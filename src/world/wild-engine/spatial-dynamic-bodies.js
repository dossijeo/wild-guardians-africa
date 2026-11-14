// Session-local identity bridge for the experimental native dynamic registry.
// Publication is explicit and ordered; this object does not infer movement.
export function createSpatialDynamicBodies(wasm){
 const required=['spatial_bodies_reset','spatial_body_upsert','spatial_body_remove','spatial_body_has_blockers','spatial_body_segment_clear','spatial_body_detour','spatial_bodies_result_ptr'];
 for(const name of required)if(typeof wasm?.[name]!=='function')throw new TypeError('Missing native dynamic body service: '+name);
 const ids=new Map();let next=1,disposed=false;
 const assertLive=()=>{if(disposed)throw Error('Dynamic body service disposed');};
 function publish(key,{x,z,radius,kind,flags}){
  assertLive();if(key==null)throw TypeError('Expected body identity');let id=ids.get(key),created=id===undefined;if(created)id=next;
  if(!wasm.spatial_body_upsert(id,x,z,radius,kind,flags))throw TypeError('Invalid dynamic body');
  if(created){ids.set(key,id);next++;}return id;
 }
 function remove(key){assertLive();const id=ids.get(key);if(id===undefined)return false;wasm.spatial_body_remove(id);ids.delete(key);return true;}
 function clear(key,start,end,mask){assertLive();const id=ids.get(key);if(id===undefined)throw Error('Unknown dynamic body');const result=wasm.spatial_body_segment_clear(id,start.x,start.z,end.x,end.z,mask);if(result<0)throw TypeError('Invalid segment');return result===1;}
 function hasBlockers(key,range){assertLive();const id=ids.get(key);if(id===undefined)throw Error('Unknown dynamic body');const result=wasm.spatial_body_has_blockers(id,range);if(result<0)throw TypeError('Invalid range');return result===1;}
 function detour(key,goal,mask){assertLive();const id=ids.get(key);if(id===undefined)throw Error('Unknown dynamic body');const count=wasm.spatial_body_detour(id,goal.x,goal.z,mask);if(count<0)throw TypeError('Invalid detour');if(!count)return null;const values=new Float64Array(wasm.memory.buffer,wasm.spatial_bodies_result_ptr(),count*2);return Array.from({length:count},(_,i)=>({x:values[i*2],z:values[i*2+1]}));}
 function terrainCacheStats(){assertLive();if(typeof wasm.spatial_body_terrain_cache_hits!=='function'||typeof wasm.spatial_body_terrain_cache_misses!=='function')return null;return {hits:wasm.spatial_body_terrain_cache_hits(),misses:wasm.spatial_body_terrain_cache_misses(),entries:wasm.spatial_body_terrain_cache_entries?.()??null,memoryBytes:wasm.memory.buffer.byteLength,blockedEdges:typeof wasm.spatial_body_blocked_edge_hits==='function'?{hits:wasm.spatial_body_blocked_edge_hits(),rechecks:wasm.spatial_body_blocked_edge_rechecks(),misses:wasm.spatial_body_blocked_edge_misses(),entries:wasm.spatial_body_blocked_edge_entries()}:null};}
 function dispose(){if(disposed)return;disposed=true;wasm.spatial_bodies_reset();ids.clear();}
 wasm.spatial_bodies_reset();return {publish,remove,clear,hasBlockers,detour,terrainCacheStats,dispose};
}
