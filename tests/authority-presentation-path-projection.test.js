import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedPresentationState} from '../src/simulation/confirmed-live-state.js';
import {createSimulationAuthority,authoritySnapshotFields} from '../src/simulation/simulation-authority.js';
import {createMainSnapshotEncoder,createMainSnapshotDecoder} from '../src/simulation/main-thread-snapshot-transport.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';

test('real authority prepares transport fields without changing snapshots or simulation',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),initial=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)keys.push(`${x},${z}`);
 const baseline=createSimulationAuthority(module,snapshot,keys,{compactPresentationPaths:true}),prepared=createSimulationAuthority(module,snapshot,keys,{compactPresentationPaths:true,prepareTransportSnapshots:true}),encoder=createMainSnapshotEncoder({prepareSnapshot:()=>{throw Error('unexpected snapshot parse');}}),decoder=createMainSnapshotDecoder();
 try{for(let sequence=1;sequence<=4;sequence++){const command=sequence===4?{kind:'snapshot',sequence}:{kind:'advance',sequence,seconds:.05,nightFastForward:false},a=baseline.execute(command),b=prepared.execute(command);assert.equal(b.snapshot,a.snapshot);assert.deepEqual(b.events,a.events);assert.ok(b[authoritySnapshotFields] instanceof Map);assert.equal(Object.getOwnPropertyDescriptor(b,authoritySnapshotFields).enumerable,false);const publication={...b,kind:'result',session:'s'},wire=encoder.encode({kind:'publication',publication},{preparedFields:b[authoritySnapshotFields],forceFull:sequence===4});assert.deepEqual(JSON.parse(decoder.decode(wire).publication.snapshot),JSON.parse(a.snapshot));if(sequence===4)assert.equal(wire.publication.snapshot,a.snapshot);}}
 finally{baseline.dispose();prepared.dispose();}
});

test('real authority projects only future route tails and keeps checkpoints and simulation identical',()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),initial=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),snapshot=serialize(initial),keys=[];for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)keys.push(`${x},${z}`);
 const baseline=createSimulationAuthority(module,snapshot,keys),projected=createSimulationAuthority(module,snapshot,keys,{compactPresentationPaths:true}),display=deserialize(snapshot),receiver=createConfirmedStateReceiver(display,'s');let reduced=false;
 try{
  for(let sequence=1;sequence<=4;sequence++){
   const command={kind:'advance',sequence,seconds:.05,steps:2,nightFastForward:true},a=baseline.execute(command),b=projected.execute(command);assert.deepEqual(a.events,b.events);assert.equal(a.elapsed,b.elapsed);
   if(b.presentationPaths){assert.equal(b.presentationPaths,'head-v1');assert.equal(b.snapshot,serializeConfirmedPresentationState(JSON.parse(a.snapshot)));assert.ok(b.snapshot.length<a.snapshot.length);reduced=true;}else assert.equal(b.snapshot,a.snapshot);
   assert.equal(receiver.accept({...b,session:'s'}).accepted,true);
  }
  assert.equal(reduced,true);const checkpoint={kind:'advance',sequence:5,seconds:.05,steps:1,nightFastForward:true,visualTerrain:true},ca=baseline.execute(checkpoint),cb=projected.execute(checkpoint);assert.equal(cb.presentationPaths,undefined);assert.equal(ca.snapshot,cb.snapshot);assert.ok(cb.terrainCheckpoint);assert.equal(receiver.accept({...cb,session:'s'}).accepted,true);
  const a=baseline.execute({kind:'snapshot',sequence:6}),b=projected.execute({kind:'snapshot',sequence:6});assert.equal(b.presentationPaths,undefined);assert.equal(a.snapshot,b.snapshot);assert.deepEqual(a.events,b.events);assert.equal(receiver.accept({...b,session:'s'}).accepted,true);assert.equal(serialize(display),a.snapshot);
 }finally{baseline.dispose();projected.dispose();}
});
