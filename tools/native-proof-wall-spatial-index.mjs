import {Navigation} from '../src/world/navigation.js';import {wallCollisionBounds} from '../src/world/wall-collision-frame.js';
const coarse=Navigation.prototype.coarseSegmentClear,walk=Navigation.prototype.testWalkable;
// Private synchronous read-only QA index. Candidate order is original order.
// Gates/nonwalls are ALWAYS retained; only conservative static wall boxes
// eliminate candidates. Native functions retain all geometry/terrain decisions.
export function withNativeWallSpatialIndex(view,compute,{enabled=false,maxRadius=4,cellSize=8,maxCells=256,onDiagnostics=()=>{}}={}){
 if(typeof enabled!=='boolean'||!Number.isFinite(maxRadius)||maxRadius<0||maxRadius>16||!Number.isFinite(cellSize)||cellSize<1||cellSize>64||!Number.isSafeInteger(maxCells)||maxCells<1||maxCells>4096)throw Error('Invalid QA spatial options');
 const stats={enabled,indexedWalls:0,alwaysRetained:0,queries:0,potentialCandidates:0,actualCandidates:0,fullFallbacks:0,cellsVisited:0};if(!enabled){const r=compute(view);onDiagnostics(stats);return r;}
 if(view.coarseSegmentClear!==coarse||view.testWalkable!==walk)throw Error('QA spatial index requires native collision functions');
 const obstacles=view.obstacles,version=view.version,oldBounds=view.obstacleBounds,identity=JSON.stringify(obstacles),bins=new Map(),always=[],boxes=[],stamps=new Uint32Array(obstacles.length),receivers=new WeakMap();let active=true,stamp=0;
 const key=(x,z)=>x+','+z;
 for(let i=0;i<obstacles.length;i++){
  const o=obstacles[i];if(o.kind!=='wall'||o.gate){always.push(i);continue;}
  const raw=wallCollisionBounds(o,maxRadius),b={minX:raw[0],minZ:raw[1],maxX:raw[2],maxZ:raw[3]},xs=Math.floor((b.minX-1e-8)/cellSize),xe=Math.floor((b.maxX+1e-8)/cellSize),zs=Math.floor((b.minZ-1e-8)/cellSize),ze=Math.floor((b.maxZ+1e-8)/cellSize);
  if(![xs,xe,zs,ze].every(Number.isSafeInteger)||![b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)||(xe-xs+1)*(ze-zs+1)>maxCells){always.push(i);continue;}
  boxes[i]=b;stats.indexedWalls++;for(let x=xs;x<=xe;x++)for(let z=zs;z<=ze;z++){const k=key(x,z),bin=bins.get(k)??[];if(!bins.has(k))bins.set(k,bin);bin.push(i);}
 }
 stats.alwaysRetained=always.length;
 const select=(start,end,radius)=>{
  stats.queries++;stats.potentialCandidates+=obstacles.length;
  const minX=Math.min(start.x,end.x)-1e-8,maxX=Math.max(start.x,end.x)+1e-8,minZ=Math.min(start.z,end.z)-1e-8,maxZ=Math.max(start.z,end.z)+1e-8;
  const xs=Math.floor(minX/cellSize),xe=Math.floor(maxX/cellSize),zs=Math.floor(minZ/cellSize),ze=Math.floor(maxZ/cellSize);
  if(![xs,xe,zs,ze].every(Number.isSafeInteger)||![minX,maxX,minZ,maxZ,radius].every(Number.isFinite)||radius<0||radius>maxRadius||(xe-xs+1)*(ze-zs+1)>maxCells){stats.fullFallbacks++;stats.actualCandidates+=obstacles.length;return obstacles;}
  if(++stamp===4294967295){stamps.fill(0);stamp=1;}const ids=[...always];for(const i of always)stamps[i]=stamp;
  for(let x=xs;x<=xe;x++)for(let z=zs;z<=ze;z++){stats.cellsVisited++;for(const i of bins.get(key(x,z))??[]){if(stamps[i]===stamp)continue;stamps[i]=stamp;const b=boxes[i];if(maxX<b.minX||minX>b.maxX||maxZ<b.minZ||minZ>b.maxZ)continue;ids.push(i);}}
  ids.sort((a,b)=>a-b);stats.actualCandidates+=ids.length;return ids.map(i=>obstacles[i]);
 };
 const invoke=(fn,args,source,isPoint)=>{
  let r=receivers.get(source);if(!r){r=Object.create(source);receivers.set(source,r);}const previous=r.obstacles;
  r.obstacles=select(isPoint?{x:args[0],z:args[1]}:args[0],isPoint?{x:args[0],z:args[1]}:args[1],args[2]??.3);
  try{return fn.apply(r,args);}finally{r.obstacles=previous;}
 };
 const shadow=Object.create(view);shadow.coarseSegmentClear=function(...args){return active?invoke(coarse,args,this,false):view.coarseSegmentClear(...args);};shadow.testWalkable=function(...args){return active?invoke(walk,args,this,true):view.testWalkable(...args);};
 try{const result=compute(shadow);if(result?.then)throw Error('QA spatial lease must remain synchronous');if(view.obstacles!==obstacles||view.version!==version||view.obstacleBounds!==oldBounds||JSON.stringify(obstacles)!==identity||view.coarseSegmentClear!==coarse||view.testWalkable!==walk)throw Error('QA spatial geometry changed; reject certificate');return result;}
 finally{active=false;onDiagnostics({...stats});}
}
