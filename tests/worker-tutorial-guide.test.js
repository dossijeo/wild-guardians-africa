import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerTutorialGuide} from '../src/app/worker-tutorial-guide.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){let now=0,key='guide',sequence=7;const frame={sequence:7,terrainGeneration:2,selectableGeneration:3,cameraVersion:1},calls=[],configs=[];
 const client={guardianFrame:()=>({...frame}),guardianContext:async()=>({context:{epoch:'e',camera:{position:[1,2,3]}},frame:{...frame}}),verifyGuardianFrame:async()=>true,setGuardianGuide:async guide=>{calls.push(guide);return {accepted:true,visibility:'unknown'};},clearGuardianGuide:()=>{calls.push('clear');return true;}};
 const runtime={status:()=>({confirmedSequence:sequence}),submit:async()=>{sequence=8;return {sequence:8,value:{origin:{x:2,y:3,z:4},position:[4,5,6],cropHeightInputs:[]}};}};
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
 f.setKey('other');f.guide.update({key:'other',toolKind:'plant'});resolve({sequence:8,value:{origin:{x:2,y:3,z:4},position:[4,5,6],cropHeightInputs:[]}});await flush();assert.ok(!f.calls.some(item=>item!=='clear'));f.guide.dispose();
});
test('guide bounds retries when the authoritative context keeps changing',async()=>{
 const f=fixture();let count=0;f.client.guardianContext=async()=>{count++;throw Error('stale');};f.guide.update({key:'guide',toolKind:'center'});
 for(const at of [300,1400,2500,3600,4700]){f.setTime(at);f.guide.update({key:'guide',toolKind:'center'});await flush();}
 assert.equal(count,3);f.guide.dispose();
});
test('guide recovers from transient failures after its initial retry window',async()=>{
 const f=fixture(),context=f.client.guardianContext;let count=0;f.client.guardianContext=async()=>{if(++count<=3)throw Error('temporarily unavailable');return context();};
 try{f.guide.update({key:'guide',toolKind:'center'});for(const at of [300,1400,2500,4700,6499]){f.setTime(at);f.guide.update({key:'guide',toolKind:'center'});await flush();}assert.equal(count,3);f.setTime(6500);f.guide.update({key:'guide',toolKind:'center'});await flush();assert.equal(count,4);assert.equal(f.configs.at(-1).position[0],4);}finally{f.guide.dispose();}
});
test('guide hides when an authority-sampled crop height changes',async()=>{
 let now=0,growth=0,sequence=7;const calls=[],frame={sequence:7,terrainGeneration:2,selectableGeneration:3,cameraVersion:1};
 const client={guardianFrame:()=>({...frame}),guardianContext:async()=>({context:{camera:{position:[1,2,3]}},frame:{...frame}}),verifyGuardianFrame:async()=>true,setGuardianGuide:async()=>{calls.push('shown');},clearGuardianGuide:()=>calls.push('clear')};
 const runtime={status:()=>({confirmedSequence:sequence}),submit:async()=>{sequence=8;return {sequence:8,value:{origin:{x:2,y:3,z:4},position:[4,5,6],cropHeightInputs:[{id:'p',species:'platano',growth:0}]}};}};
 const guide=createWorkerTutorialGuide({client,runtime,keyNow:()=>'guide',clock:()=>now,heightsCurrent:inputs=>inputs.every(item=>item.growth===growth)});
 guide.update({key:'guide',toolKind:'plant'});now=300;guide.update({key:'guide',toolKind:'plant'});await flush();assert.deepEqual(calls,['shown']);
 growth=1;guide.update({key:'guide',toolKind:'plant'});assert.deepEqual(calls,['shown','clear']);guide.dispose();
});
test('a crop changing while admission is pending cannot publish a stale guide',async()=>{
 let now=0,growth=0,sequence=7,finish;const calls=[],frame={sequence:7,terrainGeneration:2,selectableGeneration:3,cameraVersion:1};
 const client={guardianFrame:()=>({...frame}),guardianContext:async()=>({context:{camera:{position:[1,2,3]}},frame:{...frame}}),verifyGuardianFrame:async()=>true,setGuardianGuide:()=>new Promise(resolve=>{calls.push('admitting');finish=resolve;}),clearGuardianGuide:()=>calls.push('clear')};
 const runtime={status:()=>({confirmedSequence:sequence}),submit:async()=>{sequence=8;return {sequence:8,value:{origin:{x:2,y:3,z:4},position:[4,5,6],cropHeightInputs:[{id:'p',species:'platano',growth:0}]}};}};
 const guide=createWorkerTutorialGuide({client,runtime,keyNow:()=>'guide',clock:()=>now,heightsCurrent:inputs=>inputs.every(item=>item.growth===growth)});
 guide.update({key:'guide',toolKind:'plant'});now=300;guide.update({key:'guide',toolKind:'plant'});await flush();assert.deepEqual(calls,['admitting']);
 growth=1;finish({accepted:true,visibility:'unknown'});await flush();assert.deepEqual(calls,['admitting','clear']);guide.dispose();
});
test('viewport revision clears a previously admitted guide',async()=>{
 const f=fixture();f.guide.update({key:'guide',toolKind:'center'});f.setTime(300);f.guide.update({key:'guide',toolKind:'center'});await flush();
 assert.equal(f.calls.length,1);f.frame.viewportVersion=1;f.setTime(500);f.guide.update({key:'guide',toolKind:'center'});
 assert.equal(f.calls.at(-1),'clear');assert.equal(f.configs.at(-1),null);f.guide.dispose();
});
test('authority revision invalidates a shown guide and unsubscribes without scanning main state',async()=>{let now=0,sequence=7,revision=null;const commands=[],calls=[],frame={sequence:7,terrainGeneration:2,selectableGeneration:3,cameraVersion:1},client={guardianFrame:()=>({...frame}),guardianContext:async()=>({context:{camera:{position:[1,2,3]}},frame:{...frame}}),verifyGuardianFrame:async()=>true,setGuardianGuide:async()=>calls.push('shown'),clearGuardianGuide:()=>calls.push('clear')},runtime={status:()=>({confirmedSequence:sequence,tutorialGuideRevision:revision}),submit:async command=>{commands.push(command);if(command.trackGuideRevision===false){revision=null;return {sequence};}revision=1;sequence=8;return {sequence,tutorialGuideRevision:1,value:{origin:{x:2,y:3,z:4},position:[4,5,6],cropHeightInputs:[{id:'p',species:'mijo',growth:1}]}};}},guide=createWorkerTutorialGuide({client,runtime,keyNow:()=>'guide',clock:()=>now,trackRevision:true,heightsCurrent:()=>{throw Error('must not scan');}});try{guide.update({key:'guide',toolKind:'plant'});now=300;guide.update({key:'guide',toolKind:'plant'});await flush();assert.deepEqual(calls,['shown']);assert.equal(commands[0].trackGuideRevision,true);revision=2;guide.update({key:'guide',toolKind:'plant'});await flush();assert.deepEqual(calls,['shown','clear']);assert.ok(commands.some(command=>command.trackGuideRevision===false));}finally{guide.dispose();}});
test('revision changed during frame verification prevents stale admission',async()=>{let now=0,sequence=7,revision=null,finish;const calls=[],frame={sequence:7,terrainGeneration:2,selectableGeneration:3,cameraVersion:1},client={guardianFrame:()=>({...frame}),guardianContext:async()=>({context:{camera:{position:[1,2,3]}},frame:{...frame}}),verifyGuardianFrame:()=>new Promise(resolve=>{finish=resolve;}),setGuardianGuide:async()=>calls.push('shown'),clearGuardianGuide:()=>calls.push('clear')},runtime={status:()=>({confirmedSequence:sequence,tutorialGuideRevision:revision}),submit:async command=>{if(command.trackGuideRevision===false){revision=null;return {sequence};}revision=1;sequence=8;return {sequence,tutorialGuideRevision:1,value:{origin:{x:2,y:3,z:4},position:[4,5,6],cropHeightInputs:[]}};}},guide=createWorkerTutorialGuide({client,runtime,keyNow:()=>'guide',clock:()=>now,trackRevision:true});try{guide.update({key:'guide',toolKind:'plant'});now=300;guide.update({key:'guide',toolKind:'plant'});await flush();revision=2;finish(true);await flush();assert.ok(!calls.includes('shown'));}finally{guide.dispose();}});
