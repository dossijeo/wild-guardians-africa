import {containsPoint} from './footprints.js';
export const FLUID_PLACEMENT_REASON='No se puede construir sobre agua o lava';
export function fluidAt(field,x,z){return field?.waterInfo?field.waterInfo(x,z).inside:field?.blocked?.(x,z,0)??false;}
export function footprintFluidSample(field,polygon){
 for(const p of polygon)if(fluidAt(field,p.x,p.z))return p;
 const xs=polygon.map(p=>p.x),zs=polygon.map(p=>p.z),step=.25;
 for(let x=Math.min(...xs);x<=Math.max(...xs);x+=step)for(let z=Math.min(...zs);z<=Math.max(...zs);z+=step)if(containsPoint(polygon,x,z)&&fluidAt(field,x,z))return {x,z};
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/step);for(let j=1;j<n;j++){const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n;if(fluidAt(field,x,z))return {x,z};}}
 return null;
}
// Search only on a requested placement, never while drawing a wall. The final
// chosen location is revalidated against terrain, footprints, props and slopes.
export function resolveFluidPlacement(nav,shapesAt,x,z,extraCheck=()=>null){
 const evaluate=(px,pz,all=false)=>{
  const shapes=shapesAt(px,pz),checks=[];
  for(const shape of shapes){
   const check=nav.placementFootprint?nav.placementFootprint(shape):nav.placement(shape.x,shape.z,shape.radius);
   const extra=extraCheck(shape);checks.push(extra?{...check,...extra}:check);
   if(!all&&!checks.at(-1).valid)break;
  }
  return {x:px,z:pz,shapes,checks,valid:checks.length===shapes.length&&checks.every(c=>c.valid)};
 };
 const initial=evaluate(x,z,true);if(initial.valid||!initial.checks.some(c=>c.fluid))return initial;
 const points=initial.shapes.flatMap(s=>s.footprint??[{x:s.x-s.radius,z:s.z-s.radius},{x:s.x+s.radius,z:s.z+s.radius}]);
 const limit=.2*Math.max(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z)));
 const candidates=[];
 // Shortest sampled offset first; finite search and exact distance cap.
 for(let ring=1;ring<=8;ring++)for(let angle=0;angle<32;angle++){const d=limit*ring/8,a=angle*Math.PI/16;candidates.push({x:x+Math.cos(a)*d,z:z+Math.sin(a)*d,d});}
 for(const p of candidates){const found=evaluate(p.x,p.z);if(found.valid)return {...found,shifted:true,shiftDistance:p.d,shiftLimit:limit};}
 return {...initial,shiftLimit:limit};
}
