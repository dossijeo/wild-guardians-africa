// Diagnostic only. Serializes straight endpoint motions into equal slots.
// This does not check paths, timing, world changes, or physical validity.
export function serialVisualSchedule(actors,horizon){
 if(!Number.isFinite(horizon)||horizon<=0||!Array.isArray(actors))throw TypeError('Invalid schedule');
 const ids=new Set();for(const a of actors){if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||!Number.isFinite(a.radius)||a.radius<=0||!Array.isArray(a.points)||a.points.length!==2||a.points[0].t!==0||a.points[1].t!==horizon||!a.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)))throw TypeError('Invalid actor');ids.add(a.id);}
 const moving=actors.filter(a=>a.points[0].x!==a.points[1].x||a.points[0].z!==a.points[1].z),slots=new Map(moving.map((a,i)=>[a.id,i])),count=moving.length;
 const schedule=actors.map(a=>{
  const from=a.points[0],to=a.points[1],index=slots.get(a.id);if(index===undefined)return {id:a.id,radius:a.radius,points:[{...from},{...to}]};
  const start=horizon*index/count,end=index===count-1?horizon:horizon*(index+1)/count;if(!(end>start))throw RangeError('Unrepresentable time slots');
  const points=[{...from}];if(start>0)points.push({t:start,x:from.x,z:from.z});points.push({t:end,x:to.x,z:to.z});if(end<horizon)points.push({t:horizon,x:to.x,z:to.z});return {id:a.id,radius:a.radius,points};
 });
 return {schedule,movingCount:count,relativeSpeedMultiplier:count||0};
}
