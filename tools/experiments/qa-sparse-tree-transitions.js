import {FarTreeTransitions} from './far-tree-transitions.js';

// QA prototype only. candidates() must be a superset of every ID for which
// coverage.has(id, suppressed) can be true, including retained off-region IDs.
// Callers without that guarantee use the original complete scan.
export class QaSparseTreeTransitions extends FarTreeTransitions {
 constructor(options){super(options);this.sparseReady=false;this.positive=new Set();this.retired=new Set();}
 index(){this.positive.clear();this.retired.clear();for(const [id,state] of this.states){if(this.ids.has(id)){if(state.target)this.positive.add(id);}else this.retired.add(id);}this.sparseReady=true;}
 bind(sink,trees){this.sparseReady=false;super.bind(sink,trees);this.index();}
 setCoverage(coverage,gpuReady){
  if(!this.sparseReady||typeof coverage.candidates!=='function'){
   const changed=super.setCoverage(coverage,gpuReady);if(this.sparseReady)this.index();return changed;
  }
  if(typeof gpuReady!=='boolean')throw Error('Invalid GPU readiness');
  if(this.coverage===coverage&&this.revision===coverage.revision&&this.gpuReady===gpuReady)return false;
  this.coverage=coverage;this.revision=coverage.revision;this.gpuReady=gpuReady;
  for(const id of this.retired)if(!gpuReady||!coverage.has(id)){this.states.delete(id);this.retired.delete(id);}
  const work=new Set(this.positive);if(gpuReady)for(const id of coverage.candidates())if(this.ids.has(id))work.add(id);
  for(const id of work){const state=this.states.get(id),target=gpuReady&&coverage.has(id,this.suppressed)?1:0;state.target=target;
   if(!target){this.positive.delete(id);if(state.ready!==0){state.ready=0;this.sink.setTreeReadiness(id,0);}this.active.delete(id);}
   else{this.positive.add(id);if(state.ready<1)this.active.add(id);}
  }
  return true;
 }
 clear(){super.clear();this.positive.clear();this.retired.clear();this.sparseReady=false;}
}
