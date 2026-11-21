import test from 'node:test';
import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {createWorkerGameRuntime} from '../src/simulation/worker-game-runtime.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function pump(f,promise){let done=false,result,error;promise.then(r=>{done=true;result=r;},e=>{done=true;error=e;});for(let i=0;i<2000&&!done;i++)await f.present();assert(done,'Build boundary timed out');if(error)throw error;return result;}
async function setup(){
 const source=nativeFarmArrivalRouteFixture({peer:false}),state=structuredClone(source.state);state.ledger.balance=rational(100000);
 const a=source.point(0,8),b=source.point(0,14),f=await nativeProductionAuthority(state,{chunkKeys:[...Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),'2,-1','2,0','2,1']});
 await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));
 const trace=[];globalThis.__buildHeadTrace=trace;const send=f.controlPort.postMessage.bind(f.controlPort);
 f.controlPort.postMessage=message=>{if(message.type==='IntentMutationQuiesce'||message.type==='IntentMutationRelease')trace.push({kind:message.type});send(message);};
 return {f,trace,command:{kind:'buildWallChain',id:'head-only-build',material:'zarzas',points:[[a.x,a.z],[b.x,b.z]],options:{smooth:false,snap:false}},async close(){delete globalThis.__buildHeadTrace;await f.close();source.close();}};
}
const holds=trace=>trace.filter(e=>e.kind==='IntentMutationQuiesce').length;

test('GPU hold starts after the real runtime FIFO head and quote, with no queue work or re-quote inside',async()=>{
 const x=await setup(),{f,trace,command}=x,prior=deferred();let runtime,blockSnapshot=false,head=false;
 try{
  const before=f.snapshot();await pump(f,f.authority.prepareNativeStructureCommand(command));
  assert.equal(holds(trace),0,'READY is not permission to block GPU while the command waits');
  for(let i=0;i<3;i++){f.advance();await f.present();}
  const after=f.snapshot();assert(after.elapsed>before.elapsed);assert.notDeepEqual([after.workers[0].x,after.workers[0].z],[before.workers[0].x,before.workers[0].z]);assert.equal(after.ledger.entries[command.id],undefined);
  let confirmed=0;
  const client={ready:Promise.resolve(),dispose(){},submit(c){
   const result=(async()=>{if(c.kind==='snapshot'&&blockSnapshot){blockSnapshot=false;await prior.promise;}
    if(c.kind==='buildWallChain'){head=true;trace.push({kind:'head'});return f.structureCommand(c);}return f.command(c);})();
   return {accepted:true,result};
  }};
  runtime=createWorkerGameRuntime({client,world:{createConfirmedReceiver:()=>({accept:r=>{confirmed=r.sequence;return {accepted:true};},status:()=>({sequence:confirmed,lastElapsed:0})})},session:'build-head',startupSuspended:true,now:()=>0,schedule:()=>1,cancel(){}});
  await pump(f,runtime.start());blockSnapshot=true;const preceding=runtime.submit({kind:'snapshot'}),purchase=runtime.submit(command);purchase.catch(()=>{});
  await f.present();assert.equal(head,false);assert.equal(holds(trace),0);assert.equal(f.host.inspect().nativeMutationHold,null);
  prior.resolve();await pump(f,preceding);const result=await pump(f,purchase);assert.equal(result.value,true,result.rejection);
  const i=trace.findIndex(e=>e.kind==='IntentMutationQuiesce'),j=trace.findIndex(e=>e.kind==='IntentMutationRelease');
  assert(trace.findIndex(e=>e.kind==='head')<i);assert(j>i);assert.equal(holds(trace),1);
  if(process.env.QA_BUILD_HEAD_TRACE==='1'){assert(trace.slice(0,i).some(e=>e.kind==='quote'));assert.equal(trace.slice(i,j).filter(e=>e.kind==='quote').length,0);}
  assert.equal(result.events.filter(e=>e.type==='WallChainBuilt').length,1);assert(JSON.parse(result.snapshot).ledger.entries[command.id]);
  assert.equal((await pump(f,runtime.submit(command))).value,false);
  await pump(f,f.authority.finishNativeStructureCommand(command));assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
  console.log(JSON.stringify({case:'fifo-head',trace}));
 }finally{prior.resolve();runtime?.dispose();await x.close();}
});

for(const mode of ['cancel','quote-change'])test(`${mode} between graphics READY and FIFO head never starts a GPU hold or charges`,async()=>{
 const x=await setup(),{f,trace,command}=x;try{
  const before=f.snapshot();await pump(f,f.authority.prepareNativeStructureCommand(command));assert.equal(holds(trace),0);
  if(mode==='cancel'){await pump(f,f.authority.finishNativeStructureCommand(command));assert.equal(f.command(command).value,false);}
  else{f.command({kind:'pause',reason:'changed-before-head'});const result=await pump(f,f.structureCommand(command));assert.equal(result.value,false);await pump(f,f.authority.finishNativeStructureCommand(command));}
  assert.equal(holds(trace),0);const after=f.snapshot();assert.equal(after.ledger.entries[command.id],undefined);assert.deepEqual(after.structures,before.structures);
  assert.equal(f.records.find(r=>r.kind==='barrier-addition').committed,false);assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});

test('one head owns the pending mutation; duplicate entry and a competing command cannot consume it',async()=>{
 const x=await setup(),{f,command}=x;try{
  await pump(f,f.authority.prepareNativeStructureCommand(command));const before=f.command({kind:'snapshot'}),captured={...command,sequence:before.sequence+1};
  const entering=f.authority.beginNativeStructureCommand(captured);entering.catch(()=>{});
  assert.throws(()=>f.authority.execute(captured),/boundary is not ready/);
  await assert.rejects(f.authority.beginNativeStructureCommand(captured),/already entered/);
  assert.throws(()=>f.authority.execute({kind:'snapshot',sequence:captured.sequence}),/FIFO head is occupied/);
  await pump(f,entering);const result=f.authority.execute(captured);assert.equal(result.value,true,result.rejection);assert.equal(result.events.filter(e=>e.type==='WallChainBuilt').length,1);
  await pump(f,f.authority.finishNativeStructureCommand(command));assert.deepEqual(f.faults,[]);
 }finally{await x.close();}
});
