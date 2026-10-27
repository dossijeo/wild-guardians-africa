import fs from 'node:fs';
import {Vector3,Box3} from 'three';
import {BakedSolidContacts} from '../../src/rendering/baked-solid-contacts.js';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
import {BakedBeastFall} from '../../src/rendering/baked-beast-fall.js';
import {BakedRagdollClip} from '../../src/simulation/baked-ragdoll-clip.js';
import {isTailContactVertex} from '../../src/rendering/beast-ground-contact.js';
const base='public/content/guardian/ragdoll-fallback/',meta=JSON.parse(fs.readFileSync(base+'falls.json')),bytes=fs.readFileSync(base+'falls.bin'),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),point=new Vector3(),rows=[];
for(const species of Object.keys(ANIMAL_ACTIONS.animals)){
 const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals[species].url),binding=new BeastRagdollBinding(model),meshes=[];model.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});model.updateMatrixWorld(true);
 let initialMax=-Infinity;for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);initialMax=Math.max(initialMax,point.x);}
 // A wall begins 5 cm beyond the real standing silhouette. Initial pose is valid.
 const wallX=initialMax+.05,radius=Math.max(.8,ANIMAL_ACTIONS.animals[species].presentation.footprint.radius);
 for(const direction of ['side','downSide']){
  const clip=new BakedRagdollClip(meta.clips.find(c=>c.species===species&&c.direction===direction),buffer),last=binding.bones.get('Hips').getWorldPosition(new Vector3());let blocked=0,maxPenetration=0,at=0,limiter='',maxHipStep=0;const previousHip=new Vector3();
  const fall=new BakedBeastFall(binding,clip,{solidContacts:process.argv.includes('--correct')?new BakedSolidContacts(binding,[new Box3(new Vector3(wallX,0,-20),new Vector3(wallX+.3,2.5,20))]):null,surface:()=>0,clipPosition:p=>{if(p.x+radius>=wallX){p.x=last.x;p.z=last.z;blocked++;}last.copy(p);}});
  for(let t=0;t<=clip.duration;t+=.1){fall.apply(t);if(t)maxHipStep=Math.max(maxHipStep,fall.hip.distanceTo(previousHip));previousHip.copy(fall.hip);for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);if(point.y<0||point.y>2.5)continue;const penetration=point.x-wallX;if(penetration>maxPenetration){maxPenetration=penetration;at=t;limiter=mesh.name;}}}
  rows.push({species,direction,wallX,radius,blocked,maxPenetration,at,limiter,maxHipStep});fall.restore();
 }
}
const output=process.argv[2]??'test-results/baked-obstacle-audit.json';fs.writeFileSync(output,JSON.stringify({scope:'Full non-tail skin against a 2.5m vertical wall beyond the initial standing silhouette. Existing hip radius clipping, flat floor, no rendering.',rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
