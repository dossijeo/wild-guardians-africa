// Read-only facts for notification lifetime and click-to-focus. This is not a
// game state or a save. Messages are bounded by the simulation to eight items;
// only entities actually referenced by them cross the worker boundary.
export function projectConfirmedNotices(state){
 if(!state||!Array.isArray(state.messages)||!Array.isArray(state.plants)||!Array.isArray(state.structures)||!Array.isArray(state.workers)||state.raid!==null&&state.raid!==undefined&&!Array.isArray(state.raid.animals))throw TypeError('Invalid notice state');
 const messages=state.messages.map(message=>{
  if(!message||typeof message.id!=='string'||typeof message.text!=='string'||message.target!==null&&message.target!==undefined&&typeof message.target!=='string')throw TypeError('Invalid notice');
  const result={id:message.id,text:message.text,target:message.target??null};
  if(message.category!==undefined)result.category=message.category;
  if(message.location!==undefined){if(!Number.isFinite(message.location?.x)||!Number.isFinite(message.location?.z))throw TypeError('Invalid notice location');result.location={x:message.location.x,z:message.location.z};}
  return result;
 });
 const wanted=new Set(messages.map(message=>message.target).filter(Boolean)),animals=state.raid?.animals??[],targets=[],seen=new Set();
 for(const group of [state.plants,state.structures,state.workers,animals]){
  if(seen.size===wanted.size)break;
  for(const entity of group){
   if(!wanted.has(entity.id)||seen.has(entity.id))continue;seen.add(entity.id);
   // The former consumer passed the actual entity to focusTerrainCamera, which
   // uses only these coordinates and two optional camera settings.
   const item={id:entity.id,x:entity.x,z:entity.z};if(entity.theta!=null)item.theta=entity.theta;if(entity.distance!=null)item.distance=entity.distance;targets.push(item);
   if(seen.size===wanted.size)break;
  }
 }
 return {version:1,messages,raid:state.raid?{animals:animals.filter(animal=>wanted.has(animal.id)).map(({id})=>({id}))}:null,targets};
}

export function confirmedNoticeFocus(view,id){
 if(!view||view.version!==1||!Array.isArray(view.messages)||!Array.isArray(view.targets)||typeof id!=='string')throw TypeError('Invalid notice projection');
 const message=view.messages.find(item=>item.id===id);if(!message)return null;
 return view.targets.find(item=>item.id===message.target)??message.location??null;
}

export function validateConfirmedNoticeProjection(view){
 const exact=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));
 if(!exact(view,['version','messages','raid','targets'])||view.version!==1||!Array.isArray(view.messages)||!Array.isArray(view.targets)||view.raid!==null&&(!exact(view.raid,['animals'])||!Array.isArray(view.raid.animals)))throw TypeError('Invalid notice projection');
 const ids=new Set(),wanted=new Set();for(const message of view.messages){if(!exact(message,['id','text','target','category','location'])||typeof message.id!=='string'||!message.id||ids.has(message.id)||typeof message.text!=='string'||message.target!==null&&typeof message.target!=='string'||message.category!==undefined&&typeof message.category!=='string'||message.location!==undefined&&(!exact(message.location,['x','z'])||!Number.isFinite(message.location.x)||!Number.isFinite(message.location.z)))throw TypeError('Invalid notice projection');ids.add(message.id);if(message.target)wanted.add(message.target);}
 const targets=new Set();for(const target of view.targets){if(!exact(target,['id','x','z','theta','distance'])||typeof target.id!=='string'||!wanted.has(target.id)||targets.has(target.id)||!Number.isFinite(target.x)||!Number.isFinite(target.z)||target.theta!==undefined&&!Number.isFinite(target.theta)||target.distance!==undefined&&!Number.isFinite(target.distance))throw TypeError('Invalid notice projection');targets.add(target.id);}
 const animals=new Set();for(const animal of view.raid?.animals??[]){if(!exact(animal,['id'])||typeof animal.id!=='string'||!wanted.has(animal.id)||animals.has(animal.id))throw TypeError('Invalid notice projection');animals.add(animal.id);}
 return view;
}
