// QA only: install after loading; restore every prototype when capture ends.
// Timings are nested synchronous CPU wall times, never GPU execution times.
export async function installFarCpuProbe(world){
 const [{NativeTreeCoverage},{NativePreparedTreeCoverage},{NativeTreeStandby},{NativeFarLayer},{NativeFarCoverage},{FarTreeTransitions}]=await Promise.all([
  import('./native-tree-coverage.js'),import('./native-prepared-tree-coverage.js'),import('./native-tree-standby.js'),import('./native-far-layer.js'),import('./native-far-coverage.js'),import('./far-tree-transitions.js')]);
 const records=new Map(),restore=[],spans=[];let dropped=0;
 const recordSpan=(label,at,ms)=>{if(ms>=1){if(spans.length<100000)spans.push({label,at,ms});else dropped++;}};
 function wrap(prototype,key,label,before=null,only=()=>true){
  const original=prototype[key];if(typeof original!=='function')throw Error('Missing far diagnostic method '+label);
  const values=records.get(label)??[];records.set(label,values);
  const wrapped=function(...args){before?.();if(!only())return original.apply(this,args);const start=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-start;if(values.length<100000)values.push(ms);else dropped++;recordSpan(label,start,ms);}};
  prototype[key]=wrapped;restore.push(()=>{if(prototype[key]===wrapped)prototype[key]=original;});
 }
 for(const [prototype,key,label] of [[NativeTreeCoverage.prototype,'update','physical-coverage'],[NativePreparedTreeCoverage.prototype,'update','prepared-coverage'],[NativeTreeStandby.prototype,'update','standby'],[NativeFarLayer.prototype,'update','layer'],[NativeFarCoverage.prototype,'update','native-fade'],[FarTreeTransitions.prototype,'advance','transitions'],[FarTreeTransitions.prototype,'setCoverage','transition-coverage'],[FarTreeTransitions.prototype,'setSuppressions','transition-suppressions']])wrap(prototype,key,label);
 if(world?.farVegetation){
  let active=0;const seen=new WeakSet();
  for(const adapter of world.farVegetation.adapters){
   wrap(adapter,'update','adapter',()=>{const p=adapter.layer.current?.prototype;if(p&&!seen.has(p)){seen.add(p);if(p.updateGroundBounds)wrap(p,'updateGroundBounds','ground-bounds');if(p.update)wrap(p,'update','impostor-prototype');}});
  }
  const original=world.farVegetation.update;
  const scoped=function(...args){active++;try{return original.apply(this,args);}finally{active--;}};
  world.farVegetation.update=scoped;restore.push(()=>{if(world.farVegetation.update===scoped)world.farVegetation.update=original;});
  wrap(world.camera,'updateMatrixWorld','camera-matrices',null,()=>active>0);
  wrap(world.farVegetation,'update','far-total');
 }
 const previousSpan=globalThis.qaFarCpuSpan;
 const span=(label,fn)=>{const start=performance.now();try{return fn();}finally{let values=records.get(label);if(!values)records.set(label,values=[]);const ms=performance.now()-start;if(values.length<100000)values.push(ms);else dropped++;recordSpan(label,start,ms);}};
 globalThis.qaFarCpuSpan=span;restore.push(()=>{if(globalThis.qaFarCpuSpan===span){if(previousSpan)globalThis.qaFarCpuSpan=previousSpan;else delete globalThis.qaFarCpuSpan;}});
 let finished=false;
 return ()=>{if(finished)throw Error('Far diagnostic already finished');finished=true;for(const fn of restore.reverse())fn();
  const stats=values=>{const sorted=values.slice().sort((a,b)=>a-b),at=q=>sorted.length?sorted[Math.ceil(sorted.length*q)-1]:null;return {calls:sorted.length,totalMs:sorted.reduce((a,b)=>a+b,0),p50:at(.5),p95:at(.95),p99:at(.99),max:sorted.at(-1)??null};};
  return {scope:'Nested synchronous CPU method wall times including diagnostic clock overhead; across all species, not frame percentiles. Do not add parent and child totals. Spans >=1ms retain timestamps for frame correlation.',dropped,spans,methods:Object.fromEntries([...records].map(([k,v])=>[k,stats(v)]))};
 };
}
