import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {replaySurfacePose} from './browser/guardian-surface-pose.js';

test('recovery collider refit matches uncached geometry and preserves standing cache',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.rhino.url,import.meta.url));
 const binding=new BeastRagdollBinding(model,{species:'rhino'});
 binding.capture();binding.colliders();
 const capture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/rhino-recovery-negative-surface-pose.json.gz',import.meta.url))));
 replaySurfacePose(model,capture);binding.capture();
 const cached=binding.colliders(),refitted=binding.colliders({refit:true});
 assert.deepEqual(binding.colliders(),cached,'Recovery must not poison the shared standing support cache');
 model.traverse(n=>{if(n.isSkinnedMesh)n.geometry=n.geometry.clone();});
 const fresh=binding.colliders();
 assert.deepEqual(refitted,fresh,'Refit must include all eligible skin samples');
 assert.notDeepEqual(cached[11].hull,fresh[11].hull,'Captured thigh pose exercises stale support selection');
});
