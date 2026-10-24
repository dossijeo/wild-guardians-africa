// QA only: observe program creation without querying shader/link status.
// Synchronous call durations are not GPU execution times.
export function installLoadingProgramInventory(){
 const contexts=new WeakMap(),getContext=HTMLCanvasElement.prototype.getContext;
 const report=globalThis.qaLoadingProgramInventory={contexts:[],links:[],deletes:[]};
 const hash=text=>{let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);return (value>>>0).toString(16);};
 HTMLCanvasElement.prototype.getContext=function(...args){
  const gl=getContext.apply(this,args);
  if(!gl||!String(args[0]).startsWith('webgl')||contexts.has(gl))return gl;
  const id=report.contexts.length,shaders=new WeakMap(),programs=new WeakMap();let serial=0;
  contexts.set(gl,id);report.contexts.push({id,canvasId:this.id});
  const source=gl.shaderSource,attach=gl.attachShader,link=gl.linkProgram,remove=gl.deleteProgram;
  gl.shaderSource=function(shader,text){shaders.set(shader,{hash:hash(text),name:text.match(/#define SHADER_NAME (.*)/)?.[1]??null,defines:text.match(/^#define .*$/gm)??[]});return source.call(this,shader,text);};
  gl.attachShader=function(program,shader){let record=programs.get(program);if(!record){record={id:serial++,shaders:[]};programs.set(program,record);}record.shaders.push(shader);return attach.call(this,program,shader);};
  gl.linkProgram=function(program){const start=performance.now();try{return link.call(this,program);}finally{const record=programs.get(program);report.links.push({context:id,id:record?.id,start,callMs:performance.now()-start,afterReady:!!globalThis.qaStreamingReadyAt,shaders:record?.shaders.map(shader=>shaders.get(shader))??[],stack:new Error().stack});}};
  gl.deleteProgram=function(program){report.deletes.push({context:id,id:programs.get(program)?.id,at:performance.now()});return remove.call(this,program);};
  return gl;
 };
}
