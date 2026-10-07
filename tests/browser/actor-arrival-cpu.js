import {SkinnedMesh} from 'three';

// QA only. Actor duration includes awaited scheduling, and can overlap other
// actor installations; it is not exclusive CPU and must not be summed as a frame.
export class ActorArrivalCpu {
 constructor(world,now=()=>performance.now()){
  this.now=now;this.actors=[];this.bounds=[];this.hooks=[];
  const owner=this;
  this.wrap(world,'actor',original=>async function(entity,type){
   const start=now();let failed=false;
   try{return await original.call(this,entity,type);}
   catch(error){failed=true;throw error;}
   finally{owner.actors.push({id:entity.id,type,species:entity.species??null,elapsedMs:now()-start,failed});}
  });
  this.wrap(SkinnedMesh.prototype,'computeBoundingSphere',original=>function(...args){
   const start=now();
   try{return original.apply(this,args);}
   finally{owner.bounds.push({mesh:this.name,vertices:this.geometry?.attributes.position?.count??0,cpuMs:now()-start});}
  });
 }
 wrap(target,name,make){
  const original=target[name],owned=Object.hasOwn(target,name),wrapped=make(original);
  target[name]=wrapped;this.hooks.push({target,name,original,owned,wrapped});
 }
 dispose(){
  for(const {target,name,original,owned,wrapped} of this.hooks.reverse())if(target[name]===wrapped){if(owned)target[name]=original;else delete target[name];}
  this.hooks=[];
 }
 finish(){
  this.dispose();
  return {actors:this.actors,boundingSpheres:this.bounds,scope:'Native actor installation elapsed time includes async waits and overlaps. Bounding-sphere timings are synchronous calls. No GPU timer, exclusive actor CPU total, or physical phone result.'};
 }
}
