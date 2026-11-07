// QA-only exact-key experiment. Geometry attribute writes must increment their
// Three.js version; this does not claim to observe unsupported raw mutations.
const records=new WeakMap(),pending=new WeakMap();
const matrix=(out,m)=>{if(!m)return false;out.push(...m.elements);return true;};
function signature(data,rootInverse){
 const values=[data.groundSamples,data.cachedSkinning,data.model.scale.y],seen=new Set();matrix(values,rootInverse);
 for(const sample of data.groundSamples){const m=sample.mesh;values.push(m,sample.index);if(seen.has(m))continue;seen.add(m);const g=m.geometry,s=m.skeleton;if(!g||!s||!matrix(values,m.matrixWorld)||!matrix(values,m.bindMatrix)||!matrix(values,m.bindMatrixInverse))return null;
  values.push(g,m.getVertexPosition,m.applyBoneTransform,s,s.bones.length,s.boneInverses.length);
  for(const name of ['position','skinIndex','skinWeight']){const a=g.getAttribute(name);if(!a)return null;values.push(a,a.array,a.version,a.count,a.itemSize);}
  for(const [name,attributes] of Object.entries(g.morphAttributes)){values.push(name,attributes,attributes.length);for(const a of attributes)values.push(a,a.array,a.version,a.count,a.itemSize);}
  values.push(g.morphTargetsRelative,...(m.morphTargetInfluences??[]));for(const b of s.bones){values.push(b);matrix(values,b.matrixWorld);}for(const b of s.boneInverses)matrix(values,b);
 }
 return values;
}
export function tryGroundCache(data,rootInverse){
 const stats=globalThis.__qaGroundStats??={hits:0,misses:0},now=signature(data,rootInverse),previous=records.get(data);if(!now){stats.misses++;pending.delete(data);return false;}
 if(previous&&now.length===previous.signature.length&&now.every((v,i)=>Object.is(v,previous.signature[i]))){stats.hits++;const min=previous.min,model=data.model;if(min<.022*model.scale.y){model.position.y=.022*model.scale.y-min;model.updateMatrixWorld(true);}return true;}
 stats.misses++;pending.set(data,now);return false;
}
export function rememberGroundCache(data,min){const signature=pending.get(data);pending.delete(data);if(signature)records.set(data,{signature,min});}
