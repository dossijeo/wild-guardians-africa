// The first RAF interval starts before samples were cleared. Retain its CPU
// work, but compute cadence only between consecutive in-window frame starts.
export function physicsWindowMetrics(rows,keys){
 return Object.fromEntries(keys.map(key=>{
  const values=(key==='dt'?rows.slice(1):rows).map(row=>row[key]??0);
  if(values.some(value=>!Number.isFinite(value)||value<0))throw Error('Invalid physics benchmark sample: '+key);
  values.sort((a,b)=>a-b);const count=values.length,at=p=>count?values[Math.min(count-1,Math.floor(count*p))]:null;
  return [key,{count,mean:count?values.reduce((sum,value)=>sum+value,0)/count:null,p95:at(.95),p99:at(.99),max:at(1)}];
 }));
}
