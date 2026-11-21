import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const hostSource=readFileSync(new URL('../src/simulation/worker-runtime-host.js',import.meta.url),'utf8');
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const source=hostSource;
 const start=source.indexOf("  if(data.kind==='command'){"),end=source.indexOf("  throw Error('Unknown runtime host message');",start);assert(start>=0&&end>start);
 const tail=source.slice(end),outer=tail.slice(tail.indexOf(' }catch(error){'),tail.indexOf('\n};'));
 const messages=[],faults=[],prepares=[];let sequence=0,release,reject,finishCalled=false;
 const gate=new Promise((yes,no)=>{release=yes;reject=no;});gate.catch(()=>{});
 const deps={runtime:{async submit(command){const current=++sequence;messages.push({kind:'publication',sequence:current});return {sequence:current};}},authorityClient:{async prepareNativeStructureCommand(command){prepares.push(command.id);},finishNativeStructureCommand(){finishCalled=true;return gate;}},postMessage:message=>{messages.push(message);if(message.kind==='commandResult')assert.equal(message.sequence,sequence,'receipt must accompany its publication');},visualStream:{fail:error=>faults.push(error)}};
 const handler=new Function(...Object.keys(deps),`let nativeResourceAttached=true,nativeRecoveryHold=null,nativeStructureRelease=null,recoveryFault=null,recoveryFrozen=false,outbox=null,session='s';const foldedViews=new Map();return async data=>{try{${source.slice(start,end)}${outer}};`)(...Object.values(deps));
 return {handler,messages,faults,prepares,release,reject,finished:()=>finishCalled,publish(){messages.push({kind:'publication',sequence:++sequence});}};
}
test('Build receipt precedes delayed release and later publications; next Build waits for release',async()=>{
 const f=fixture(),first=f.handler({kind:'command',id:1,command:{kind:'buildWallChain',id:'first'}});await flush();assert(f.finished());assert.equal(f.messages.filter(m=>m.kind==='commandResult'&&m.id===1).length,1);
 f.publish();const second=f.handler({kind:'command',id:2,command:{kind:'placeStructure',id:'second'}});await flush();assert.deepEqual(f.prepares,['first']);f.release();await Promise.all([first,second]);assert.deepEqual(f.prepares,['first','second']);assert.equal(f.messages.filter(m=>m.kind==='commandResult').length,2);assert.deepEqual(f.faults,[]);
});
test('release failure after purchase faults the owner without a second result or command failure',async()=>{
 const f=fixture(),task=f.handler({kind:'command',id:1,command:{kind:'buildWallChain',id:'first'}});await flush();f.reject(Error('release failed'));await task;assert.equal(f.messages.filter(m=>m.kind==='commandResult').length,1);assert.equal(f.messages.filter(m=>m.kind==='commandFailure').length,0);assert.equal(f.messages.filter(m=>m.kind==='failure').length,1);assert.equal(f.faults.length,1);
});
