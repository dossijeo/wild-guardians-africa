import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerTutorialGuide} from '../src/app/worker-tutorial-guide.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){let now=0,key='guide',sequence=7;const frame={sequence:7,terrainGeneration:2,selectableGeneration:3,cameraVersion:1},calls=[],configs=[];
 const client={guardianFrame:()=>({...frame}),guardianContext:async()=>({context:{epoch:'e',camera:{position:[1,2,3]}},frame:{...frame}}),verifyGuardianFrame:async()=>true,setGuardianGuide:async guide=>{calls.push(guide);return {accepted:true,visibility:'unknown'};},clearGuardianGuide:()=>{calls.push('clear');return true;}};
 const runtime={status:()=>({confirmedSequence:sequence}),submit:async()=>{sequence=8;return {sequence:8,value:{origin:{x:2,y:3,z:4},position:[4,5,6]}};}};
 const guide=createWorkerTutorialGuide({client,runtime,keyNow:()=>key,clock:()=>now,onConfig:value=>configs.push(value)});
 return {client,runtime,guide,calls,configs,frame,setKey:value=>key=value,setTime:value=>now=value};}
test('guide uses authoritative origin once and never declares visibility',async()=>{
 const f=fixture();f.guide.update({key:'guide',toolKind:'center'});f.setTime(300);f.guide.update({key:'guide',toolKind:'center'});await flush();
 assert.deepEqual(f.calls,[{origin:{x:2,y:3,z:4},target:[4,5,6],camera:{x:1,y:2,z:3}}]);assert.equal(f.configs.at(-1).position[0],4);
 f.setTime(4000);f.guide.update({key:'guide',toolKind:'center'});await flush();assert.equal(f.calls.length,1);
 f.setKey(null);f.guide.update({key:null});assert.equal(f.calls.at(-1),'clear');f.guide.dispose();
});
test('guide discards late authoritative answers after a camera or target change',async()=>{
 const f=fixture();let resolve;f.runtime.submit=()=>new Promise(done=>{resolve=done;});f.guide.update({key:'guide',toolKind:'center'});f.setTime(300);f.guide.update({key:'guide',toolKind:'center'});await flush();
 f.setKey('other');f.guide.update({key:'other',toolKind:'plant'});resolve({sequence:8,value:{origin:{x:2,y:3,z:4},position:[4,5,6]}});await flush();assert.ok(!f.calls.some(item=>item!=='clear'));f.guide.dispose();
});
test('guide bounds retries when the authoritative context keeps changing',async()=>{
 const f=fixture();let count=0;f.client.guardianContext=async()=>{count++;throw Error('stale');};f.guide.update({key:'guide',toolKind:'center'});
 for(const at of [300,1400,2500,3600,4700]){f.setTime(at);f.guide.update({key:'guide',toolKind:'center'});await flush();}
 assert.equal(count,3);f.guide.dispose();
});
