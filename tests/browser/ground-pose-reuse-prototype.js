import {SkinnedMesh} from 'three';
// Diagnostic only: attribute versions do not detect writes without needsUpdate.
// Sample arrays and underlying buffer contents must remain immutable.
export function createGroundPoseReuse(){
 const entries=new WeakMap(),stats={hits:0,misses:0,bypassed:0,unsupported:0,checks:0,maxDifference:0};let mode='reference';
 function signature(data){
  const model=data.model,samples=data.groundSamples;if(!model||!samples?.length)return null;
  model.position.y=0;model.parent?.updateWorldMatrix(true,false);model.updateMatrixWorld(true);
  const values=[samples,samples.length,model,model.scale.y,...(model.parent?.matrixWorld.elements??[])],seen=new Set();
  for(const sample of samples){const mesh=sample.mesh;if(seen.has(mesh))continue;seen.add(mesh);
   if(!mesh.isSkinnedMesh||mesh.getVertexPosition!==SkinnedMesh.prototype.getVertexPosition||mesh.applyBoneTransform!==SkinnedMesh.prototype.applyBoneTransform)return null;
   const geometry=mesh.geometry,attrs=geometry.attributes,skeleton=mesh.skeleton;values.push(mesh,geometry,skeleton,...mesh.matrixWorld.elements,...mesh.bindMatrix.elements,...mesh.bindMatrixInverse.elements);
   for(const name of ['position','skinIndex','skinWeight']){const a=attrs[name];if(!a)return null;values.push(a,a.array,a.version);}
   for(const a of geometry.morphAttributes.position??[])values.push(a,a.array,a.version);
   values.push(geometry.morphTargetsRelative,...(mesh.morphTargetInfluences??[]));
   for(let i=0;i<skeleton.bones.length;i++)values.push(skeleton.bones[i],...skeleton.bones[i].matrixWorld.elements,...skeleton.boneInverses[i].elements);
  }
  return values;
 }
 const equal=(a,b)=>a?.length===b?.length&&a.every((v,i)=>Object.is(v,b[i]));
 function run(data,original,sampled){
  if(mode==='reference')return original(data);
  if((mode==='candidate-sampled'||mode==='verify-sampled')&&sampled!==false){entries.delete(data);stats.bypassed++;return original(data);}
  const sig=signature(data),previous=entries.get(data);if(!sig){stats.unsupported++;return original(data);}
  const hit=previous&&equal(sig,previous.signature);if(hit)stats.hits++;else stats.misses++;
  if(mode==='verify'||mode==='verify-sampled'||!hit){original(data);const value=data.model.position.y;if(hit){stats.checks++;stats.maxDifference=Math.max(stats.maxDifference,Math.abs(value-previous.y));}entries.set(data,{signature:sig,y:value});return;}
  data.model.position.y=previous.y;if(previous.y>0)data.model.updateMatrixWorld(true);
 }
 return {run,setMode(value){if(!['reference','candidate','verify','candidate-sampled','verify-sampled'].includes(value))throw Error('Bad mode');mode=value;},reset(){for(const k of Object.keys(stats))stats[k]=0;},stats(){return {...stats};}};
}
