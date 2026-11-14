// QA-only change to Three r180's per-object reference. The skeleton remains
// owned by each mesh; only the generated WGSL symbol is made deterministic.
export function stableSkinningReference(source){
 const before='referenceBuffer("skeleton.boneMatrices", "mat4", skinnedMesh.skeleton.bones.length)',after='referenceBuffer("skeleton.boneMatrices", "mat4", skinnedMesh.skeleton.bones.length).setName("wgBoneMatrices")';
 if(!source.includes(before))return null;if(source.split(before).length!==2||source.includes(after))throw Error('Unexpected Three skinning reference');return source.replace(before,after);
}
