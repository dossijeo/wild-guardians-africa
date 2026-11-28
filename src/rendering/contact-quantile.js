// Exact order statistic for transient collider-fit arrays. Sorting every skin
// coordinate is unnecessary; a three-way partition also handles repeated values.
export function contactQuantile(values, fraction){
 if(!values.length)throw Error('Empty contact sample');
 const target=Math.floor((values.length-1)*fraction);
 if(target<0||target>=values.length||!Number.isFinite(target))throw Error('Invalid contact quantile');
 let lo=0,hi=values.length-1;
 while(lo<hi){
  const a=values[lo],b=values[(lo+hi)>>>1],c=values[hi];
  const pivot=Math.max(Math.min(a,b),Math.min(Math.max(a,b),c));
  let lower=lo,index=lo,upper=hi;
  while(index<=upper){
   if(values[index]<pivot){const v=values[lower];values[lower++]=values[index];values[index++]=v;}
   else if(values[index]>pivot){const v=values[upper];values[upper--]=values[index];values[index]=v;}
   else index++;
  }
  if(target<lower)hi=lower-1;
  else if(target>upper)lo=upper+1;
  else return values[target];
 }
 return values[target];
}
