// Search only on a planting gesture, never during rendering or simulation ticks.
export const PLANT_TOUCH_RADIUS=1.6;
export function nearbyPlantPlacement(x,z,{plants=[],spacing=1.1,valid=()=>true,maxDistance=PLANT_TOUCH_RADIUS,boundaryRadius=null}={}) {
  if(![x,z,maxDistance,spacing].every(Number.isFinite)||maxDistance<0||spacing<=0)return null;
  const occupied=plants.filter(p=>p.alive!==false&&Number.isFinite(p.x)&&Number.isFinite(p.z));
  const free=(a,b)=>occupied.every(p=>Math.hypot(p.x-a,p.z-b)>=spacing)&&valid(a,b);
  if(free(x,z))return {x,z};
  const candidates=[],add=(a,b)=>{const distance=Math.hypot(a-x,b-z);if(distance<=maxDistance&&distance>0)candidates.push({x:a,z:b,distance});};
  const r=spacing+1e-6;
  // Exact circle boundaries handle the common imprecise tap near/between crops.
  const near=occupied.filter(p=>Math.hypot(p.x-x,p.z-z)<=maxDistance+r);
  for(const p of near){const angle=Math.atan2(z-p.z,x-p.x);add(p.x+r*Math.cos(angle),p.z+r*Math.sin(angle));}
  for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){
    const a=near[i],b=near[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
    if(!d||d>2*r)continue;
    const h=Math.sqrt(Math.max(0,r*r-d*d/4)),mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
    add(mx-dz/d*h,mz+dx/d*h);add(mx+dz/d*h,mz-dx/d*h);
  }
  if(Number.isFinite(boundaryRadius)){const d=Math.hypot(x,z);if(d>0)add(x/d*boundaryRadius,z/d*boundaryRadius);}
  // Terrain/building validity is a black-box predicate: bounded sampling, then
  // refine the first valid ray. This is a local approximation, not a global solver.
  for(let ring=1;ring<=8;ring++)for(let angle=0;angle<32;angle++){
    const t=angle*Math.PI/16,d=maxDistance*ring/8;add(x+Math.cos(t)*d,z+Math.sin(t)*d);
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const best=candidates.find(p=>free(p.x,p.z));if(!best)return null;
  let lo=0,hi=1;
  for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(free(x+(best.x-x)*mid,z+(best.z-z)*mid))hi=mid;else lo=mid;}
  return {x:x+(best.x-x)*hi,z:z+(best.z-z)*hi};
}
