import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {copyNativeBarrierAdditionReference,copyNativeBarrierAdditionProposal,copyNativeBarrierAdditionAttestation,copyNativeBarrierAdditionResources,nativeBarrierAdditionPresentationMatches,sameNativeBarrierAdditionReference} from '../src/world/native-barrier-addition.js';
const module=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
// Real authority, native WASM and shared admission; the graphics drain/packet
// receipt is an explicit test double. This does not validate transport or GPU.
function setup({badReceipt=false,onHold=()=>{}}={}){
 const publications=[],f=createNativeRouteExecutionFixture({core:createSpatialWorld(module),onNativeWorldResources:r=>publications.push(r)});
 f.worker(1,f.point(-6,0),f.point(6,0));f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();
 let baseline,clock,closed=false,holdCount=0;const releases=[];
 const source={ownsGpuConsumer:consumer=>consumer===source,status:()=>({session:'solid-test',authorityEpoch:baseline.authorityEpoch,closed,sentSequence:clock.intentSequence,sentTime:clock.committedThrough,clockSequence:clock.clockSequence}),dispose(){closed=true;},
  async quiesceGpuForMutation(options){holdCount++;const s=source.status();onHold(f);return {authorityEpoch:s.authorityEpoch,session:s.session,sequence:s.sentSequence,effectiveTime:s.sentTime,clockSequence:s.clockSequence,holdId:holdCount,preparedWorldBoundary:options.preparedWorldBoundary,preparedFrameSequence:1,nativeBarrierAdditionVersion:badReceipt?0:1,preparedBarrierAdditionTemplate:options.preparedBarrierAdditionTemplate};},
  releaseGpuAfterMutation(receipt,value){releases.push(value);}
 };
 const stop=f.bridge.observeNativeIntentControl({gpuConsumer:{publication:source,owner:source},onBaseline:b=>{baseline=b;clock=b.clock;},onChanges:()=>{},onClock:value=>{clock=value;}});
 const p=f.point(35,35),additions=[{entityId:'wall-910001',x:Math.fround(p.x),z:Math.fround(p.z),halfX:1,halfZ:Math.fround(.3),yaw:Math.fround(.2),passMask:0}];
 const advance=()=>{f.state.elapsed+=.1;assert(f.w.nav_intent_execution_advance(f.state.elapsed)>=0);f.bridge.commitNativeCausalClock();};
 const run=(options={})=>f.bridge.addNativeBarriersAfterGpuQuiescence({additions,getPublication:()=>source,validate:()=>true,project:()=>true,prepareResources:({resources,proposedWorldBoundary})=>({preparedWorldBoundary:proposedWorldBoundary,preparedBarrierAdditionTemplate:resources.nativeBarrierAddition,valid:()=>true,commit:()=>true,abort(){}}),...options});
 return {...f,source,publications,releases,additions,advance,run,get holds(){return holdCount;},close(){stop();source.dispose();f.session.dispose();}};
}
test('solid batch uses real shared admission, permits elapsed execution and adopts before publication',async()=>{
 const f=setup();try{const before=f.session.core.snapshot(),body=f.body(1);let prepared,projected=false,retained=false;
  const result=await f.run({prepareResources:({resources,proposedWorldBoundary,deferredStart})=>{
   assert.equal(deferredStart,true);prepared=resources;assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.holds,0);f.advance();f.advance();assert.notDeepEqual(f.body(1),body);
   return {preparedWorldBoundary:proposedWorldBoundary,preparedBarrierAdditionTemplate:resources.nativeBarrierAddition,valid:()=>true,commit:actual=>{assert(projected);assert(nativeBarrierAdditionPresentationMatches(prepared,actual.resources,actual.nativeBarrierAdditionBinding));retained=true;return true;},abort(){}};
  },project:({ids,worldBoundary,nativeBarrierAdditionBinding})=>{assert.equal(ids.length,1);assert.equal(f.session.core.snapshot().barriers.length,before.barriers.length+1);assert.equal(f.publications.length,0);assert.deepEqual(worldBoundary,nativeBarrierAdditionBinding.reference.worldBoundary);projected=true;return true;}});
  assert.equal(result.status,'committed',JSON.stringify(result));assert(retained);assert.equal(f.holds,1);assert.equal(f.publications.length,1);assert.equal(f.releases.length,1);assert.equal(f.releases[0].committed,true);assert.deepEqual(f.releases[0].nativeBarrierAdditions,[result.nativeBarrierAdditionBinding]);assert.deepEqual(f.bridge.nativeWorldResourceBoundary(),result.worldBoundary);assert.equal(f.w.spatial_world_proposal_resource_snapshot(result.worldBoundary.nativeSession,result.worldBoundary.ticket),0);
 }finally{f.close();}
});
test('solid batch refuses stale purchase before native commit and never calls projection',async()=>{
 const f=setup();try{const before=f.session.core.snapshot();let valid=true,projected=0;const result=await f.run({validate:()=>valid,project:()=>{projected++;return true;},prepareResources:({resources,proposedWorldBoundary})=>{valid=false;return {preparedWorldBoundary:proposedWorldBoundary,preparedBarrierAdditionTemplate:resources.nativeBarrierAddition,valid:()=>true,commit:()=>true,abort(){}};}});assert.equal(result.status,'stale');assert.equal(projected,0);assert.equal(f.holds,0);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}finally{f.close();}
});
test('solid batch rejects an incomplete draw receipt without physical purchase',async()=>{
 const f=setup({badReceipt:true});try{const before=f.session.core.snapshot();let projected=0;const result=await f.run({project:()=>{projected++;return true;}});assert.equal(result.status,'invalid-receipt',JSON.stringify(result));assert.equal(projected,0);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.releases[0].committed,false);}finally{f.close();}
});
test('solid batch rejects a route-intersecting shape before graphical preparation',async()=>{
 const f=setup();try{const p=f.point(0,0),before=f.session.core.snapshot();let prepares=0;const result=await f.run({additions:[{...f.additions[0],x:Math.fround(p.x),z:Math.fround(p.z),halfX:1,halfZ:1}],prepareResources:()=>{prepares++;throw Error('must not prepare');}});assert.notEqual(result.status,'committed');assert.equal(prepares,0);assert.equal(f.holds,0);assert.deepEqual(f.session.core.snapshot(),before);}finally{f.close();}
});
test('solid batch closes drawing after an unexpected irreversible projection failure',async()=>{
 const f=setup();try{const before=f.session.core.snapshot();const result=await f.run({project:()=>{throw Error('unexpected projection failure');}});assert.equal(result.status,'committed-control-failed',JSON.stringify(result));assert.equal(f.session.core.snapshot().barriers.length,before.barriers.length+1);assert.equal(f.source.status().closed,true);assert.equal(f.releases.length,0);assert.equal(f.publications.length,0);}finally{f.close();}
});
test('solid command preparation waits for its FIFO turn with no earlier consequence, then consumes synchronously once',async()=>{
 const f=setup();try{const before=f.session.core.snapshot();let consume,resolveTurn,readyResolve,projects=0;const ready=new Promise(resolve=>{readyResolve=resolve;});
  const pending=f.run({atCommitBoundary:commit=>new Promise(resolve=>{consume=commit;resolveTurn=resolve;readyResolve();}),project:()=>{projects++;return true;}});
  await ready;assert.equal(projects,0);assert.equal(f.publications.length,0);assert.deepEqual(f.session.core.snapshot(),before);f.advance();f.advance();assert.equal(projects,0);
  const answer=consume();assert.equal(answer.status,'committed',JSON.stringify(answer));assert.equal(projects,1);assert.equal(f.publications.length,1);assert.equal(f.releases.length,1,'the commit must release its exact clock before another command can advance it');assert.throws(()=>consume(),/already consumed/);resolveTurn();assert.equal((await pending).status,'committed');assert.equal(f.releases[0].committed,true);assert.throws(()=>consume(),/retired/);
 }finally{f.close();}
});
test('retired prepared command cannot be consumed by a late FIFO turn',async()=>{
 const f=setup(),controller=new AbortController();try{const before=f.session.core.snapshot();let consume,readyResolve,projects=0;const ready=new Promise(resolve=>{readyResolve=resolve;});
  const pending=f.run({signal:controller.signal,atCommitBoundary:commit=>{consume=commit;readyResolve();return new Promise(()=>{});},project:()=>{projects++;return true;}});
  await ready;controller.abort();assert.equal((await pending).status,'control-failed');assert.equal(projects,0);assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.releases[0].committed,false);assert.throws(()=>consume(),/retired/);
 }finally{f.close();}
});
test('changed dependency while waiting for command turn rejects before buying',async()=>{
 const f=setup();try{let consume,resolveTurn,readyResolve,valid=true,projects=0;const ready=new Promise(resolve=>{readyResolve=resolve;}),before=f.session.core.snapshot();
  const pending=f.run({validate:()=>valid,atCommitBoundary:commit=>new Promise(resolve=>{consume=commit;resolveTurn=resolve;readyResolve();}),project:()=>{projects++;return true;}});await ready;valid=false;
  const answer=consume();assert.equal(answer.status,'stale');assert.equal(projects,0);assert.deepEqual(f.session.core.snapshot(),before);resolveTurn();assert.equal((await pending).status,'stale');assert.equal(f.releases[0].committed,false);
 }finally{f.close();}
});
test('finishing immediately after synchronous command commit does not abort its accepted graphics receipt',async()=>{
 const f=setup(),controller=new AbortController();try{let consume,resolveTurn,readyResolve;const ready=new Promise(resolve=>{readyResolve=resolve;});
  const pending=f.run({signal:controller.signal,atCommitBoundary:commit=>new Promise(resolve=>{consume=commit;resolveTurn=resolve;readyResolve();})});await ready;
  assert.equal(consume().status,'committed');resolveTurn();controller.abort();const result=await pending;
  assert.equal(result.status,'committed',JSON.stringify(result));assert.equal(f.source.status().closed,false);assert.equal(f.releases[0].committed,true);
 }finally{f.close();}
});
const reference=(ticket=1,time=10)=>({kind:'native-barrier-addition-reference',version:1,worldBoundary:{version:1,authorityEpoch:'epoch',nativeSession:1,ticket,effectiveTime:time},sourceControlSequence:3,additions:[{entityId:'wall-1',x:0,z:0,halfX:1,halfZ:1,yaw:0,passMask:0}]});
test('solid reference owns its ordered Float32 shapes and rejects incompatible aliases',()=>{
 const input=reference(),copy=copyNativeBarrierAdditionReference(input);input.additions[0].x=5;assert.equal(copy.additions[0].x,0);assert(Object.isFrozen(copy.additions[0]));
 for(const change of [r=>r.additions[0].passMask=1,r=>r.additions.push({...r.additions[0]}),r=>r.additions[0].x=.1,r=>r.actorId=42]){const r=reference();change(r);assert.throws(()=>copyNativeBarrierAdditionReference(r));}
 assert.equal(sameNativeBarrierAdditionReference(copy,input),false);
});
test('solid binding rejects changed shapes, entity ownership, control and origin epochs',()=>{
 const binding=()=>({kind:'native-barrier-addition-attestation',version:1,reference:reference(2,11),preparedReference:reference(),nativeIds:[8]});assert(copyNativeBarrierAdditionAttestation(binding()));
 for(const change of [b=>b.reference.additions[0].x=1,b=>b.reference.additions[0].entityId='wall-2',b=>b.reference.sourceControlSequence++,b=>b.reference.worldBoundary.authorityEpoch='other',b=>b.reference.worldBoundary.ticket=1,b=>b.nativeIds=[],b=>b.nativeIds=[0],b=>b.reference.worldBoundary.effectiveTime=9]){const b=binding();change(b);assert.throws(()=>copyNativeBarrierAdditionAttestation(b));}
});
test('solid presentation rejects incomplete evidence and terrain changes despite matching ticket',()=>{
 const prepared=reference(),actual=reference(2,11),binding={kind:'native-barrier-addition-attestation',version:1,reference:actual,preparedReference:prepared,nativeIds:[8]},proposal=copyNativeBarrierAdditionProposal({kind:'native-barrier-addition-proposal',version:1,worldBoundary:prepared.worldBoundary,nativeBarrierAddition:prepared,authorizedAutonomy:false,authorizedConsequences:false}),resources={version:1,kind:2,phase:'committed',worldBoundary:actual.worldBoundary,nativeSession:1,ticket:2,effectiveTime:11,chunks:[],removed:[],nativeBarrierAdditionBinding:binding};
 assert(nativeBarrierAdditionPresentationMatches(proposal,resources,binding));assert.equal(nativeBarrierAdditionPresentationMatches(proposal,resources,null),false);assert.throws(()=>copyNativeBarrierAdditionResources({...resources,chunks:[{cx:0,cz:0}]}));assert.equal(nativeBarrierAdditionPresentationMatches(proposal,resources,{...binding,nativeIds:[9]}),false);
});
test('a gate reference keeps one placement, its initial pose and three ordered proxies through retiming',()=>{
 const gateReference=(ticket=1,time=10)=>{
  const {additions,...base}=reference(ticket,time),{entityId,...shape}=additions[0];
  const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  return {...base,version:2,gate:{entityId:'structure-1',modelId:1,x:0,z:0,yaw:0,sx:1,sz:1,mechanismId:2,opening:0,
    rootMatrix:matrix,leafMatrix:[...matrix],proxies:[{...shape,x:-1},{...shape,x:1},{...shape,passMask:1}]}};
 };
 const binding=()=>({kind:'native-barrier-addition-attestation',version:1,reference:gateReference(2,11),preparedReference:gateReference(),nativeIds:[8,9,10]});
 const copy=copyNativeBarrierAdditionAttestation(binding());
 assert.equal(copy.reference.gate.entityId,'structure-1');
 assert.deepEqual(copy.nativeIds,[8,9,10]);
 for(const change of [
  transfer=>{transfer.reference.gate.opening=.1;},
  transfer=>{transfer.reference.gate.mechanismId++;},
  transfer=>{transfer.reference.gate.yaw=.1;},
  transfer=>{transfer.reference.gate.rootMatrix[12]=2;},
  transfer=>{transfer.reference.gate.proxies[1].passMask=1;},
  transfer=>{transfer.reference=reference(2,11);},
  transfer=>{transfer.nativeIds=[8,9,9];}
 ]){
  const transfer=binding();
  change(transfer);
  assert.throws(()=>copyNativeBarrierAdditionAttestation(transfer));
 }
});
