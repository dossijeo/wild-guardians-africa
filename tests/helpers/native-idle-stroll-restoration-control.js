import {restoredNativeIdleStrollGame,nativeIdleStrollGameSave} from './native-idle-stroll-restoration-game.js';
import {createNativeRouteControl} from '../../src/rendering/native-route-control.js';
import {tick} from '../../src/simulation/game.js';

// Real save/load and native log/clock. installStrolls below remains a control
// boundary test, not proof that a graphical consumer prepared GPU resources.
export function controlledRestoredNativeIdleStroll({saved=nativeIdleStrollGameSave(),bindAfterObserve=false,...options}={}){
 const f=restoredNativeIdleStrollGame(saved,{...options,bindBodies:!bindAfterObserve});let c,baseline,detach,paused=false,clockPaused=false;const events=[],clocks=[];
 const clock=record=>{const previous=c.status().clock;c.acceptClock({...record,anchorAbsoluteMs:record.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:record.reanchor?record.committedThrough:previous.anchorLogicalTime});};
 try{
  detach=f.planner.observeNativeIntentControl({onBaseline(b){baseline=b;c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingHomeRequests:b.pendingHomeRequests??[],pendingTaskRequests:b.pendingTaskRequests??[],pendingIdleStrollRequests:b.pendingIdleStrollRequests??[]});if(b.clock)c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){events.push(...changes);if(!paused)changes.forEach(e=>c.accept(e));},onClock(record){clocks.push(record);if(!clockPaused)clock(record);}});
  return {...f,actor:Number(f.actor.split('-').at(-1)),c,baseline,events,clocks,advance:seconds=>tick(f.state,seconds,f.nav),pauseControl:value=>paused=value,pauseClock:value=>clockPaused=value,acceptLastClock:()=>clock(clocks.at(-1)),close(){detach?.();c?.dispose();f.close();}};
 }catch(error){detach?.();c?.dispose();f.close();throw error;}
}
