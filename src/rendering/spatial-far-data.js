import {createSpatialWorld} from '../world/wild-engine/spatial-world.js';
import {validateSpatialTerrainState} from '../world/wild-engine/spatial-state.js';

// Worker-owned visual replica. Never expand gameplay residency or navigation.
export function createFarSpatialReplica(module,terrain){
 validateSpatialTerrainState(terrain);
 const core=createSpatialWorld(module);
 core.generate(terrain.seed,0,0,terrain.biome,terrain);
 terrain.settlements.forEach((s,i)=>{if(i===0)core.setSettlement(s.x,s.z,s.hx,s.hz);else core.addSettlement(s.x,s.z,s.hx,s.hz);});
 core.removeChunk(0,0);
 return core;
}

export function collectSpatialFarTrees(core,bounds,{slots=[0,1,2,3],suppressed=[]}={}){
 if(![bounds?.minX,bounds?.maxX,bounds?.minZ,bounds?.maxZ].every(Number.isFinite)||bounds.minX>=bounds.maxX||bounds.minZ>=bounds.maxZ)throw TypeError('Invalid far spatial bounds');
 const minX=Math.floor((bounds.minX+24)/48),maxX=Math.floor((bounds.maxX+24-1e-9)/48),minZ=Math.floor((bounds.minZ+24)/48),maxZ=Math.floor((bounds.maxZ+24-1e-9)/48);
 if((maxX-minX+1)*(maxZ-minZ+1)>1024)throw RangeError('Far spatial region exceeds budget');
 if(!Array.isArray(slots)||slots.some(s=>!Number.isInteger(s)||s<0||s>19))throw TypeError('Invalid far slots');
 const hidden=new Set(suppressed),trees=[],seen=new Set();
 for(let cz=minZ;cz<=maxZ;cz++)for(let cx=minX;cx<=maxX;cx++){
  core.addChunk(cx,cz);
  try{const lists=core.instances();for(const slot of slots)for(const t of lists[slot]){
   if(t.x<bounds.minX||t.x>=bounds.maxX||t.z<bounds.minZ||t.z>=bounds.maxZ||hidden.has(t.id)||seen.has(t.id))continue;
   seen.add(t.id);trees.push(t);
  }}finally{core.removeChunk(cx,cz);}
 }
 return trees.sort((a,b)=>a.id.localeCompare(b.id));
}
