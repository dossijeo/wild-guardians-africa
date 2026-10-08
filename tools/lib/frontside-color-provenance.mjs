// QA-only face mapping after a saved PBR comparison. No acceptance inference.
import * as THREE from 'three';
export function mapColorProvenance(renderer,group,scene,camera,original,candidate,size){
 group.traverse(mesh=>{if(mesh.isMesh&&Array.isArray(mesh.material))throw Error('Color provenance requires a single-material source arm');});
 const saved=[],descriptors=[],linear=Float64Array.from({length:256},(_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});let next=1;
 group.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible||mesh.isInstancedMesh&&mesh.count===0)return;const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  for(const [name,attribute] of Object.entries(mesh.geometry.attributes))if(attribute.isInstancedBufferAttribute)geometry.setAttribute(name,attribute);
  const count=geometry.getAttribute('position').count,ids=new Float32Array(count),start=next;for(let i=0;i<count;i++)ids[i]=start+Math.floor(i/3);next+=count/3;
  geometry.setAttribute('qaFaceId',new THREE.BufferAttribute(ids,1));const material=mesh.material.clone(),compile=mesh.material.onBeforeCompile;
  material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);shader.vertexShader='attribute float qaFaceId;varying float vQaFaceId;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {vQaFaceId=qaFaceId;');shader.fragmentShader='precision highp float;varying float vQaFaceId;void main(){float id=floor(vQaFaceId+.5);gl_FragColor=vec4(mod(id,256.),mod(floor(id/256.),256.),floor(id/65536.),gl_FrontFacing?255.:128.)/255.;}';};
  const sourceCache=mesh.material.customProgramCacheKey.call(mesh.material);
  material.customProgramCacheKey=()=> 'qa-color-face-'+mesh.name+'|'+sourceCache;material.toneMapped=false;
  saved.push({mesh,geometry,material,oldGeometry:mesh.geometry,oldMaterial:mesh.material});descriptors.push({start,end:next,name:mesh.name,sourceFaces:mesh.geometry.userData.qaTriangleSourceFaces});mesh.geometry=geometry;mesh.material=material;
 });
 const shadow=renderer.shadowMap.enabled,color=renderer.outputColorSpace,found=new Map();
 try{renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.render(scene,camera);const gl=renderer.getContext(),ids=new Uint8Array(size*size*4);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,ids);
  for(let i=0;i<ids.length;i+=4){if(!original[i+3]||!candidate[i+3]||![0,1,2].some(c=>Math.abs(linear[original[i+c]]-linear[candidate[i+c]])>.03))continue;
   const id=ids[i]+256*ids[i+1]+65536*ids[i+2],d=descriptors.find(d=>id>=d.start&&id<d.end);if(!d)throw Error('Missing color face provenance');const key=d.name+':'+(id-d.start)+':'+ids[i+3];if(!found.has(key))found.set(key,{mesh:d.name,face:id-d.start,sourceFace:d.sourceFaces?.[id-d.start]??id-d.start,backFacing:ids[i+3]===128,pixels:0,pixelCoordinates:[]});const face=found.get(key);face.pixels++;face.pixelCoordinates.push([(i/4)%size,Math.floor(i/4/size)]);
  }
 }finally{renderer.shadowMap.enabled=shadow;renderer.outputColorSpace=color;for(const s of saved){s.mesh.geometry=s.oldGeometry;s.mesh.material=s.oldMaterial;s.geometry.dispose();s.material.dispose();}}
 return [...found.values()].sort((a,b)=>b.pixels-a.pixels);
}
