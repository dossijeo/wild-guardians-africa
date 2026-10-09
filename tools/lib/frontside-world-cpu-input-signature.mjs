function fingerprint(array,count=array.length){const bytes=new Uint8Array(array.buffer,array.byteOffset,count*array.BYTES_PER_ELEMENT);let value=2166136261;for(const byte of bytes)value=Math.imul(value^byte,16777619)>>>0;return{bytes:bytes.length,fnv32:value.toString(16).padStart(8,'0')};}
// CPU evidence outside timed queries. Geometry differs intentionally; record
// instances and source rig pose arrays, without claiming bound GPU equality.
export function worldCpuInputSignature(world){
 const instances=[],rigs=[];
 world.scene.traverse(mesh=>{
  if(mesh.isInstancedMesh&&mesh.visible&&mesh.count>0){const growth=mesh.geometry.getAttribute('iGrowth'),bridge=mesh.geometry.getAttribute('iBridge');instances.push({id:mesh.uuid,name:mesh.name,count:mesh.count,matrix:fingerprint(mesh.instanceMatrix.array,mesh.count*16),growth:growth?fingerprint(growth.array,mesh.count*growth.itemSize):null,bridge:bridge?fingerprint(bridge.array,mesh.count*bridge.itemSize):null});}
  if(mesh.isSkinnedMesh&&mesh.skeleton){rigs.push({id:mesh.uuid,name:mesh.name,bones:mesh.skeleton.bones.length,pose:fingerprint(mesh.skeleton.boneMatrices),matrixWorld:mesh.matrixWorld.elements.slice()});}
 });
 instances.sort((a,b)=>a.id.localeCompare(b.id));rigs.sort((a,b)=>a.id.localeCompare(b.id));
 return{instances,rigs,meaning:'Active CPU instance and rig pose fingerprints outside timing; FNV32 is diagnostic, not collision-proof GPU buffer/texel identity or category approval.'};
}
