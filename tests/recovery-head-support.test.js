import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {BeastRecovery} from '../src/rendering/beast-recovery.js';
import {replaySurfacePose} from './browser/guardian-surface-pose.js';
test('head support detects the native warthog penetration within the contact margin',async()=>{
 const capture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/warthog-recovery-negative-surface-pose.json.gz',import.meta.url))));
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.warthog.url,import.meta.url));new BeastRagdollBinding(model,{species:'warthog'});
 const full=replaySurfacePose(model,capture);assert.ok(Math.abs(full.minimum-capture.minimum)<1e-6);
 const nodes=[];model.traverse(n=>nodes.push(n));const floors=new Map(capture.meshes.map(m=>[nodes[m.index],m.floors]));
 const p=new Vector3(),samples=BeastRecovery.contactSamples(model);let sampled=Infinity;
 for(const {mesh,index}of samples){mesh.getVertexPosition(index,p).applyMatrix4(mesh.matrixWorld);sampled=Math.min(sampled,p.y-floors.get(mesh)[index]);}
 assert.ok(sampled-full.minimum<.006,`Head support misses ${sampled-full.minimum} m`);
 assert.ok(full.minimum+(.01-sampled)>0,'Normal support correction must clear the captured head');
 assert.ok(samples.length<1300,'Retain sparse sampling rather than full-skin updates');
});
