import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {SkinContactBounds} from '../src/rendering/skin-contact-bounds.js';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';
for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species} optimized skin bounds match Three including transforms and morphs`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));model.position.set(12,3,-7);model.rotation.set(.1,.7,-.2);model.scale.setScalar(.83);
 const bounds=new SkinContactBounds(model),p=new Vector3();
 for(const morphed of [false,true]){
  model.traverse(o=>{if(o.isBone&&/Arm|Leg|Head/.test(o.name))o.rotation.z+=.23;if(morphed&&o.morphTargetInfluences)o.morphTargetInfluences.fill(.3);});model.updateMatrixWorld(true);
  const expected=new Box3(),actual=bounds.expand(new Box3());
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);expected.expandByPoint(p);}});
  assert.ok(actual.min.distanceTo(expected.min)<1e-6);assert.ok(actual.max.distanceTo(expected.max)<1e-6);
 }
});

test('contact indices reuse immutable geometry and invalidate changed deformation inputs',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.hyena.url,import.meta.url));
 SkinContactBounds.prewarm(model);const first=new SkinContactBounds(model),second=new SkinContactBounds(model);
 for(let i=0;i<first.meshes.length;i++){assert.equal(first.meshes[i].indices,second.meshes[i].indices);assert.equal(first.meshes[i].inputs,second.meshes[i].inputs);}
 const mesh=first.meshes[0].mesh;mesh.geometry.attributes.position.needsUpdate=true;
 const changed=new SkinContactBounds(model);assert.notEqual(first.meshes[0].indices,changed.meshes[0].indices);assert.notEqual(first.meshes[0].inputs,changed.meshes[0].inputs);
 const before=changed.meshes[0].indices,oldName=mesh.skeleton.bones[0].name;mesh.skeleton.bones[0].name='tail';
 const renamed=new SkinContactBounds(model);assert.notEqual(before,renamed.meshes[0].indices);mesh.skeleton.bones[0].name=oldName;
});


test('an existing bounds sampler refreshes changed rest positions and replaced weights',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.hyena.url,import.meta.url)),bounds=new SkinContactBounds(model),point=new Vector3();
 const mesh=bounds.meshes[0].mesh,g=mesh.geometry;
 for(const change of [()=>{const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+.25);p.needsUpdate=true;},()=>{const weights=g.attributes.skinWeight.clone();for(let i=0;i<weights.count;i++){weights.setX(i,1);weights.setY(i,0);weights.setZ(i,0);weights.setW(i,0);}g.setAttribute('skinWeight',weights);}]){
  const old=bounds.meshes[0].inputs;change();model.updateMatrixWorld(true);const actual=bounds.expand(new Box3()),expected=new Box3();
  model.traverse(m=>{if(m.isSkinnedMesh)for(let i=0;i<m.geometry.attributes.position.count;i++){if(isTailContactVertex(m,i))continue;m.getVertexPosition(i,point).applyMatrix4(m.matrixWorld);expected.expandByPoint(point);}});
  assert.ok(bounds.meshes[0].inputs!==old,'changed attributes refresh decoded inputs');assert.ok(actual.min.distanceTo(expected.min)<1e-6);assert.ok(actual.max.distanceTo(expected.max)<1e-6);
 }
});
