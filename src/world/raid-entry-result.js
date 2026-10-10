// Same-realm unit/CLI computation is branded privately. Structured-cloned
// browser replies need the native MessageEvent of this preparer's owned Worker.
const computed=new WeakSet();
export function completeRaidEntryResult(result){
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
 freeze(result);computed.add(result);return result;
}
export const isComputedRaidEntryResult=result=>!!result&&computed.has(result);
export function nativeOwnedRaidReply(event,worker){
 return typeof Worker!=='undefined'&&worker instanceof Worker&&event?.isTrusted===true&&event.target===worker;
}
export function raidRequestProof(request){
 return JSON.stringify([request.owner,request.token,request.key,request.geometryKey,request.group,request.bounds,request.view,request.profile,request.config,request.state]);
}
export function finiteRaidWarmth(warmth,version){
 if(!warmth||warmth.version!==version)return false;
 for(const [key,max] of [['chunks',8],['walk',5000],['segments',10000],['paths',128]]){
  const entries=warmth[key];if(!Array.isArray(entries)||entries.length>max||entries.some(p=>!Array.isArray(p)||p.length!==2||typeof p[0]!=='string'))return false;
 }
 if(warmth.walk.some(p=>typeof p[1]!=='boolean')||warmth.segments.some(p=>typeof p[1]!=='boolean'))return false;
 let points=0;for(const [,path] of warmth.paths){if(!Array.isArray(path)||(points+=path.length)>20000||path.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)))return false;}
 // Chunk data are bounded plain numeric/string/boolean records from scatter.
 // Reject cyclic, nonfinite and excessively large transport payloads.
 let nodes=0;const visit=(value,depth)=>{
  if(++nodes>500000||depth>16)return false;
  if(value===null||typeof value==='string'||typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value);
  if(Array.isArray(value))return value.every(p=>visit(p,depth+1));
  return !!value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype&&Object.values(value).every(p=>visit(p,depth+1));
 };
 return visit(warmth.chunks,0);
}
