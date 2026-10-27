export function obstructionState(world){
 const values=[];
 for(const [key,group] of world.chunks)for(const batch of group.userData.lodBatches??[]){
  const array=batch.fade?.attribute.array;if(!array)continue;
  for(let i=0;i<array.length;i++)if(array[i]<.999)values.push([`${key}:${batch.slot}:${i}`,array[i]]);
 }
 return values.sort((a,b)=>a[0].localeCompare(b[0]));
}
