// Native GPU decoders subtract a four-ulp time margin and clamp their curve.
// Retain enough certified clock coverage to reach the terminal sample on the
// next coherent native step, rather than freezing just before its final row.
export function nativeClockResourceEnd(start,end){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start)throw TypeError('Invalid native clock resource interval');
 const value=end+Math.max(1,end-start)*.0000019073486328125;
 if(!Number.isFinite(value))throw RangeError('Native clock resource interval overflow');
 return value;
}
