// Entity IDs are immutable. Default lookup remains local to one worker pass.
// Explicit reuse is for histories whose membership changes replace the array
// or change its length; WeakMap keys keep restored/retired arrays independent.
// Gameplay membership changes replace arrays or change their length; fields
// (alive, delivered, workerId...) stay live through the stored object reference.
const historyIndexes=new WeakMap();
export function workerEntityLookup(collectionOf,{reuse=false}={}){
 let collection=null,length=-1,index=null,queries=0;
 return id=>{
  if(id===null||id===undefined)return undefined;
  const current=collectionOf();
  if(current!==collection||current.length!==length){collection=current;length=current.length;index=null;queries=0;}
  // The small-farm pilot showed that constructing a Map costs more than scans.
  if(length<64)return collection.find(entity=>entity.id===id);
  if(reuse){const cached=historyIndexes.get(collection);if(cached?.length===length){index=cached.index;return index.get(id);}if(cached)historyIndexes.delete(collection);}
  if(index)return index.get(id);
  if(++queries===1)return collection.find(entity=>entity.id===id);
  index=new Map();for(const entity of collection)if(!index.has(entity.id))index.set(entity.id,entity);
  if(reuse)historyIndexes.set(collection,{length,index});
  return index.get(id);
 };
}
