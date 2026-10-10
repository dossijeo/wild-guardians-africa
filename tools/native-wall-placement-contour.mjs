// QA player planning only: trace wall placement, not actor transitability.
// Every proposed segment uses native wallPlacement; complete native quoting
// and perimeter proof remain mandatory in the purchasing policy.
import {SearchFrontier} from '../src/world/search-frontier.js';
import {containsPoint,segmentDistance,edgeDistance,footprintDistance} from '../src/world/footprints.js';
import {centerFootprint} from '../src/world/centers.js';
import {operational} from '../src/simulation/rules.js';
import {wallStroke} from '../src/world/wall-layout.js';
export function wallPlacementContour(s,nav,candidate,{margin=16,maxVisited=4000,maxPoints=256}={}){
 if(!Number.isFinite(margin)||margin<1||margin>32||!Number.isSafeInteger(maxVisited)||maxVisited<1||maxVisited>10000||!Number.isSafeInteger(maxPoints)||maxPoints<4||maxPoints>256)throw Error('Invalid bounded wall contour');
 const crops=s.plants.filter(p=>p.alive),buildings=s.structures.filter(c=>c.kind==='center'&&operational(c)).map(c=>centerFootprint(c,s).footprint),land=[...crops,...buildings.flat()];
 const [x0,z0,x1,z1]=candidate.bounds,step=1,edges=new Map(),nodes=new Map();let visited=0,queries=0;
 const key=p=>`${p.x},${p.z}`;
 // A row envelope fills gaps between neighbouring crops without imposing a
 // rectangular core over a winding river. It is a planning exclusion only.
 const rows=new Map();
 for(const p of land)for(let z=Math.floor(p.z-1.5);z<=Math.ceil(p.z+1.5);z++){
  const row=rows.get(z)??[Infinity,-Infinity];row[0]=Math.min(row[0],p.x-1);row[1]=Math.max(row[1],p.x+1);rows.set(z,row);
 }
 const protectedPoint=p=>[Math.floor(p.z),Math.ceil(p.z)].some(z=>{const row=rows.get(z);return row&&p.x>=row[0]&&p.x<=row[1];});
 // Keep corners on the farm's dry connected shore. Merely choosing the
 // closest legal point can pick the opposite bank and demand a river crossing.
 const shore=new Set(),queue=[];
 const anchor=land.find(p=>!nav.field.fluidInside(Math.round(p.x),Math.round(p.z)));
 if(!anchor)return {candidate:null,reason:'no-dry-land-anchor',visited,queries};
 queue.push({x:Math.round(anchor.x),z:Math.round(anchor.z)});shore.add(key(queue[0]));
 for(let i=0;i<queue.length&&queue.length<=16000;i++){
  const p=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const q={x:p.x+dx,z:p.z+dz},id=key(q);
   if(q.x<Math.floor(x0-margin)||q.x>Math.ceil(x1+margin)||q.z<Math.floor(z0-margin)||q.z>Math.ceil(z1+margin)||shore.has(id)||nav.field.fluidInside(q.x,q.z))continue;
   shore.add(id);queue.push(q);
  }
 }
 if(queue.length>16000)return {candidate:null,reason:'shore-search-bound',visited,queries};
 const clearPoint=p=>{
  const id=key(p);if(nodes.has(id))return nodes.get(id);
  const valid=!protectedPoint(p)&&!crops.some(c=>Math.hypot(c.x-p.x,c.z-p.z)<1)&&!buildings.some(poly=>footprintDistance(poly,p.x,p.z)<1)
   &&nav.wallPlacement({kind:'wall',material:'zarzas',gate:false,x:p.x,z:p.z,yaw:0,baseScaleX:.1,status:'intact'}).valid;
  nodes.set(id,valid);return valid;
 };
 const clearEdge=(a,b)=>{
  const id=key(a)+'>'+key(b);if(edges.has(id))return edges.get(id);
  let valid=!protectedPoint({x:(a.x+b.x)/2,z:(a.z+b.z)/2})&&!crops.some(c=>edgeDistance(a,b,c.x,c.z)<1)&&!buildings.some(poly=>footprintDistance(poly,(a.x+b.x)/2,(a.z+b.z)/2)<1);
  if(valid)for(const slot of wallStroke([[a.x,a.z],[b.x,b.z]],[],{smooth:false,snap:false})){
   queries++;if(!nav.wallPlacement({kind:'wall',material:'zarzas',gate:false,x:slot.x,z:slot.z,yaw:-slot.angle,baseScaleX:slot.scaleX,status:'intact'}).valid){valid=false;break;}
  }
  edges.set(id,valid);return valid;
 };
 const corners=[];
 for(const [x,z] of candidate.points.slice(0,-1)){
  const choices=[];for(let dx=-16;dx<=16;dx++)for(let dz=-16;dz<=16;dz++)if(dx*dx+dz*dz<=256)choices.push({x:Math.round(x)+dx,z:Math.round(z)+dz,d:dx*dx+dz*dz});
  choices.sort((a,b)=>a.d-b.d||a.x-b.x||a.z-b.z);
  const p=choices.find(p=>shore.has(key(p))&&clearPoint(p));if(!p)return {candidate:null,reason:'no-legal-placement-corner',visited,queries};corners.push({x:p.x,z:p.z});
 }
 corners.push(corners[0]);const points=[corners[0]];
 for(let i=1;i<corners.length;i++){
  const a=corners[i-1],b=corners[i],frontier=new SearchFrontier(),best=new Map([[key(a),0]]),parents=new Map(),known=new Map([[key(a),a]]),done=new Set();let end=null;
  const priorNodes=new Set(points.slice(0,-1).map(key));priorNodes.delete(key(b));
  frontier.push({...a,g:0,f:Math.hypot(b.x-a.x,b.z-a.z)});
  while(frontier.length&&visited<maxVisited){
   const p=frontier.pop(),id=key(p);if(done.has(id))continue;done.add(id);visited++;
   if(p.x===b.x&&p.z===b.z){end=id;break;}
   for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]]){
    const q={x:p.x+dx*step,z:p.z+dz*step},qid=key(q),g=p.g+Math.hypot(dx,dz)*step;
    if(priorNodes.has(qid)||q.x<x0-margin||q.x>x1+margin||q.z<z0-margin||q.z>z1+margin||g>=(best.get(qid)??Infinity)||!clearPoint(q)||!clearEdge(p,q))continue;
    const crossing=points.some((old,j)=>j>0&&segmentDistance(p,q,points[j-1],old)<1e-8&&!(key(p)===key(a)&&key(old)===key(a))&&!(key(q)===key(b)&&key(points[j-1])===key(b)));
    if(crossing)continue;
    best.set(qid,g);parents.set(qid,id);known.set(qid,q);frontier.push({...q,g,f:g+Math.hypot(q.x-b.x,q.z-b.z)});
   }
  }
  if(!end)return {candidate:null,reason:visited>=maxVisited?'placement-search-bound':'no-legal-placement-side',corners,side:i-1,visited,queries};
  const path=[];for(let at=end;at!==key(a);at=parents.get(at))path.push(known.get(at));points.push(...path.reverse());
  if(points.length>maxPoints)return {candidate:null,reason:'point-bound',visited,queries};
 }
 const polygon=points.slice(0,-1),n=polygon.length;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(j!==i+1&&!(i===0&&j===n-1)&&segmentDistance(polygon[i],polygon[(i+1)%n],polygon[j],polygon[(j+1)%n])<1e-8)return {candidate:null,reason:'self-intersection',visited,queries};
 const omitted=land.filter(p=>!containsPoint(polygon,p.x,p.z)).map(p=>({x:p.x,z:p.z,id:p.id,onAnchorShore:shore.has(key({x:Math.round(p.x),z:Math.round(p.z)}))}));
 if(omitted.length)return {candidate:null,reason:'farm-not-enclosed',omitted,visited,queries};
 const bounds=polygon.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.z),Math.max(b[2],p.x),Math.max(b[3],p.z)],[Infinity,Infinity,-Infinity,-Infinity]);
 return {candidate:{bounds,points:points.map(p=>[p.x,p.z]),routed:true,placementRouted:true},reason:'bounded-native-placement-route',visited,queries};
}
