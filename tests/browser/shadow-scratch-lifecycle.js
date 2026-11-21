// Research-only lifetime manager for experimental shadow snapshots.
import {shadowSnapshotReuse} from './shadow-snapshot-reuse-prototype.js';
export function createShadowScratch(cache){
 const slots=[[],[]];let disposed=false;
 function clear(){cache.invalidate();for(const slot of slots)slot.length=0;}
 return {
  capture(renderer,light,scene,camera){if(disposed)throw Error('Scratch disposed');const scratch=cache.snapshot===slots[0]?slots[1]:slots[0];try{const result=shadowSnapshotReuse(renderer,light,scene,camera,scratch);if(result===null)clear();return result;}catch(error){clear();throw error;}},
  reset(){if(!disposed)clear();},
  dispose(){if(!disposed){clear();disposed=true;}},
  retained(){return slots.map(slot=>slot.length);}
 };
}
