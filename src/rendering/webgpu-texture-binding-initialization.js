// Three r180 clones NodeBuilderState binding templates before initializing a
// new render object. Sampler's dispose listener can have cleared a template's
// texture after an immutable palette generation was retired. _init() otherwise
// uploads that null texture before NodeSampledTexture.update() can repair it.
//
// Renderer._createObjectPipeline / _renderObject update object nodes BEFORE
// Bindings.updateForRender. Resolve only the new group's direct node bindings
// here, from those already selected object values. Existing groups, graph keys
// and the drawing worker are untouched; no graph discovery occurs per frame.
const installation=Symbol('wgTextureBindingInitialization');

export function installWebGpuTextureBindingInitialization(renderer){
 const bindings=renderer?._bindings;
 if(renderer?.backend?.isWebGPUBackend!==true||typeof bindings?._init!=='function'||typeof bindings?.getForRender!=='function'||typeof bindings?.textures?.updateTexture!=='function')throw TypeError('Texture binding initialization requires initialized Three WebGPU Bindings');
 if(bindings[installation])return bindings[installation];
 const original=bindings._init;let disposed=false;
 function initialize(group){
  if(disposed)return original.call(this,group);
  if(!Array.isArray(group?.bindings))throw TypeError('Unexpected Three bind group layout');
  for(const binding of group.bindings){
   if(!binding.isSampler||!binding.textureNode)continue;
   if(binding.textureNode.isTextureNode!==true||typeof binding.update!=='function'||binding.textureNode.value?.isTexture!==true)throw TypeError('Node texture binding has no current object texture');
   // Both NodeSampler and NodeSampledTexture implement the same direct
   // resource selection, but update() also handles generation bookkeeping.
   binding.update();
   if(binding.texture!==binding.textureNode.value)throw Error('Three node texture binding did not select its current texture');
  }
  return original.call(this,group);
 }
 const handle={dispose(){if(disposed)return;disposed=true;if(bindings._init===initialize)bindings._init=original;if(bindings[installation]===handle)delete bindings[installation];}};
 Object.defineProperty(bindings,installation,{value:handle,configurable:true});bindings._init=initialize;return handle;
}
