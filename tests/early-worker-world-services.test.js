import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {installEarlyWorkerWorldServices} from '../src/app/early-worker-world-services.js';

const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());

test('early world services focus the same farm and apply ordered confirmed state',()=>{
 const state=fixture(),authority=deserialize(serialize(state));
 const focused=[],world={state,mixers:new Map(),focus:point=>focused.push(point)};
 installEarlyWorkerWorldServices(world);
 world.focusFarm();
 assert.equal(focused[0],state.structures.find(s=>s.status!=='ruined')??state.villages[0]);
 const receiver=world.createConfirmedReceiver('session');
 const packet={session:'session',sequence:1,snapshot:serializeConfirmedState(authority),events:[],physicsPose:null};
 assert.equal(receiver.accept(packet).accepted,true);
 assert.equal(receiver.accept(packet).reason,'stale');
 assert.equal(receiver.status().sequence,1);
});

test('early presentation does not claim ownership of legacy prop meshes',()=>{
 const world={};installEarlyWorkerWorldServices(world);
 assert.deepEqual(world.syncResidentProps(),{chunks:0,slots:0});
 world.prototypes=[];
 assert.throws(()=>world.syncResidentProps(),/cannot own legacy resident props/);
});
