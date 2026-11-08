// Symbol metadata is intentionally non-enumerable: it must not alter TSL graph
// structure/cache keys. Registration occurs when a physical binding is updated,
// never by discovering graph nodes during replay.
const clockMetadata=Symbol.for('wild-guardians.remote-clock');
export function markRemoteClockNode(node,semantic,epoch){
 if(!node?.isNode||!['absolute','relative'].includes(semantic)||!Number.isFinite(epoch)||epoch<0)throw TypeError('Invalid remote clock node');
 Object.defineProperty(node,clockMetadata,{value:Object.freeze({semantic,epoch}),enumerable:false});
 return node;
}
export function installRemoteClockBindings(renderer,remote){
 const backend=renderer?.backend;
 if(typeof backend?.updateBinding!=='function'||typeof backend.get!=='function'||typeof remote?.registerClockBinding!=='function')throw TypeError('Invalid remote clock binding adapter');
 const original=backend.updateBinding,registered=new WeakMap();let disposed=false;
 function updateBinding(binding){
  const result=original.call(this,binding);
  if(disposed||!binding?.isNodeUniformsGroup)return result;
  const buffer=this.get(binding).buffer;
  if(!buffer||registered.get(binding)===buffer)return result;
  for(const uniform of binding.uniforms){
   const metadata=uniform.nodeUniform?.node?.[clockMetadata];
   if(!metadata)continue;
   if(!Number.isSafeInteger(uniform.offset)||uniform.offset<0||uniform.itemSize!==1)throw Error('Invalid remote clock uniform layout');
   remote.registerClockBinding(buffer,{byteOffset:uniform.offset*4,...metadata});
  }
  registered.set(binding,buffer);
  return result;
 }
 backend.updateBinding=updateBinding;
 return {dispose(){if(disposed)return;disposed=true;if(backend.updateBinding===updateBinding)backend.updateBinding=original;}};
}
