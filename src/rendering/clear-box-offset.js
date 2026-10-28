// Closest horizontal translation clearing every vertically overlapping box.
// Candidate extrema suffice for the complement of axis-aligned rectangles.
export function clearBoxOffset(bounds,solids,out,padding=.015){
 const active=solids.filter(s=>s.active?.()!==false&&s.max.y>=bounds.min.y&&s.min.y<=bounds.max.y);
 const xs=[0],zs=[0];
 for(const s of active){xs.push(s.min.x-bounds.max.x-padding,s.max.x-bounds.min.x+padding);zs.push(s.min.z-bounds.max.z-padding,s.max.z-bounds.min.z+padding);}
 let best=Infinity,bx=0,bz=0;
 for(const x of xs)for(const z of zs){const score=x*x+z*z;if(score>=best)continue;
  if(active.some(s=>bounds.max.x+x>=s.min.x&&bounds.min.x+x<=s.max.x&&bounds.max.z+z>=s.min.z&&bounds.min.z+z<=s.max.z))continue;
  best=score;bx=x;bz=z;
 }
 return Number.isFinite(best)?out.set(bx,0,bz):null;
}
