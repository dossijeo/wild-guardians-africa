import * as THREE from 'three';
// QA prototype: stable logical IDs retain matrices across changes of the selected LOD bin.
export function residentMatrixPack(owner,g,entries,stats){
 let q=g.qaResident;
 if(!q){
  const original=g.mesh.material,material=original.clone(),compile=original.onBeforeCompile;
  q=g.qaResident={ids:new Map(),data:new Float32Array(16*8),capacity:8,texture:null,uniform:{value:null},origin:null};
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(original,shader,renderer);shader.uniforms.qaResidentMatrices=q.uniform;
   shader.vertexShader='uniform sampler2D qaResidentMatrices;attribute float qaResidentId;mat4 qaResidentMatrix;\n#define instanceMatrix qaResidentMatrix\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('void main() {',`void main() {
    int qaRow=int(qaResidentId);qaResidentMatrix=mat4(texelFetch(qaResidentMatrices,ivec2(0,qaRow),0),texelFetch(qaResidentMatrices,ivec2(1,qaRow),0),texelFetch(qaResidentMatrices,ivec2(2,qaRow),0),texelFetch(qaResidentMatrices,ivec2(3,qaRow),0));`);
  };
  material.customProgramCacheKey=()=>original.customProgramCacheKey()+'|qa-resident-matrix-v1';
  g.mesh.material=material;
  g.mesh.geometry.setAttribute('qaResidentId',new THREE.InstancedBufferAttribute(new Float32Array(g.capacity),1).setUsage(THREE.DynamicDrawUsage));
 }
 const origin=owner.origin.x+':'+owner.origin.z;
 if(q.origin!==origin){q.ids.clear();q.origin=origin;}
 let offset=0,textureDirty=false;const matrix=new THREE.Matrix4(),ids=g.mesh.geometry.attributes.qaResidentId,visibility=g.mesh.geometry.attributes.nativeVisibility;
 for(const e of entries)for(let i=0;i<e.mesh.count;i++){
  const visible=e.mesh.geometry.attributes.nativeVisibility?.array[i]??1;
  if(owner.omitZeroColor&&visible<=0)continue;
  const logical=e.batch.orders[e.level][i];
  if(logical===undefined)throw Error('Missing stable instance identity');
  const key=e.batch.uid+':'+logical+':'+e.group.matrixWorld.elements.join(',');
  let id=q.ids.get(key);
  if(id===undefined){
   id=q.ids.size;q.ids.set(key,id);
   if(id>=q.capacity){q.capacity*=2;const data=new Float32Array(q.capacity*16);data.set(q.data);q.data=data;}
   matrix.fromArray(e.mesh.instanceMatrix.array,i*16).premultiply(e.group.matrixWorld);matrix.elements[12]-=owner.origin.x;matrix.elements[14]-=owner.origin.z;matrix.toArray(q.data,id*16);textureDirty=true;
  }
  ids.array[offset]=id;visibility.array[offset]=visible;offset++;
 }
 if(textureDirty||!q.texture){
  if(!q.texture||q.texture.image.height!==q.capacity){q.texture?.dispose();q.texture=new THREE.DataTexture(q.data,4,q.capacity,THREE.RGBAFormat,THREE.FloatType);q.texture.generateMipmaps=false;q.uniform.value=q.texture;}
  q.texture.needsUpdate=true;stats.residentTextureUploads=(stats.residentTextureUploads??0)+1;
 }
 ids.needsUpdate=true;visibility.needsUpdate=true;g.mesh.count=offset;
 stats.residentSelections=(stats.residentSelections??0)+1;
}
export function disposeResidentMatrices(g){if(g.qaResident){g.qaResident.texture?.dispose();g.mesh.material.dispose();}}
