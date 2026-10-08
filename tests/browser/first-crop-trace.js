// Opt-in QA attribution only; forwards each native call once, adds no GL queries.
export class FirstCropTrace {
 constructor(renderer,{now=()=>performance.now(),threshold=5,limit=128}={}){
  this.report={scope:'Opt-in CPU call attribution, not GPU duration. No additional GL queries; wrapper overhead means this is not an acceptance timing run.',calls:[]};this.restores=[];this.disposed=false;
  const wrap=(owner,name,metadata=()=>({}))=>{const original=owner[name];if(typeof original!=='function')return;const self=this;const replacement=function(...args){const start=now();try{return original.apply(this,args);}finally{const duration=now()-start;if(duration>=threshold&&self.report.calls.length<limit)self.report.calls.push({method:name,cpuMs:duration,...metadata(args)});}};owner[name]=replacement;this.restores.push(()=>{if(owner[name]===replacement)owner[name]=original;});};
  const imageInfo=image=>({width:image?.width,height:image?.height,imageType:image?.constructor?.name});
  const uploadInfo=(name,args)=>{const image=name==='texSubImage2D'?(args.length===7?args[6]:args[8]):name==='texImage2D'?(args.length===6?args[5]:args[8]):undefined;return {target:args[0],level:args[1],...(typeof image==='object'&&!ArrayBuffer.isView(image)?imageInfo(image):{width:args[name==='texSubImage2D'?4:3],height:args[name==='texSubImage2D'?5:4],imageType:image?.constructor?.name})};};
  const gl=renderer.getContext();for(const name of ['getProgramInfoLog','getShaderInfoLog','getProgramParameter','getShaderParameter','getUniformLocation','getAttribLocation','compileShader','linkProgram','texStorage2D','texStorage3D','texImage2D','texSubImage2D','bufferData','bufferSubData','clientWaitSync'])wrap(gl,name,args=>['texImage2D','texSubImage2D'].includes(name)?uploadInfo(name,args):['getProgramParameter','getShaderParameter'].includes(name)?{parameter:args[1]}:{});
  wrap(renderer,'renderBufferDirect',args=>({object:args[4]?.name,objectType:args[4]?.type,material:args[3]?.name,materialType:args[3]?.type,recipe:args[3]?.customProgramCacheKey?.()?.slice(0,500),programCacheKey:renderer.properties?.get(args[3])?.currentProgram?.cacheKey,map:args[3]?.map?{uuid:args[3].map.uuid,sourceId:args[3].map.source?.id,...imageInfo(args[3].map.image)}:undefined}));
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const restore of this.restores.reverse())restore();this.restores.length=0;}
}
