import {SearchFrontier} from '../world/search-frontier.js';
const distances=[4,8,12,16,24,32];
const angles=32,budget=8;
// An open fractional corridor can have no usable one-metre grid cells. Try
// a bounded physical connector after normal static routing fails. Every leg
// uses the original swept collision rules; no obstacle or body is removed.
export function animalExitConnector(actor,end,nav){
 const radius=actor.radius??.28;
 if(!nav.segmentClear||!nav.walkable)return null;
 const key=JSON.stringify([nav.version??0,actor.x,actor.z,end.x,end.z,radius]);
 let search=actor.exitConnectorSearch;
 if(!search||search.key!==key)search=actor.exitConnectorSearch={key,next:0};
 const heading=Math.atan2(end.x-actor.x,end.z-actor.z);
 const limit=Math.min(distances.length*angles,search.next+budget);
 for(;search.next<limit;){
  const index=search.next++,sample=index%angles;
  const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/16;
  const reach=distances[Math.floor(index/angles)];
  const point={x:actor.x+Math.sin(heading+offset)*reach,z:actor.z+Math.cos(heading+offset)*reach};
  if(!nav.walkable(point.x,point.z,radius,null,false)||
    !nav.segmentClear(actor,point,radius,null,false)||
    !nav.segmentClear(point,end,radius,null,false))continue;
  delete actor.exitConnectorSearch;
  return [point,{x:end.x,z:end.z}];
 }
 if(search.next===distances.length*angles)return fractionalExit(actor,end,nav,search,radius);
 return null;
}

// Rare fallback: the normal integer grid and a two-leg connector can both
// miss a winding, physically open corridor. Search a half-metre lattice
// anchored to the actual actor, retaining its bounded frontier across ticks
// and saves. Native swept checks remain the sole definition of clearance.
function fractionalExit(actor,end,nav,search,radius){
 const maxNodes=4096,step=.5;
 const fine=search.fine??= {items:[],sequence:0,costs:{'0,0':0},previous:{},visited:0,nodeCount:1};
 const frontier=new SearchFrontier();frontier.items=fine.items;frontier.sequence=fine.sequence;
 if(!fine.visited&&!frontier.length)frontier.push({i:0,j:0,g:0,f:Math.hypot(end.x-actor.x,end.z-actor.z)});
 const point=(i,j)=>({x:actor.x+i*step,z:actor.z+j*step});
 const stop=Math.min(maxNodes,fine.visited+budget);
 while(frontier.length&&fine.visited<stop){
  fine.visited++;const current=frontier.pop(),key=`${current.i},${current.j}`;
  if(current.g>fine.costs[key])continue;
  const here=point(current.i,current.j);
  if(nav.segmentClear(here,end,radius,null,false)){
   const path=[{x:end.x,z:end.z}];let cursor=key;
   const seen=new Set();
   while(cursor!=='0,0'){if(!cursor||seen.has(cursor))return null;seen.add(cursor);const [i,j]=cursor.split(',').map(Number);path.push(point(i,j));cursor=fine.previous[cursor];}
   delete actor.exitConnectorSearch;return path.reverse();
  }
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
   if(!di&&!dj)continue;
   const i=current.i+di,j=current.j+dj;
   if(Math.abs(i)>128||Math.abs(j)>128)continue;
   const nextKey=`${i},${j}`,g=current.g+Math.hypot(di,dj)*step;
   if(g>=(fine.costs[nextKey]??Infinity))continue;
   if(!Object.hasOwn(fine.costs,nextKey)&&fine.nodeCount>=maxNodes||frontier.length>=maxNodes)continue;
   const next=point(i,j);
   if(!nav.walkable(next.x,next.z,radius,null,false)||!nav.segmentClear(here,next,radius,null,false))continue;
   if(!Object.hasOwn(fine.costs,nextKey))fine.nodeCount++;
   fine.costs[nextKey]=g;fine.previous[nextKey]=key;
   frontier.push({i,j,g,f:g+Math.hypot(end.x-next.x,end.z-next.z)});
  }
 }
 fine.items=frontier.items;fine.sequence=frontier.sequence;
 return null;
}
