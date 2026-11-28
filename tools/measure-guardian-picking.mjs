import fs from 'node:fs';
import {Vector3,Raycaster,Sphere} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {actorGeometry} from '../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {preparePickBounds,updatePickBounds} from '../src/rendering/skin-pick-bounds.js';
const models=[],meshes=[],preparation=[];
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 for(let i=0;i<4;i++){
  const copy=clone(model);copy.position.set(i*5,0,models.length*2);copy.updateMatrixWorld(true);models.push(copy);
  const start=performance.now();copy.traverse(mesh=>{if(mesh.isSkinnedMesh)meshes.push({mesh,envelope:preparePickBounds(mesh)});});preparation.push(performance.now()-start);
 }
}
const ray=new Raycaster(new Vector3(0,2,10),new Vector3(0,-.1,-1).normalize()),runs=[];
for(let i=0;i<12;i++)for(const mode of i%2?['prepared','exact']:['exact','prepared']){
 const start=performance.now();
 for(const {mesh,envelope} of meshes){if(mode==='exact'){mesh.computeBoundingBox();mesh.boundingSphere??=new Sphere();mesh.boundingBox.getBoundingSphere(mesh.boundingSphere);}else if(!updatePickBounds(mesh,envelope))throw Error('Unexpected exact fallback');}
 const boundsMs=performance.now()-start,hits=ray.intersectObjects(models,true);
 runs.push({mode,boundsMs,totalPickMs:performance.now()-start,hits:hits.length});
}
const report={scope:'Node CPU only; 20 catalog beasts, 4 per species; alternating exact and prepared bounds then identical raycast; not browser FPS or full click latency',preparationMs:preparation,runs};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2));else console.log(JSON.stringify(report,null,2));
