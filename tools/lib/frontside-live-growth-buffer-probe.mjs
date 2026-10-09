// QA-only WebGL2 readback at the actual native draw. Never enable in timings.
// This module creates no context and makes no appearance/performance decision.
function fnv(bytes){let value=2166136261;for(const byte of bytes)value=Math.imul(value^byte,16777619)>>>0;return value.toString(16).padStart(8,'0');}
export function installLiveGrowthBufferProbe(renderer,mesh,{limit=64,readbackByteLimit=2*1024*1024,label=()=>null}={}){
 const gl=renderer.getContext();if(typeof gl.getBufferSubData!=='function')throw Error('Growth buffer probe requires WebGL2');
 const names=['drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced'],previous=new Map(),bufferIds=new WeakMap(),records=[],errors=[];
 const oldBefore=mesh.onBeforeRender,oldAfter=mesh.onAfterRender;let active=false,captureArmed=false,closed=false,nextId=1,readBytes=0,skippedLimitDraws=0;
 const token=buffer=>{if(!bufferIds.has(buffer))bufferIds.set(buffer,nextId++);return bufferIds.get(buffer);};
 function audit(){
  if(!active||!captureArmed||closed)return;if(records.length>=limit){skippedLimitDraws++;return;}
  const record={label:label(),mesh:mesh.name,count:mesh.count};records.push(record);
  const cpu=mesh.geometry.getAttribute('iGrowth');if(!cpu?.isInstancedBufferAttribute||!(cpu.array instanceof Float32Array)){record.status='SOURCE_ATTRIBUTE_UNSUPPORTED';return;}
  const program=gl.getParameter(gl.CURRENT_PROGRAM),location=program?gl.getAttribLocation(program,'iGrowth'):-1;
  if(location<0){record.status='ATTRIBUTE_NOT_ACTIVE';return;}
  const buffer=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);if(!buffer){record.status='NO_BOUND_GROWTH_BUFFER';return;}
  record.bufferToken=token(buffer);record.isBuffer=gl.isBuffer(buffer);record.cpuVersion=cpu.version;
  record.layout={location,size:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_STRIDE),offset:gl.getVertexAttribOffset(location,gl.VERTEX_ATTRIB_ARRAY_POINTER),divisor:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_DIVISOR),enabled:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_ENABLED)};
  // Three r180 uses an explicit16-byte stride for this contiguous vec4;
  // WebGL's equivalent implicit stride0 is also supported.
  if(record.layout.size!==4||record.layout.type!==gl.FLOAT||record.layout.normalized||![0,16].includes(record.layout.stride)||record.layout.offset!==0||record.layout.divisor!==1||!record.layout.enabled){record.status='LAYOUT_UNSUPPORTED';return;}
  const bytes=new Uint8Array(cpu.array.buffer,cpu.array.byteOffset,cpu.array.byteLength);record.cpuByteLength=bytes.length;record.cpuFnv32=fnv(bytes);
  if(readBytes+bytes.length>readbackByteLimit){record.status='READBACK_BUDGET_EXHAUSTED';return;}
  const binding=gl.getParameter(gl.ARRAY_BUFFER_BINDING);
  try{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);record.bufferBytes=gl.getBufferParameter(gl.ARRAY_BUFFER,gl.BUFFER_SIZE);if(record.bufferBytes<bytes.length){record.status='BUFFER_TOO_SHORT';return;}const gpu=new Uint8Array(bytes.length);gl.getBufferSubData(gl.ARRAY_BUFFER,0,gpu);readBytes+=gpu.length;record.gpuFnv32=fnv(gpu);let changedBytes=0;for(let i=0;i<gpu.length;i++)changedBytes+=gpu[i]!==bytes[i];record.changedBytes=changedBytes;record.status=changedBytes?'BOUND_GPU_BYTES_DIFFER':'BOUND_GPU_BYTES_MATCH_CPU';}
  finally{gl.bindBuffer(gl.ARRAY_BUFFER,binding);}
 }
 mesh.onBeforeRender=function(...args){oldBefore?.apply(this,args);active=true;};
 mesh.onAfterRender=function(...args){active=false;return oldAfter?.apply(this,args);};
 for(const name of names){if(typeof gl[name]!=='function')continue;const original=gl[name];previous.set(name,original);gl[name]=function(...args){try{audit();}catch(error){errors.push({method:name,message:String(error)});}return original.apply(this,args);};}
 return{
  capture(enabled){if(closed)throw Error('Closed growth buffer probe');captureArmed=Boolean(enabled);},
  snapshot(){return{status:'LIVE_GROWTH_BUFFER_PROBE_NOT_VISUAL_OR_GPU_TIMING_APPROVAL',closed,captureArmed,readBytes,limit,readbackByteLimit,skippedLimitDraws,records:records.map(r=>({...r,layout:r.layout?{...r.layout}:undefined})),errors:errors.slice(),limitations:['Synchronous binding queries/readback intentionally perturb execution; no timing result may use this probe.','Buffer tokens identify GL objects within this context only, not physical VRAM or cross-context identity.','Only iGrowth bytes/layout at selected mesh draw are observed; other attributes, textures and shader results are outside scope.']};},
  dispose(){if(closed)return;active=false;closed=true;mesh.onBeforeRender=oldBefore;mesh.onAfterRender=oldAfter;for(const [name,original] of previous)gl[name]=original;}
 };
}
