// One synchronous updateWorkers pass only. Entity IDs are immutable.
// Gameplay membership changes replace arrays or change their length; fields
// (alive, delivered, workerId...) stay live through the stored object reference.
export function workerEntityLookup(collectionOf){
 let collection=null,length=-1,index=null,queries=0;
 return id=>{
  if(id===null||id===undefined)return undefined;
  const current=collectionOf();
  if(current!==collection||current.length!==length){collection=current;length=current.length;index=null;queries=0;}
  // The small-farm pilot showed that constructing a Map costs more than scans.
  if(length<64)return collection.find(entity=>entity.id===id);
  if(index)return index.get(id);
  if(++queries===1)return collection.find(entity=>entity.id===id);
  index=new Map();for(const entity of collection)if(!index.has(entity.id))index.set(entity.id,entity);
  return index.get(id);
 };
}
