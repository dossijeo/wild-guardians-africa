// Drain only already-confirmed boundaries. This pump never invents elapsed
// simulation time or infers a rate from wall time; it is not interpolation.
export function createConfirmedTimelinePump({stream,maxBoundaries=8}={}){
 if(!stream||typeof stream.nextTimelineBoundary!=='function'||typeof stream.advanceNextTimelineBoundary!=='function'||typeof stream.timelineStatus!=='function'||typeof stream.status!=='function'||!Number.isSafeInteger(maxBoundaries)||maxBoundaries<1)throw TypeError('Invalid confirmed timeline pump');
 let closed=false;
 return {advance(){if(closed)throw Error('Confirmed timeline pump disposed');let count=0;while(count<maxBoundaries){const boundary=stream.nextTimelineBoundary();if(boundary===null)break;const current=stream.status(),received=stream.timelineStatus();if(current.closed||!Number.isSafeInteger(boundary?.sequence)||boundary.sequence!==current.sequence+1||!Number.isFinite(boundary.elapsed)||boundary.elapsed<current.lastElapsed||!Number.isFinite(received.receivedElapsed)||boundary.elapsed>received.receivedElapsed)throw Error('Invalid confirmed timeline boundary');if(!stream.advanceNextTimelineBoundary())break;const after=stream.status();if(after.closed||after.sequence!==boundary.sequence||after.lastElapsed!==boundary.elapsed)throw Error('Confirmed timeline boundary was not applied');count++;}return count;},dispose(){closed=true;}};
}
