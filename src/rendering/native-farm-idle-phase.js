import {floorFloat32} from './float32-time.js';

// Match the existing GPU decoder's conservative age. This is clock arithmetic,
// not trajectory/pose sampling. Only the looping clip origin is corrected.
export function nativeDecodedClockAge(raw,duration=Infinity){
 const margin=Math.fround(Math.max(Math.abs(raw),1)*.000000476837158203125);
 return Math.max(0,Math.min(Math.fround(raw-margin),duration));
}
export function nativeFarmIdlePhaseOffset({elapsed,executionEpoch,relativeTime,duration,period}){
 if(![elapsed,executionEpoch,relativeTime,duration,period].every(Number.isFinite)||elapsed<executionEpoch||executionEpoch<0||relativeTime<0||Math.fround(relativeTime)!==relativeTime||duration<0||period<=0)throw TypeError('Invalid native Farm Idle phase clock');
 const age=nativeDecodedClockAge(floorFloat32(elapsed-executionEpoch)),physical=nativeDecodedClockAge(relativeTime,duration),offset=(executionEpoch%period+age-physical)%period;
 return Math.fround(offset<0?offset+period:offset);
}

// Idle21 uploads its relative age directly, without the movement decoder's
// margin or an absolute clip origin. Repeat only after its finite endpoint;
// an earlier revocation/hold keeps its submitted phase unchanged.
// Same-clip successors retain their accumulated resource wait as a scalar delay.
export function nativeIdleCyclePhaseOffset({elapsed,executionEpoch,relativeTime,duration,period,phaseDelay=0}){
 if(![elapsed,executionEpoch,relativeTime,duration,period].every(Number.isFinite)||elapsed<executionEpoch||executionEpoch<0||relativeTime<0||Math.fround(relativeTime)!==relativeTime||duration<0||period<=0||relativeTime>floorFloat32(duration)||executionEpoch+relativeTime>elapsed||!Number.isFinite(phaseDelay)||phaseDelay<0)throw TypeError('Invalid native Idle cycle phase clock');
 const end=floorFloat32(duration);if(relativeTime<end)return Math.fround(phaseDelay%period);
 const extra=Math.max(0,elapsed-(executionEpoch+duration)+(duration-end)),offset=(phaseDelay%period+floorFloat32(extra)%period)%period;
 return Math.fround(offset<0?offset+period:offset);
}
