// QA only: actual GPU state after selected depth draws. Queries may synchronize
// the driver and must never be interpreted as performance evidence.
export function createDepthGpuProbe(world,objectIds){
 if(!Array.isArray(objectIds)||!objectIds.length||objectIds.length>8||objectIds.some(id=>typeof id!=='string'||!id))throw Error('Invalid GPU probe selection');
 const selected=new Set(objectIds),renderer=world.renderer,gl=renderer.getContext(),ids=new WeakMap(),programs=[];let serial=0;
 const id=object=>{if(!object)return null;if(!ids.has(object))ids.set(object,++serial);return ids.get(object);};
 const value=v=>ArrayBuffer.isView(v)?Array.from(v):v;
 const samplerTypes=new Map([[gl.SAMPLER_2D,gl.TEXTURE_2D],[gl.SAMPLER_CUBE,gl.TEXTURE_CUBE_MAP],[gl.SAMPLER_2D_SHADOW,gl.TEXTURE_2D],[gl.INT_SAMPLER_2D,gl.TEXTURE_2D],[gl.UNSIGNED_INT_SAMPLER_2D,gl.TEXTURE_2D]]);
 function snapshot(){
  const program=gl.getParameter(gl.CURRENT_PROGRAM),programId=id(program);
  if(!program)throw Error('Depth GPU draw has no current program');
  if(!programs.some(p=>p.id===programId)){
   const attributes=[];for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);i++){
    const info=gl.getActiveAttrib(program,i);attributes.push({name:info.name,type:info.type,size:info.size,location:gl.getAttribLocation(program,info.name)});
   }
   programs.push({id:programId,attributes,shaders:gl.getAttachedShaders(program).map(shader=>({type:gl.getShaderParameter(shader,gl.SHADER_TYPE),source:gl.getShaderSource(shader)}))});
  }
  const uniforms={},textures={},active=gl.getParameter(gl.ACTIVE_TEXTURE);
  try{
   for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){
    const info=gl.getActiveUniform(program,i),v=value(gl.getUniform(program,gl.getUniformLocation(program,info.name)));
    uniforms[info.name]={type:info.type,size:info.size,value:v};
    const target=samplerTypes.get(info.type);if(target===undefined)continue;
    for(const unit of Array.isArray(v)?v:[v]){
     gl.activeTexture(gl.TEXTURE0+unit);
     const texture=gl.getParameter(target===gl.TEXTURE_2D?gl.TEXTURE_BINDING_2D:gl.TEXTURE_BINDING_CUBE_MAP);
     textures[info.name+':'+unit]={unit,target,id:id(texture),...(texture?{min:gl.getTexParameter(target,gl.TEXTURE_MIN_FILTER),mag:gl.getTexParameter(target,gl.TEXTURE_MAG_FILTER),wrapS:gl.getTexParameter(target,gl.TEXTURE_WRAP_S),wrapT:gl.getTexParameter(target,gl.TEXTURE_WRAP_T)}:{})};
    }
   }
  }finally{gl.activeTexture(active);}
  const attributes=[];
  for(let index=0;index<gl.getParameter(gl.MAX_VERTEX_ATTRIBS);index++){
   const enabled=gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_ENABLED);
   attributes.push({index,enabled,buffer:id(gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)),size:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_STRIDE),divisor:gl.getVertexAttrib(index,gl.VERTEX_ATTRIB_ARRAY_DIVISOR),offset:gl.getVertexAttribOffset(index,gl.VERTEX_ATTRIB_ARRAY_POINTER),...(!enabled?{constant:value(gl.getVertexAttrib(index,gl.CURRENT_VERTEX_ATTRIB))}:{})});
  }
  return {program:programId,uniforms,textures,attributes,indexBuffer:id(gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)),pipeline:{depthTest:gl.isEnabled(gl.DEPTH_TEST),depthFunc:gl.getParameter(gl.DEPTH_FUNC),depthMask:gl.getParameter(gl.DEPTH_WRITEMASK),cull:gl.isEnabled(gl.CULL_FACE),cullMode:gl.getParameter(gl.CULL_FACE_MODE),frontFace:gl.getParameter(gl.FRONT_FACE),blend:gl.isEnabled(gl.BLEND),stencil:gl.isEnabled(gl.STENCIL_TEST),viewport:value(gl.getParameter(gl.VIEWPORT)),colorMask:value(gl.getParameter(gl.COLOR_WRITEMASK))}};
 }
 return {programs,capture(render){
  const original=renderer.renderBufferDirect,rows=[];
  renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
   const result=original.call(this,camera,scene,geometry,material,object,group);
   if(renderer.getRenderTarget()===world.destructionPass.smokeDepth&&selected.has(object.uuid))rows.push({object:object.uuid,geometry:geometry.uuid,material:material.id,type:material.type,group:group?{...group}:null,assetGroup:[...(world.assetGroups?.colors??[])].find(([,entry])=>entry.mesh===object)?.[0]??null,...snapshot()});
   return result;
  };
  try{render();return rows;}finally{renderer.renderBufferDirect=original;}
 }};
}
