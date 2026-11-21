// Compatibility with Three r180, scoped to NativeWall's exclusively owned
// geometries. Its first RenderObject does not list attributes used by later
// materials. r187 retires the geometry's whole attribute inventory instead.
// Unlike r187, r180 caches interleaved views individually but allocates their
// GPU buffer on .data. Remove those cache entries before the normal dispose
// listener runs, and retire each backing once through the existing backend.
// Caller must already hold the owner's deferred GPU retirement boundary.
export function disposeWebGpuWallGeometry(geometry,renderer){
 const attributes=renderer?._attributes,backend=renderer?.backend;
 if(backend?.isWebGPUBackend&&attributes){
  const views=[...Object.values(geometry.attributes),...(geometry.index?[geometry.index]:[])],backings=new Set();
  for(const view of views){attributes.data.delete(view);backings.add(view.isInterleavedBufferAttribute?view.data:view);}
  for(const backing of backings){
   attributes.data.delete(backing);
   if(backend.has(backing)){
    if(backend.get(backing).buffer)backend.destroyAttribute(backing);
    else backend.delete(backing);
   }
  }
 }
 // Keep Three's geometry counts, wireframe retirement and other listeners.
 geometry.dispose();
}
