// QA-only synchronous-call attribution. No GPU timing or additional GL queries.
export function installLoadingGlTrace() {
 const original=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();
 const rows=globalThis.qaLoadingGlCalls=[];
 const names=['getParameter','getProgramParameter','getProgramInfoLog','getShaderParameter','getShaderInfoLog','getActiveUniform','getUniformLocation','getActiveAttrib','getAttribLocation','compileShader','linkProgram','texImage2D','texSubImage2D','texStorage2D','generateMipmap','bufferData','bufferSubData','drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced','readPixels','finish','clientWaitSync'];
 HTMLCanvasElement.prototype.getContext=function(...args){
  const gl=original.apply(this,args);
  if(!gl||!String(args[0]).startsWith('webgl')||seen.has(gl))return gl;
  seen.add(gl);
  for(const name of names){
   const call=gl[name];if(typeof call!=='function')continue;
   gl[name]=function(...parameters){
    const start=performance.now();
    try{return call.apply(this,parameters);}
    finally{const ms=performance.now()-start;if(ms>=5&&rows.length<2000)rows.push({name,start,ms,stack:new Error().stack});}
   };
  }
  return gl;
 };
}
