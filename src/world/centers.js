import {containsPoint} from './footprints.js';
import {CENTER_GEOMETRIES} from './center-geometries.js';

export function centerCulture(center,state){
 return center.culture??state?.villages?.find(v=>v.id===center.villageId)?.culture??state?.culture??'mapungubwe';
}
export function centerGeometry(center,state){
 const geometry=CENTER_GEOMETRIES[centerCulture(center,state)];
 if(!geometry)throw new Error('Geometría de centro desconocida');
 return geometry;
}
export function centerFootprint(center,state){
 const geometry=centerGeometry(center,state),c=Math.cos(center.yaw??0),s=Math.sin(center.yaw??0);
 return {...center,radius:geometry.radius,footprint:geometry.hull.map(([x,z])=>({x:center.x+x*c+z*s,z:center.z-x*s+z*c}))};
}
// Direction is the same XZ heading convention used by worker/animal controllers.
export function centerBoundaryPoint(center,angle,clearance=0,state){
 const {hull}=centerGeometry(center,state),yaw=center.yaw??0;
 const local=angle-yaw,dx=Math.sin(local),dz=Math.cos(local);let radius=0;
 for(let i=0;i<hull.length;i++){
  const p=hull[i],q=hull[(i+1)%hull.length],ex=q[0]-p[0],ez=q[1]-p[1],det=dx*ez-dz*ex;
  if(Math.abs(det)<1e-10)continue;
  const t=(p[0]*ez-p[1]*ex)/det,u=(p[0]*dz-p[1]*dx)/det;
  if(t>=0&&u>=-1e-9&&u<=1+1e-9)radius=Math.max(radius,t);
 }
 // Radial approach candidates still require Navigation to validate body clearance
 // around slanted faces. A failed candidate must never bypass the footprint.
 return {x:center.x+Math.sin(angle)*(radius+clearance),z:center.z+Math.cos(angle)*(radius+clearance)};
}
export function centerServicePoint(center,state,clearance=.6){
 const geometry=centerGeometry(center,state),x=geometry.bounds.max[0]+clearance,yaw=center.yaw??0;
 return {x:center.x+x*Math.cos(yaw),z:center.z-x*Math.sin(yaw)};
}

// Closest authored building edge from the crop, with body clearance outside it.
// This is not the fixed arrival/service entrance used for hiring and idle walks.
export function centerDeliveryPoint(center,source,state,clearance=.6){
 const hull=centerFootprint(center,state).footprint;let best=null;
 for(let i=0;i<hull.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((source.x-a.x)*dx+(source.z-a.z)*dz)/length)):0;
  const x=a.x+t*dx,z=a.z+t*dz,distance=Math.hypot(source.x-x,source.z-z);
  if(!best||distance<best.distance)best={x,z,distance,dx,dz};
 }
 if(!clearance)return {x:best.x,z:best.z};
 let dx=source.x-best.x,dz=source.z-best.z,length=Math.hypot(dx,dz);
 if(length<1e-9||containsPoint(hull,source.x,source.z)){
  const area=hull.reduce((sum,p,i)=>sum+p.x*hull[(i+1)%hull.length].z-p.z*hull[(i+1)%hull.length].x,0);
  dx=best.dz*Math.sign(area);dz=-best.dx*Math.sign(area);length=Math.hypot(dx,dz);
 }
 return {x:best.x+dx/length*clearance,z:best.z+dz/length*clearance};
}
