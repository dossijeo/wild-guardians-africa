import {uniform} from 'three/tsl';
import {floorFloat32} from './float32-time.js';
import {validateConfirmedClockSegments} from '../simulation/confirmed-clock-segments.js';

// A presentation-only clock over an already confirmed and separately certified
// interval. It never advances simulation, crosses its endpoint or interpolates
// an event/pause boundary. Uncertified observations must use the normal pump.
export function createConfirmedHistoricalClock({initialElapsed,initialSequence=0,now=()=>performance.now()}={}){
 if(!Number.isFinite(initialElapsed)||initialElapsed<0||!Number.isFinite(Math.fround(initialElapsed))||!Number.isSafeInteger(initialSequence)||initialSequence<0||typeof now!=='function')throw TypeError('Invalid historical clock');
 const epoch=initialElapsed,node=uniform(floorFloat32(initialElapsed)),motionNode=uniform(0);let elapsed=initialElapsed,sequence=initialSequence,active=null,closed=false;
 function updateNode(){node.value=floorFloat32(elapsed);motionNode.value=floorFloat32(elapsed-epoch);}
 function checkTime(value){if(!Number.isFinite(value)||active&&value<active.last)throw TypeError('Historical clock must be monotonic');}
 function begin(preview){if(closed||active||!preview||preview.safeForAutonomousPlayback!==true||!Array.isArray(preview.reasons)||preview.reasons.length||preview.sequence!==sequence+1||preview.start!==elapsed||!Number.isFinite(preview.end)||preview.end<=preview.start||!preview.clockSegments||preview.clockSegments.startPauses?.length||preview.clockSegments.endPauses?.length)throw Error('Uncertified historical clock boundary');const clock=preview.clockSegments;validateConfirmedClockSegments(clock,{start:preview.start,end:preview.end,startPauses:[],endPauses:[]});if(!clock.complete||!clock.segments.length)throw Error('Unusable historical clock segments');const at=now();checkTime(at);active={sequence:preview.sequence,start:preview.start,end:preview.end,segments:structuredClone(clock.segments),index:0,spent:0,last:at,suspended:false,invalid:false};return true;}
 function advance(at=now()){if(closed)throw Error('Historical clock disposed');if(!active)return elapsed;checkTime(at);let remaining=active.suspended||active.invalid?0:(at-active.last)/1000;active.last=at;while(remaining>0&&active.index<active.segments.length){const segment=active.segments[active.index],available=segment.realDuration-active.spent,used=Math.min(remaining,available);active.spent+=used;remaining-=used;elapsed=Math.min(segment.end,segment.start+active.spent*segment.rate);if(active.spent>=segment.realDuration-1e-12){elapsed=segment.end;active.index++;active.spent=0;}}if(active.index===active.segments.length)elapsed=active.end;updateNode();return elapsed;}
 function suspend(at=now()){if(!active||closed)throw Error('Historical clock is not active');advance(at);active.suspended=true;}
 function resume(at=now()){if(!active||closed||active.invalid)throw Error('Historical clock cannot resume');checkTime(at);active.last=at;active.suspended=false;}
 function invalidate(at=now()){if(!active||closed)return false;advance(at);active.invalid=true;active.suspended=true;return true;}
 function commitBoundary(nextSequence,nextElapsed){if(closed||!active||active.invalid||active.index!==active.segments.length||nextSequence!==active.sequence||nextElapsed!==active.end||elapsed!==active.end)throw Error('Historical boundary is not complete');sequence=nextSequence;active=null;return true;}
 function cancelAtStart(){if(closed||!active||elapsed!==active.start||active.index!==0||active.spent!==0)throw Error('Historical playback already advanced');active=null;}
 function syncCommitted(nextSequence,nextElapsed){if(closed||active||!Number.isSafeInteger(nextSequence)||nextSequence!==sequence+1||!Number.isFinite(nextElapsed)||nextElapsed<elapsed)throw Error('Invalid committed historical boundary');sequence=nextSequence;elapsed=nextElapsed;updateNode();}
 return {node,motionNode,get epoch(){return epoch;},get elapsed(){return elapsed;},begin,advance,suspend,resume,invalidate,commitBoundary,cancelAtStart,syncCommitted,status(){return {closed,sequence,elapsed,active:active?{sequence:active.sequence,start:active.start,end:active.end,suspended:active.suspended,invalid:active.invalid,complete:active.index===active.segments.length}:null};},dispose(){closed=true;active=null;}};
}
