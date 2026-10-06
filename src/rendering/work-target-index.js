// Render-only cache. Verify membership AND IDs before reuse, including edits
// with unchanged array length. Other entity fields remain live references.
function refresh(array,entries,ids,index,unique){
  for(let i=0;i<array.length;i++){
    const entity=array[i];if(entity.id!==ids[i])return false;
    if(entity!==entries[i]){
      // Unique IDs permit replacing just the reference. Duplicate IDs need a
      // full rebuild to preserve the last occurrence, including aliased objects.
      if(!unique)return false;entries[i]=entity;index.set(entity.id,entity);
    }
  }
  return true;
}
export class WorkTargetIndex {
  constructor(){this.reset();}
  reset(){this.state=null;this.plants=null;this.structures=null;this.plantEntries=[];this.structureEntries=[];this.plantIds=[];this.structureIds=[];this.index=null;}
  forState(state){
    const plants=state.plants,structures=state.structures;
    const unique=this.index?.size===plants.length+structures.length;
    if(this.state!==state||this.plants!==plants||this.structures!==structures||plants.length!==this.plantEntries.length||structures.length!==this.structureEntries.length||!refresh(plants,this.plantEntries,this.plantIds,this.index,unique)||!refresh(structures,this.structureEntries,this.structureIds,this.index,unique)){
      this.state=state;this.plants=plants;this.structures=structures;
      this.plantEntries=plants.slice();this.structureEntries=structures.slice();
      this.plantIds=plants.map(entity=>entity.id);this.structureIds=structures.map(entity=>entity.id);
      this.index=new Map();for(const entity of plants)this.index.set(entity.id,entity);for(const entity of structures)this.index.set(entity.id,entity);
    }
    return this.index;
  }
}
