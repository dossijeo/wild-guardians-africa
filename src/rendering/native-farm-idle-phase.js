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
