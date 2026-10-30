import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {AnimationClip,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {BeastRecovery} from '../src/rendering/beast-recovery.js';
import {AuthoredBeastRecovery} from '../src/rendering/authored-beast-recovery.js';
test('penetrating entry settles smoothly onto support before the full pose blend ends',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.rhino.url,import.meta.url)),binding=new BeastRagdollBinding(model,{species:'rhino'});
 binding.capture();const snapshot=binding.physicalSnapshot(new Float32Array(98));
 const samples=BeastRecovery.contactSamples(model),point=new Vector3();let minimum=Infinity;
 for(const {mesh,index}of samples){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);minimum=Math.min(minimum,point.y);}
 const floor=minimum+.02,clip=AnimationClip.parse(JSON.parse(fs.readFileSync(new URL('../content/source/animations/stand-up/rhino-candidate.json',import.meta.url))).clip);
 const recovery=new AuthoredBeastRecovery(binding,snapshot,{clip,surface:()=>floor});
 const clearance=()=>{let result=Infinity;for(const {mesh,index}of samples){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);result=Math.min(result,point.y-floor);}return result;};
 recovery.apply(0);assert.ok(Math.abs(clearance()+.02)<1e-6,'Exact incoming pose retained');
 recovery.apply(.001);assert.ok(Math.abs(clearance()+.02)<.0001,'No instantaneous support snap');
 recovery.apply(.149);assert.ok(clearance()>=.0099,'Initial penetration should be resolved by 150 ms');
});
