import {waitLoadingGpuFence} from './wait-loading-gpu-fence.js';

// QA only. Register the existing Assets-owned maize Texture objects with the
// renderer before disposing their local diorama copies. Matching Source/sampler
// keys may share native storage; no pixel or Texture copy is created here.
// This deliberately retains residency in an empty farm and needs resource and
// first-use measurements before any production adoption.
export async function retainLoadingMaizeTextures(world,diorama,{fence=waitLoadingGpuFence}={}) {
 const renderer=world.renderer,gl=renderer.getContext(),epoch=world.glResourceEpoch?.stats.epoch??0;
 const check=()=>{if(world.disposed||diorama.disposed||world.loading.signal.aborted||diorama.abort.signal.aborted||renderer.getContext()!==gl||gl.isContextLost()||(world.glResourceEpoch?.stats.epoch??0)!==epoch)throw Error('Maize texture retention cancelled');};
 check();const originals=new Map([...diorama.textureOwner.copies].map(([original,copy])=>[copy,original])),textures=new Set();
 diorama.scene.traverse(mesh=>{if(!mesh.isInstancedMesh)return;for(const material of [mesh.material].flat())for(const key of ['map','normalMap']){const copy=material?.[key];if(!copy)continue;const original=originals.get(copy);if(!original||copy.source!==original.source)throw Error('Missing original maize texture owner');textures.add(original);}});
 if(!textures.size)throw Error('No prepared maize textures');
 const retained=[];
 for(const texture of textures){check();renderer.initTexture(texture);check();retained.push({texture:texture.uuid,source:texture.source.uuid,width:texture.image?.width??0,height:texture.image?.height??0});}
 await fence(renderer,{signal:world.loading.signal,cancelled:()=>world.disposed||diorama.disposed,getEpoch:()=>world.glResourceEpoch?.stats.epoch??0});check();
 return {textures:retained,scope:'QA residency only; existing Assets-owned samplers, no clone/draw or geometry upload. Peak and retained-memory validation pending.'};
}
