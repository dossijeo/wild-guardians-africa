// Opt-in QA cache key only. Hostile static navigation uses the complete gate
// footprint; live worker passage still reads the current state every time.
export function proofGeometrySignature(value,gateAnimationInvariant=false){
 if(!gateAnimationInvariant)return JSON.stringify(value);
 return JSON.stringify(value,function(key,item){
  return key==='gateOpen'&&this.kind==='wall'&&this.gate===true?undefined:item;
 });
}
