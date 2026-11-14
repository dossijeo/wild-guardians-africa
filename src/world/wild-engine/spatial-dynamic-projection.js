// Projection of confirmed simulation bodies. State remains owned by the game;
// native IDs are stable for each worker/animal identity in this session.
export function createDynamicBodyProjection(registry){
 let previous=new Map();
 function recordFor(actor,kind){
  const flags=(actor.status==='home'||actor.status==='gone'?0:1)|
   (actor.incapacitated?2:0)|(actor.status==='retreating'?4:0)|
   ((actor.hitsRemaining??0)>0?8:0);
  return {x:actor.x,z:actor.z,radius:actor.radius??.28,kind,flags};
 }
 function publishChanged(key,value){const before=previous.get(key);if(!before||Object.keys(value).some(k=>!Object.is(value[k],before[k])))registry.publish(key,value);}
 function sync(state){
  const next=new Map();
  for(const [kind,actors] of [[0,state.workers??[]],[1,state.raid?.animals??[]]])for(const actor of actors){
   if(actor.id==null)throw TypeError('Dynamic body needs an identity');
   const key=`${kind}:${actor.id}`;if(next.has(key))throw Error('Duplicate dynamic body identity');
   const record=recordFor(actor,kind);
   next.set(key,record);
  }
  for(const key of previous.keys())if(!next.has(key))registry.remove(key);
  for(const [key,value] of next)publishChanged(key,value);
  previous=next;
 }
 function update(actor,kind){if(actor.id==null||(kind!==0&&kind!==1))throw TypeError('Expected body identity and kind');const key=`${kind}:${actor.id}`;if(!previous.has(key))throw Error('Body must be registered before movement');const value=recordFor(actor,kind);publishChanged(key,value);previous.set(key,value);}
 function clear(){for(const key of previous.keys())registry.remove(key);previous.clear();}
 return {sync,update,clear};
}
