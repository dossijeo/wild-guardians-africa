import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Vector3,Matrix4} from 'three';
import {actorAsset} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

// Offline only: conservative extremal attachment points of each bone's
// dominant skin region. Accuracy under blends must be checked against skin.
const result={schema:'wg-anatomic-support/1',species:{}};
for(const species of ['hyena','warthog','buffalo','lion','rhino']){
 const path='public'+ANIMAL_ACTIONS.animals[species].url,bytes=await readFile(path),gltf=await actorAsset(path),model=gltf.scene;model.updateMatrixWorld(true);
 const groups=new Map(),v=new Vector3(),inverse=new Matrix4();
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.getAttribute('position'),ids=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');for(let i=0;i<p.count;i++){
  let best=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,best))best=k;
  if(weights.getComponent(i,best)<.55)continue;const bone=mesh.skeleton.bones[ids.getComponent(i,best)];if(!bone)continue;const name=bone.name.replace(/^mixamorig[:_]?/,'');if(/tail/i.test(name))continue;
  mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse.copy(bone.matrixWorld).invert());let entry=groups.get(name);if(!entry){entry=Array(6).fill(null);groups.set(name,entry);}for(let axis=0;axis<3;axis++)for(let side=0;side<2;side++){const key=axis*2+side,value=v.getComponent(axis),old=entry[key];if(!old||(side?value>old.value:value<old.value))entry[key]={value,point:v.toArray()};}
 }});
 result.species[species]={sourceSha256:createHash('sha256').update(bytes).digest('hex'),bones:[...groups].map(([name,entries])=>({name,points:entries.filter(Boolean).map(e=>e.point)}))};
 console.log(species,groups.size,[...groups.values()].reduce((sum,items)=>sum+items.filter(Boolean).length,0));
}
await mkdir('public/content/guardian',{recursive:true});await writeFile('public/content/guardian/anatomic-support-qa.json',JSON.stringify(result)+'\n');
