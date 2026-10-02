import {centerGeometry} from './centers.js';
// Service points outside the same footprints used by Navigation.
export function repairRoute(worker,target,nav){
  const radius=.28,clearance=.1;
  let points;
  if(target.kind==='center'){
    const angle=Math.atan2(worker.x-target.x,worker.z-target.z);
    points=Array.from({length:16},(_,i)=>{
      const offset=i===0?0:Math.ceil(i/2)*(i%2?1:-1)*Math.PI/8;
      return {x:target.x+Math.sin(angle+offset)*(centerGeometry(target,nav.state).radius+radius+clearance),z:target.z+Math.cos(angle+offset)*(centerGeometry(target,nav.state).radius+radius+clearance)};
    });
  }else{
    const scale=target.gate?(target.material==='reforzado'?1.6:['adobe','piedra'].includes(target.material)?1.4:1):1;
    const width=1.09*scale+radius+clearance,depth=.22+radius+clearance,c=Math.cos(target.yaw??0),s=Math.sin(target.yaw??0);
    points=[[0,depth],[0,-depth],[width,0],[-width,0]].map(([x,z])=>({x:target.x+x*c+z*s,z:target.z-x*s+z*c}));
    points.sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-Math.hypot(b.x-worker.x,b.z-worker.z));
  }
  for(const [index,point] of points.entries()){
    const destination={...point,id:`repair-point-${target.id}-${index}`},path=nav.path(worker,destination,radius,null,true);
    if(path)return {destination,path};
  }
  return null;
}
