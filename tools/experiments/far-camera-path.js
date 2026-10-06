// Deterministic QA paths; no gameplay camera constraints.
export function farCameraPath(mode,time,{duration=12,height=10,yaw=0,near=40,far=60}={}){
 if(!['approach','orbit','lateral'].includes(mode)||![time,duration,height,yaw,near,far].every(Number.isFinite)||time<0||duration<=0||near<0||far<=near)throw Error('Invalid camera path');
 const t=Math.min(1,time/duration),angle=yaw*Math.PI/180,middle=(near+far)/2;
 if(mode==='orbit')return {x:middle*Math.sin(angle+t*Math.PI*2),y:height,z:middle*Math.cos(angle+t*Math.PI*2),done:t===1};
 const forward=mode==='approach'?far-(far-near)*Math.sin(t*Math.PI):middle,lateral=mode==='lateral'?middle*.5*Math.sin(t*Math.PI*2):0;
 return {x:forward*Math.sin(angle)+lateral*Math.cos(angle),y:height,z:forward*Math.cos(angle)-lateral*Math.sin(angle),done:t===1};
}
