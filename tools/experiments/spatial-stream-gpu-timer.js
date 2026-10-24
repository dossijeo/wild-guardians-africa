// QA-only whole WorldScene.render command interval. Results are asynchronous;
// timer intervals include GPU pipeline bubbles and are not isolated busy time.
export function installStreamGpuTimer(world,{sampleEvery=3,maxPending=8,timeoutMs=15000,now=()=>performance.now(),wait=()=>new Promise(resolve=>setTimeout(resolve,4))}={}){
 const gl=world.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const result={supported:!!ext,sampleEvery,samplesMs:[],submitted:0,skipped:0,disjoint:false};
 if(!ext)return {stop(){},async finish(){return result;}};
 const pending=[],original=world.render;let frame=0,stopped=false;
 const poll=()=>{
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){result.disjoint=true;result.samplesMs.length=0;}
  while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
   const query=pending.shift();
   try{if(!result.disjoint)result.samplesMs.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);}
   finally{gl.deleteQuery(query);}
  }
 };
 function render(...args){
  poll();let query=null;
  if(frame++%sampleEvery===0&&!result.disjoint){
   if(pending.length>=maxPending)result.skipped++;
   else{
    if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))throw Error('GPU timer conflicts with another elapsed query');
    query=gl.createQuery();if(!query)throw Error('GPU query allocation failed');
    gl.beginQuery(ext.TIME_ELAPSED_EXT,query);result.submitted++;
   }
  }
  try{return original.apply(this,args);}
  finally{if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);}}
 }
 world.render=render;
 const stop=()=>{if(stopped)return;stopped=true;if(world.render===render)world.render=original;};
 return {stop,async finish(){
  stop();const deadline=now()+timeoutMs;
  try{while(pending.length){poll();if(!pending.length)break;if(now()>deadline)throw Error('GPU query completion timeout');await wait();}return result;}
  finally{for(const query of pending)gl.deleteQuery(query);pending.length=0;}
 }};
}
