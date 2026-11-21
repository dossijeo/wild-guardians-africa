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
for(const species of ['buffalo'])test(`${species} full-skin wall regression at 60 Hz through articulated roll`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),binding=new BeastRagdollBinding(model),meshes=[];model.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});model.updateMatrixWorld(true);const p=new Vector3();let edge=-Infinity;
 for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);edge=Math.max(edge,p.x);}
 const wall=edge+.05,clip=new BakedRagdollClip(meta.clips.find(c=>c.species===species&&c.direction==='side'),buffer),contacts=new BakedSolidContacts(binding,[new Box3(new Vector3(wall,0,-20),new Vector3(wall+.3,2.5,20))]),last=binding.bones.get('Hips').getWorldPosition(new Vector3()),start=last.clone(),radius=ANIMAL_ACTIONS.animals[species].presentation.footprint.radius;
 const fall=new BakedBeastFall(binding,clip,{surface:()=>0,solidContacts:contacts,clipPosition:p=>{if(p.x+radius>=wall){p.x=last.x;p.z=last.z;}last.copy(p);}});fall.apply(0);assert.ok(fall.hip.distanceTo(start)<1e-6);
 const previous=fall.hip.clone();for(let time=1/60;time<=2.02;time+=1/60){fall.apply(time);previous.copy(fall.hip);for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);if(p.y>=0&&p.y<=2.5)assert.ok(p.x<=wall+.005,`Skin crossed wall ${p.x-wall}m at ${time}; mesh ${mesh.name}, vertex ${i}; sampled ${contacts.samples.some(s=>s.mesh===mesh&&s.index===i)}; shift ${contacts.shift.toArray()}`);}}
});


