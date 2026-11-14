// Diagnostic Worker ledger: keep event ceilings only for versions that can
// still be acknowledged. Capacity is an admission limit, never silent loss.
export function createVersionWindow(capacity=16){
 if(!Number.isSafeInteger(capacity)||capacity<2)throw new RangeError('Invalid version capacity');
 const ceilings=new Map([[0,0]]);let latest=0,confirmed=0;
 return {
  permits(version,ack){return Number.isSafeInteger(version)&&version>=confirmed&&version<=latest&&ceilings.has(version)&&Number.isSafeInteger(ack)&&ack>=0&&ack<=ceilings.get(version);},
  canAppendAfter(version){if(!ceilings.has(version)||version<confirmed)return false;let kept=0;for(const key of ceilings.keys())if(key>=version)kept++;return kept<capacity;},
  confirm(version){if(!ceilings.has(version)||version<confirmed)throw Error('Invalid confirmation');confirmed=version;for(const key of ceilings.keys())if(key<version)ceilings.delete(key);},
  append(version,ceiling){if(!Number.isSafeInteger(version)||version!==latest+1||!Number.isSafeInteger(ceiling)||ceiling<ceilings.get(latest)||ceilings.size>=capacity)throw Error('Invalid version append');ceilings.set(version,ceiling);latest=version;},
  state(){return {latest,confirmed,size:ceilings.size,capacity};}
 };
}
