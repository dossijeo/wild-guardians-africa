import test from 'node:test';
import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {advanceReal,newGame,resume} from '../src/simulation/game.js';
import {centerServicePoint} from '../src/world/centers.js';
import {Navigation} from '../src/world/navigation.js';
import {nativeFarmArrivalRouteFixture} from './helpers/native-farm-arrival-route.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';

const chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
const advance={kind:'advance',seconds:.02,steps:2,nightFastForward:false,captureClockSegments:true};
const checkpoint=f=>f.command({kind:'snapshot',visualTerrain:true,nativeAuthorityCheckpoint:true});

test('the real-time advance retains its night rate and its tick samples across an internal shield expiry',async()=>{
  const initial=newGame({seed:712,culture:'mapungubwe',slotId:'shield-time'});
  resume(initial,'intro');
  Object.assign(initial,{time:320,initialPreparation:false,dayPlan:{done:true},nightPlan:{done:true}});
  initial.spells.push({kind:'shield',id:'clock-test',x:-14,z:8.2,radius:1.95,remaining:.026});
  const run=async prepared=>{
    const state=structuredClone(initial),nav=new Navigation(712,'sabana',{});
    nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(state);
    const segments=[],ticks=[],options={onClockSegment:s=>segments.push(s),onTick:()=>ticks.push(state.elapsed)};
    if(prepared)options.expireShield=async(spell,reachExpiry)=>{
      reachExpiry();
      assert.equal(state.elapsed,initial.elapsed+.026);
      assert.equal(spell.remaining,0);
      assert(state.spells.includes(spell));
      await Promise.resolve();
      state.spells=state.spells.filter(s=>s!==spell);
      nav.setState(state);
    };
    const result=advanceReal(state,.04,nav,options);
    if(prepared)await result;else assert.equal(result,undefined);
    return {state,ticks,segments};
  };
  const legacy=await run(false),prepared=await run(true);
  assert.deepEqual(prepared,legacy);
  assert.deepEqual(prepared.segments.map(s=>s.rate),[5,5]);
});

async function restoredCivilShield(options,{duringFarm=false}={}){
  const source=nativeFarmArrivalRouteFixture({peer:false});
  const state=structuredClone(source.state);
  source.close();
  const worker=state.workers[0],center=state.structures.find(row=>row.id===worker.centerId);
  const service=centerServicePoint(center,state,.8);
  center.x+=-14-service.x;center.z+=3.2-service.z;
  Object.assign(worker,{x:-14,z:11.8});
  state.villages.find(row=>row.id===worker.villageId).entry={x:-14,z:11.8};
  state.ledger.balance=rational(100000);state.cooldowns.shield=0;
  const original=await nativeProductionAuthority(state,{chunkKeys,attach:false});
  let saved;
  try{
    assert.equal(original.command({kind:'castShield',id:'civil-expiry',x:-14,z:8.2}).value,true);
    saved=original.snapshot();
  }finally{await original.close();}
  if(duringFarm)saved.spells[0].remaining=.2;
  const due=saved.elapsed+saved.spells[0].remaining;
  const f=await nativeProductionAuthority(saved,{chunkKeys,...options});
  try{
    await untilProduction(f,()=>f.records.some(row=>row.kind==='farm-arrival'&&row.committed));
    await f.present();
    let now=f.snapshot();
    while(now.elapsed<due-.25){now=f.advance(.1);await f.present();}
    while(now.elapsed<due-.027){now=f.advance(.001);await f.present();}
    assert.equal(now.workers[0].nativeRouteAdmission,duringFarm?'native-farm-arrival':'native-idle');
    return f;
  }catch(error){await f.close();throw error;}
}

async function pump(f,predicate){
  for(let i=0;i<1200;i++){
    assert.deepEqual(f.faults,[]);
    if(predicate())return;
    await f.present();
  }
  assert.fail('Shield did not reach the expected preparation or submission');
}

for(const closing of [false,true])test(closing?'disposing during kind4 READY cancels the actual two-step advance and its retained draw':
  'civil Shield with the empty beast driver expires inside the second step and publishes the entire advance once',async()=>{
  const options={observeWorldMotion:true,captureHistoricalEvents:true,emptyBeastPhysics:true};
  let legacy;
  if(!closing){
    const old=await restoredCivilShield(options);
    try{checkpoint(old);legacy=old.command(advance);}finally{await old.close();}
  }
  let release;
  const held=new Promise(resolve=>{release=resolve;});
  const f=await restoredCivilShield({...options,qualifyShieldExpiry:true,onReady:row=>row.resources?.kind===4?held:undefined});
  try{
    const before=checkpoint(f),state=JSON.parse(before.snapshot),spell=state.spells[0];
    const due=state.elapsed+spell.remaining;
    assert(spell.remaining>.02&&spell.remaining<.04);
    let result;
    const pending=f.command({...advance,visualTerrain:true}).then(value=>{result=value;});
    pending.catch(()=>{});
    let row;
    await pump(f,()=>!!(row=f.records.find(record=>record.resources?.kind===4&&record.packet)));
    assert.equal(row.minSequence,before.sequence);
    assert.equal(row.resources.effectiveTime,due);
    assert.equal(row.resources.nativeShield.spell.remaining,0);
    assert.equal(row.resources.nativeShield.polygonId,before.nativeAuthorityCheckpoint.shieldOwners[0].polygonId);
    assert.equal(row.committed,false);
    assert.equal(result,undefined);
    assert.throws(()=>f.authority.execute({kind:'snapshot',sequence:before.sequence+2}),/expiry owns this advance/);
    if(closing){
      f.authority.dispose();release();
      await assert.rejects(pending,/cancelled|aborted|closed/i);
      await f.present();
      assert.equal(result,undefined);
      assert.equal(row.committed,false);
    }else{
      release();
      await pump(f,()=>row.committed);
      await pending;await row.packet.presented;
      assert.equal(result.sequence,before.sequence+1);
      assert.equal(result.stepsExecuted,2);
      assert.equal(result.nativeWorldResources.length,1);
      assert.deepEqual(result.nativeWorldResources[0].worldBoundary,row.resources.worldBoundary);
      assert.equal(result.nativeWorldResources[0].kind,4);
      assert(Math.abs(result.elapsed-due-.014)<1e-9);
      assert.deepEqual(JSON.parse(result.snapshot),JSON.parse(legacy.snapshot));
      assert.deepEqual(result.events,legacy.events);
      assert.deepEqual(result.clockSegments,legacy.clockSegments);
      const after=checkpoint(f).nativeAuthorityCheckpoint;
      assert.deepEqual(after.shieldOwners,[]);
      assert.deepEqual(after.spatialState.polygons,before.nativeAuthorityCheckpoint.spatialState.polygons.filter(p=>p.id!==row.resources.nativeShield.polygonId));
      assert.deepEqual(f.faults,[]);
    }
  }finally{release();await f.close();}
});

test('civil Shield expiry keeps the acquired Farm route and its draw clock across kind4',async()=>{
  const options={emptyBeastPhysics:true};
  const old=await restoredCivilShield(options,{duringFarm:true});
  let legacy;
  try{checkpoint(old);legacy=old.command(advance);}finally{await old.close();}
  let release;
  const held=new Promise(resolve=>{release=resolve;});
  const f=await restoredCivilShield({...options,qualifyShieldExpiry:true,
    onReady:row=>row.resources?.kind===4?held:undefined},{duringFarm:true});
  try{
    const before=checkpoint(f),state=JSON.parse(before.snapshot),spell=state.spells[0];
    const farm=f.records.find(row=>row.kind==='farm-arrival'&&row.committed);
    const farmClock=()=>f.host.inspect().nativeRouteFrame.bindings.find(row=>row.nativeFarmArrival);
    const beforeClock=farmClock();
    assert.deepEqual(beforeClock.nativeFarmArrival,farm.resources.nativeFarmArrival);
    assert(spell.remaining>.02&&spell.remaining<.04);
    let settled=false,failed=false;
    const pending=f.command({...advance,visualTerrain:true}).finally(()=>{settled=true;});
    pending.catch(()=>{failed=true;});
    let row;
    await pump(f,()=>settled||!!(row=f.records.find(record=>record.resources?.kind===4&&record.packet)));
    if(settled)await pending;
    assert(row);
    assert.equal(row.committed,false);
    assert.equal(row.resources.effectiveTime,state.elapsed+spell.remaining);
    assert.equal(row.resources.nativeShield.polygonId,before.nativeAuthorityCheckpoint.shieldOwners[0].polygonId);
    let presented=false;
    const frame=row.packet.presented.then(()=>{presented=true;});
    frame.catch(()=>{failed=true;});
    release();
    await pump(f,()=>presented||failed);
    const result=await pending;
    await frame;
    const shown=f.host.inspect().nativeRouteFrame;
    assert.deepEqual(shown.worldBoundary,row.resources.worldBoundary);
    assert.deepEqual(farmClock().nativeFarmArrival,beforeClock.nativeFarmArrival);
    assert.equal(farmClock().executionEpoch,beforeClock.executionEpoch);
    assert(farmClock().relativeTime>beforeClock.relativeTime);
    assert.equal(result.stepsExecuted,2);
    assert.deepEqual(result.clockSegments,legacy.clockSegments);
    assert.deepEqual(result.events,legacy.events);
    assert.deepEqual(JSON.parse(result.snapshot),JSON.parse(legacy.snapshot));
    assert.deepEqual(checkpoint(f).nativeAuthorityCheckpoint.shieldOwners,[]);
    assert.equal(f.records.filter(record=>record.kind==='farm-arrival').length,1);
    assert.deepEqual(f.faults,[]);
  }finally{release();await f.close();}
});
