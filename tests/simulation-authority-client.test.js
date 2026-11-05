import test from 'node:test';import assert from 'node:assert/strict';import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
function fixture(capacity=2){const sent=[],worker={postMessage:m=>sent.push(m),terminate(){this.terminated=true;}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',capacity,workerFactory:()=>worker});return {client,worker,sent,receive:data=>worker.onmessage({data})};}
test('journalled authority permits ordered terrain reattachment without QA mode',async()=>{
 const sent=[],worker={postMessage:(message,transfer)=>sent.push({message,transfer}),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',onTerrainJournal:()=>{},workerFactory:()=>worker});
 worker.onmessage({data:{kind:'ready',session:'s'}});await client.ready;
 const port={},pending=client.reattachTerrain(port);assert.equal(sent.at(-1).message.kind,'reattachTerrain');assert.deepEqual(sent.at(-1).transfer,[port]);
 const command=client.submit({kind:'snapshot'});assert.equal(sent.at(-1).message.kind,'reattachTerrain');
 worker.onmessage({data:{kind:'terrainReattached',session:'s'}});await pending;assert.equal(sent.at(-1).message.kind,'command');
 worker.onmessage({data:{kind:'result',session:'s',sequence:1}});await command.result;client.dispose();
});
test('shared rigs remain opt in to the authority worker',()=>{const sent=[],worker={postMessage:m=>sent.push(m),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',shareSpeciesRigs:true,workerFactory:()=>worker});assert.equal(sent[0].shareSpeciesRigs,true);client.ready.catch(()=>{});client.dispose();const usual=fixture();assert.equal(usual.sent[0].shareSpeciesRigs,undefined);usual.client.ready.catch(()=>{});usual.client.dispose();});
test('commands queue in order and reject capacity without consuming a sequence',async()=>{const f=fixture(),a=f.client.submit({kind:'pause',reason:'test'}),b=f.client.submit({kind:'snapshot'});assert.equal(f.client.submit({kind:'snapshot'}).reason,'capacity');assert.equal(f.sent.length,1);f.receive({kind:'ready',session:'s'});await f.client.ready;assert.equal(f.sent[1].command.sequence,1);f.receive({kind:'result',session:'s',sequence:1});await a.result;assert.equal(f.sent[2].command.sequence,2);f.receive({kind:'result',session:'s',sequence:2});await b.result;assert.equal(f.client.status().next,3);f.client.dispose();});
test('wrong session or out-of-order responses fail all pending commands',async()=>{const f=fixture();f.receive({kind:'ready',session:'s'});await f.client.ready;const a=f.client.submit({kind:'snapshot'}),b=f.client.submit({kind:'snapshot'}),rejected=Promise.allSettled([a.result,b.result]);f.receive({kind:'result',session:'wrong',sequence:1});assert.deepEqual((await rejected).map(x=>x.status),['rejected','rejected']);assert.equal(f.client.status().state,'failed');assert.equal(f.worker.terminated,true);assert.equal(f.client.submit({kind:'snapshot'}).reason,'failed');});
test('queued commands capture their values at admission',async()=>{const f=fixture(),command={kind:'castShield',id:'shield',x:1,z:2,selection:{origin:{x:3,y:4,z:5}}},a=f.client.submit(command);command.selection.origin.x=99;command.x=77;f.receive({kind:'ready',session:'s'});await f.client.ready;assert.equal(f.sent[1].command.x,1);assert.equal(f.sent[1].command.selection.origin.x,3);f.receive({kind:'result',session:'s',sequence:1});await a.result;f.client.dispose();});

test('worker command error terminates authority and cannot publish another journal',async()=>{
 const f=fixture();f.receive({kind:'ready',session:'s'});await f.client.ready;
 const first=f.client.submit({kind:'advance',seconds:.1,nightFastForward:false}),next=f.client.submit({kind:'snapshot'}),results=Promise.allSettled([first.result,next.result]);
 f.receive({kind:'error',session:'s',sequence:1,message:'command failed after partial work'});
 assert.deepEqual((await results).map(r=>r.status),['rejected','rejected']);assert.equal(f.worker.terminated,true);assert.equal(f.client.submit({kind:'snapshot'}).reason,'failed');
 assert.equal(f.sent.filter(m=>m.kind==='command').length,1);
});
test('terrain journal is delivered before its matching command result',async()=>{
 const sent=[],seen=[],worker={postMessage:m=>sent.push(m),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'s',onTerrainJournal:(sequence,chunks)=>seen.push({sequence,chunks}),workerFactory:()=>worker});
 worker.onmessage({data:{kind:'ready',session:'s'}});await client.ready;const request=client.submit({kind:'snapshot'});worker.onmessage({data:{kind:'terrainJournal',session:'s',sequence:1,chunks:[{cx:0,cz:0}]}});worker.onmessage({data:{kind:'result',session:'s',sequence:1}});await request.result;assert.deepEqual(seen,[{sequence:1,chunks:[{cx:0,cz:0}]}]);client.dispose();
});

test('authored center templates are forwarded only when explicitly enabled',()=>{
 const defaults=fixture();assert.equal(defaults.sent[0].authoredCenterTemplates,undefined);defaults.client.ready.catch(()=>{});defaults.client.dispose();
 const sent=[],worker={postMessage:message=>sent.push(message),terminate(){}},client=createSimulationAuthorityClient({snapshot:'{}',chunkKeys:[],session:'authored',authoredCenterTemplates:true,workerFactory:()=>worker});assert.equal(sent[0].authoredCenterTemplates,true);client.ready.catch(()=>{});client.dispose();
});
