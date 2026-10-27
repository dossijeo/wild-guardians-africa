// QA only: install after loading; restore every prototype when capture ends.
// Timings are nested synchronous CPU wall times, never GPU execution times.
export async function installFarCpuProbe(){
 const [{NativeTreeCoverage},{NativePreparedTreeCoverage},{NativeTreeStandby},{NativeFarLayer},{NativeFarCoverage},{FarTreeTransitions}]=await Promise.all([
  import('./native-tree-coverage.js'),import('./native-prepared-tree-coverage.js'),import('./native-tree-standby.js'),import('./native-far-layer.js'),import('./native-far-coverage.js'),import('./far-tree-transitions.js')]);
 const records=new Map(),restore=[];let dropped=0;
 for(const [prototype,key,label] of [[NativeTreeCoverage.prototype,'update','physical-coverage'],[NativePreparedTreeCoverage.prototype,'update','prepared-coverage'],[NativeTreeStandby.prototype,'update','standby'],[NativeFarLayer.prototype,'update','layer'],[NativeFarCoverage.prototype,'update','native-fade'],[FarTreeTransitions.prototype,'advance','transitions']]){
  const original=prototype[key];if(typeof original!=='function')throw Error('Missing far diagnostic method '+label);
  const values=[];records.set(label,values);
  const wrapped=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{if(values.length<100000)values.push(performance.now()-start);else dropped++;}};
  prototype[key]=wrapped;restore.push(()=>{if(prototype[key]===wrapped)prototype[key]=original;});
 }
 let finished=false;
 return ()=>{if(finished)throw Error('Far diagnostic already finished');finished=true;for(const fn of restore)fn();
  const stats=values=>{const sorted=values.slice().sort((a,b)=>a-b),at=q=>sorted.length?sorted[Math.ceil(sorted.length*q)-1]:null;return {calls:sorted.length,totalMs:sorted.reduce((a,b)=>a+b,0),p50:at(.5),p95:at(.95),p99:at(.99),max:sorted.at(-1)??null};};
  return {scope:'Nested synchronous CPU method wall times including diagnostic clock overhead; across all species, not frame percentiles. Do not add parent and child totals.',dropped,methods:Object.fromEntries([...records].map(([k,v])=>[k,stats(v)]))};
 };
}
