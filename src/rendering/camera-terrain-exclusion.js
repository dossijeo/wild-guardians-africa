// Exceptional recovery after a slide or streamed building changes the local
// constraints. Ordinary clear positions require only one indexed point query.
export function constrainCameraToTerrain(point,motion,field){
 const clamp=p=>{
  const ground=field.surface(p[0],p[2]);
  if(!Number.isFinite(ground))throw Error('Invalid camera terrain height');
  return [p[0],Math.max(ground+2,Math.min(ground+20,p[1])),p[2]];
 };
 const initial=clamp(point),encountered=new Set();
 let hit=motion.index.sweep(initial,initial,motion.radius);
 if(!hit)return {point:initial,resolved:true,iterations:0};
 encountered.add(motion.index.records.get(hit.id));
 const clearance=motion.radius+motion.skin;
 for(let iteration=0;iteration<12;iteration++){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const box of encountered)for(let axis=0;axis<3;axis++){
   lo[axis]=Math.min(lo[axis],box.worldMin[axis]);hi[axis]=Math.max(hi[axis],box.worldMax[axis]);
  }
  const candidates=[];
  for(let axis=0;axis<3;axis++)for(const side of [-1,1]){
   const candidate=initial.slice();candidate[axis]=side<0?lo[axis]-clearance:hi[axis]+clearance;
   candidates.push(clamp(candidate));
  }
  candidates.sort((a,b)=>Math.hypot(...a.map((x,i)=>x-initial[i]))-Math.hypot(...b.map((x,i)=>x-initial[i])));
  let grew=false;
  for(const candidate of candidates){
   hit=motion.index.sweep(candidate,candidate,motion.radius);
   if(!hit)return {point:candidate,resolved:true,iterations:iteration+1};
   const box=motion.index.records.get(hit.id);
   if(!encountered.has(box)){encountered.add(box);grew=true;}
  }
  if(!grew)break;
 }
 // Keep terrain safety and report the unresolved building conflict explicitly.
 return {point:initial,resolved:false,iterations:12};
}
