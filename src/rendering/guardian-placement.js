import {Vector3} from 'three';
// Bounded work per accepted command. No navigation or camera movement is requested.
export function guardianPlacement({target,camera,nav,state,occluded=()=>false}){
 const radius=target.radius??.7,base=Math.atan2(camera.position.x-target.x,camera.position.z-target.z),v=new Vector3(),candidates=[];
 // Cull distant entries once per command, rather than scanning the whole farm
 // for each of the sixteen candidate footprints.
 const cropRange=radius+4.4,workerRange=radius+4.5;
 const crops=state.plants.filter(p=>p.alive&&Math.abs(p.x-target.x)<cropRange&&Math.abs(p.z-target.z)<cropRange);
 const workers=(state.workers??[]).filter(w=>w.status!=='gone'&&Math.abs(w.x-target.x)<workerRange&&Math.abs(w.z-target.z)<workerRange);
 const floor=nav.actorSurface?.(target.x,target.z)??nav.field.surface(target.x,target.z);
 v.set(target.x,floor+.7,target.z).project(camera);const sx=v.x,sy=v.y;
 for(const distance of [radius+2.1,radius+3.4])for(const offset of [-.9,.9,-1.5,1.5,-.4,.4,2,-2]){
  const a=base+offset,x=target.x+Math.sin(a)*distance,z=target.z+Math.cos(a)*distance,y=nav.actorSurface?.(x,z)??nav.field.surface(x,z);
  if(!Number.isFinite(y))continue;
  const clear=nav.walkable(x,z,.8,null,false)&&!workers.some(w=>Math.hypot(x-w.x,z-w.z)<1.1)&&!(state.raid?.animals??[]).some(a=>a.status!=='gone'&&Math.hypot(x-a.x,z-a.z)<.8+a.radius)&&!crops.some(p=>Math.hypot(x-p.x,z-p.z)<1);
  v.set(x,y+1.7,z).project(camera);
  const screen=Math.hypot(v.x-sx,v.y-sy),out=Math.max(0,Math.abs(v.x)-.82)+Math.max(0,Math.abs(v.y)-.78);
  const blocked=occluded(x,y+1.7,z),score=(clear?0:1000)+out*100+Math.abs(y-floor)*3+(blocked?20:0)+Math.abs(screen-.19)*8+distance*.12;
  candidates.push({x,y:y+1.7,z,score,clear});
 }
 candidates.sort((a,b)=>a.score-b.score);const best=candidates.find(p=>p.clear)??candidates[0];
 if(!best)return {x:target.x+2,y:floor+5,z:target.z};
 // Above the obstruction when every ground footprint is blocked; never alter gameplay.
 return {x:best.x,y:best.y+(best.clear?0:5),z:best.z};
}
