import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {BeastRecovery} from '../src/rendering/beast-recovery.js';
import {SkinContactSampler} from '../tools/guardian/skin-contact-sampler-experiment.mjs';
for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species}: prepared sparse contacts match Three skin and morph deformation`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 const samples=BeastRecovery.contactSamples(model),sampler=new SkinContactSampler(samples),out=new Float64Array(samples.length*3),expected=new Vector3(),actual=new Vector3();
 for(let pose=0;pose<3;pose++){
  model.position.set(12+pose,3,-7);model.rotation.set(.1,.7+pose*.2,-.2);model.scale.set(1.1,.83,.9);
  model.traverse(o=>{if(o.isBone&&/Arm|Leg|Head/.test(o.name))o.rotation.z+=.23;if(o.morphTargetInfluences)o.morphTargetInfluences.fill(pose*.2);});model.updateMatrixWorld(true);
  sampler.sample(out);
  for(let i=0;i<samples.length;i++){const {mesh,index}=samples[i];mesh.getVertexPosition(index,expected).applyMatrix4(mesh.matrixWorld);actual.fromArray(out,i*3);assert.ok(actual.distanceTo(expected)<1e-9,`${species} sample ${i}, pose ${pose}`);}
 }
 assert.throws(()=>sampler.sample(new Float64Array(0)),/Invalid contact/);
});
