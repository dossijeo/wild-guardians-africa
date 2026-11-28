import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptLiveTerrainCheckpoint} from '../src/rendering/live-terrain-checkpoint.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';

test('automatic recovery base does not rebuild live terrain or discard late terrain',()=>{
 const applied=[],acks=[],port={postMessage:m=>acks.push(m.id),close(){},start(){}},terrain=createConfirmedTerrainReceiver({port,session:'s',confirmedSequence:5,residency:{replace:(payload,revision)=>applied.push([payload.id,revision])}});
 const message={session:'s',sequence:5,physicsPose:null,terrainCheckpoint:{sequence:5,chunks:[{}],recoveryOnly:true}};
 const result=acceptLiveTerrainCheckpoint(message,'s',()=>{throw Error('must not restore');});
 assert.deepEqual(result,{sequence:5,chunks:1,activePoses:0,restored:false});
 port.onmessage({data:{kind:'terrain',session:'s',id:1,sequence:4,revision:1,payload:{id:'late'}}});
 assert.deepEqual(applied,[['late',1]]);assert.deepEqual(acks,[1]);terrain.dispose();
});
test('explicit checkpoint still invokes the full restore and invalid identities fail',()=>{
 let calls=0;const message={session:'s',sequence:5,terrainCheckpoint:{sequence:5,chunks:[]}},restore=input=>{assert.equal(input,message);calls++;return {restored:true};};
 assert.deepEqual(acceptLiveTerrainCheckpoint(message,'s',restore),{restored:true});assert.equal(calls,1);
 assert.throws(()=>acceptLiveTerrainCheckpoint({...message,session:'wrong'},'s',restore),/Invalid/);
 assert.throws(()=>acceptLiveTerrainCheckpoint({...message,terrainCheckpoint:{sequence:4,chunks:[]}},'s',restore),/Invalid/);
});
