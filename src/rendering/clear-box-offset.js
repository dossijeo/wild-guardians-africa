// Closest horizontal translation clearing every vertically overlapping box.
// Candidate extrema suffice for the complement of axis-aligned rectangles.
export function clearBoxOffset(bounds,solids,out,padding=.015,barriers=[]){
 const active=solids.filter(s=>s.active?.()!==false&&s.max.y>=bounds.min.y&&s.min.y<=bounds.max.y);
 const xs=[0],zs=[0];
 for(const s of active){xs.push(s.min.x-bounds.max.x-padding,s.max.x-bounds.min.x+padding);zs.push(s.min.z-bounds.max.z-padding,s.max.z-bounds.min.z+padding);}
 let best=Infinity,bx=0,bz=0;
 for(const x of xs)for(const z of zs){const score=x*x+z*z;if(score>=best)continue;
  if(active.some(s=>bounds.max.x+x>=s.min.x&&bounds.min.x+x<=s.max.x&&bounds.max.z+z>=s.min.z&&bounds.min.z+z<=s.max.z))continue;
  if(barriers.some(s=>s.active?.()!==false&&crossesBarrier(bounds,s,x,z)))continue;
  best=score;bx=x;bz=z;
 }
 return Number.isFinite(best)?out.set(bx,0,bz):null;
}

function crossesBarrier(bounds,solid,x,z){
 if(solid.max.y<bounds.min.y||solid.min.y>bounds.max.y)return false;
 const loX=solid.min.x-bounds.max.x,hiX=solid.max.x-bounds.min.x,loZ=solid.min.z-bounds.max.z,hiZ=solid.max.z-bounds.min.z;
 // Existing overlap must be allowed to escape; this gate prevents crossing a
 // previously clear static obstacle while resolving a different moving peer.
 if(loX<=0&&hiX>=0&&loZ<=0&&hiZ>=0)return false;
 let enter=0,exit=1;
 for(const [lo,hi,d]of [[loX,hiX,x],[loZ,hiZ,z]]){
  if(Math.abs(d)<1e-10){if(lo>0||hi<0)return false;continue;}
  enter=Math.max(enter,Math.min(lo/d,hi/d));exit=Math.min(exit,Math.max(lo/d,hi/d));
  if(enter>exit)return false;
 }
 return enter<=exit&&exit>=0&&enter<=1;
}
