// Directed rounding for nonnegative finite simulation-time values.
const floats=new Float32Array(1),bits=new Uint32Array(floats.buffer);
export function floorFloat32(value){if(!Number.isFinite(value)||value<0)throw TypeError('Invalid nonnegative time');floats[0]=value;if(!Number.isFinite(floats[0]))throw RangeError('Time exceeds float32');if(floats[0]>value)bits[0]--;return floats[0];}
export function ceilFloat32(value){if(!Number.isFinite(value)||value<0)throw TypeError('Invalid nonnegative time');floats[0]=value;if(!Number.isFinite(floats[0]))throw RangeError('Time exceeds float32');if(floats[0]<value)bits[0]++;if(!Number.isFinite(floats[0]))throw RangeError('Time exceeds float32');return floats[0];}
