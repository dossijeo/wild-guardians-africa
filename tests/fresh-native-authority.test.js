import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {freshNativeAuthorityOptions} from '../src/simulation/fresh-native-authority.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {deserialize} from '../src/persistence/snapshots.js';
const wasm=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
test('fresh authority reconstructs the actual camera demand without generating it on the source world',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'fresh-native'}),{state,nav,session}=opening;let authority,reference;
 try{const before=session.core.captureResidentChunks(),site=opening.start.site.center,opts=freshNativeAuthorityOptions(state,nav,session,{eye:{x:site.x,z:site.z},target:site,quality:'media'});assert.deepEqual(session.core.captureResidentChunks(),before);assert.ok(opts.chunkKeys.length>=25);assert.equal(new Set(opts.chunkKeys).size,opts.chunkKeys.length);const copy=deserialize(opts.snapshot),loaded=new Map();reference=createSpatialGameSession(wasm,copy,{loaded:()=>loaded,onData:()=>{}});for(const key of opts.chunkKeys){const [x,z]=key.split(',').map(Number);if(reference.core.selectChunk(x,z)<0)assert.ok(reference.core.addChunk(x,z)>=0);}const expected={version:1,chunkKeys:opts.chunkKeys,spatialState:reference.core.snapshot()};authority=createSimulationAuthority(wasm,opts.snapshot,opts.chunkKeys,opts);assert.equal(authority.verifyNativeBootstrapForQa(expected),true);assert.equal(authority.execute({kind:'snapshot',sequence:1}).snapshot,opts.snapshot);assert.throws(()=>freshNativeAuthorityOptions({...state,elapsed:1},nav,session,{eye:site,target:site}),/Invalid fresh/);
 }finally{authority?.dispose();reference?.dispose();opening.dispose();}
});
