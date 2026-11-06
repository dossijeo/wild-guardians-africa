import {createConfirmedHudDeltaDecoder} from './confirmed-hud-delta.js';
import {validateConfirmedHudSchema} from './confirmed-hud-projection.js';
import {physicsOwners} from './host-publication-queue.js';

// A presentation-only consumer. The entire publication remains available to
// the caller for ordered events, settlements and other interaction barriers.
// A callback failure makes replay unsafe, so this instance fails closed.
export function createConfirmedHudReceiver({session,onPublication,initialSequence=0,initialState=null}={}){
 if(typeof session!=='string'||!session||typeof onPublication!=='function'||!Number.isSafeInteger(initialSequence)||initialSequence<0||initialState!==null&&(!Number.isSafeInteger(initialState.sequence)||initialState.sequence<1||!Number.isFinite(initialState.elapsed)||typeof initialState.slotId!=='string'||!initialState.slotId))throw TypeError('Invalid HUD receiver');
 const decoder=createConfirmedHudDeltaDecoder({validate:validateConfirmedHudSchema});let sequence=initialSequence,fault=false,closed=false,receiving=false,lastView=null,lastElapsed=initialState?.elapsed??null,stateSequence=initialState?.sequence??null,lastEvent=initialState?initialState.sequence-1:0;
 return {
  accept(envelope){
   if(closed||fault)throw Error('HUD receiver unavailable');if(receiving)throw Error('HUD receiver reentry');
   const message=envelope?.publication,first=envelope?.firstSequence??message?.sequence;
   if(envelope?.kind!=='publication'||envelope.session!==session||!message||!Number.isSafeInteger(message.sequence)||message.sequence<=sequence||!Number.isSafeInteger(first)||first!==sequence+1||first>message.sequence||!Array.isArray(message.events))throw TypeError('Invalid HUD publication');
   if(initialState&&first!==message.sequence&&message.unchanged!==true&&physicsOwners(message)===null)throw TypeError('Invalid coalesced HUD publication');
   const unchanged=message.unchanged===true;let prepared=null,view;
   if(unchanged){if(!lastView||message.hudDelta!==undefined||message.events.length||message.presentationJournal?.length||message.settlements?.length||message.slotId!==lastView.slotId||message.elapsed!==lastView.rules.elapsed||initialState&&message.stateSequence!==stateSequence||!Array.isArray(message.pauses)||JSON.stringify(message.pauses)!==JSON.stringify(lastView.rules.pauses))throw TypeError('Invalid unchanged HUD publication');view=structuredClone(lastView);}
   else{if(message.hudDelta?.sequence!==message.sequence)throw TypeError('Invalid HUD publication');prepared=decoder.prepare(message.hudDelta);view=prepared.view;}
   if(message.elapsed!==undefined&&message.elapsed!==view.rules.elapsed||message.slotId!==undefined&&message.slotId!==view.slotId)throw TypeError('Inconsistent HUD publication');
   let nextEvent=lastEvent;if(initialState){if(view.slotId!==initialState.slotId||view.rules.elapsed<lastElapsed||!Number.isSafeInteger(view.stateSequence)||view.stateSequence<stateSequence)throw TypeError('Invalid confirmed HUD authority');nextEvent=Math.max(lastEvent,stateSequence-1);for(const event of message.events){const match=typeof event?.id==='string'?/^event-(0|[1-9]\d*)$/.exec(event.id):null,n=match?Number(match[1]):NaN;if(!Number.isSafeInteger(n)||n<=nextEvent||n>=view.stateSequence||typeof event.type!=='string')throw TypeError('Invalid confirmed HUD event sequence');nextEvent=n;}}
   if(initialState&&message.presentationJournalVersion!==undefined&&message.presentationJournalVersion!==2)throw TypeError('Invalid HUD journal version');
   if(initialState&&message.presentationJournalVersion===2&&!Array.isArray(message.presentationJournal))throw TypeError('Missing HUD journal');
   if(initialState&&message.presentationJournal!==undefined){if(!Array.isArray(message.presentationJournal))throw TypeError('Invalid HUD journal');const ids=new Map(message.events.map((event,index)=>[event.id,index])),required=new Set(message.events.filter(event=>message.presentationJournalVersion===2||['SpellActivated','CropPicked','CropDestroyed','RaidEnded'].includes(event.type)).map(event=>event.id)),gone=new Set();let last=-1,at=lastElapsed;for(const fact of message.presentationJournal){if(!fact||typeof fact!=='object')throw TypeError('Invalid HUD journal fact');if(message.presentationJournalVersion===2||Object.hasOwn(fact,'at')){if(!Number.isFinite(fact.at)||fact.at<at||fact.at>view.rules.elapsed)throw TypeError('Invalid HUD journal time');at=fact.at;}if(fact.kind==='event'){const index=ids.get(fact.eventId);if(index===undefined||index<=last||!required.delete(fact.eventId))throw TypeError('Invalid HUD journal order');last=index;}else if(fact.kind!=='animalGone'||typeof fact.actorId!=='string'||!fact.actorId||gone.has(fact.actorId))throw TypeError('Invalid HUD journal fact');else gone.add(fact.actorId);}if(required.size)throw TypeError('Incomplete HUD journal');}
   receiving=true;try{const committed=prepared?.commit();onPublication(view,envelope);sequence=message.sequence;if(!unchanged)lastView=committed;if(initialState){lastElapsed=view.rules.elapsed;stateSequence=view.stateSequence;lastEvent=nextEvent;}return {accepted:true,sequence};}catch(error){fault=true;throw error;}finally{receiving=false;}
  },
  status(){return {sequence,lastElapsed,fault,closed};},
  dispose(){if(closed)return;closed=true;lastView=null;decoder.reset();}
 };
}
