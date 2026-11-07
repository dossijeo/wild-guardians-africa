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
 function begin(preview){if(closed||active||!preview||preview.safeForAutonomousPlayback!==true||!Array.isArray(preview.reasons)||preview.reasons.length||preview.sequence!==sequence+1||preview.start!==elapsed||!Number.isFinite(preview.end)||preview.end<=preview.start||!preview.clockSegments||preview.clockSegments.startPauses?.length||preview.clockSegments.endPauses?.length)throw Error('Uncertified historical clock boundary');const clock=preview.clockSegments;validateConfirmedClockSegments(clock,{start:preview.start,end:preview.end,startPauses:[],endPauses:[]});if(!clock.complete||!clock.segments.length)throw Error('Unusable historical clock segments');const at=now();checkTime(at);active={sequence:preview.sequence,start:preview.start,end:preview.end,segments:structuredClone(clock.segments),index:0,spent:0,last:at,carry:0,limit:null,suspended:false,invalid:false};return true;}
 function advanceLimited(at,limit){if(closed)throw Error('Historical clock disposed');if(!active)return elapsed;if(!Number.isFinite(limit)||limit<elapsed||limit>active.end)throw TypeError('Invalid historical clock limit');checkTime(at);if(active.suspended||active.invalid){active.last=at;return elapsed;}let remaining=(at-active.last)/1000+active.carry;active.carry=0;active.last=at;while(remaining>0&&active.index<active.segments.length&&elapsed<limit){const segment=active.segments[active.index],available=segment.realDuration-active.spent,used=Math.min(remaining,available,(limit-elapsed)/segment.rate);active.spent+=used;remaining-=used;elapsed=Math.min(segment.end,limit,segment.start+active.spent*segment.rate);if(active.spent>=segment.realDuration-1e-12){elapsed=Math.min(segment.end,limit);active.index++;active.spent=0;}}if(active.index===active.segments.length)elapsed=active.end;else if(elapsed>=limit)active.carry=remaining;updateNode();return elapsed;}
 function advance(at=now()){return advanceLimited(at,active?.limit??active?.end??elapsed);}
 function advanceUntil(limit,at=now()){if(!active||closed||active.limit!==null&&active.limit!==limit)throw Error('Historical clock limit unavailable');active.limit=limit;return advanceLimited(at,limit);}
 function releaseLimit(limit){if(!active||active.limit!==limit||elapsed!==limit)throw Error('Historical clock limit not reached');active.limit=null;}
 function suspend(at=now()){if(!active||closed)throw Error('Historical clock is not active');advance(at);active.suspended=true;}
 function resume(at=now()){if(!active||closed||active.invalid)throw Error('Historical clock cannot resume');checkTime(at);active.last=at;active.suspended=false;}
 function invalidate(at=now()){if(!active||closed)return false;advance(at);active.invalid=true;active.suspended=true;return true;}
 function commitBoundary(nextSequence,nextElapsed){if(closed||!active||active.invalid||active.index!==active.segments.length||nextSequence!==active.sequence||nextElapsed!==active.end||elapsed!==active.end)throw Error('Historical boundary is not complete');sequence=nextSequence;active=null;return true;}
 function cancelAtStart(){if(closed||!active||elapsed!==active.start||active.index!==0||active.spent!==0)throw Error('Historical playback already advanced');active=null;}
 // Drop only the current certified interval. The confirmed stream must then
 // commit its endpoint before anything is drawn or another interval starts.
 function abandonForBoundary(preview){if(closed||!active||preview?.sequence!==active.sequence||preview.start!==active.start||preview.end!==active.end||elapsed>active.end)throw Error('Invalid historical fallback boundary');active=null;}
 function syncCommitted(nextSequence,nextElapsed){if(closed||active||!Number.isSafeInteger(nextSequence)||nextSequence!==sequence+1||!Number.isFinite(nextElapsed)||nextElapsed<elapsed)throw Error('Invalid committed historical boundary');sequence=nextSequence;elapsed=nextElapsed;updateNode();}
 // The stream commits only at a completed endpoint (or the legacy fallback).
 // Sharing this clock with effects prevents a second, frozen visual timeline.
 function commit(nextElapsed){if(active)return commitBoundary(active.sequence,nextElapsed);return syncCommitted(sequence+1,nextElapsed);}
 return {commit,node,motionNode,get epoch(){return epoch;},get elapsed(){return elapsed;},begin,advance,advanceUntil,releaseLimit,suspend,resume,invalidate,commitBoundary,cancelAtStart,abandonForBoundary,syncCommitted,status(){return {closed,sequence,elapsed,active:active?{sequence:active.sequence,start:active.start,end:active.end,suspended:active.suspended,invalid:active.invalid,complete:active.index===active.segments.length}:null};},dispose(){closed=true;active=null;}};
}
