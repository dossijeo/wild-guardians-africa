import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {installEarlyWorkerWorldServices,installTutorialFocusInterruption} from '../src/app/early-worker-world-services.js';
import {EventDispatcher} from 'three';
import {createWorkerNavigationProjection} from '../src/app/worker-navigation-projection.js';

const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());

test('Worker camera reports its current navigation view without waiting for a frame acknowledgement',()=>{
 const calls=[],nav=createWorkerNavigationProjection({bounds:[-24,-24,24,24],eye:{x:0,z:0},target:{x:0,z:0}}),owner={backgroundViews:true,setNavigationView:view=>calls.push(structuredClone(view))},world={nav,state:{raid:null},camera:{position:{x:0,z:0}},controls:{target:{x:1,z:2}},quality:'media',workerRuntime:owner};installEarlyWorkerWorldServices(world);
 world.syncNavigationView();assert.deepEqual(calls[0],{bounds:[-120,-120,120,120],eye:{x:0,z:0},target:{x:1,z:2}});world.syncNavigationView();assert.equal(calls.length,1);world.camera.position.x=49;world.syncNavigationView();assert.equal(calls.length,2);assert.equal(calls[1].bounds[0],-72);assert.equal(calls[1].eye.x,49);
});

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
 assert.equal(world.confirmedAnimalPoses,undefined);assert.equal(world.confirmedVfxEventWindow,undefined);assert.equal(world.legacyActorRevision,undefined);
});

test('early presentation does not claim ownership of legacy prop meshes',()=>{
 const world={};installEarlyWorkerWorldServices(world);
 assert.deepEqual(world.syncResidentProps(),{chunks:0,slots:0});
 world.prototypes=[];
 assert.throws(()=>world.syncResidentProps(),/cannot own legacy resident props/);
});

test('legacy receiver is required only for explicit development diagnostics',()=>{
 const world={state:{}},calls=[],legacy=(...args)=>{calls.push(args);return {legacy:true};};
 assert.throws(()=>installEarlyWorkerWorldServices({}, {dev:true,visualSearch:'?qa-worker-path-trace'}),/receiver unavailable/);
 installEarlyWorkerWorldServices(world,{dev:true,visualSearch:'?qa-worker-double-decode',legacyReceiver:legacy});assert.deepEqual(world.createConfirmedReceiver('s'),{legacy:true});assert.deepEqual(calls[0],[world.state,'s',world,{repeatDecode:true}]);
 const production={state:fixture()};installEarlyWorkerWorldServices(production,{dev:false,visualSearch:'?qa-worker-double-decode',legacyReceiver:()=>{throw Error('unexpected legacy receiver');}});assert.ok(production.createConfirmedReceiver('s').status());
});

test('village preparation and preview belong to the graphical worker',async()=>{
 const calls=[],preview={culture:'mapungubwe',buildings:[]},world={webGpuWorld:{client:{prepareStructure:(...args)=>{calls.push(['prepare',...args]);return Promise.resolve();},showVillagePreview:value=>{calls.push(['show',value]);return true;},clearVillagePreview:()=>calls.push(['clear'])}}};
 installEarlyWorkerWorldServices(world);await world.ensureVillage('mapungubwe');world.showVillagePreview(preview);world.clearVillagePreview();
 assert.deepEqual(calls,[['prepare','village','mapungubwe'],['show',preview],['clear']]);assert.equal(world.scene,undefined);
});

test('early spatial residency stores collision metadata without constructing meshes',()=>{
 const world={chunks:new Map()},instances=[[{id:'tree',x:1,z:2}]],data={cx:2,cz:-1,authority:'spatial-wasm',terrainRevision:3,instances,terrain:{positions:new Float32Array(30)}};installEarlyWorkerWorldServices(world);
 world.installChunk(data);assert.deepEqual(world.chunks.get('2,-1'),{authority:'spatial-wasm',terrainRevision:3,instances});assert.equal(world.chunks.get('2,-1').terrain,undefined);assert.throws(()=>world.installChunk({...data,authority:'other'}),/metadata/);
});

test('early loading cancels promptly and releases late resources',async()=>{
 const world={loading:new AbortController(),disposed:false},released=[];installEarlyWorkerWorldServices(world);let finish;const pending=world.loadReady(new Promise(resolve=>{finish=resolve;}),value=>released.push(value));world.loading.abort();await assert.rejects(pending,/cancelada/);finish('late');await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(released,['late']);
});

test('tutorial focus comes from the authority when no local navigation exists',async()=>{
 const focused=[],pending=[],world={state:{},nav:{workerProjection:true},focus:point=>focused.push(point),workerRuntime:{submit:command=>new Promise(resolve=>pending.push({command,resolve}))}};installEarlyWorkerWorldServices(world);
 world.focusTutorialPlacement('plant');assert.deepEqual(pending[0].command,{kind:'tutorialGuideTarget',toolKind:'plant',toolSpell:null});world.cancelTutorialFocus();pending[0].resolve({value:{target:'old',position:[1,2,3]}});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(focused,[]);
 world.focusTutorialPlacement('center');pending[1].resolve({value:{target:'new',position:[4,5,6]}});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(focused,[{x:4,z:6}]);
});

test('manual camera input cancels pending authoritative tutorial focus',async()=>{
 const focused=[],pending=[],world={state:{},nav:{workerProjection:true},canvas:new EventTarget(),controls:new EventDispatcher(),canvasEvents:new AbortController(),focus:point=>focused.push(point),workerRuntime:{submit:command=>new Promise(resolve=>pending.push({command,resolve}))}};
 installEarlyWorkerWorldServices(world);const release=installTutorialFocusInterruption(world);
 for(const type of ['pointerdown','wheel','start']){
  world.focusTutorialPlacement('center');const request=pending.at(-1);
  if(type==='start')world.controls.dispatchEvent({type});else world.canvas.dispatchEvent(new Event(type));
  request.resolve({value:{target:'center-site',position:[1,0,2]}});await new Promise(resolve=>setImmediate(resolve));
 }
 assert.deepEqual(focused,[]);release();world.canvasEvents.abort();
});

test('legacy tutorial targeting loads only on demand and ignores stale focus requests',async()=>{
 const focused=[],loads=[],state={},nav={},world={state,nav,focus:point=>focused.push(point)};
 installEarlyWorkerWorldServices(world,{loadLegacyTutorialTarget:()=>new Promise(resolve=>loads.push(resolve))});
 assert.equal(loads.length,0);world.focusTutorialPlacement('plant');world.cancelTutorialFocus();await Promise.resolve();assert.equal(loads.length,0);world.focusTutorialPlacement('plant');await Promise.resolve();assert.equal(loads.length,1);world.cancelTutorialFocus();loads[0]({tutorialHandTarget:()=>{throw Error('stale query executed');}});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(focused,[]);
 world.focusTutorialPlacement('center');await Promise.resolve();assert.equal(loads.length,2);loads[1]({tutorialHandTarget:(s,n,kind)=>{assert.equal(s,state);assert.equal(n,nav);assert.equal(kind,'center');return {target:'center',position:[4,5,6]};}});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(focused,[{x:4,z:6}]);
});

test('authority tutorial focus never loads local navigation',async()=>{
 let loads=0;const world={state:{},nav:{workerProjection:true},focus(){},workerRuntime:{submit:()=>Promise.resolve({value:null})}};installEarlyWorkerWorldServices(world,{loadLegacyTutorialTarget:()=>{loads++;throw Error('unexpected local query');}});world.focusTutorialPlacement('plant');await new Promise(resolve=>setImmediate(resolve));assert.equal(loads,0);
});

test('camera residency and farm focus use confirmed compact state after snapshot removal',()=>{const nav=createWorkerNavigationProjection({bounds:[-24,-24,24,24],eye:{x:0,z:0},target:{x:0,z:0}}),calls=[],focused=[],world={nav,actorAudio:{structures:[{id:'center',kind:'center',status:'intact',x:3,z:4}],raid:{animals:[{id:'a',status:'active',x:100,z:0,radius:1,spawn:{x:100,z:0},exit:{x:190,z:0},path:[{x:110,z:0}]}]}},confirmedHud:{construction:{villages:[{x:0,z:0}]}},camera:{position:{x:0,z:0}},controls:{target:{x:0,z:0}},quality:'media',workerRuntime:{backgroundViews:true,setNavigationView:view=>calls.push(view)},focus:value=>focused.push(value)};installEarlyWorkerWorldServices(world);world.syncNavigationView();world.focusFarm();assert.equal(focused[0].id,'center');assert.ok(calls[0].bounds[2]>=190);});
