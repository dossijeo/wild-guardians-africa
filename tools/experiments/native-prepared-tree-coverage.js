// A completed fence belongs to the exact CPU packing and renderable generation
// captured before preparation, never to every tree that happens to be live later.
export class NativePreparedTreeCoverage {
 constructor(native,signature=()=> '',packingSignature=null){this.native=native;this.signature=signature;this.packingSignature=packingSignature;this.resourceSignatures=new Map();this.prepared=new Map();this.counts=new Map();this.nativeRevision=-1;this.renderSignature=null;this._revision=0;}
 rebuild(){this.counts.clear();for(const record of this.prepared.values())for(const id of record.ids)this.counts.set(id,(this.counts.get(id)??0)+1);}
 update(){
  const signature=this.signature();if(this.nativeRevision===this.native.revision&&this.renderSignature===signature)return false;
  if(this.renderSignature!==signature&&!this.packingSignature){this.prepared.clear();this.resourceSignatures.clear();}
  else for(const [batch,record] of this.prepared)if(this.native.batches.get(batch)!==record||this.packingSignature&&this.resourceSignatures.get(batch)!==this.packingSignature(record)){this.prepared.delete(batch);this.resourceSignatures.delete(batch);}
  this.nativeRevision=this.native.revision;this.renderSignature=signature;this.rebuild();this._revision++;return true;
 }
 get revision(){return this._revision;}
 capture(){this.update();const entries=[...this.native.batches];return {signature:this.renderSignature,entries,resources:this.packingSignature?new Map(entries.map(([batch,record])=>[batch,this.packingSignature(record)])):null};}
 complete(snapshot){
  this.update();if(snapshot.signature!==this.renderSignature&&!this.packingSignature)return 0;let accepted=0;
  for(const [batch,record] of snapshot.entries)if(this.native.batches.get(batch)===record&&this.prepared.get(batch)!==record&&(!this.packingSignature||snapshot.resources.get(batch)===this.packingSignature(record))){this.prepared.set(batch,record);if(this.packingSignature)this.resourceSignatures.set(batch,snapshot.resources.get(batch));accepted++;}
  if(accepted){this.rebuild();this._revision++;}return accepted;
 }
 // Caller updates once after native packing; per-tree lookups stay O(1).
 has(id,suppressed){return !suppressed?.has(id)&&this.counts.has(id);}
 clear(){this.prepared.clear();this.resourceSignatures.clear();this.counts.clear();this.nativeRevision=-1;this.renderSignature=null;this._revision++;}
}
