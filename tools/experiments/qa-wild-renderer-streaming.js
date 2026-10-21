import {placeCamera} from './qa-savanna-camera-sweep.js';

// Diagnostic latency experiment. Instrumented timings are not frame-rate or GPU
// comparisons: different completion frames necessarily draw different content.
export async function measureStreamingSweep(world){
 if(world.qaFixedResidency)throw Error('Streaming needs normal moving residency');
 await world.whenChunksReady();
 const stream=world.chunkStream,pending=new Map(),completed=[],cancelled=[];
 const original={plan:stream.plan,build:stream.build,onData:stream.onData,render:world.render};
 let frame=0;
 stream.plan=function(desired,force=false){
  const now=performance.now();
  for(const [key,record] of pending)if(force||!desired.has(key)){
   cancelled.push({...record,key,waitMs:now-record.requested});pending.delete(key);
  }
  for(const [key,job] of desired)if((!this.loaded().has(key)||this.stale.has(key)||force)&&!pending.has(key))
   pending.set(key,{requested:now,requestFrame:frame,cx:job.cx,cz:job.cz});
  return original.plan.call(this,desired,force);
 };
 stream.build=function(config,profile,cx,cz){
  const start=performance.now();
  try{return original.build.apply(this,arguments);}
  finally{const item=pending.get(`${cx},${cz}`);if(item)item.buildMs=performance.now()-start;}
 };
 stream.onData=function(data){
  const key=`${data.cx},${data.cz}`,item=pending.get(key),start=performance.now();
  const result=original.onData.apply(this,arguments),end=performance.now();
  if(item){completed.push({...item,key,installMs:end-start,latencyMs:end-item.requested,readyFrame:frame});pending.delete(key);}
  return result;
 };
 try{
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{world.render=original.render;reject(Error('Streaming sweep timeout'));},180000);
   world.render=function(){
    try{
     placeCamera(world,.5-.5*Math.cos(2*Math.PI*frame/180));
     if(world.qaContinuousGrass)world.qaContinuousGrass.timeOverride=frame/30;
     const result=original.render.call(this,1/30);
     if(++frame===360){world.render=original.render;clearTimeout(timeout);resolve();}
     return result;
    }catch(error){clearTimeout(timeout);world.render=original.render;reject(error);throw error;}
   };
  });
  await world.whenChunksReady();
  if(pending.size)throw Error('Unresolved streaming observations');
  return {frames:frame,completed,cancelled,worker:!!stream.worker,
   finalKeys:[...world.chunks.keys()].sort(),instrumented:true};
 }finally{stream.plan=original.plan;stream.build=original.build;stream.onData=original.onData;world.render=original.render;}
}
