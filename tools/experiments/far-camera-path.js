// Deterministic QA paths; no gameplay camera constraints.
export function farCameraPath(mode,time,{duration=12,height=10,yaw=0}={}){
 if(!['approach','orbit','lateral'].includes(mode)||!Number.isFinite(time)||time<0||!(duration>0))throw Error('Invalid camera path');
 const t=Math.min(1,time/duration),angle=yaw*Math.PI/180;
 if(mode==='orbit')return {x:50*Math.sin(angle+t*Math.PI*2),y:height,z:50*Math.cos(angle+t*Math.PI*2),done:t===1};
 const forward=mode==='approach'?60-20*Math.sin(t*Math.PI):50,lateral=mode==='lateral'?25*Math.sin(t*Math.PI*2):0;
 return {x:forward*Math.sin(angle)+lateral*Math.cos(angle),y:height,z:forward*Math.cos(angle)-lateral*Math.sin(angle),done:t===1};
}
