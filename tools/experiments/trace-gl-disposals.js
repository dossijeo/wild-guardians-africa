// QA-only. Keep GL faults observable by the original consumers while recording
// which disposal call first produced them. Never enable this in a benchmark.
export function traceGlDisposals(gl,{limit=64,onError=()=>{}}={}){
 const getError=gl.getError,queued=[],records=[],originals=new Map();let closed=false,dropped=0;
 const record=(method,phase,code)=>{const row={method,phase,code,hex:'0x'+code.toString(16),stack:new Error().stack};if(records.length<limit)records.push(row);else dropped++;if(code!==gl.CONTEXT_LOST_WEBGL)onError('GL disposal '+method+' '+phase+' '+row.hex);};
 const preserve=(method,phase,code)=>{if(code===gl.NO_ERROR)return;queued.push(code);record(method,phase,code);};
 const proxyError=function(){return queued.length?queued.shift():getError.call(gl);};gl.getError=proxyError;
 for(const name of ['deleteBuffer','deleteVertexArray','deleteTexture','deleteProgram','deleteSync','deleteFramebuffer','deleteRenderbuffer','deleteShader']){
  if(typeof gl[name]!=='function')continue;const original=gl[name];
  const proxy=function(...args){preserve(name,'prior',getError.call(gl));const result=original.apply(gl,args);preserve(name,'after',getError.call(gl));return result;};
  originals.set(name,{original,proxy});gl[name]=proxy;
 }
 const restored=()=>{queued.length=0;};gl.canvas?.addEventListener?.('webglcontextrestored',restored);
 return {report:()=>({records:[...records],dropped,pendingErrors:queued.length}),dispose(){if(closed)return;closed=true;gl.canvas?.removeEventListener?.('webglcontextrestored',restored);for(const [name,{original,proxy}]of originals)if(gl[name]===proxy)gl[name]=original;if(gl.getError===proxyError)gl.getError=getError;queued.length=0;}};
}
