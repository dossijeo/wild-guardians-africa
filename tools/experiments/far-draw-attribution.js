// QA-only synchronous attribution. No GL queries, new draws or GPU timers.
export function measureFarDraw(renderer,slot,submit,{now=()=>performance.now(),record=row=>(globalThis.qaFarDraws??=[]).push(row)}={}){
 const gl=renderer.getContext(),restore=[],api={},materials=[];
 const wrap=(object,key,run)=>{const own=Object.hasOwn(object,key),original=object[key];if(typeof original!=='function')return;
  object[key]=function(...args){return run(original,this,args);};
  restore.push(()=>{if(own)object[key]=original;else delete object[key];});
 };
 const started=now();let failed=false;
 try{
  for(const key of ['getProgramParameter','getProgramInfoLog','getShaderParameter','getShaderInfoLog','getActiveUniform','getUniformLocation','getActiveAttrib','getAttribLocation','linkProgram','compileShader','bufferData','bufferSubData','texImage2D','texSubImage2D','generateMipmap','drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
   wrap(gl,key,(original,self,args)=>{const start=now();try{return original.apply(self,args);}finally{const ms=now()-start,row=api[key]??={count:0,ms:0,maxMs:0};row.count++;row.ms+=ms;row.maxMs=Math.max(row.maxMs,ms);}});
  }
  wrap(renderer,'renderBufferDirect',(original,self,args)=>{const start=now();try{return original.apply(self,args);}finally{const ms=now()-start;if(ms>=2){const material=args[3],object=args[4];materials.push({ms,material:material?.name,programKey:material?.customProgramCacheKey?.().slice(-180),type:material?.type,object:object?.name,vertices:args[2]?.attributes?.position?.count??null});}}});
  return submit();
 }catch(error){failed=true;throw error;}finally{
  const ms=now()-started;for(let i=restore.length-1;i>=0;i--)restore[i]();
  record({slot,ms,failed,api,materials,scope:'Instrumented synchronous CPU submission wall time; nested material/API durations overlap, not GPU time.'});
 }
}
