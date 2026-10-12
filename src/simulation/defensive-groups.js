import {wallLayout} from '../world/wall-layout.js';
import {segmentDistance} from '../world/footprints.js';
const cache=new WeakMap();
export function defensiveGroups(state){
 const signature=state.structures.map(s=>[s.id,s.status,s.hp>0,s.kind,s.cost,s.x,s.z,s.yaw,s.material,s.gate,s.baseScaleX].join(':')).join('|');
 const old=cache.get(state);if(old?.signature===signature&&old.source===state.structures)return old.groups;
 const intact=state.structures.filter(s=>s.status==='intact'&&s.hp>0),layout=wallLayout(intact,{});
 const pieces=layout.pieces.map(p=>({id:p.entityId,ends:layout.endpoints(p).map(([x,z])=>({x,z}))})),parent=pieces.map((_,i)=>i);
 const root=i=>parent[i]===i?i:(parent[i]=root(parent[i]));
 for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
  // Original Bastion graph joins endpoints, crossings and T junctions at EPS=.10.
  if(segmentDistance(...pieces[i].ends,...pieces[j].ends)<.10)parent[root(j)]=root(i);
 }
 const components=new Map();for(let i=0;i<pieces.length;i++){const r=root(i);if(!components.has(r))components.set(r,[]);components.get(r).push(pieces[i].id);}
 const groups=intact.filter(s=>s.kind==='center').map(s=>({id:'structure:'+s.id,targets:[s],value:s.cost}));
 for(const ids of components.values()){
  ids.sort();const members=new Set(ids),targets=intact.filter(s=>members.has(s.id));
  groups.push({id:'defense:'+ids[0],targets,value:targets.reduce((n,s)=>n+s.cost,0)});
 }
 cache.set(state,{signature,source:state.structures,groups});return groups;
}
