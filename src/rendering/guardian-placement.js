import {Vector3} from 'three';
// Bounded work per accepted command. No navigation or camera movement is requested.
export function guardianPlacement({target,camera,nav,state,occluded=()=>false,occupied=null,bodyScale=1,cropHeight=()=>2.2}){
 // Commands can follow a camera turn before the renderer refreshes matrices.
 camera.updateWorldMatrix(true,false);
 const blockedAt=(x,y,z)=>[y-.9*bodyScale,y,y+1.1*bodyScale].reduce((count,height)=>count+Number(occluded(x,height,z)),0);
 // Reserve a conservative body/vortex envelope, not just its center.
 // Applied only while planning a command, never per rendered frame.
 const framePenalty=(x,y,z)=>{
  let penalty=0;
  for(const dx of [-1.4,1.4])for(const dz of [-1.4,1.4])for(const dy of [-1.2,1.4]){
   v.set(x+dx*bodyScale,y+dy*bodyScale,z+dz*bodyScale).applyMatrix4(camera.matrixWorldInverse);
   // Projected X/Y can look framed even behind a perspective camera.
   // Prefer a partially cropped visible body over an invisible candidate.
   if(-v.z<camera.near||-v.z>camera.far){penalty+=1000;continue;}
   v.applyMatrix4(camera.projectionMatrix);
   penalty+=Math.max(0,Math.abs(v.x)-.92)+Math.max(0,Math.abs(v.y)-.92);
  }
  return penalty;
 };
 const radius=target.radius??.7,base=Math.atan2(camera.position.x-target.x,camera.position.z-target.z),v=new Vector3(),candidates=[];
 // Cull distant entries once per command, rather than scanning the whole farm
 // for each of the sixteen candidate footprints.
 const cropRange=radius+8,workerRange=radius+8.1;
 const crops=state.plants.filter(p=>p.alive&&Math.abs(p.x-target.x)<cropRange&&Math.abs(p.z-target.z)<cropRange);
 const workers=(state.workers??[]).filter(w=>w.status!=='gone'&&Math.abs(w.x-target.x)<workerRange&&Math.abs(w.z-target.z)<workerRange);
 const floor=nav.actorSurface?.(target.x,target.z)??nav.field.surface(target.x,target.z);
 v.set(target.x,floor+.7,target.z).project(camera);const sx=v.x,sy=v.y;
 const evaluate=(distance,offset)=>{
  const a=base+offset,x=target.x+Math.sin(a)*distance,z=target.z+Math.cos(a)*distance,y=nav.actorSurface?.(x,z)??nav.field.surface(x,z);
  if(!Number.isFinite(y))return;
  const clear=nav.placement(x,z,.8*bodyScale).valid&&!occupied?.(x,y+1.7*bodyScale,z)&&!workers.some(w=>Math.hypot(x-w.x,z-w.z)<1.1)&&!(state.raid?.animals??[]).some(a=>a.status!=='gone'&&Math.hypot(x-a.x,z-a.z)<.8+a.radius)&&!crops.some(p=>Math.hypot(x-p.x,z-p.z)<1);
  v.set(x,y+1.7*bodyScale,z).project(camera);
  const screen=Math.hypot(v.x-sx,v.y-sy),out=Math.max(0,Math.abs(v.x)-.82)+Math.max(0,Math.abs(v.y)-.78);
  const blocked=blockedAt(x,y+1.7*bodyScale,z),score=(clear?0:1000)+(out+framePenalty(x,y+1.7*bodyScale,z))*100+Math.abs(y-floor)*3+blocked*12+Math.abs(screen-.19)*8+distance*.12;
  candidates.push({x,y:y+1.7*bodyScale,z,score,clear,distance});
 };
 for(const distance of [radius+2.1,radius+3.4])for(const offset of [-.9,.9,-1.5,1.5,-.4,.4,2,-2])evaluate(distance,offset);
 // Edge targets may leave no framed candidate on the nearby rings. Try a
 // bounded wider ring toward the camera before accepting a cropped body.
 if(!candidates.some(p=>p.clear&&framePenalty(p.x,p.y,p.z)===0)){
  for(const distance of [radius+5,radius+6.6])for(const offset of [0,-.4,.4,-.9,.9])evaluate(distance,offset);
 }
 candidates.sort((a,b)=>a.score-b.score);const best=candidates.find(p=>p.clear)??candidates[0];
 if(!best)return {x:target.x+2,y:floor+5,z:target.z};
 if(!best.clear&&occupied){
  // Evaluate the actual elevated body, not a ground candidate followed by a
  // blind five-metre lift that can put the spirit outside the camera.
  const aerial=[];
  for(const p of candidates){
   let ceiling=p.y-1.7*bodyScale;
   for(const crop of crops)if(Math.hypot(p.x-crop.x,p.z-crop.z)<1.2)ceiling=Math.max(ceiling,(nav.field.surface(crop.x,crop.z))+cropHeight(crop));
   for(const worker of workers)if(Math.hypot(p.x-worker.x,p.z-worker.z)<1.3)ceiling=Math.max(ceiling,nav.field.surface(worker.x,worker.z)+2);
   for(const animal of state.raid?.animals??[])if(animal.status!=='gone'&&Math.hypot(p.x-animal.x,p.z-animal.z)<1+animal.radius)ceiling=Math.max(ceiling,nav.field.surface(animal.x,animal.z)+3.5);
   for(const lift of [1.6,2.5,3.5,5]){
    const y=p.y+lift;if(y-1.2*bodyScale<ceiling||occupied(p.x,y,p.z))continue;
    v.set(p.x,y,p.z).project(camera);const screen=Math.hypot(v.x-sx,v.y-sy);let out=Math.max(0,Math.abs(v.x)-.82)+Math.max(0,Math.abs(v.y)-.78);
    v.set(p.x,y+1.3*bodyScale,p.z).project(camera);out+=Math.max(0,Math.abs(v.y)-.88);
    const score=(out+framePenalty(p.x,y,p.z))*100+blockedAt(p.x,y,p.z)*12+Math.abs(screen-.25)*8+lift*.6+p.distance*.12;
    aerial.push({x:p.x,y,z:p.z,score});
   }
  }
  aerial.sort((a,b)=>a.score-b.score);if(aerial.length){const p=aerial[0];return {x:p.x,y:p.y,z:p.z};}
 }
 // Last resort when the supplied solid volumes leave no usable aerial space.
 return {x:best.x,y:best.y+(best.clear?0:5),z:best.z};
}
