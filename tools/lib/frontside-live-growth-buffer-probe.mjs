// QA-only WebGL2 readback at the actual native draw. Never enable in timings.
// This module creates no context and makes no appearance/performance decision.
function fnv(bytes){let value=2166136261;for(const byte of bytes)value=Math.imul(value^byte,16777619)>>>0;return value.toString(16).padStart(8,'0');}
export function installLiveGrowthBufferProbe(renderer,mesh,{limit=64,readbackByteLimit=2*1024*1024,label=()=>null}={}){
 const gl=renderer.getContext();if(typeof gl.getBufferSubData!=='function')throw Error('Growth buffer probe requires WebGL2');
 const names=['drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced'],previous=new Map(),bufferIds=new WeakMap(),records=[],errors=[];
 const oldBefore=mesh.onBeforeRender,oldAfter=mesh.onAfterRender;let active=false,captureArmed=false,closed=false,nextId=1,readBytes=0,skippedLimitDraws=0,drawContext=null;
 const objectIds=new WeakMap();let nextObjectId=1;
 const objectToken=object=>{if(!object)return null;if(!objectIds.has(object))objectIds.set(object,nextObjectId++);return objectIds.get(object);};
 const token=buffer=>{if(!bufferIds.has(buffer))bufferIds.set(buffer,nextId++);return bufferIds.get(buffer);};
 function audit(){
  if(!active||!captureArmed||closed)return;if(records.length>=limit){skippedLimitDraws++;return;}
  const record={label:label(),mesh:mesh.name,count:mesh.count,drawContext:drawContext?{...drawContext}:null};records.push(record);
  const cpu=mesh.geometry.getAttribute('iGrowth');if(!cpu?.isInstancedBufferAttribute||!(cpu.array instanceof Float32Array)){record.status='SOURCE_ATTRIBUTE_UNSUPPORTED';return;}
  const program=gl.getParameter(gl.CURRENT_PROGRAM),location=program?gl.getAttribLocation(program,'iGrowth'):-1;
  record.programToken=objectToken(program);record.framebufferToken=gl.FRAMEBUFFER_BINDING===undefined?null:objectToken(gl.getParameter(gl.FRAMEBUFFER_BINDING));record.rendererFrameAtDraw=renderer.info?.render?.frame??null;
  if(location<0){record.status='ATTRIBUTE_NOT_ACTIVE';return;}
  const buffer=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);if(!buffer){record.status='NO_BOUND_GROWTH_BUFFER';return;}
  record.bufferToken=token(buffer);record.isBuffer=gl.isBuffer(buffer);record.cpuVersion=cpu.version;
  record.layout={location,size:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_STRIDE),offset:gl.getVertexAttribOffset(location,gl.VERTEX_ATTRIB_ARRAY_POINTER),divisor:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_DIVISOR),enabled:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_ENABLED)};
  // Three r180 uses an explicit16-byte stride for this contiguous vec4;
  // WebGL's equivalent implicit stride0 is also supported.
  if(record.layout.size!==4||record.layout.type!==gl.FLOAT||record.layout.normalized||![0,16].includes(record.layout.stride)||record.layout.offset!==0||record.layout.divisor!==1||!record.layout.enabled){record.status='LAYOUT_UNSUPPORTED';return;}
  const bytes=new Uint8Array(cpu.array.buffer,cpu.array.byteOffset,cpu.array.byteLength);record.cpuByteLength=bytes.length;record.cpuFnv32=fnv(bytes);record.activeByteLength=Math.min(bytes.length,mesh.count*cpu.itemSize*Float32Array.BYTES_PER_ELEMENT);
  if(readBytes+bytes.length>readbackByteLimit){record.status='READBACK_BUDGET_EXHAUSTED';return;}
  const binding=gl.getParameter(gl.ARRAY_BUFFER_BINDING);
  try{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);record.bufferBytes=gl.getBufferParameter(gl.ARRAY_BUFFER,gl.BUFFER_SIZE);if(record.bufferBytes<bytes.length){record.status='BUFFER_TOO_SHORT';return;}const gpu=new Uint8Array(bytes.length);gl.getBufferSubData(gl.ARRAY_BUFFER,0,gpu);readBytes+=gpu.length;record.gpuFnv32=fnv(gpu);let changedBytes=0,activeChangedBytes=0;const changedOffsets=[],lanes=new Set();for(let i=0;i<gpu.length;i++)if(gpu[i]!==bytes[i]){changedBytes++;if(i<record.activeByteLength)activeChangedBytes++;if(changedOffsets.length<32)changedOffsets.push(i);if(lanes.size<16)lanes.add(Math.floor(i/4));}record.changedBytes=changedBytes;record.activeChangedBytes=activeChangedBytes;record.unusedCapacityChangedBytes=changedBytes-activeChangedBytes;record.changedByteOffsetsFirst32=changedOffsets;const gpuFloats=new Float32Array(gpu.buffer);record.changedFloatLanesFirst16=[...lanes].map(index=>({index,instance:Math.floor(index/cpu.itemSize),component:index%cpu.itemSize,active:index*4<record.activeByteLength,cpu: Number.isFinite(cpu.array[index])?cpu.array[index]:String(cpu.array[index]),gpu:Number.isFinite(gpuFloats[index])?gpuFloats[index]:String(gpuFloats[index])}));record.status=changedBytes?'BOUND_GPU_BYTES_DIFFER':'BOUND_GPU_BYTES_MATCH_CPU';}
  finally{gl.bindBuffer(gl.ARRAY_BUFFER,binding);}
 }
 mesh.onBeforeRender=function(...args){oldBefore?.apply(this,args);const material=args[4],group=args[5],target=renderer.getRenderTarget?.();drawContext={callback:'onBeforeRender',renderTargetToken:objectToken(target),renderTargetUuid:target?.uuid??null,renderTargetName:target?.texture?.name??null,materialType:material?.type??null,materialUuid:material?.uuid??null,materialSide:material?.side??null,groupStart:group?.start??null,groupCount:group?.count??null,groupMaterialIndex:group?.materialIndex??null,rendererFrameAtCallback:renderer.info?.render?.frame??null,shadowMapEnabled:renderer.shadowMap?.enabled??null};active=true;};
 mesh.onAfterRender=function(...args){active=false;return oldAfter?.apply(this,args);};
 for(const name of names){if(typeof gl[name]!=='function')continue;const original=gl[name];previous.set(name,original);gl[name]=function(...args){try{audit();}catch(error){errors.push({method:name,message:String(error)});}return original.apply(this,args);};}
 return{
  capture(enabled){if(closed)throw Error('Closed growth buffer probe');captureArmed=Boolean(enabled);},
  snapshot(){return{status:'LIVE_GROWTH_BUFFER_PROBE_NOT_VISUAL_OR_GPU_TIMING_APPROVAL',closed,captureArmed,readBytes,limit,readbackByteLimit,skippedLimitDraws,records:records.map(r=>({...r,layout:r.layout?{...r.layout}:undefined})),errors:errors.slice(),limitations:['Synchronous binding queries/readback intentionally perturb execution; no timing result may use this probe.','Buffer/program/target tokens identify objects within this context only, not physical VRAM or cross-context identity.','Draw context reports actual onBeforeRender material and target; onBeforeShadow is not instrumented and shadow draws are not claimed.','Only iGrowth bytes/layout at selected mesh draw are observed; other attributes, textures and shader results are outside scope.','Changed byte offsets are bounded to the first 32 and float lanes to the first 16; full mismatch counts remain recorded.']};},
  dispose(){if(closed)return;active=false;closed=true;mesh.onBeforeRender=oldBefore;mesh.onAfterRender=oldAfter;for(const [name,original] of previous)gl[name]=original;}
 };
}
