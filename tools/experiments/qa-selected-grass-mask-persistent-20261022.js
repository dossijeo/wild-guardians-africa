import {syncSelectedGrassMask as raster,disposeSelectedGrassMask as release} from './qa-selected-grass-mask-cached-20261022.js';
// Different semantics: persistent accepted-tile eligibility, not current draw membership.
export function syncSelectedGrassMask(world,q){
 const start=performance.now();
 const p=q.persistentMask??={tiles:new Map(),chunks:new Map(),raster:{meshes:[{capacity:Infinity}]},checks:0,rebuilds:0,cpuMs:0};
 let changed=p.tiles.size!==q.tiles.size||p.chunks.size!==world.chunks.size;
 if(!changed)for(const [key,t]of q.tiles)if(p.tiles.get(key)!==t){changed=true;break;}
 if(!changed)for(const [key,g]of world.chunks)if(p.chunks.get(key)!==g){changed=true;break;}
 if(changed){
  const anchors=[];for(const tile of q.tiles.values())if(world.chunks.has(tile.chunk))for(const anchor of tile.items)anchors.push(anchor);
  // Replaced groups must not retain the old material's mask uniform ownership.
  for(const [key,g]of world.chunks)if(p.chunks.has(key)&&p.chunks.get(key)!==g){const e=p.raster.selectedMasks?.get(key);if(e){if(e.uniform.value===e.texture)e.uniform.value=e.fallback;e.texture.dispose();p.raster.selectedMasks.delete(key);}}
  raster(world,p.raster,[anchors]);p.tiles=new Map(q.tiles);p.chunks=new Map(world.chunks);p.rebuilds++;
 }
 p.checks++;p.cpuMs+=performance.now()-start;
 q.selectedMaskStats={...p.raster.selectedMaskStats,checks:p.checks,rebuilds:p.rebuilds,persistentCpuMs:p.cpuMs};
 if(q.stats.overflow)world.biomeGround.qaCoverageUnderlay.value.x=0;
}
export function disposeSelectedGrassMask(q){if(q.persistentMask)release(q.persistentMask.raster);q.persistentMask=null;}
