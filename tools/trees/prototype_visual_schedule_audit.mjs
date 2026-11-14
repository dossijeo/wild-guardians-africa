// Isolated diagnostic: exact relative-motion test for 2D discs following
// piecewise-linear paths over one common confirmed interval. No world authority.
export function auditVisualSchedule(actors,horizon){
 if(!Number.isFinite(horizon)||horizon<=0||!Array.isArray(actors))throw TypeError('Invalid horizon or actors');
 const ids=new Set();
 for(const a of actors){
  if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||!Number.isFinite(a.radius)||a.radius<=0||!Array.isArray(a.points)||a.points.length<2)throw TypeError('Invalid actor');ids.add(a.id);
  for(let i=0;i<a.points.length;i++){const p=a.points[i];if(!p||![p.t,p.x,p.z].every(Number.isFinite)||p.t<0||p.t>horizon||i&&p.t<=a.points[i-1].t)throw TypeError('Invalid point');}
  if(a.points[0].t!==0||a.points.at(-1).t!==horizon)throw TypeError('Incomplete interval');
 }
 const conflicts=[];let segmentPairs=0;
 const at=(p,q,t)=>{const f=(t-p.t)/(q.t-p.t);return {x:p.x+(q.x-p.x)*f,z:p.z+(q.z-p.z)*f};};
 for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){
  const a=actors[i],b=actors[j],limit=a.radius+b.radius;let ai=0,bi=0,best=Infinity,bestTime=0;
  while(ai<a.points.length-1&&bi<b.points.length-1){
   const a0=a.points[ai],a1=a.points[ai+1],b0=b.points[bi],b1=b.points[bi+1],start=Math.max(a0.t,b0.t),end=Math.min(a1.t,b1.t);
   if(end>=start){segmentPairs++;const as=at(a0,a1,start),bs=at(b0,b1,start),ae=at(a0,a1,end),be=at(b0,b1,end),x=as.x-bs.x,z=as.z-bs.z,vx=ae.x-as.x-(be.x-bs.x),vz=ae.z-as.z-(be.z-bs.z),v2=vx*vx+vz*vz,dot=x*vx+z*vz;if(![limit,x,z,vx,vz,v2,dot].every(Number.isFinite))throw RangeError('Schedule arithmetic overflow');const f=v2?Math.max(0,Math.min(1,-dot/v2)):0,d=Math.hypot(x+vx*f,z+vz*f);if(!Number.isFinite(d))throw RangeError('Schedule arithmetic overflow');if(d<best){best=d;bestTime=start+(end-start)*f;}}
   if(a1.t<=b1.t)ai++;if(b1.t<=a1.t)bi++;
  }
  if(best<limit-1e-8)conflicts.push({a:a.id,b:b.id,time:bestTime,distance:best,required:limit});
 }
 return {safe:conflicts.length===0,conflicts,segmentPairs};
}
