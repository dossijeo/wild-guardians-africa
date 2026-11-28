import test from 'node:test';import assert from 'node:assert/strict';
import {controlledNativeFarmArrival as fixture,farmArrivalAdmissionProtocol as protocol} from './helpers/native-farm-arrival-route-ports.js';
import {createNativeIntentProduction} from '../src/simulation/native-intent-production.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {urgentWork} from '../src/simulation/locomotion.js';
import {tick} from '../src/simulation/game.js';
import {nativeFarmArrivalRouteFixture as sourceFixture} from './helpers/native-farm-arrival-route.js';

async function production(f,p,{planner=f.planner,resources=p.connection}={}){
 // Adapt the low-level publication to the cohort's existing coherence view,
 // using actual port ACKs. The protocol and GPU ACK remain explicit doubles.
 const status=p.source.status,publication=p.source;publication.status=()=>{const s=status();return {...s,coherent:s.sentSequence===s.appliedSequence&&s.clockSequence===s.appliedClockSequence};};
 for(let i=0;i<200&&!publication.status().coherent;i++)await new Promise(r=>setImmediate(r));assert(publication.status().coherent);
 const errors=[],owner=createNativeIntentProduction({state:f.state,planner,bodyId:()=>1,getPublication:()=>publication,getResources:()=>resources,publicationSequence:()=>7,terrainManifest:()=>({epoch:'farm-dispatch-fixture',chunks:[]}),onError:e=>errors.push(e)});
 return {owner,errors};
}
const resources=p=>({status:()=>({phase:'running',pending:false,retained:false}),prepareNativeFarmArrivalResources:p.connection.prepareNativeFarmArrivalResources});
function urgency(f,urgent){
 // Existing gameplay policy counts pending tasks at this center, even where
 // the actual planner cannot assign them. No actor source/goal is fabricated.
 f.state.tasks=urgent?Array.from({length:100},(_,i)=>({id:`task-${910000+i}`,centerId:f.worker.centerId})):[];
 assert.equal(urgentWork(f.state,f.worker),urgent);
}

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ordinary producer acquires initial Farm23 through the existing ports (${urgent?'urgent':'walk'})`,async()=>{
 const f=fixture({profile:profile.id});let p,o;try{
  urgency(f,urgent);const body=f.body(1),q=f.requestSource,rng=f.state.rng;
  p=await protocol(f);o=await production(f,p,{resources:resources(p)});
  const result=await o.owner.wake();assert.equal(result?.status,'committed',JSON.stringify(result));await p.released;
  assert.equal(o.owner.status().last.kind,'farm-arrival');assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');
  assert.deepEqual(result.nativeFarmArrivalBinding.reference.sourceRequest,q);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
  assert.equal(result.nativeFarmArrivalBinding.preparedReference.motionFlags,urgent?1:0);
  assert.equal(p.counters().preparations,1);assert.equal(p.counters().commits,1);assert.deepEqual(o.errors,[]);assert.deepEqual(p.errors,[]);
  assert.equal(await o.owner.wake(),null,'an acquired route is not dispatched again');
 }finally{o?.owner.dispose();await p?.close();f.close();}
});

for(const invalidation of ['urgency','home','dispose'])test(`initial Farm dispatch cancels its actual preparation on ${invalidation}`,async()=>{
 const f=fixture();let p,o,release;const wait=new Promise(r=>release=r);try{
  urgency(f,false);let prepared;const started=new Promise(r=>prepared=r);
  p=await protocol(f,{async onPrepare(){prepared();await wait;}});o=await production(f,p,{resources:resources(p)});
  const pending=o.owner.wake();let ready=false;started.then(()=>ready=true);for(let i=0;i<200&&!ready;i++)await new Promise(r=>setImmediate(r));assert(ready,'Farm preparation was dispatched');const body=f.body(1);
  if(invalidation==='urgency')urgency(f,true);
  else if(invalidation==='home'){f.worker.contractDay--;tick(f.state,.01,f.nav);}
  else o.owner.dispose();
  o.owner.wake();release();const result=await pending;
  assert.notEqual(result?.status,'committed');assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(p.counters().commits,0);assert.deepEqual(o.errors,[]);
  if(invalidation==='home')assert(f.planner.nativeHomeRequestReference(f.actor));
 }finally{release();o?.owner.dispose();await p?.close();f.close();}
});

for(const unavailable of ['request','cold','resources','publication','terrain'])test(`initial Farm waits for its real ${unavailable} boundary`,async()=>{
 const f=sourceFixture({bound:unavailable!=='cold'});let o;try{
  let calls=0;const planner={...f.planner,startNativeFarmArrivalAfterGpuQuiescence(){calls++;throw Error('Unexpected dispatch');}};
  if(unavailable==='request')planner.nativeFarmArrivalRequestReference=()=>null;
  o=createNativeIntentProduction({state:f.state,planner,bodyId:()=>1,getPublication:()=>({status:()=>({coherent:unavailable!=='publication',closed:false})}),getResources:()=>({status:()=>({phase:unavailable==='resources'?'starting':'running',pending:false,retained:false})}),publicationSequence:()=>1,terrainManifest:()=>unavailable==='terrain'?null:{chunks:[]},onError:e=>{throw e;}});
  assert.equal(await o.wake(),null);assert.equal(calls,0);assert.equal(o.status().phase,'idle');assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);
 }finally{o?.dispose();f.close();}
});
