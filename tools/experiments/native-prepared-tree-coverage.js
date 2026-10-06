// A completed fence belongs to the exact CPU packing and renderable generation
// captured before preparation, never to every tree that happens to be live later.
export class NativePreparedTreeCoverage {
 constructor(native,signature=()=> ''){this.native=native;this.signature=signature;this.prepared=new Map();this.counts=new Map();this.nativeRevision=-1;this.renderSignature=null;this._revision=0;}
 rebuild(){this.counts.clear();for(const record of this.prepared.values())for(const id of record.ids)this.counts.set(id,(this.counts.get(id)??0)+1);}
 update(){
  const signature=this.signature();if(this.nativeRevision===this.native.revision&&this.renderSignature===signature)return false;
  if(this.renderSignature!==signature)this.prepared.clear();
  else for(const [batch,record] of this.prepared)if(this.native.batches.get(batch)!==record)this.prepared.delete(batch);
  this.nativeRevision=this.native.revision;this.renderSignature=signature;this.rebuild();this._revision++;return true;
 }
 get revision(){return this._revision;}
 capture(){this.update();return {signature:this.renderSignature,entries:[...this.native.batches]};}
 complete(snapshot){
  this.update();if(snapshot.signature!==this.renderSignature)return 0;let accepted=0;
  for(const [batch,record] of snapshot.entries)if(this.native.batches.get(batch)===record&&this.prepared.get(batch)!==record){this.prepared.set(batch,record);accepted++;}
  if(accepted){this.rebuild();this._revision++;}return accepted;
 }
 // Caller updates once after native packing; per-tree lookups stay O(1).
 has(id,suppressed){return !suppressed?.has(id)&&this.counts.has(id);}
 clear(){this.prepared.clear();this.counts.clear();this.nativeRevision=-1;this.renderSignature=null;this._revision++;}
}
