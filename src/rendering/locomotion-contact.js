export function movingPose(actor){
 if(actor.profile){
  if(actor.status==='home'||actor.incapacitated||actor.fallRemaining>0||actor.gateWaiting)return null;
  if(actor.status==='carrying')return {name:'Carry_Crate',phase:actor.carryPhase??0};
  if(actor.status==='fleeing')return {name:'Run',phase:actor.runPhase??0};
  if(['walking','arriving','returning'].includes(actor.status))return actor.running?{name:'Run',phase:actor.runPhase??0}:{name:'Walk_Skip',phase:actor.walkPhase??0};
  if(['idle','waiting'].includes(actor.status)&&actor.idleState?.mode==='walk')return {name:'Walk_Skip',phase:actor.walkPhase??0};
 }else if(['entering','walking','retreating'].includes(actor.status))return {name:actor.status==='walking'?'Walking':'Running',phase:actor.motionPhase??0};
 return null;
}
export function crossedFootsteps(clip,start,end){
 const contacts=[];if(!(end>start))return contacts;
 for(const [index,marker] of clip.contacts.entries()){
  const first=Math.floor((start-marker.time)/clip.duration)+1,last=Math.floor((end-marker.time)/clip.duration);
  for(let cycle=first;cycle<=last;cycle++)contacts.push({...marker,index,cycle,phase:cycle*clip.duration+marker.time});
 }
 return contacts.sort((a,b)=>a.phase-b.phase);
}
