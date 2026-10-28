import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Box3,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {BakedBeastFall} from '../src/rendering/baked-beast-fall.js';
import {BakedRagdollClip} from '../src/simulation/baked-ragdoll-clip.js';
import {BakedSolidContacts} from '../src/rendering/baked-solid-contacts.js';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';
const base=new URL('../public/content/guardian/ragdoll-fallback/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('falls.json',base))),bytes=fs.readFileSync(new URL('falls.bin',base)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
for(const species of ['buffalo','rhino'])test(`${species} baked skin remains outside a thin wall during fall and roll`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),binding=new BeastRagdollBinding(model),meshes=[];model.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});model.updateMatrixWorld(true);const p=new Vector3();let edge=-Infinity;
 for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);edge=Math.max(edge,p.x);}
 const wall=edge+.05,clip=new BakedRagdollClip(meta.clips.find(c=>c.species===species&&c.direction==='side'),buffer),contacts=new BakedSolidContacts(binding,[new Box3(new Vector3(wall,0,-20),new Vector3(wall+.3,2.5,20))]),last=binding.bones.get('Hips').getWorldPosition(new Vector3()),start=last.clone(),radius=ANIMAL_ACTIONS.animals[species].presentation.footprint.radius;
 const fall=new BakedBeastFall(binding,clip,{surface:()=>0,solidContacts:contacts,clipPosition:p=>{if(p.x+radius>=wall){p.x=last.x;p.z=last.z;}last.copy(p);}});fall.apply(0);assert.ok(fall.hip.distanceTo(start)<1e-6);
 const previous=fall.hip.clone();for(let time=.1;time<=clip.duration;time+=.1){fall.apply(time);assert.ok(fall.hip.distanceTo(previous)<.15,`Contact correction jumps at ${time}: ${fall.hip.distanceTo(previous)}m; offset ${contacts.shift.toArray()}`);previous.copy(fall.hip);for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);if(p.y>=0&&p.y<=2.5)assert.ok(p.x<=wall+.005,`Skin crossed wall ${p.x-wall}m`);}}
});

test('baked peer correction survives empty peer lists and repeated restored poses',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.hyena.url,import.meta.url));
 const binding=new BeastRagdollBinding(model),hip=binding.bones.get('Hips'),local=hip.position.clone(),start=hip.getWorldPosition(new Vector3());
 const contacts=new BakedSolidContacts(binding,[],()=>[]);contacts.peerOffset.set(.5,0,-.2);
 for(let i=0;i<3;i++){
  hip.position.copy(local);model.updateMatrixWorld(true);contacts.resolve(()=>0);
  const expected=start.clone().add(new Vector3(.5,0,-.2));
  assert.ok(hip.getWorldPosition(new Vector3()).distanceTo(expected)<1e-6,'Peer removal must not undo or accumulate the applied correction');
 }
});
