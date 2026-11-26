const resourceKey='__remoteGpuId';

export function captureRemoteRecoveryPose(backend,meshes,camera,render){
 const original=backend.draw;
 let witness=null;
 backend.draw=function(object,...args){
  const result=original.call(this,object,...args);
  const references=object.camera===camera&&meshes.get(object.object);
  if(witness||!references)return result;
  for(const group of object.getBindings())for(const binding of group.bindings){
   if(!binding.isNodeUniformsGroup)continue;
   const phase=binding.uniforms.find(value=>value.nodeUniform?.node===references.phaseOffset.node);
   const weight=binding.uniforms.find(value=>value.nodeUniform?.node===references.clockWeight.node);
   const id=this.get(binding).buffer?.[resourceKey];
   if(phase?.itemSize===1&&weight?.itemSize===1&&typeof id==='string'){
    witness={id,phaseOffset:phase.offset*4,weightOffset:weight.offset*4};return result;
   }
  }
  return result;
 };
 try{return {rendered:render(),witness};}finally{backend.draw=original;}
}

// Read the exact retained uniform generation used by a populated render draw.
// A writeBuffer, a texture job or an unused bind group cannot attest the pose.
export function submittedRecoveryPose(op,snapshot,value,phase){
 const {id,phaseOffset,weightOffset}=value??{},buffer=snapshot.get(id);
 if(!buffer?.uniformShadow||phaseOffset===weightOffset||
    ![phaseOffset,weightOffset].every(offset=>Number.isSafeInteger(offset)&&offset>=0&&offset%4===0&&offset+4<=buffer.uniformShadow.length))return null;
 const bytes=new DataView(buffer.uniformShadow.buffer,buffer.uniformShadow.byteOffset,buffer.uniformShadow.byteLength);
 if(bytes.getFloat32(phaseOffset,true)!==phase||bytes.getFloat32(weightOffset,true)!==0)return null;
 for(const commandBuffer of op.args[0]){
  if(commandBuffer.texturePreparation)continue;
  for(const pass of commandBuffer.__remoteCommands){
   if(pass.method!=='beginRenderPass'||!pass.args[0]?.colorAttachments?.some(Boolean))continue;
   const bound=new Map();
   for(const {method,args} of pass.commands){
    if(method==='setBindGroup'){
     const group=snapshot.get(args[1]?.[resourceKey]);
     const usesBuffer=group?.kind==='createBindGroup'&&(!args[2]||args[2].every(offset=>offset===0))&&
       group.dependencyEntries.get(id)===buffer&&group.descriptor.entries.some(({resource})=>{
        const begin=resource.offset??0,end=begin+(resource.size??buffer.uniformShadow.length-begin);
        return resource.buffer?.[resourceKey]===id&&[phaseOffset,weightOffset].every(offset=>offset>=begin&&offset+4<=end);
       });
     bound.set(args[0],usesBuffer);
    }else if((method==='draw'||method==='drawIndexed')&&args[0]>0&&(args[1]??1)>0&&[...bound.values()].some(Boolean)){
     return {phase,weight:0};
    }else if(method==='executeBundles')bound.clear();
   }
  }
 }
 return null;
}
