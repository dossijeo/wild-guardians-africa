// Teardown for the retained QA coverage only. Shared ground textures belong to WorldScene.
export function disposeCoverage(world,q,previousHook){
 if(q.disposed)return;
 q.disposed=true;q.enabled=false;q.group.visible=false;
 if(world.scene.onBeforeRender===q.renderHook)world.scene.onBeforeRender=previousHook;
 q.releaseEvents?.();q.releaseEvents=null;world.scene.remove(q.group);
 for(const entry of q.meshes){entry.mesh.geometry.dispose();entry.mesh.material.dispose();}
 q.chunks.clear();q.tiles.clear();q.blockers?.clear();
 if(world.qaContinuousGrass===q)delete world.qaContinuousGrass;
 // The pilot replaced/disposed the prior detail layer when mounted. Keep a safe
 // empty visual layer until another pilot is mounted; this does not recreate it.
 if(world.groundDetails===q)world.groundDetails={enabled:false,count:0,chunks:new Map(),chunk(){},release(){},flush(){},rebuild(){},markDirtyAt(){},dispose(){}};
}
