import {centerCulture} from '../world/centers.js';

// Only the village and center records in the graphic publication feed the
// camera-volume index. Walls, crops, props and actors are queried afresh by
// the authority. Heights used by the graphic records come from these chunks.
export function guardianGeometryDependencies(state, revisionAt){
 if(!state||!Array.isArray(state.villages)||!Array.isArray(state.structures)||typeof revisionAt!=='function')return null;
 const villages=[],centers=[],chunks=new Map(),ids=new Set();
 const chunk=(x,z)=>{if(!Number.isFinite(x)||!Number.isFinite(z))return false;const cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),item=revisionAt(cx,cz);if(!item||item.cx!==cx||item.cz!==cz||typeof item.epoch!=='string'||!item.epoch||!Number.isSafeInteger(item.revision)||item.revision<1)return false;chunks.set(`${cx},${cz}`,[cx,cz,item.epoch,item.revision]);return true;};
 for(const v of state.villages){if(typeof v?.id!=='string'||!v.id||ids.has(v.id)||typeof v.culture!=='string'||!Array.isArray(v.buildings))return null;ids.add(v.id);const buildings=[];for(const b of v.buildings){if(typeof b?.key!=='string'||!b.key||![b.x,b.z,b.yaw??0].every(Number.isFinite)||!chunk(b.x,b.z))return null;buildings.push([b.key,b.x,b.z,b.yaw??0]);}villages.push([v.id,v.culture,buildings]);}
 for(const c of state.structures){if(c.kind!=='center')continue;const culture=centerCulture(c,state);if(typeof c.id!=='string'||!c.id||typeof culture!=='string'||![c.x,c.z,c.yaw??0,c.hp,c.maxHp].every(Number.isFinite)||typeof c.status!=='string'||c.status==='collapsing'&&!Number.isFinite(c.collapseRemaining)||!chunk(c.x,c.z))return null;centers.push([c.id,culture,c.x,c.z,c.yaw??0,c.status,c.hp,c.maxHp,c.collapseRemaining??null]);}
 villages.sort((a,b)=>a[0].localeCompare(b[0]));centers.sort((a,b)=>a[0].localeCompare(b[0]));return {version:1,villages,centers,chunks:[...chunks.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1])};
}

export function guardianManifestRevision(manifest){
 if(typeof manifest?.epoch!=='string'||!manifest.epoch||!Array.isArray(manifest.chunks))return null;const map=new Map();for(const item of manifest.chunks){if(!Number.isSafeInteger(item?.cx)||!Number.isSafeInteger(item.cz)||!Number.isSafeInteger(item.revision)||item.revision<1)return null;const key=`${item.cx},${item.cz}`;if(map.has(key))return null;map.set(key,{cx:item.cx,cz:item.cz,epoch:manifest.epoch,revision:item.revision});}return (cx,cz)=>map.get(`${cx},${cz}`)??null;
}
