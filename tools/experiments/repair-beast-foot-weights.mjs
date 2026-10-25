import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from '../glb-container.mjs';
const species=process.argv[2]??'lion',library=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species];
const source=process.argv[3]??'public'+library.url,sourceBytes=await readFile(source);
const {json,bin}=readGlb(sourceBytes),copy=structuredClone(json);
assert(!json.asset.extras?.wildFootWeights,'Already repaired; use the prior source model');
for(const m of copy.materials){delete m.normalTexture;delete m.pbrMetallicRoughness?.baseColorTexture;}
const bytes=writeGlb(copy,bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');gltf.scene.updateMatrixWorld(true);
const output=new Uint8Array(bin),view=new DataView(output.buffer),seen=new Set(),report={species,source,changedVertices:0,bySide:{Left:0,Right:0},invariants:'Only existing skin-weight floats change. Positions, normals, UVs, indices, textures, skeleton and animation channels are unchanged.'};
gltf.scene.traverse(mesh=>{
 if(!mesh.isSkinnedMesh)return;const association=gltf.parser.associations.get(mesh);assert(association?.meshes!==undefined);
 const primitive=json.meshes[association.meshes].primitives[association.primitives??0],index=primitive.attributes.WEIGHTS_0;
 if(seen.has(index))return;seen.add(index);const a=json.accessors[index],b=json.bufferViews[a.bufferView];assert.equal(a.componentType,5126);assert(!b.byteStride);
 const p=mesh.geometry.attributes.position,w=mesh.geometry.attributes.skinWeight,j=mesh.geometry.attributes.skinIndex;
 for(const side of ['Left','Right']){
  const foot=mesh.skeleton.bones.findIndex(b=>b.name===side+'Foot'),leg=mesh.skeleton.bones.findIndex(b=>b.name===side+'Leg');if(foot<0||leg<0)continue;
  const ankle=mesh.skeleton.bones[foot].getWorldPosition(new THREE.Vector3()).y;
  for(let i=0;i<p.count;i++){
   let f=-1,l=-1;for(let k=0;k<4;k++){if(j.getComponent(i,k)===foot&&w.getComponent(i,k)>.01)f=k;if(j.getComponent(i,k)===leg&&w.getComponent(i,k)>.01)l=k;}
   if(f<0||l<0)continue;const fw=w.getComponent(i,f),lw=w.getComponent(i,l);if(fw+lw<.999)continue;
   const y=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).y;
   // Rigid foot below the ankle, smooth return to authored calf weights above.
   const blend=1-THREE.MathUtils.smoothstep(y,ankle-.015,ankle+.06);if(blend<=0)continue;
   const offset=(b.byteOffset??0)+(a.byteOffset??0)+i*16;
   view.setFloat32(offset+f*4,fw+lw*blend,true);view.setFloat32(offset+l*4,lw*(1-blend),true);report.changedVertices++;report.bySide[side]++;
  }
 }
});
json.asset.extras={...json.asset.extras,wildFootWeights:{tool:'tools/experiments/repair-beast-foot-weights.mjs',sourceSha256:createHash('sha256').update(sourceBytes).digest('hex'),changedVertices:report.changedVertices,rigidBelowAnkle:-.015,authoredAboveAnkle:.06}};
await mkdir('.codex-tmp/beast-feet',{recursive:true});await writeFile(`.codex-tmp/beast-feet/${species}.glb`,writeGlb(json,output));await writeFile(`.codex-tmp/beast-feet/${species}.json`,JSON.stringify(report,null,2)+'\n');console.log(report);
