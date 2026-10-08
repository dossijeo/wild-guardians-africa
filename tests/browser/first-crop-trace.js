// Opt-in QA attribution only; forwards each native call once, adds no GL queries.
export class FirstCropTrace {
 constructor(renderer,{now=()=>performance.now(),threshold=5,limit=128}={}){
  this.report={scope:'Opt-in CPU call attribution, not GPU duration. No additional GL queries; wrapper overhead means this is not an acceptance timing run.',calls:[]};this.restores=[];this.disposed=false;
  const wrap=(owner,name,metadata=()=>({}))=>{const original=owner[name];if(typeof original!=='function')return;const self=this;const replacement=function(...args){const start=now();try{return original.apply(this,args);}finally{const duration=now()-start;if(duration>=threshold&&self.report.calls.length<limit)self.report.calls.push({method:name,cpuMs:duration,...metadata(args)});}};owner[name]=replacement;this.restores.push(()=>{if(owner[name]===replacement)owner[name]=original;});};
  const gl=renderer.getContext();for(const name of ['getProgramInfoLog','getShaderInfoLog','getProgramParameter','getShaderParameter','getUniformLocation','getAttribLocation','compileShader','linkProgram','texStorage2D','texStorage3D','texImage2D','texSubImage2D','bufferData','bufferSubData','clientWaitSync'])wrap(gl,name);
  wrap(renderer,'renderBufferDirect',args=>({object:args[4]?.name,objectType:args[4]?.type,material:args[3]?.name,materialType:args[3]?.type,recipe:args[3]?.customProgramCacheKey?.()?.slice(0,500)}));
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const restore of this.restores.reverse())restore();this.restores.length=0;}
}
