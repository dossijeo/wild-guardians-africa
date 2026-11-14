// Presentation-only crop positions. Entries never participate in game queries.
export class ProvisionalCrops {
 constructor({now=()=>performance.now(),correctionMs=200}={}){this.now=now;this.correctionMs=correctionMs;this.entries=new Map();}
 begin(id,species,x,z){this.entries.set(id,{plant:{id:`provisional-${id}`,species,x,z,alive:true,growth:0},targetId:null});}
 reject(id){this.entries.delete(id);}
 confirm(id,targetId){const entry=this.entries.get(id);if(entry){entry.targetId=targetId;entry.confirmedAt=this.now();}}
 get needsFrameUpdate(){for(const entry of this.entries.values())if(entry.targetId)return true;return false;}
 visible(plants){
  if(!this.entries.size)return plants;
  const output=plants.slice(),at=this.now();
  for(const [id,entry] of this.entries){
   if(!entry.targetId){output.push(entry.plant);continue;}
   const index=output.findIndex(p=>p.id===entry.targetId);
   if(index<0){this.entries.delete(id);continue;}
   const target=output[index],t=Math.min(1,Math.max(0,(at-entry.confirmedAt)/this.correctionMs));
   if(t>=1){this.entries.delete(id);continue;}
   const ease=t*t*(3-2*t);output[index]={...target,x:entry.plant.x+(target.x-entry.plant.x)*ease,z:entry.plant.z+(target.z-entry.plant.z)*ease};
  }
  return output;
 }
 clear(){this.entries.clear();}
}
