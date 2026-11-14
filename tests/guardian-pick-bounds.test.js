import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {preparePickBounds,updatePickBounds} from '../src/rendering/skin-pick-bounds.js';

const workers=JSON.parse(fs.readFileSync(new URL('../public/content/worker-actions.json',import.meta.url)));
const actors={...Object.fromEntries(['hyena','lion','warthog','buffalo','rhino'].map(s=>[s,ANIMAL_ACTIONS.animals[s]])),...workers};
for(const [species,descriptor] of Object.entries(actors))test(`${species}: pick bounds contain posed skin and simultaneous facial morphs`,async()=>{
 const model=await actorGeometry(new URL('../public'+descriptor.url,import.meta.url)),meshes=[],p=new Vector3();
 model.traverse(mesh=>{if(mesh.isSkinnedMesh){const envelope=preparePickBounds(mesh);assert.ok(envelope);meshes.push({mesh,envelope});}});
 assert.ok(meshes.length);
 for(let pose=0;pose<4;pose++){
  model.position.set(4000+pose,2,-3000);model.rotation.set(.1*pose,.3*pose,-.2*pose);model.scale.set(1.2,.8,1.1);
  model.traverse(bone=>{if(bone.isBone&&/Head|Spine|Arm|Leg/.test(bone.name))bone.rotation.z+=.13;});
  for(const {mesh} of meshes)for(let i=0;i<(mesh.morphTargetInfluences?.length??0);i++)mesh.morphTargetInfluences[i]=pose===3?1:(i+pose)%3*.5;
  model.updateMatrixWorld(true);
  for(const {mesh,envelope} of meshes){
   assert.ok(updatePickBounds(mesh,envelope));
   for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,p);assert.ok(mesh.boundingBox.containsPoint(p),`${species} pose ${pose} vertex ${i}`);assert.ok(mesh.boundingSphere.containsPoint(p));}
  }
 }
 const {mesh,envelope}=meshes.find(({mesh})=>mesh.morphTargetInfluences?.length);
 mesh.morphTargetInfluences[0]=1.1;assert.equal(updatePickBounds(mesh,envelope),false,'Out-of-range morph must use exact fallback');mesh.morphTargetInfluences[0]=0;
 mesh.geometry.attributes.position.needsUpdate=true;assert.equal(updatePickBounds(mesh,envelope),false,'Changed geometry invalidates the prepared bounds');
});
