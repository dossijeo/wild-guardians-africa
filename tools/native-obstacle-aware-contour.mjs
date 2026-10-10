// Offline QA planning only. The exclusion core keeps proposed wall paths out
// of the farm; it is never added to live navigation or treated as protection.
import {containsPoint,segmentDistance} from '../src/world/footprints.js';
import {centerFootprint} from '../src/world/centers.js';
import {operational} from '../src/simulation/rules.js';
export function obstacleAwareContour(s,nav,candidate,{radius=.9,margin=32,maxPoints=256}={}){
 if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(margin)||margin<=0||margin>32||!Number.isSafeInteger(maxPoints)||maxPoints<4||maxPoints>256)throw Error('Invalid bounded contour routing');
 const [x0,z0,x1,z1]=candidate.bounds,inset=3;
 if(x1-x0<=inset*2||z1-z0<=inset*2)return {candidate:null,reason:'core-too-small'};
 const core=[{x:x0+inset,z:z0+inset},{x:x1-inset,z:z0+inset},{x:x1-inset,z:z1-inset},{x:x0+inset,z:z1-inset}];
 const view=nav.forBuildingPlacement({id:'qa-planning-exclusion-core',kind:'house',footprint:core,x:(x0+x1)/2,z:(z0+z1)/2});
 // A corner may land on a rock or village footprint. Search only outward
 // from its original quadrant, deterministically and within six metres.
 const corners=[];
 for(const [x,z] of candidate.points.slice(0,-1)){
  const sx=x<(x0+x1)/2?-1:1,sz=z<(z0+z1)/2?-1:1,choices=[];
  for(let dx=0;dx<=6;dx++)for(let dz=0;dz<=6;dz++)if(Math.hypot(dx,dz)<=6)choices.push({x:x+sx*dx,z:z+sz*dz,d:dx*dx+dz*dz});
  choices.sort((a,b)=>a.d-b.d||a.x-b.x||a.z-b.z);
  const corner=choices.find(p=>view.walkable(p.x,p.z,radius,null,false));
  if(!corner)return {candidate:null,reason:'no-bounded-clear-corner'};
  corners.push(corner);
 }
 corners.push(corners[0]);const points=[corners[0]];
 for(let i=1;i<corners.length;i++){
  if(!view.walkable(corners[i-1].x,corners[i-1].z,radius,null,false)||!view.walkable(corners[i].x,corners[i].z,radius,null,false))return {candidate:null,reason:'corner-not-walkable'};
  const raw=view.path(corners[i-1],corners[i],radius,null,false,margin);
  if(!raw)return {candidate:null,reason:'no-bounded-side-route',side:i-1};
  for(const p of view.smoothPath(corners[i-1],raw,radius,null,false))if(Math.hypot(p.x-points.at(-1).x,p.z-points.at(-1).z)>1e-8)points.push({x:p.x,z:p.z});
  if(points.length>maxPoints)return {candidate:null,reason:'point-bound'};
 }
 if(Math.hypot(points[0].x-points.at(-1).x,points[0].z-points.at(-1).z)>1e-8)return {candidate:null,reason:'route-not-closed'};
 const polygon=points.slice(0,-1),n=polygon.length;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(j!==i+1&&!(i===0&&j===n-1)&&segmentDistance(polygon[i],polygon[(i+1)%n],polygon[j],polygon[(j+1)%n])<1e-8)return {candidate:null,reason:'self-intersection'};
 const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
 if(!land.every(p=>containsPoint(polygon,p.x,p.z)))return {candidate:null,reason:'farm-not-enclosed'};
 const bounds=polygon.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.z),Math.max(b[2],p.x),Math.max(b[3],p.z)],[Infinity,Infinity,-Infinity,-Infinity]);
 return {candidate:{bounds,points:points.map(p=>[p.x,p.z]),routed:true,planningRadius:radius},reason:'bounded-native-routes'};
}
