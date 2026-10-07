// Exact swept sphere against a finite axis-aligned exclusion box. The rounded
// corners matter: expanding a box alone rejects otherwise safe diagonal views.
const axes=[0,1,2];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function contact(start,delta,t,box){
 const point=start.map((x,i)=>x+delta[i]*t),normal=point.map((x,i)=>x-clamp(x,box.min[i],box.max[i]));
 const length=Math.hypot(...normal);
 if(length>1e-12)for(const i of axes)normal[i]/=length;
 else {
  // A loaded/constructed volume may surround the initial camera. Report a
  // deterministic nearest exit direction, rather than an undefined normal.
  let distance=Infinity,axis=0,sign=-1;
  for(const i of axes)for(const s of [-1,1]){
   const d=s<0?point[i]-box.min[i]:box.max[i]-point[i];
   if(d<distance){distance=d;axis=i;sign=s;}
  }
  normal.fill(0);normal[axis]=sign;
 }
 return {id:box.id,fraction:t,point,normal};
}
export function sweepCameraVolume(start,end,box,radius=0){
 if(!Number.isFinite(radius)||radius<0||axes.some(i=>!Number.isFinite(start[i])||!Number.isFinite(end[i])||!Number.isFinite(box.min[i])||!Number.isFinite(box.max[i])||box.min[i]>box.max[i]))throw new Error('Invalid camera exclusion sweep');
 const delta=end.map((x,i)=>x-start[i]);
 // Cheap conservative broad phase, followed by the rounded-box exact test.
 if(axes.some(i=>Math.max(start[i],end[i])<box.min[i]-radius||Math.min(start[i],end[i])>box.max[i]+radius))return null;
 const cuts=[0,1];
 for(const i of axes)if(delta[i]!==0)for(const face of [box.min[i],box.max[i]]){
  const t=(face-start[i])/delta[i];if(t>0&&t<1)cuts.push(t);
 }
 cuts.sort((a,b)=>a-b);
 const radius2=radius*radius;
 for(let k=0;k<cuts.length-1;k++){
  const lo=cuts[k],hi=cuts[k+1];if(hi===lo)continue;
  const mid=(lo+hi)/2;let a=0,b=0,c=-radius2;
  for(const i of axes){
   const x=start[i]+delta[i]*mid;
   const face=x<box.min[i]?box.min[i]:x>box.max[i]?box.max[i]:null;
   if(face===null)continue;
   const offset=start[i]-face;a+=delta[i]*delta[i];b+=2*delta[i]*offset;c+=offset*offset;
  }
  const value=t=>(a*t+b)*t+c;
  if(value(lo)<=0)return contact(start,delta,lo,box);
  if(a===0)continue;
  const discriminant=b*b-4*a*c;
  if(discriminant<0)continue;
  const root=(-b-Math.sqrt(discriminant))/(2*a);
  if(root>=lo-1e-12&&root<=hi+1e-12)return contact(start,delta,clamp(root,lo,hi),box);
 }
 return null;
}
export function firstCameraVolumeHit(start,end,volumes,radius=0){
 let first=null;
 for(const volume of volumes){const hit=sweepCameraVolume(start,end,volume,radius);if(hit&&(!first||hit.fraction<first.fraction))first=hit;}
 return first;
}
