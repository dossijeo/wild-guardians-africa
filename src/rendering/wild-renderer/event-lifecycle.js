import {IncrementalWildRenderer} from './incremental.js';
export async function createEventLifecycleWildRenderer(url=new URL('./core.wasm',import.meta.url)){
 const {instance}=await WebAssembly.instantiate(await(await fetch(url)).arrayBuffer(),{wasi_snapshot_preview1:{proc_exit(code){throw Error(`Wild Renderer exited ${code}`)}}});
 return new EventLifecycleWildRenderer(instance.exports);
}

// Experimental lifecycle-only variant. Population, LOD and fade revisions still
// use the inherited adapter; this does not claim full Engine-event integration.
export class EventLifecycleWildRenderer extends IncrementalWildRenderer {
 constructor(wasm){super(wasm);this.eventLifecycle=true;this.owners=new Map();}
 trackEntry(entry){
  let owner=this.owners.get(entry.group);
  if(!owner){
   owner={batches:new Map(),removed:()=>this.releaseOwner(entry.group)};
   this.owners.set(entry.group,owner);
   entry.group.addEventListener('removed',owner.removed);
  }
  if(!owner.batches.has(entry.batch)){
   const mesh=entry.mesh,dispose=()=>this.releaseBatch(entry.group,entry.batch);
   owner.batches.set(entry.batch,{mesh,dispose});
   mesh.addEventListener('dispose',dispose);
  }

 }
 source(entry){this.trackEntry(entry);return super.source(entry);}
 releaseBatch(group,batch){
  const owner=this.owners.get(group),binding=owner?.batches.get(batch);
  if(!binding)return;
  binding.mesh.removeEventListener('dispose',binding.dispose);
  owner.batches.delete(batch);
  const source=this.sources.get(batch);
  if(source){this.freeSource(source);this.sources.delete(batch);}
 }
 releaseOwner(group){
  const owner=this.owners.get(group);if(!owner)return;
  group.removeEventListener('removed',owner.removed);
  for(const batch of owner.batches.keys())this.releaseBatch(group,batch);
  this.owners.delete(group);
 }
 dispose(){
  for(const group of this.owners.keys())this.releaseOwner(group);
  super.dispose();
 }
}
