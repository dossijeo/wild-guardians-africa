import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {freshNativeAuthorityOptions} from '../src/simulation/fresh-native-authority.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {serialize} from '../src/persistence/snapshots.js';
import {newGame} from '../src/simulation/game.js';
const wasm=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
test('fresh authority reconstructs the actual camera demand without generating it on the source world',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'fresh-native'}),{state,nav,session}=opening;let authority,reference;
 try{const before=session.core.captureResidentChunks(),site=opening.start.site.center,opts=freshNativeAuthorityOptions(state,nav,session,{eye:{x:site.x,z:site.z},target:site,quality:'media'});assert.deepEqual(session.core.captureResidentChunks(),before);assert.ok(opts.chunkKeys.length>=25);assert.equal(new Set(opts.chunkKeys).size,opts.chunkKeys.length);const copy=deserialize(opts.snapshot),loaded=new Map();reference=createSpatialGameSession(wasm,copy,{loaded:()=>loaded,onData:()=>{}});for(const key of opts.chunkKeys){const [x,z]=key.split(',').map(Number);if(reference.core.selectChunk(x,z)<0)assert.ok(reference.core.addChunk(x,z)>=0);}const expected={version:1,chunkKeys:opts.chunkKeys,spatialState:reference.core.snapshot()};authority=createSimulationAuthority(wasm,opts.snapshot,opts.chunkKeys,opts);assert.equal(authority.verifyNativeBootstrapForQa(expected),true);assert.equal(authority.execute({kind:'snapshot',sequence:1}).snapshot,opts.snapshot);assert.throws(()=>freshNativeAuthorityOptions({...state,elapsed:1},nav,session,{eye:site,target:site}),/Invalid fresh/);
 }finally{authority?.dispose();reference?.dispose();opening.dispose();}
});

test('fresh and restored authority retain revised settlement chunks for center placement',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'fresh-center-revision'});let resident,empty,restored;
 try{
  const {state,nav,session}=opening,site=opening.start.site.center;
  const initial=newGame({seed:712,biome:'sabana',culture:'suajili',slotId:'fresh-center-revision'});
  initial.villages=structuredClone(state.villages);initial.suppressed=structuredClone(state.suppressed);
  const opts=freshNativeAuthorityOptions(initial,nav,session,{eye:{x:site.x,z:site.z},target:site,quality:'media'}),chunks=[];
  resident=createSimulationAuthority(wasm,serialize(initial),opts.chunkKeys,{...opts,onTerrainChunk:data=>chunks.push({key:`${data.cx},${data.cz}`,revision:data.terrainRevision})});
  assert.ok(chunks.some(chunk=>chunk.revision>0),'settlement must supply at least one revised chunk');
  empty=createSimulationAuthority(wasm,serialize(initial),[],{navigationView:opts.navigationView});
  const saved=resident.execute({kind:'snapshot',sequence:1,nativeAuthorityCheckpoint:true});
  restored=createSimulationAuthority(wasm,saved.snapshot,saved.nativeAuthorityCheckpoint.chunkKeys,{navigationView:saved.nativeAuthorityCheckpoint.navigationView});
  const command={kind:'placeStructure',sequence:2,id:'fresh-center',structure:{kind:'center',x:61.04902548888943,z:17.16776320490579,yaw:0}};
  const actual=resident.execute(command),expected=empty.execute({...command,sequence:1}),replay=restored.execute({...command,sequence:1});
  assert.equal(actual.value,true);assert.equal(actual.snapshot,expected.snapshot);assert.deepEqual(actual.events,expected.events);
  assert.equal(replay.value,true);assert.equal(replay.snapshot,actual.snapshot);assert.deepEqual(replay.events,actual.events);
  assert.equal(actual.events.filter(event=>event.type==='PlacementCommitted').length,1);
  const duplicate=restored.execute({...command,sequence:2});
  assert.equal(duplicate.value,false);assert.deepEqual(duplicate.events,[]);assert.equal(duplicate.snapshot,actual.snapshot);
 }finally{resident?.dispose();empty?.dispose();restored?.dispose();opening.dispose();}
});
