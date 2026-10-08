// Entity IDs are immutable. Default lookup remains local to one worker pass.
// Explicit reuse is for histories whose membership changes replace the array
// or change its length; WeakMap keys keep restored/retired arrays independent.
// Gameplay membership changes replace arrays or change their length; fields
// (alive, delivered, workerId...) stay live through the stored object reference.
const historyIndexes=new WeakMap();
// appendOnly is opt-in for crop/crate histories: existing members and IDs
// remain unchanged, while new members are appended. A new array or shrink
// still invalidates the index; arbitrary in-place replacement is unsupported.
export function workerEntityLookup(collectionOf,{reuse=false,appendOnly=false}={}){
 let collection=null,length=-1,index=null,queries=0;
 return id=>{
  if(id===null||id===undefined)return undefined;
  const current=collectionOf();
  if(current!==collection||current.length!==length){collection=current;length=current.length;index=null;queries=0;}
  // The small-farm pilot showed that constructing a Map costs more than scans.
  // Retire a former large index before a small collection can regrow to its
  // old length with different members.
  if(length<64){if(reuse)historyIndexes.delete(collection);return collection.find(entity=>entity.id===id);}
  if(reuse){const cached=historyIndexes.get(collection);if(cached?.length===length){index=cached.index;return index.get(id);}if(appendOnly&&cached&&cached.length<length){
   for(let i=cached.length;i<length;i++){const entity=collection[i];if(!cached.index.has(entity.id))cached.index.set(entity.id,entity);}
   cached.length=length;index=cached.index;return index.get(id);
  }if(cached)historyIndexes.delete(collection);}
  if(index)return index.get(id);
  if(++queries===1)return collection.find(entity=>entity.id===id);
  index=new Map();for(const entity of collection)if(!index.has(entity.id))index.set(entity.id,entity);
  if(reuse)historyIndexes.set(collection,{length,index});
  return index.get(id);
 };
}
