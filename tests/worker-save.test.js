import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {createWorkerSaveCoordinator,workerCheckpointPolicy} from '../src/persistence/worker-save.js';
import {encodePhysicsCheckpoint} from '../src/simulation/physics-checkpoint-codec.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const packet=(state,sequence,saveAvailable=true)=>({sequence,saveAvailable,snapshot:serialize(state),raidWaitBindings:[]});

test('worker checkpoints are captured immediately and written in request order',async()=>{
 const state=newGame({seed:712,slotId:'a'}),barriers=[],writes=[],firstWrite=deferred();
 const runtime={submit(command){assert.deepEqual(command,{kind:'snapshot'});const d=deferred();barriers.push(d);return d.promise;}};
 const repository={async save(saved){writes.push(structuredClone(saved));if(writes.length===1)await firstWrite.promise;}};
 const saves=createWorkerSaveCoordinator({runtime,repository,slotId:'a',now:()=>123});
 const a=saves.request(),b=saves.request();assert.equal(barriers.length,2);
 barriers[0].resolve(packet(state,1));state.day=2;barriers[1].resolve(packet(state,2));state.day=3;
 await new Promise(resolve=>setImmediate(resolve));assert.equal(writes.length,1);assert.equal(writes[0].day,1);
 firstWrite.resolve();assert.deepEqual(await a,{saved:true,sequence:1,elapsed:0});assert.equal((await b).sequence,2);
 assert.equal(writes[1].day,2);assert.equal(writes[1].savedAt,123);
});

test('unsafe physics checkpoint does not write or wait for the simulation to resume',async()=>{
 const state=newGame({seed:712,slotId:'a'});let writes=0;
 const saves=createWorkerSaveCoordinator({runtime:{submit:async()=>packet(state,4,false)},repository:{save(){writes++;}},slotId:'a'});
 assert.deepEqual(await saves.request(),{saved:false,reason:'physics-active',sequence:4});assert.equal(writes,0);
});
test('experimental physics save accepts an encoded supported checkpoint but not an unavailable one',async()=>{
 const state=newGame({seed:712,slotId:'a'}),physical=encodePhysicsCheckpoint({version:1,fall:{solver:{world:new Uint8Array([1,2,3])}}}),sent=[],writes=[];let checkpoint=null;
 const saves=createWorkerSaveCoordinator({runtime:{submit:async command=>{sent.push(command);return {...packet(state,1,false),snapshot:serializeConfirmedState(state),physicsCheckpoint:checkpoint};}},repository:{save(s){writes.push(s);}},slotId:'a',experimentalPhysics:true});
 assert.equal((await saves.request()).saved,false);checkpoint=physical;assert.equal((await saves.request()).saved,true);assert.equal(writes[0].workerPhysicsCheckpoint,physical);assert.deepEqual(sent.map(x=>x.physicsCheckpoint),['encoded','encoded']);
 state.pauses.push('campaign-cinematic');assert.equal((await saves.request()).saved,false);assert.equal(writes.length,1);
});

test('failed and cross-slot checkpoints do not block later saves',async()=>{
 const state=newGame({seed:712,slotId:'a'}),other=newGame({seed:713,slotId:'b'});let n=0,writes=0;
 const saves=createWorkerSaveCoordinator({runtime:{submit(){n++;if(n===1)return Promise.reject(Error('worker failed'));return Promise.resolve(packet(n===2?other:state,n));}},repository:{save(){writes++;}},slotId:'a'});
 await assert.rejects(saves.request(),/worker failed/);await assert.rejects(saves.request(),/slot mismatch/);
 assert.equal((await saves.request()).saved,true);assert.equal(writes,1);
});

test('invalid navigation wait bindings cannot be persisted',async()=>{
 const state=newGame({seed:712,slotId:'a'}),bad={...packet(state,1),raidWaitBindings:[{id:'missing',epoch:null,current:true}]};let writes=0;
 const saves=createWorkerSaveCoordinator({runtime:{submit:async()=>bad},repository:{save(){writes++;}},slotId:'a'});
 await assert.rejects(saves.request(),/bindings do not match/);assert.equal(writes,0);
});

test('native checkpoint is saved only when requested and validates before persistence',async()=>{
 const state=newGame({seed:712,slotId:'a'}),writes=[],sent=[];let native=null;
 const saves=createWorkerSaveCoordinator({runtime:{submit:async command=>{sent.push(command);return {...packet(state,1),nativeAuthorityCheckpoint:native};}},repository:{save(s){writes.push(s);}},slotId:'a',experimentalNativeAuthority:true});
 await assert.rejects(saves.request(),/native authority checkpoint/);assert.equal(writes.length,0);
 native={version:1,chunkKeys:['0,0'],spatialState:{version:5,seed:712,biome:'savanna',settlements:[],barriers:[],polygons:[],removedProps:[],nextBarrierId:1,nextPolygonId:1},navigationView:null};
 assert.equal((await saves.request()).saved,true);assert.deepEqual(writes[0].workerNativeAuthorityCheckpoint,native);assert.deepEqual(sent,[{kind:'snapshot',nativeAuthorityCheckpoint:true},{kind:'snapshot',nativeAuthorityCheckpoint:true}]);
 native.chunkKeys.push('0,0');await assert.rejects(saves.request(),/native authority checkpoint/);assert.equal(writes.length,1);
});

test('explicit checkpoint policy requests native and physical state without QA options',async()=>{
 const state=newGame({seed:712,slotId:'a'}),physical=encodePhysicsCheckpoint({version:1,fall:{solver:{world:new Uint8Array([1,2,3])}}}),native={version:1,chunkKeys:['0,0'],spatialState:{version:5,seed:712,biome:'savanna',settlements:[],barriers:[],polygons:[],removedProps:[],nextBarrierId:1,nextPolygonId:1},navigationView:null},commands=[],saved=[];
 const requested={physics:true,nativeAuthority:true},policy=workerCheckpointPolicy(requested),saves=createWorkerSaveCoordinator({runtime:{submit:async command=>{commands.push(command);return {...packet(state,1,false),snapshot:serializeConfirmedState(state),physicsCheckpoint:physical,nativeAuthorityCheckpoint:native};}},repository:{save:state=>saved.push(state)},slotId:'a',checkpointPolicy:policy});requested.physics=false;
 assert.equal((await saves.request()).saved,true);assert.deepEqual(commands,[{kind:'snapshot',physicsCheckpoint:'encoded',nativeAuthorityCheckpoint:true}]);assert.equal(saved[0].workerPhysicsCheckpoint,physical);assert.deepEqual(saved[0].workerNativeAuthorityCheckpoint,native);assert.ok(Object.isFrozen(policy));
 assert.throws(()=>workerCheckpointPolicy({physics:'yes'}),/checkpoint policy/);assert.throws(()=>workerCheckpointPolicy({other:true}),/checkpoint policy/);assert.throws(()=>createWorkerSaveCoordinator({runtime:{submit(){}},repository:{save(){}},slotId:'a',checkpointPolicy:{},experimentalPhysics:true}),/Conflicting/);
});
