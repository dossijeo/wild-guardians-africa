// These segments describe time already simulated by the authority. They do
// not certify route, terrain or event continuity and are not a future horizon.
export function validateConfirmedClockSegments(clock,{start,end,startPauses,endPauses}){
 if(!clock||clock.version!==1||clock.start!==start||clock.end!==end||!Array.isArray(clock.startPauses)||!Array.isArray(clock.endPauses)||JSON.stringify(clock.startPauses)!==JSON.stringify(startPauses)||JSON.stringify(clock.endPauses)!==JSON.stringify(endPauses)||typeof clock.complete!=='boolean'||!Array.isArray(clock.segments)||clock.segments.length>256||!clock.complete&&clock.segments.length)throw TypeError('Invalid confirmed clock segments');
 if(!clock.complete)return;
 let cursor=start;for(const segment of clock.segments){if(!segment||segment.start!==cursor||!Number.isFinite(segment.end)||segment.end<=cursor||segment.end>end||!Number.isFinite(segment.realDuration)||segment.realDuration<=0||![1,5].includes(segment.rate)||Math.abs((segment.end-segment.start)-segment.realDuration*segment.rate)>1e-7*Math.max(1,segment.end-segment.start))throw TypeError('Invalid confirmed clock segment');cursor=segment.end;}
 if(cursor!==end)throw TypeError('Incomplete confirmed clock segments');
}
