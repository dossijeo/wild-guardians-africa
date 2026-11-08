// QA-only: record actual misses in Three's node-builder cache. Wrapping the
// existing method preserves its arguments and result; the measurement adds
// overhead and cannot be used as an uninstrumented frametime comparison.
export function instrumentNodeBuilders(source){
 const anchor="await renderer.init();checkBootstrap();if(!renderer.backend?.isWebGPUBackend)";
 const injection=`await renderer.init();
 {const nodes=renderer._nodes,original=nodes?.getForRender;if(typeof original!=='function'||!(nodes.nodeBuilderCache instanceof Map))throw Error('Node diagnostics unavailable');
  const rows=[];globalThis.qaNodeBuilds=rows;nodes.getForRender=function(object){const data=this.get(object),cold=data.nodeBuilderState===undefined,key=cold?this.getForRenderCacheKey(object):null,miss=cold&&!this.nodeBuilderCache.has(key);if(!miss)return original.apply(this,arguments);
   const started=performance.now(),mesh=object.object,material=object.material,path=[];for(let p=mesh;p&&path.length<5;p=p.parent)path.push(p.name||p.type);
   const materialKey=object.getMaterialCacheKey?.(),dynamicKey=object.getDynamicCacheKey?.();
   try{return original.apply(this,arguments);}finally{if(rows.length<2000)rows.push({at:performance.timeOrigin+started,ms:performance.now()-started,phase:renderer._compilationPromises===null?'draw':'compile',material:material?.name||material?.type,materialId:material?.uuid??null,materialType:material?.type,positionNodeId:material?.positionNode?.id??null,colorNodeId:material?.colorNode?.id??null,outputNodeId:material?.outputNode?.id??null,shadow:material?.isShadowPassMaterial===true,object:mesh?.name||mesh?.type,objectId:mesh?.uuid??null,geometryId:mesh?.geometry?.uuid??null,sceneId:object.scene?.uuid??null,contextId:object.context?.id??null,lightId:object.lightsNode?.id??null,lights:(object.lightsNode?.getLights?.()??[]).map(light=>({id:light.id,type:light.type,castShadow:light.castShadow})),materialKey,dynamicKey,path,skinned:!!mesh?.isSkinnedMesh,instanced:!!mesh?.isInstancedMesh,bones:mesh?.skeleton?.bones?.length??null,slot:mesh?.userData?.nativePropSlot??null,cacheKey:key});}}
 }checkBootstrap();if(!renderer.backend?.isWebGPUBackend)`;
 if(source.split(anchor).length!==2)throw Error('Node diagnostics anchor missing');return source.replace(anchor,injection);
}
