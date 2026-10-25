import * as THREE from 'three';
const size=97,step=.5,radius=.4;
// Cached immutable anchor footprints; WeakMap entries expire with invalidated tile anchors.
// QA only: rasterize accepted, capacity-limited draw anchors, never Engine records.
export function syncSelectedGrassMask(world,q,bins){
 const start=performance.now();q.selectedMasks??=new Map();q.stampCache??=new WeakMap();let uploads=0,bytes=0,rebuilt=0,skipped=0;
 for(const [key,e]of q.selectedMasks)if(!world.chunks.has(key)){e.texture.dispose();q.selectedMasks.delete(key);}
 for(const [key,g]of world.chunks){
  const uniform=g.children.find(m=>m.userData.ground)?.material.userData.biomeGround?.uQaCoverageMask;if(!uniform)continue;
  let e=q.selectedMasks.get(key);if(!e){const [cx,cz]=key.split(',').map(Number),data=new Uint8Array(size*size),texture=new THREE.DataTexture(data,size,size,THREE.RedFormat);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.unpackAlignment=1;texture.needsUpdate=true;e={texture,data,scratch:new Uint8Array(data.length),x:cx*48-24,z:cz*48-24,uniform,fallback:uniform.value,members:new Set(),nextMembers:new Set()};q.selectedMasks.set(key,e);}
  e.nextMembers.clear();e.uniform=uniform;uniform.value=e.texture;
 }
 for(let b=0;b<bins.length;b++)for(let pi=0;pi<Math.min(bins[b].length,q.meshes[b].capacity);pi++){const p=bins[b][pi];
  if(p[3]<.05)continue;
  let stamps=q.stampCache.get(p);
  if(!stamps){stamps=[];
   for(let cx=Math.floor((p[0]-radius+24)/48);cx<=Math.floor((p[0]+radius+24)/48);cx++)for(let cz=Math.floor((p[2]-radius+24)/48);cz<=Math.floor((p[2]+radius+24)/48);cz++){
    const ox=cx*48-24,oz=cz*48-24,key=cx+','+cz,values=[];
    for(let x=Math.max(0,Math.ceil((p[0]-radius-ox)/step));x<=Math.min(size-1,Math.floor((p[0]+radius-ox)/step));x++)for(let z=Math.max(0,Math.ceil((p[2]-radius-oz)/step));z<=Math.min(size-1,Math.floor((p[2]+radius-oz)/step));z++){
     const d=Math.hypot(ox+x*step-p[0],oz+z*step-p[2]);if(d<=radius)values.push(z*size+x,Math.round(255*(1-d/radius)));
    }stamps.push({key,values});
   }q.stampCache.set(p,stamps);
  }
  for(const stamp of stamps){const e=q.selectedMasks.get(stamp.key);if(!e)continue;e.nextMembers.add(stamp);}

 }
 for(const e of q.selectedMasks.values()){
  let same=e.members.size===e.nextMembers.size;if(same)for(const stamp of e.nextMembers)if(!e.members.has(stamp)){same=false;break;}
  if(same){skipped++;continue;}rebuilt++;
  e.scratch.fill(0);for(const stamp of e.nextMembers){const v=stamp.values;for(let i=0;i<v.length;i+=2)e.scratch[v[i]]=Math.max(e.scratch[v[i]],v[i+1]);}
  const old=e.members;e.members=e.nextMembers;e.nextMembers=old;
  let changed=false;for(let i=0;i<e.data.length;i++)if(e.data[i]!==e.scratch[i]){changed=true;break;}if(changed){e.data.set(e.scratch);e.texture.needsUpdate=true;uploads++;bytes+=e.data.length;}}
 const prior=q.selectedMaskStats??{};q.selectedMaskStats={updates:(prior.updates??0)+1,rebuilt:(prior.rebuilt??0)+rebuilt,skipped:(prior.skipped??0)+skipped,cpuMs:(prior.cpuMs??0)+performance.now()-start,uploads:(prior.uploads??0)+uploads,uploadBytes:(prior.uploadBytes??0)+bytes,residentBytes:q.selectedMasks.size*size*size,meshes:q.selectedMasks.size};
}
export function disposeSelectedGrassMask(q){for(const e of q.selectedMasks?.values()??[]){e.uniform.value=e.fallback;e.texture.dispose();}q.selectedMasks?.clear();q.stampCache=null;}
