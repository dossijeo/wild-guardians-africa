// QA only: observe program creation without querying shader/link status.
// Synchronous call durations are not GPU execution times.
export function installLoadingProgramInventory({traceCalls=false}={}){
 const contexts=new WeakMap(),programIdentities=new WeakMap(),getContext=HTMLCanvasElement.prototype.getContext;
 const report=globalThis.qaLoadingProgramInventory={contexts:[],links:[],deletes:[],slowCalls:[],longFrames:[]};
 // Read existing Three metadata only: no GL status query or resource creation.
 Object.defineProperty(report,'residentPrograms',{enumerable:true,get(){
  return (globalThis.qaThreadWorld?.renderer?.info.programs??[]).map(program=>({
   ...programIdentities.get(program.program),threeId:program.id,
   cacheKey:program.cacheKey,usedTimes:program.usedTimes,
  }));
 }});
 if(traceCalls&&PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')){
  const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(globalThis.qaStreamingLoadStart&&entry.startTime>=qaStreamingLoadStart&&(!globalThis.qaStreamingReadyAt||entry.startTime<qaStreamingReadyAt+6000)&&report.longFrames.length<2000)report.longFrames.push(entry.toJSON());});
  observer.observe({type:'long-animation-frame'});
 }
 const hash=text=>{let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);return (value>>>0).toString(16);};
 HTMLCanvasElement.prototype.getContext=function(...args){
  const gl=getContext.apply(this,args);
  if(!gl||!String(args[0]).startsWith('webgl')||contexts.has(gl))return gl;
  const id=report.contexts.length,shaders=new WeakMap(),programs=new WeakMap();let serial=0;
  contexts.set(gl,id);report.contexts.push({id,canvasId:this.id});
  const source=gl.shaderSource,attach=gl.attachShader,link=gl.linkProgram,remove=gl.deleteProgram;
  gl.shaderSource=function(shader,text){shaders.set(shader,{hash:hash(text),name:text.match(/#define SHADER_NAME (.*)/)?.[1]??null,defines:text.match(/^#define .*$/gm)??[]});return source.call(this,shader,text);};
  gl.attachShader=function(program,shader){let record=programs.get(program);if(!record){record={id:serial++,shaders:[]};programs.set(program,record);programIdentities.set(program,{context:id,id:record.id});}record.shaders.push(shader);return attach.call(this,program,shader);};
  gl.linkProgram=function(program){const start=performance.now();try{return link.call(this,program);}finally{const record=programs.get(program);report.links.push({context:id,id:record?.id,start,callMs:performance.now()-start,afterReady:!!globalThis.qaStreamingReadyAt,shaders:record?.shaders.map(shader=>shaders.get(shader))??[],stack:new Error().stack});}};
  gl.deleteProgram=function(program){report.deletes.push({context:id,id:programs.get(program)?.id,at:performance.now()});return remove.call(this,program);};
  if(traceCalls)for(const name of ['getProgramInfoLog','getProgramParameter','getShaderInfoLog','getShaderParameter','getParameter','texImage2D','texSubImage2D','generateMipmap','bufferData','bufferSubData','drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
   const call=gl[name];if(typeof call!=='function')continue;
   gl[name]=function(...parameters){const start=performance.now();try{return call.apply(this,parameters);}finally{const ms=performance.now()-start;if(ms>=5&&report.slowCalls.length<2000)report.slowCalls.push({context:id,name,start,ms,afterReady:!!globalThis.qaStreamingReadyAt,stack:new Error().stack});}};
  }
  return gl;
 };
}
