// A shared data-layout check, not an authority or presentation entry point.
// Route and pending-resume callers retain their distinct identity contracts.
export function copyNativePresentationSamples(value){
 const {rows,startTime,endTime,rowWidth}=value,width=16;
 if(rowWidth!==width||!(rows instanceof Float64Array)||rows.length<width||rows.length%width!==0||rows.length/width>16384||!Number.isFinite(startTime)||startTime<0||!Number.isFinite(endTime)||endTime<startTime||rows[0]!==startTime||rows.at(-width)!==endTime)throw TypeError('Invalid native presentation samples');
 for(let i=0;i<rows.length;i+=width){
  for(let column=0;column<width;column++)if(!Number.isFinite(rows[i+column]))throw TypeError('Invalid native presentation sample');
  if(i>0&&rows[i]<=rows[i-width]||!Number.isSafeInteger(rows[i+6])||rows[i+6]<0||![0,1].includes(rows[i+7])||![0,1].includes(rows[i+14])||rows[i+15]<0)throw TypeError('Invalid native presentation interval');
 }
 return rows.slice();
}
