import {createConfirmedHudDeltaDecoder} from './confirmed-hud-delta.js';
import {validateConfirmedHudSchema} from './confirmed-hud-projection.js';

// A presentation-only consumer. The entire publication remains available to
// the caller for ordered events, settlements and other interaction barriers.
// A callback failure makes replay unsafe, so this instance fails closed.
export function createConfirmedHudReceiver({session,onPublication,initialSequence=0}={}){
 if(typeof session!=='string'||!session||typeof onPublication!=='function'||!Number.isSafeInteger(initialSequence)||initialSequence<0)throw TypeError('Invalid HUD receiver');
 const decoder=createConfirmedHudDeltaDecoder({validate:validateConfirmedHudSchema});let sequence=initialSequence,fault=false,closed=false,receiving=false;
 return {
  accept(envelope){
   if(closed||fault)throw Error('HUD receiver unavailable');if(receiving)throw Error('HUD receiver reentry');
   const message=envelope?.publication,first=envelope?.firstSequence??message?.sequence;
   if(envelope?.kind!=='publication'||envelope.session!==session||!message||!Number.isSafeInteger(message.sequence)||message.sequence<=sequence||!Number.isSafeInteger(first)||first!==sequence+1||first>message.sequence||!Array.isArray(message.events)||message.hudDelta?.sequence!==message.sequence)throw TypeError('Invalid HUD publication');
   const prepared=decoder.prepare(message.hudDelta),view=prepared.view;
   if(message.elapsed!==undefined&&message.elapsed!==view.rules.elapsed||message.slotId!==undefined&&message.slotId!==view.slotId)throw TypeError('Inconsistent HUD publication');
   receiving=true;try{prepared.commit();onPublication(view,envelope);sequence=message.sequence;return {accepted:true,sequence};}catch(error){fault=true;throw error;}finally{receiving=false;}
  },
  status(){return {sequence,fault,closed};},
  dispose(){if(closed)return;closed=true;decoder.reset();}
 };
}
