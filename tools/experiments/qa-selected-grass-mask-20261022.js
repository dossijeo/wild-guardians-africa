import * as THREE from 'three';
const size=97,step=.5,radius=.4;
// QA only: rasterize accepted, capacity-limited draw anchors, never Engine records.
export function syncSelectedGrassMask(world,q,bins){
 const start=performance.now();q.selectedMasks??=new Map();let uploads=0,bytes=0;
 for(const [key,e]of q.selectedMasks)if(!world.chunks.has(key)){e.texture.dispose();q.selectedMasks.delete(key);}
 for(const [key,g]of world.chunks){
  const uniform=g.children.find(m=>m.userData.ground)?.material.userData.biomeGround?.uQaCoverageMask;if(!uniform)continue;
  let e=q.selectedMasks.get(key);if(!e){const [cx,cz]=key.split(',').map(Number),data=new Uint8Array(size*size),texture=new THREE.DataTexture(data,size,size,THREE.RedFormat);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.unpackAlignment=1;texture.needsUpdate=true;e={texture,data,scratch:new Uint8Array(data.length),x:cx*48-24,z:cz*48-24,uniform,fallback:uniform.value};q.selectedMasks.set(key,e);}
  e.scratch.fill(0);uniform.value=e.texture;
 }
 for(let b=0;b<bins.length;b++)for(let pi=0;pi<Math.min(bins[b].length,q.meshes[b].capacity);pi++){const p=bins[b][pi];
  if(p[3]<.05)continue;
  for(let cx=Math.floor((p[0]-radius+24)/48);cx<=Math.floor((p[0]+radius+24)/48);cx++)for(let cz=Math.floor((p[2]-radius+24)/48);cz<=Math.floor((p[2]+radius+24)/48);cz++){
   const e=q.selectedMasks.get(cx+','+cz);if(!e)continue;
   for(let x=Math.max(0,Math.ceil((p[0]-radius-e.x)/step));x<=Math.min(size-1,Math.floor((p[0]+radius-e.x)/step));x++)for(let z=Math.max(0,Math.ceil((p[2]-radius-e.z)/step));z<=Math.min(size-1,Math.floor((p[2]+radius-e.z)/step));z++){
    const d=Math.hypot(e.x+x*step-p[0],e.z+z*step-p[2]);if(d<=radius)e.scratch[z*size+x]=Math.max(e.scratch[z*size+x],Math.round(255*(1-d/radius)));
   }
  }
 }
 for(const e of q.selectedMasks.values()){let changed=false;for(let i=0;i<e.data.length;i++)if(e.data[i]!==e.scratch[i]){changed=true;break;}if(changed){e.data.set(e.scratch);e.texture.needsUpdate=true;uploads++;bytes+=e.data.length;}}
 const prior=q.selectedMaskStats??{};q.selectedMaskStats={updates:(prior.updates??0)+1,cpuMs:(prior.cpuMs??0)+performance.now()-start,uploads:(prior.uploads??0)+uploads,uploadBytes:(prior.uploadBytes??0)+bytes,residentBytes:q.selectedMasks.size*size*size,meshes:q.selectedMasks.size};
}
export function disposeSelectedGrassMask(q){for(const e of q.selectedMasks?.values()??[]){e.uniform.value=e.fallback;e.texture.dispose();}q.selectedMasks?.clear();}
