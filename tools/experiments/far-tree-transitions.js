// Experimental controller. GPU readiness is supplied only after real resource
// preparation; it must never be inferred from a chunk request or CPU coverage.
export class FarTreeTransitions {
 constructor({duration=1}={}){if(!Number.isFinite(duration)||duration<=0)throw Error('Invalid fade duration');this.duration=duration;this.states=new Map();this.ids=new Set();this.active=new Set();this.suppressed=new Set();this.coverage=null;this.gpuReady=false;this.revision=null;this.sink=null;}
 bind(sink,trees){
  this.sink=sink;this.ids=new Set(trees.map(t=>t.id));this.active.clear();
  for(const id of this.ids){const state=this.states.get(id)??{ready:0,target:0};this.states.set(id,state);sink.setTreeReadiness(id,state.ready);sink.setTreeEnabled(id,!this.suppressed.has(id));}
  this.revision=null;if(this.coverage)this.setCoverage(this.coverage,this.gpuReady);
 }
 setCoverage(coverage,gpuReady){
  if(typeof gpuReady!=='boolean')throw Error('Invalid GPU readiness');
  if(this.coverage===coverage&&this.revision===coverage.revision&&this.gpuReady===gpuReady)return false;
  this.coverage=coverage;this.revision=coverage.revision;this.gpuReady=gpuReady;
  for(const id of this.states.keys())if(!this.ids.has(id)&&(!gpuReady||!coverage.has(id)))this.states.delete(id);
  for(const id of this.ids){const state=this.states.get(id);state.target=gpuReady&&coverage.has(id,this.suppressed)?1:0;
   if(!state.target){state.ready=0;this.active.delete(id);this.sink.setTreeReadiness(id,0);}else if(state.ready<1)this.active.add(id);
  }
  return true;
 }
 setSuppressions(suppressed){
  const next=new Set(suppressed);if(next.size===this.suppressed.size&&[...next].every(id=>this.suppressed.has(id)))return false;for(const id of this.ids)if(this.suppressed.has(id)!==next.has(id))this.sink.setTreeEnabled(id,!next.has(id));
  this.suppressed=next;this.revision=null;if(this.coverage)this.setCoverage(this.coverage,this.gpuReady);return true;
 }
 advance(dt){
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid fade time');let changed=0;
  for(const id of this.active){const state=this.states.get(id),next=Math.min(1,state.ready+dt/this.duration);if(next!==state.ready){state.ready=next;this.sink.setTreeReadiness(id,next);changed++;}if(next===1)this.active.delete(id);}
  return changed;
 }
 clear(){this.states.clear();this.ids.clear();this.active.clear();this.suppressed.clear();this.coverage=null;this.sink=null;this.revision=null;this.gpuReady=false;}
}
