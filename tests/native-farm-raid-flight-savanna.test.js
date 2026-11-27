import assert from 'node:assert/strict';
import test from 'node:test';
import {serialize,validateSnapshot} from '../src/persistence/snapshots.js';
import {prepareWorkerCheckpoint} from '../src/persistence/prepare-worker-checkpoint.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {nativeProductionAuthority, untilProduction} from './helpers/native-production-authority.js';
import {fixture,flush} from './helpers/remote-webgpu-fixture.js';
import {floorFloat32} from '../src/rendering/float32-time.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';

// Day two of the paid sabana712 microevent opening. The ordinary first night
// left two living crops and zero tasks. The second hire cost 30.
function source() {
  const state = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/sabana712-day2-farm-before-raid.json.gz', import.meta.url))));
  state.dayPlan = {at: state.time + 4, done: false, group: ['warthog']};
  return state;
}
const chunkKeys = Array.from({length: 25}, (_, i) => [i % 5, Math.floor(i / 5) - 2].join(','));

for(const mode of ['the worker evacuation and return','the ruin','a cold reload after Home19','a cold reload during a strike',
  'a cold reload during Retreat','a cold reload with foreign refuge sequence','a cold reload during crop approach',
  'a cold reload during crop strike','a cold reload during crop Retreat','a cold reload during crop READY'])test(`a daytime Savanna raid keeps its native body through ${mode}`, async () => {
  const collapses=mode==='the ruin',reload=mode.startsWith('a cold reload');
  const foreign=mode.endsWith('foreign refuge sequence');
  const crop=mode.includes('during crop');
  const pendingCrop=mode.endsWith('crop READY');
  const state=source();
  if(!crop)state.plants=[];
  if(collapses)state.structures[0].hp=146;
  const acquired=[];
  let retainedHome,releaseHome,heldCrop,releaseCrop;
  const hold=new Promise(resolve=>{releaseHome=resolve;});
  const cropHold=new Promise(resolve=>{releaseCrop=resolve;});
  const onCommit=(record,data)=>acquired.push({kind:record.kind,data});
  let f=await nativeProductionAuthority(state,{nativeWorkerLifecycle:true,chunkKeys,
    onCommit,
    async onReady(record){if(record.kind==='home-route'&&!retainedHome){retainedHome=record;await hold;}},
  });
  const worker=state.workers[0],center=state.structures[0];
  const step=async()=>{
    let result=f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
    if(result instanceof Promise){
      let settled,error;
      result.then(value=>{settled=value;},reason=>{error=reason;});
      for(let i=0;i<1000&&!settled&&!error;i++)await f.present();
      if(error)throw error;
      assert(settled,'expected the center ruin to finish its reserved substep');
      result=settled;
    }
    for(const key of result.residency.missing){const [cx,cz]=key.split(',').map(Number);f.command({kind:'addChunk',cx,cz});}
    await f.present();
    if(!foreign||!f.host.inspect().failed)assert.deepEqual(f.faults,[]);
    return JSON.parse(result.snapshot);
  };
  try{
    await untilProduction(f,()=>acquired.some(row=>row.kind==='farm-arrival'));
    f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
    let current;
    for(let i=0;i<70&&!current?.raid;i++)current=await step();
    const [animal]=current.raid.animals;
    const spawn=current.events.findLast(e=>e.type==='RaidSpawned');
    assert.equal(animal.targetId,crop?'plant-5':center.id);
    await untilProduction(f,()=>{f.snapshot();return retainedHome;});
    assert.equal(f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).saveAvailable,false);
    for(let i=0;i<3;i++){
      const waiting=await step();
      assert.equal(waiting.structures[0].hp,center.hp);
      assert.ok(!acquired.some(row=>row.kind==='home-route'));
      if(!crop){
        assert.deepEqual([waiting.raid.animals[0].x,waiting.raid.animals[0].z],[animal.x,animal.z]);
        assert.ok(!acquired.some(row=>row.kind.startsWith('animal-crop-')));
      }
    }
    releaseHome();
    let seenPair=false,checkedRefuge=false,oldEpoch,restoredAbsence;
    for(let i=0;i<1600;i++){
      current=await step();
      const bindings=f.host.inspect().nativeRouteFrame?.bindings??[];
      if(bindings.some(b=>b.nativeHome)&&bindings.some(b=>b.nativeAnimalCrop&&
          (crop?!b.nativeAnimalCrop.purpose:b.nativeAnimalCrop.purpose==='center')))seenPair=true;
      const phase=current.raid?.animals[0]?.status;
      if(!checkedRefuge&&current.raid&&acquired.some(row=>row.kind==='home-arrival')&&
          (!mode.endsWith('strike')||phase==='attacking')&&(!mode.endsWith('Retreat')||phase==='retreating')){
        const saving=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
        assert.equal(saving.saveAvailable,true);
        const disk=prepareWorkerCheckpoint(saving,{slotId:state.slotId,policy:{nativeAuthority:true},savedAt:0});
        assert(disk.saved);
        assert.equal(disk.state.workerNativeAuthorityCheckpoint.refugeReturn.actorId,21);
        if(reload){
          const tampered=structuredClone(disk.state);
          tampered.workers[0].walkPhase+=.1;
          assert.throws(()=>savedNativeAuthorityOptions(serialize(tampered)),/refuge return/i);
          oldEpoch=acquired.find(row=>row.kind==='home-arrival').data.nativeHomeArrivalBinding.reference.worldBoundary.authorityEpoch;
          await f.close();
          f=await nativeProductionAuthority(disk.state,{...savedNativeAuthorityOptions(serialize(disk.state)),onCommit,attach:false,
            async onReady(record){if(pendingCrop&&record.kind==='animal-crop-route'&&!heldCrop){heldCrop=record;await cropHold;}}});
          const post=f.controlPort.postMessage;
          f.controlPort.postMessage=event=>{
            if(event.restoredRefugeReturn)restoredAbsence=event.restoredRefugeReturn;
            if(foreign&&event.farmArrivalRequest?.version===2)
              event={...event,farmArrivalRequest:{...event.farmArrivalRequest,refugeSequence:event.farmArrivalRequest.refugeSequence+1}};
            post(event);
          };
          await f.attach();
          current=f.snapshot();
          assert.deepEqual(current.workers,disk.state.workers);
          assert(restoredAbsence);
          assert.equal(restoredAbsence.actorId,21);
          assert.notEqual(restoredAbsence.authorityEpoch,oldEpoch);
          if(pendingCrop)await untilProduction(f,()=>heldCrop?.packet);
          const again=f.command({kind:'snapshot',nativeAuthorityCheckpoint:true});
          assert.equal(again.saveAvailable,true);
          assert.deepEqual(again.nativeAuthorityCheckpoint.refugeReturn,disk.state.workerNativeAuthorityCheckpoint.refugeReturn);
          if(pendingCrop){
            const pending=JSON.parse(again.snapshot).raid.animals[0];
            assert(!heldCrop.committed&&pending.path.length>1);
            const {reference}=heldCrop.resources;
            assert.deepEqual(pending.path.at(-1),{x:Math.fround(pending.approach.x),z:Math.fround(pending.approach.z)});
            assert.equal(reference.actorId,restoredAbsence.animalId);
            releaseCrop();
          }
        }
        checkedRefuge=true;
      }
      if(foreign&&f.host.inspect().failed){
        assert.match(f.host.inspect().errors.join('\n'),/Civil Farm request lacks its acquired Home absence/);
        assert.equal(acquired.filter(row=>row.kind==='farm-arrival').length,1);
        return;
      }
      if(!current.raid&&(collapses||current.workers[0].nativeRouteAdmission==='native-idle'))break;
    }
    assert(seenPair,'expected the attack and refuge clocks in the same submitted packet');
    assert(!foreign,'expected Draw to reject the foreign absence');
    assert(checkedRefuge,'expected the saved live raid after Home19');
    const hits=current.events.filter(e=>e.type==='AnimalLogicalHit'&&e.simulationTime>=spawn.simulationTime);
    const strikes=acquired.filter(row=>row.kind==='animal-crop-strike').map(({data})=>data.nativeAnimalCropStrikeBinding);
    assert.equal(hits.length,collapses?1:animal.hitsRemaining);
    assert.equal(new Set(hits.map(e=>e.attackId)).size,hits.length);
    assert.deepEqual(hits.map(e=>e.targetId),crop?['plant-5','plant-7']:hits.map(()=>center.id));
    if(crop){
      assert.deepEqual(current.events.filter(e=>e.type==='CropDestroyed'&&e.simulationTime>=spawn.simulationTime).map(e=>e.targetId),['plant-5','plant-7']);
      assert(current.plants.every(plant=>!plant.alive));
    }
    assert.deepEqual(hits.map(e=>e.attackId),[...new Set(strikes.map(strike=>'attack-'+strike.attackId))]);
    assert.deepEqual(current.events.filter(e=>e.type==='StructureHit'&&e.animalId===animal.id).map(e=>e.structureHit.hp),crop?[]:collapses?[126]:[560,540]);
    assert.equal(current.events.filter(e=>e.type==='RaidEnded'&&e.simulationTime>=spawn.simulationTime).length,1);
    assert.deepEqual(current.ledger,state.ledger);
    const [returned]=current.workers;
    assert.equal(returned.id,worker.id);
    assert.equal(returned.personId,worker.personId);
    assert.equal(returned.hits,0);
    const programs=acquired.filter(row=>row.kind.startsWith('animal-crop-')).map(({data})=>
      data.nativeAnimalCropRouteBinding??data.nativeAnimalCropStrikeBinding);
    for(const epoch of new Set(programs.map(({reference})=>reference.worldBoundary.authorityEpoch)))
      assert.equal(new Set(programs.filter(({reference})=>reference.worldBoundary.authorityEpoch===epoch).map(({reference})=>reference.bodyId)).size,1);
    assert.equal(programs[0].reference.purpose,crop?undefined:'center');
    assert.equal(programs.at(-1).reference.purpose,'retreat');
    const farm=acquired.filter(row=>row.kind==='farm-arrival');
    if(collapses){
      const ruin=acquired.find(row=>row.kind==='center-ruin')?.data.nativeCenterRuin;
      assert(ruin,'expected a retained native ruin');
      assert.equal(ruin.prepared.retreat.reference.bodyId,programs[0].reference.bodyId);
      assert.deepEqual(current.events.filter(e=>e.type==='StructureRuined').map(e=>[e.targetId,e.simulationTime]),[[center.id,ruin.acquired.effectiveTime]]);
      assert.equal(current.structures[0].status,'ruined');
      assert.equal(current.result,'defeat');
      assert.equal(returned.status,'home');
      assert.equal(farm.length,1);
      return;
    }
    assert.equal(returned.nativeRouteAdmission,'native-idle');
    assert.equal(f.command({kind:'snapshot',nativeAuthorityCheckpoint:true}).saveAvailable,true);
    assert.equal(farm.length,2);
    const home=acquired.find(row=>row.kind==='home-arrival').data.nativeHomeArrivalBinding;
    assert.equal(farm[0].data.nativeFarmArrivalBinding.reference.bodyId,home.reference.bodyId);
    const returnedFarm=farm[1].data.nativeFarmArrivalBinding.reference;
    if(reload){
      assert.notEqual(returnedFarm.sourceRequest.refugeSequence,home.retiredSequence);
      assert.equal(returnedFarm.sourceRequest.refugeSequence,restoredAbsence.retiredSequence);
      assert.notEqual(returnedFarm.worldBoundary.authorityEpoch,oldEpoch);
    }else{
      assert.equal(returnedFarm.sourceRequest.refugeSequence,home.retiredSequence);
      assert.notEqual(returnedFarm.bodyId,home.reference.bodyId);
    }
  }finally{releaseHome();releaseCrop();await f.close();}
});

for(const [target,paused] of [['center',false],['crops',false],['crops',true]])test(`a public Savanna ${target} save rebuilds both moving flight corridors${paused?' while paused':''}`,async()=>{
  const initial=source();
  if(target==='center')initial.plants=[];
  const live=await nativeProductionAuthority(initial,{nativeWorkerLifecycle:true,chunkKeys});
  let cold,foreign,release,held;
  const commits=new Map();
  const wait=new Promise(resolve=>{release=resolve;});
  const advance=async f=>{
    const result=await f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
    for(const key of result.residency.missing){const [cx,cz]=key.split(',').map(Number);f.command({kind:'addChunk',cx,cz});}
    await f.present();
    assert.deepEqual(f.faults,[]);
    return JSON.parse(result.snapshot);
  };
  const paired=f=>{
    const frame=f.host.inspect().nativeRouteFrame;
    const home=frame?.bindings.find(row=>row.nativeHome?.actorId===21),crop=frame?.bindings.find(row=>row.nativeAnimalCrop?.actorId===22);
    return home&&crop&&{frame,home,crop};
  };
  const poses=state=>{
    const [w]=state.workers,[a]=state.raid.animals;
    return [w.x,w.z,w.heading,w.runPhase,w.walkPhase,w.carryPhase,w.runRemaining,a.x,a.z,a.heading,a.motionPhase];
  };
  try{
    await untilProduction(live,()=>live.records.some(row=>row.kind==='farm-arrival'&&row.committed));
    live.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
    let cut,current;
    for(let i=0;i<145&&!cut;i++){
      current=await advance(live);
      const clocks=paired(live);
      if(clocks?.home.relativeTime>0&&clocks.crop.relativeTime>0&&current.workers[0].status==='fleeing')cut=clocks;
    }
    assert(cut,'expected a presented cut with both actors advancing');
    if(paused)live.command({kind:'pause',reason:'qa-flight-save'});
    const saving=live.command({kind:'snapshot',nativeAuthorityCheckpoint:true,visualTerrain:true});
    assert(saving.saveAvailable);
    const disk=prepareWorkerCheckpoint(saving,{slotId:initial.slotId,policy:{nativeAuthority:true},savedAt:0});
    assert(disk.saved);
    const marker=disk.state.workerNativeAuthorityCheckpoint.raidFlight;
    const raw=serialize(disk.state),options=savedNativeAuthorityOptions(raw),savedPose=poses(disk.state);
    assert.deepEqual(savedPose,poses(current));
    assert.equal(marker.spawnSequence,cut.home.nativeHome.sourceRequest.raidSpawnSequence);
    assert(!disk.state.workers[0].nativeRouteAdmission);
    assert.equal(disk.state.raid.animals[0].targetId,target==='center'?'structure-2':'plant-5');
    assert.deepEqual(marker.homePath.at(-1),{x:60,z:0});
    const invalid=structuredClone(disk.state);
    invalid.workers[0].runPhase+=.1;
    assert.throws(()=>savedNativeAuthorityOptions(serialize(invalid)),/checkpoint differs from the saved cohort/);
    if(target==='crops'&&!paused){
      foreign=await nativeProductionAuthority(disk.state,{...options,attach:false});
      const post=foreign.controlPort.postMessage;
      foreign.controlPort.postMessage=message=>post(message.restoredFlight?
        {...message,restoredFlight:{...message.restoredFlight,raidSpawnSequence:marker.spawnSequence+1}}:message);
      const attaching=foreign.attach().catch(error=>error);
      for(let i=0;i<20&&!foreign.host.inspect().failed;i++)await foreign.present();
      assert.match(foreign.host.inspect().errors.join('\n'),/Invalid restored native flight cohort/);
      assert.equal(foreign.host.inspect().nativeRouteFrame,null);
      await foreign.close();foreign=null;
      assert(await attaching instanceof Error);
    }
    cold=await nativeProductionAuthority(disk.state,{...options,onCommit:(record,data)=>commits.set(record,data),async onReady(record){
      if(!held){held=record;await wait;}
    }});
    await untilProduction(cold,()=>held?.packet);
    assert.equal(held.kind,target==='center'||paused?'home-route':'animal-crop-route');
    assert(!held.committed);
    assert.deepEqual(poses(cold.snapshot()),savedPose);
    for(let i=0;i<3;i++)assert.deepEqual(poses(await advance(cold)),savedPose);
    release();
    if(paused){
      await untilProduction(cold,()=>held.committed);
      assert.deepEqual(poses(cold.snapshot()),savedPose);
      cold.command({kind:'resume',reason:'qa-flight-save'});
    }
    let newCut;
    for(let i=0;i<2200;i++){
      current=await advance(cold);
      newCut??=paired(cold);
      if(!current.raid&&current.workers[0].nativeRouteAdmission==='native-idle')break;
    }
    assert(newCut);
    assert.notEqual(newCut.frame.worldBoundary.authorityEpoch,cut.frame.worldBoundary.authorityEpoch);
    assert.equal(newCut.home.nativeHome.sourceRequest.raidSpawnSequence,marker.spawnSequence);
    assert.equal(newCut.crop.nativeAnimalCrop.targetId,cut.crop.nativeAnimalCrop.targetId);
    const home=commits.get(cold.records.find(row=>row.kind==='home-arrival'&&row.committed)).nativeHomeArrivalBinding;
    const farm=commits.get(cold.records.find(row=>row.kind==='farm-arrival'&&row.committed)).nativeFarmArrivalBinding.reference;
    assert.equal(farm.sourceRequest.refugeSequence,home.retiredSequence);
    assert.notEqual(farm.bodyId,home.reference.bodyId);
    const hits=current.events.filter(e=>e.type==='AnimalLogicalHit'&&e.simulationTime>=disk.elapsed);
    assert.deepEqual(hits.map(e=>e.targetId),target==='center'?['structure-2','structure-2']:['plant-5','plant-7']);
    assert.equal(new Set(hits.map(e=>e.attackId)).size,2);
    assert.equal(current.raid,null);
    assert.equal(current.workers[0].nativeRouteAdmission,'native-idle');
    assert.equal(current.workers[0].personId,marker.personId);
    assert.equal(current.workers[0].hits,0);
    assert.deepEqual(current.ledger,initial.ledger);
  }finally{release();await foreign?.close();await cold?.close();await live.close();}
});

for(const [profile,complete] of [['qualification',false],['qualification',true],['lifecycle',true]])test(`terminal Draw loss requires both Flight Home and crop clocks (${profile}): ${complete}`, async () => {
  const receipts=new Map();
  const nativeWorkerLifecycle=profile==='lifecycle';
  const f=await nativeProductionAuthority(source(),{nativeWorkerLifecycle,qualifyFarmFlee:!nativeWorkerLifecycle,qualifyAnimalCrop:!nativeWorkerLifecycle,chunkKeys,
    onCommit(record,receipt){receipts.set(record.kind,receipt);}});
  const ports=new MessageChannel();
  let replacement;
  try{
    await untilProduction(f,()=>f.records.some(row=>row.kind==='farm-arrival'&&row.committed));
    f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
    const fields=['nativeHome','nativeAnimalCrop'];
    let original,rows;
    for(let i=0;i<165;i++){
      const step=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
      for(const key of step.residency?.missing??[]){
        const [cx,cz]=key.split(',').map(Number);
        f.command({kind:'addChunk',cx,cz});
      }
      await f.present();
      original=f.host.inspect().nativeRouteFrame;
      rows=fields.map(field=>original?.bindings.find(row=>row[field]));
      if(rows.every(row=>row?.relativeTime>0))break;
    }
    assert(rows.every(row=>row?.relativeTime>0),'expected two clocks in the last original frame');
    const bindingFields=['nativeHomeRouteBinding','nativeAnimalCropRouteBinding'];
    const originals=['home-route','animal-crop-route'].map((kind,i)=>receipts.get(kind)[bindingFields[i]]);
    assert.notEqual(originals[0].reference.worldBoundary.ticket,originals[1].reference.worldBoundary.ticket);
    const before=f.snapshot();
    f.gpu.device.destroy();
    f.retireResourceEndpoint();
    const receipt=await f.authority.quiesceNativeIntentProduction();
    const retired=await f.authority.flushNativeResourcePreparation({allowRetired:true});
    assert(retired.terminal&&retired.callbacksSettled);
    const route=await f.authority.terminalWorkerRoute();
    assert.deepEqual(route,{version:2,members:[{kind:18,actorId:21},{kind:26,actorId:22}]});
    replacement=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeAnimalCropVersion:1}},
      {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
    const {recoveredWorkerRoute:q}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,receipt,route);
    assert.deepEqual(q.worldBoundary,original.worldBoundary);
    const at=before.elapsed;
    const ages=q.members.map(({execution,resources},i)=>{
      assert.equal(execution.executedThrough,at);
      assert.deepEqual(resources.presentation.worldBoundary,q.worldBoundary);
      const ref=resources[bindingFields[i]].reference,epoch=ref.worldBoundary.effectiveTime;
      assert.deepEqual(ref,originals[i].reference);
      if(complete||i===0)replacement.client.registerClockBinding(replacement.buffer,{byteOffset:i*4,epoch,semantic:'relative',
        resourceEnd:nativeClockResourceEnd(epoch,ref.endTime),[fields[i]]:ref});
      return floorFloat32(at-epoch);
    });
    await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted/);
    const submit=replacement.frame(0,{nativeWorldBoundary:q.worldBoundary,
      clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(error=>error);
    await flush();await replacement.host.idle();replacement.host.present();
    const rendered=await submit;
    if(!complete){
      assert.match(rendered.message,/Replacement requires its bound worker clock/);
      assert.equal(replacement.host.inspect().nativeRouteFrame,null);
      await assert.rejects(f.authority.checkHeldDraw(30,receipt,route),/Missing submitted|Native GPU fence closed: consumer-retired/);
      assert.equal(f.snapshot().elapsed,at);
      return;
    }
    assert(!(rendered instanceof Error),rendered.message);
    const witness=await f.authority.checkHeldDraw(30,receipt,route);
    assert.deepEqual(witness.members.map(row=>row.relativeTime),ages);
    assert.deepEqual(witness.members.map(row=>row.assignmentSequence),q.members.map(({execution})=>execution.binding.assignmentSequence));
    assert.deepEqual([...new Float32Array(replacement.gpu.buffers[0].data.buffer).subarray(0,2)],ages);
    f.authority.resumeNativeIntentProduction(receipt);
    f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
    const after=f.snapshot();
    assert.equal(after.elapsed,at+.05);
    assert.equal(after.workers[0].nativeRouteAdmission,'native-home');
    assert.notDeepEqual(after.workers.map(({x,z})=>[x,z]),before.workers.map(({x,z})=>[x,z]));
    assert.notDeepEqual(after.raid.animals.map(({x,z})=>[x,z]),before.raid.animals.map(({x,z})=>[x,z]));
    assert.deepEqual(after.raid.reservations,before.raid.reservations);
    assert.deepEqual(f.faults,[]);
  }finally{
    replacement?.client.dispose();
    await replacement?.host.dispose();
    ports.port1.close();ports.port2.close();
    await f.close();
  }
});

for(const [profile,mode] of [['qualification','exact'],['qualification','fractional refuge'],['qualification','foreign refuge'],['qualification','retired clock'],['lifecycle','exact']])test(`terminal Draw loss after Home19 (${profile}): ${mode}`,async()=>{
  const receipts=new Map();
  const initial=source();
  if(mode==='fractional refuge')initial.villages.find(v=>v.id==='village-1').entry.z=.2;
  const nativeWorkerLifecycle=profile==='lifecycle';
  const f=await nativeProductionAuthority(initial,{nativeWorkerLifecycle,qualifyFarmFlee:!nativeWorkerLifecycle,qualifyAnimalCrop:!nativeWorkerLifecycle,chunkKeys,
    onCommit(record,receipt){receipts.set(record.kind,receipt);}});
  const ports=new MessageChannel();
  let replacement;
  try{
    await untilProduction(f,()=>f.records.some(row=>row.kind==='farm-arrival'&&row.committed));
    f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
    let refuge,original;
    for(let i=0;i<186;i++){
      const step=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
      for(const key of step.residency?.missing??[]){
        const [cx,cz]=key.split(',').map(Number);
        f.command({kind:'addChunk',cx,cz});
      }
      await f.present();
      refuge=receipts.get('home-arrival')?.nativeHomeArrivalBinding;
      original=f.host.inspect().nativeRouteFrame;
      if(refuge&&original?.worldBoundary.ticket===refuge.reference.worldBoundary.ticket&&
         !original.bindings.some(b=>b.nativeHome)&&original.bindings.some(b=>b.nativeAnimalCrop?.actorId===22))break;
    }
    const proof=receipts.get('animal-crop-route')?.nativeAnimalCropRouteBinding;
    assert(proof&&refuge);
    assert.deepEqual(original.worldBoundary,refuge.reference.worldBoundary);
    assert.notEqual(proof.reference.worldBoundary.ticket,original.worldBoundary.ticket);
    const before=f.snapshot(),at=before.elapsed;
    assert.equal(before.workers[0].status,'home');
    if(mode==='fractional refuge'){
      assert.equal(before.workers[0].z,.2);
      assert.equal(refuge.reference.pose.z,Math.fround(.2));
    }
    f.gpu.device.destroy();
    f.retireResourceEndpoint();
    const hold=await f.authority.quiesceNativeIntentProduction();
    const retired=await f.authority.flushNativeResourcePreparation({allowRetired:true});
    assert(retired.terminal&&retired.callbacksSettled);
    const route=await f.authority.terminalWorkerRoute();
    assert.deepEqual(route,{version:2,refuge:true,members:[{kind:26,actorId:22}]});
    replacement=await fixture({capabilities:{nativeHomeRouteVersion:1,nativeAnimalCropVersion:1}},
      {intentControl:{port:ports.port2,session:'production-control',recoveryHold:30}});
    if(mode==='foreign refuge'){
      const accept=ports.port2.onmessage;
      ports.port2.onmessage=event=>{
        if(event.data.type!=='IntentBaseline')return accept(event);
        const data=structuredClone(event.data);
        data.recoveredWorkerRoute.refuge.reference.worldBoundary.ticket++;
        accept({data});
      };
      await assert.rejects(f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route),
        /Native intent control closed: consumer-retired/);
      await flush();
      assert(replacement.errors.some(error=>/Crop recovery differs from the acquired refuge cut/.test(error.message)));
      assert.equal(replacement.host.inspect().nativeRouteFrame,null);
      assert.equal(f.snapshot().elapsed,at);
      return;
    }
    const {recoveredWorkerRoute:q}=await f.authority.attachHeldWorkerRoute(ports.port1,'production-control',30,hold,route);
    assert.deepEqual(q.refuge,refuge);
    assert.deepEqual(q.worldBoundary,refuge.reference.worldBoundary);
    const [{execution,resources}]=q.members,ref=resources.nativeAnimalCropRouteBinding.reference;
    assert.equal(execution.executedThrough,at);
    assert.deepEqual(resources.presentation.worldBoundary,q.worldBoundary);
    assert.deepEqual(ref,proof.reference);
    const epoch=ref.worldBoundary.effectiveTime,age=floorFloat32(at-epoch);
    replacement.client.registerClockBinding(replacement.buffer,{byteOffset:0,epoch,semantic:'relative',
      nativeAnimalCrop:ref,resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
    if(mode==='retired clock'){
      const home=refuge.reference.sourceHome.reference,epoch=home.worldBoundary.effectiveTime;
      replacement.client.registerClockBinding(replacement.buffer,{byteOffset:4,epoch,semantic:'relative',
        nativeHome:home,resourceEnd:nativeClockResourceEnd(epoch,home.endTime)});
    }
    await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
    const submit=replacement.frame(0,{nativeWorldBoundary:q.worldBoundary,
      clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}}).catch(error=>error);
    await flush();await replacement.host.idle();replacement.host.present();
    const rendered=await submit;
    if(mode==='retired clock'){
      assert.match(rendered.message,/Replacement requires its bound worker clock/);
      assert.equal(replacement.host.inspect().nativeRouteFrame,null);
      assert.equal(f.snapshot().elapsed,at);
      return;
    }
    assert(!(rendered instanceof Error),rendered.message);
    const {members}=await f.authority.checkHeldDraw(30,hold,route);
    assert.deepEqual(members,[{kind:26,assignmentSequence:proof.assignmentSequence,nativeAnimalCrop:ref,relativeTime:age}]);
    assert.equal(new Float32Array(replacement.gpu.buffers[0].data.buffer)[0],age);
    f.authority.resumeNativeIntentProduction(hold);
    f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
    const after=f.snapshot();
    assert.equal(after.elapsed,at+.05);
    assert.equal(after.workers[0].status,'home');
    assert.deepEqual(after.workers.map(({x,z})=>[x,z]),before.workers.map(({x,z})=>[x,z]));
    assert.notDeepEqual(after.raid.animals.map(({x,z})=>[x,z]),before.raid.animals.map(({x,z})=>[x,z]));
    assert.deepEqual(after.raid.reservations,before.raid.reservations);
    assert.deepEqual(f.faults,[]);
  }finally{
    replacement?.client.dispose();
    await replacement?.host.dispose();
    ports.port1.close();ports.port2.close();
    await f.close();
  }
});
for (const enabled of [false, true]) {
  test('Savanna Farm admission ' + (enabled ? 'retains the original body through the daytime Stop' : 'stays gated in the ordinary profile'), async () => {
    const initial = source();
    const f = await nativeProductionAuthority(initial, {qualifyFarmFlee: enabled, qualifyAnimalCrop: true, chunkKeys});
    try {
      if (!enabled) {
        await untilProduction(f, () => f.authority.nativeIntentProductionStatus().last?.status === 'blocked');
        assert.equal(f.records.length, 0);
        assert.deepEqual(f.faults, []);
        return;
      }
      await untilProduction(f, () => f.records.some(r => r.kind === 'farm-arrival' && r.committed));
      const farm = f.records.find(r => r.kind === 'farm-arrival');
      const view = {bounds: [24,-72,168,72], eye: {x: 83,z: 24}, target: {x: 83,z: 0}};
      f.command({kind: 'setNavigationView', view});
      const requests = [];
      const post = f.controlPort.postMessage;
      f.controlPort.postMessage = data => {
        if (data.homeRequest) requests.push(data.homeRequest);
        post(data);
      };
      let state;
      for (let i = 0; i < 100; i++) {
        const step = f.command({kind: 'advance', seconds: .05, nightFastForward: false, steps: 1});
        state = JSON.parse(step.snapshot);
        if (state.raid) break;
        for (const key of step.residency?.missing ?? []) {
          const [cx, cz] = key.split(',').map(Number);
          f.command({kind: 'addChunk', cx, cz});
        }
        await f.present();
      }
      const event = state.events.findLast(e => e.type === 'RaidSpawned');
      const worker = state.workers[0];
      assert.ok(event);
      assert.equal(worker.nativeRouteAdmission, 'pending-farm-flight-stop');
      assert.equal(worker.id, 'worker-21');
      assert.ok(Math.abs(worker.x - 64.32) < 1e-8);
      assert.equal(worker.z, 0);
      assert.deepEqual(state.ledger.balance, {n: '190', d: '1'});
      await untilProduction(f, () => {
        f.snapshot();
        return requests.length && f.records.some(r => r.kind === 'farm-arrival-stop' && r.committed);
      });
      const stop = f.records.find(r => r.kind === 'farm-arrival-stop');
      await f.present();
      await stop.packet.presented;
      const request = requests.at(-1);
      assert.equal(request.version, 2);
      assert.equal(request.bodyId, farm.resources.bodyId);
      assert.equal(request.raidSpawnSequence, Number(event.id.split('-').at(-1)));
      for (const field of ['x','z','walkPhase','runPhase','carryPhase','runRemaining']) assert.equal(request.pose[field], worker[field]);
      assert.equal(request.pose.yaw, worker.heading);
      assert.deepEqual([request.home.x,request.home.z], [60,0]);
      assert.equal(f.host.inspect().nativeRouteFrame.worldBoundary.effectiveTime, state.elapsed);
      assert.deepEqual(f.faults, []);
    } finally { await f.close(); }
  });
}

for(const nativeWorkerLifecycle of [false,true])test(`a moving Farm and a new crop share two submitted clocks through the Home absence (${nativeWorkerLifecycle?'lifecycle':'qualification'})`, async () => {
  let releaseStop, held;
  const hold = new Promise(resolve => { releaseStop = resolve; });
  const f = await nativeProductionAuthority(source(), {
    nativeWorkerLifecycle, qualifyFarmFlee:!nativeWorkerLifecycle, qualifyAnimalCrop:!nativeWorkerLifecycle, chunkKeys,
    async onReady(record) {
      if (record.kind === 'farm-arrival-stop' && !held) { held = record; await hold; }
    },
  });
  const events=[];
  const post=f.controlPort.postMessage;
  f.controlPort.postMessage = event => { if(event.actorId) events.push(event); post(event); };
  try {
    const acquired = kind => f.records.find(r => r.kind === kind && r.committed);
    await untilProduction(f, () => acquired('farm-arrival'));
    f.command({kind:'setNavigationView', view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
    let state;
    for(let i=0;i<100;i++){
      const step=f.command({kind:'advance',seconds:.05,steps:i===79?2:1,nightFastForward:false});
      state=JSON.parse(step.snapshot);
      if(state.raid)break;
      for(const key of step.residency?.missing??[]){
        const [cx,cz]=key.split(',').map(Number); f.command({kind:'addChunk',cx,cz});
      }
      await f.present();
    }
    assert.equal(state.workers[0].nativeRouteAdmission,'pending-farm-flight-stop');
    const spawn=state.events.findLast(e=>e.type==='RaidSpawned');
    assert.ok(spawn);
    await untilProduction(f,()=>held);
    const animalEvents=events.filter(e=>e.actorId===22);
    assert.equal(animalEvents.length,1);
    const [birth]=animalEvents;
    assert.equal(birth.type,'IntentChanged');assert.equal(birth.state,6);
    assert.equal(birth.routeHandle,null);
    assert.equal(birth.pendingAnimalCrop.targetId,5);
    assert.equal(birth.raidFlightBirth.raidSpawnSequence,Number(spawn.id.split('-').at(-1)));
    const resting=JSON.parse(f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false}).snapshot);
    const sample=resting.workers[0].nativeFarmFlightSample;
    assert.ok(sample,'moving Farm execution must publish its Stop24 sample');
    assert.throws(()=>validateSnapshot(resting),/Muestra de evacuación/);
    assert.equal(sample.at,resting.elapsed);
    assert.equal(sample.spawnTime,spawn.simulationTime);
    assert.equal(sample.eventId,Number(spawn.id.slice(6)));
    assert.equal(sample.nativeRoute.actorId,21);
    assert.equal(sample.bodyId,1);
    for(const [key,actual] of Object.entries(sample.pose))assert.equal(actual,resting.workers[0][key],key);
    assert.ok(resting.workers[0].x>state.workers[0].x);
    assert.equal(resting.raid.animals[0].x,state.raid.animals[0].x);
    assert.equal(resting.raid.animals[0].z,state.raid.animals[0].z);
    releaseStop();
    await untilProduction(f,()=>{f.snapshot();return acquired('farm-arrival-stop');});
    const ages=[];
    for(let i=0;i<150;i++){
      await f.present();
      const frame=f.host.inspect().nativeRouteFrame;
      const worker=frame?.bindings.find(b=>b.nativeHome?.actorId===21);
      const animal=frame?.bindings.find(b=>b.nativeAnimalCrop?.actorId===22);
      if(worker&&animal){
        assert.equal(worker.nativeHome.bodyId,1);assert.equal(animal.nativeAnimalCrop.bodyId,2);
        assert.equal(animal.nativeAnimalCrop.targetId,5);ages.push([worker.relativeTime,animal.relativeTime]);
      }
      state=f.advance(.05);
      if(state.workers[0].status==='home')break;
    }
    assert.ok(ages.some(([w,a],i)=>i>0&&w>ages[i-1][0]&&a>ages[i-1][1]));
    assert.equal(state.workers[0].status,'home');assert.equal(state.workers[0].hits,0);
    assert.equal(state.workers[0].nativeFarmFlightSample,undefined);
    assert.equal(state.raid.animals[0].targetId,'plant-5');
    assert.deepEqual([state.workers[0].x,state.workers[0].z],[60,0]);
    await untilProduction(f,()=>acquired('home-arrival'));
    await f.present();await acquired('home-arrival').packet.presented;
    const final=f.host.inspect().nativeRouteFrame;
    assert.ok(final.bindings.some(b=>b.nativeAnimalCrop?.bodyId===2));
    assert.ok(!final.bindings.some(b=>b.nativeHome));
    assert.equal(f.advance(.05).workers[0].status,'home');
    assert.deepEqual(f.faults,[]);
  } finally {releaseStop();await f.close();}
});

test('Farm corridor includes future positions, semantic tangency and the interval between ticks', () => {
  const state=source();
  const mod=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM ?? new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(mod,state,{loaded:()=>loaded,onData:d=>loaded.set(d.cx+','+d.cz,d)});
try {
 for(let z=-2;z<=2;z++)for(let x=0;x<5;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.stream.onData(session.core.chunkPayload());}
 const planner=createEventDrivenTaskPlanner(session,{qualifyFarmFlee:true});planner.resetFromState(state);
 const w=session.core.wasm,worker=state.workers[0],actor=21,body=1;
 session.actorSectorRevision({worker:true});assert.equal(w.nav_intent_set_time(state.elapsed),1);
 assert.equal(w.spatial_body_upsert(body,worker.x,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(actor,body),1);
 const stop1=planner.observeTasks(state),stop2=planner.observeWorld(state);
 try{
 const q=planner.requestNativeFarmArrivalResources(state,worker);assert.ok(q);planner.commitNativeCausalClock();
 const sess=w.nav_intent_session();
 const req=planner.nativeFarmArrivalRequestReference(actor);
 assert.equal(w.nav_farm_arrival_route_proposal_stage_savanna(actor,sess,req.requestSequence,0),1);
 assert.equal(w.nav_intent_barrier_proposal_ticket(),1);
 const t=Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));
 assert.equal(w.nav_farm_arrival_route_proposal_commit_bound(...t.slice(0,5),t[1]),1);
 assert.equal(w.nav_intent_execution_begin(),1);w.nav_intent_clock_commit(1,0);
 const seq=planner.nativeFarmArrivalRouteBinding(actor).assignmentSequence;
 const clear=(x,z)=>w.nav_flight_crop_origin_clear(sess,actor,seq,x,z,1.1);
 assert.ok(Math.hypot(worker.x-68,worker.z-2)>2.2);
 assert.equal(clear(68,2),0);assert.equal(clear(57.8,0),0);assert.equal(clear(57.7995,0),1);
 const halfStep=.05*1.08/2,offset=2.19995;assert.ok(Math.hypot(halfStep,offset)>2.2);assert.equal(clear(62+halfStep,offset),0);
 assert.equal(clear(83,27.1),1);assert.equal(w.nav_flight_crop_origin_clear(sess+1,actor,seq,83,27.1,1.1),-2);
 assert.equal(w.nav_flight_crop_origin_clear(sess,actor,seq+1,83,27.1,1.1),-2);
 }finally{stop2();stop1();}
}finally {session.dispose();}
});

for (const tampered of [null, 'body', 'event']) {
  test(tampered ? 'crop birth rejects a mismatched evacuation '+tampered :
      'late Farm readiness leaves the evacuation source and the new animal on separate bodies', async () => {
    let release, held;
    const wait = new Promise(resolve => { release = resolve; });
    const f = await nativeProductionAuthority(source(), {
      qualifyFarmFlee:true, qualifyAnimalCrop:true, chunkKeys,
      async onReady(record) {
        if (!tampered && record.kind === 'farm-arrival' && !held) { held=record; await wait; }
      },
    });
    try {
      await untilProduction(f,()=>tampered ? f.records.some(r=>r.kind==='farm-arrival'&&r.committed) : !!held);
      const post=f.controlPort.postMessage;
      const events=[];
      f.controlPort.postMessage=data=>{
        if(data.actorId)events.push(data);
        if(tampered&&data.raidFlightBirth)
          data={...data,raidFlightBirth:{...data.raidFlightBirth,...(tampered==='body'?{workerBody:data.pendingAnimalCrop.bodyId}:{raidSpawnSequence:data.raidFlightBirth.raidSpawnSequence+1})}};
        post(data);
      };
      f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
      let state;
      for(let i=0;i<100;i++){
        const step=f.command({kind:'advance',seconds:.05,steps:1,nightFastForward:false});
        state=JSON.parse(step.snapshot);
        if(state.raid)break;
        for(const key of step.residency?.missing??[]){
          const [cx,cz]=key.split(',').map(Number); f.command({kind:'addChunk',cx,cz});
        }
        await f.present();
      }
      if(tampered){
        await assert.rejects(untilProduction(f,()=>{f.snapshot();return false;}),tampered==='body'?/Crop birth lacks its current raid flight peer/:/Animal crop preparation lacks its current native source/);
        assert.ok(!f.records.some(r=>r.kind==='animal-crop-route'&&r.committed));
        return;
      }
      release();
      await untilProduction(f,()=>held.aborted);
      assert.equal(held.committed,false);
      assert.equal(state.workers[0].nativeRouteAdmission,'pending-raid-flight-resources');
      assert.deepEqual([state.workers[0].x,state.workers[0].z],[60,0]);
      const request=events.find(e=>e.homeRequest)?.homeRequest;
      const animal=events.find(e=>e.pendingAnimalCrop);
      assert.equal(request.version,2);assert.equal(request.bodyId,1);
      assert.equal(animal.pendingAnimalCrop.bodyId,2);
      assert.equal(animal.raidFlightBirth.raidSpawnSequence,request.raidSpawnSequence);
      assert.equal(animal.raidFlightBirth.sourceSequence,request.requestSequence);
      assert.equal(animal.raidFlightBirth.farmTicket,null);
      for(let i=0;i<50&&!f.records.some(r=>r.kind==='home-arrival'&&r.committed);i++){await f.present();state=f.advance(.05);}
      assert.ok(f.records.some(r=>r.kind==='home-arrival'&&r.committed));assert.equal(state.workers[0].status,'home');
      assert.deepEqual(f.faults,[]);
    } finally { release();await f.close(); }
  });
}
import {copyNativeFarmArrivalRequestReference as copyFarmRequest} from '../src/world/native-farm-arrival-request-reference.js';

for(const [order,nativeWorkerLifecycle] of [['retired-active',false],['absence-first',false],['foreign-retirement',false],['retired-active',true],['foreign-retirement',true]]){
 test(`paid civilian returns after the actual RaidEnded (${nativeWorkerLifecycle?'lifecycle':'qualification'}): ${order}`,async()=>{
  const initial=source(),original=initial.workers[0],receipts=new Map();
  let release,ready,absent=false,firstHome,retreat,heldState;
  const wait=new Promise(resolve=>{release=resolve;});
  const f=await nativeProductionAuthority(initial,{nativeWorkerLifecycle,qualifyFarmFlee:!nativeWorkerLifecycle,qualifyAnimalCrop:!nativeWorkerLifecycle,chunkKeys,
   onCommit(record,data){receipts.set(record,data);},
   async onPrepare(record){
    if(record.kind!=='farm-arrival'||!firstHome||order!=='absence-first')return;
    // The ordinary render stream can remove the departed animal before the new 23.
    const at=f.snapshot().elapsed;
    f.client.beginFrame({nativeWorldBoundary:retreat.worldBoundary,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}});
    const encoder=f.client.device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
    pass.end();f.client.device.queue.submit([encoder.finish()]);
    const drawn=f.client.endFrame();await f.present();await drawn;
    assert.equal(f.host.inspect().nativeRouteFrame.bindings.length,0);absent=true;
   },
   async onReady(record){
    if(record.kind==='farm-arrival'&&firstHome){ready=record;await wait;}
   }
  });
  try{
   const committed=kind=>f.records.findLast(r=>r.kind===kind&&r.committed);
   await untilProduction(f,()=>committed('farm-arrival'));
   const hire=receipts.get(committed('farm-arrival')).nativeFarmArrivalBinding.reference;
   f.command({kind:'setNavigationView',view:{bounds:[24,-72,168,72],eye:{x:83,z:24},target:{x:83,z:0}}});
   const post=f.controlPort.postMessage;
   f.controlPort.postMessage=e=>{
    if(order==='foreign-retirement'&&e.farmArrivalRequest?.version===2)e={...e,farmArrivalRequest:{...e.farmArrivalRequest,refugeSequence:e.farmArrivalRequest.refugeSequence-1}};
    post(e);
   };
   let state,advanceCount=0,atHome=false,ended,secondFarm,seenCivilDraw=false;
   for(;advanceCount<2400;advanceCount++){
    await f.present();
    if(order==='foreign-retirement'&&f.host.inspect().failed)break;
    if(committed('home-arrival'))firstHome=receipts.get(committed('home-arrival')).nativeHomeArrivalBinding;
    const crop=committed('animal-crop-route');
    if(crop){
     const binding=receipts.get(crop).nativeAnimalCropRouteBinding;
     if(binding.reference.purpose==='retreat')retreat=binding.reference;
    }
    if(ready&&heldState===undefined){
     heldState=f.snapshot();assert.equal(heldState.workers[0].nativeRouteAdmission,'pending-farm-arrival-resources');
     assert.equal(heldState.workers[0].nativeRefugeSequence,firstHome.retiredSequence);
     assert.equal(heldState.workers[0].raidReturn,true);
     assert.deepEqual([heldState.workers[0].x,heldState.workers[0].z],[60,0]);
     assert.throws(()=>validateSnapshot(heldState),/Invalid live Farm return/);
     for(let i=0;i<2;i++){const w=f.advance(.05).workers[0];assert.deepEqual([w.x,w.z,w.walkPhase],[60,0,heldState.workers[0].walkPhase]);}
     release();
    }
    if(ready?.committed){
     secondFarm=receipts.get(ready).nativeFarmArrivalBinding;
     const frame=f.host.inspect().nativeRouteFrame;
     if(frame?.worldBoundary?.ticket===secondFarm.reference.worldBoundary.ticket)seenCivilDraw=true;
    }
    if(seenCivilDraw&&state.workers[0].nativeRouteAdmission==='native-idle'&&committed('idle-cycle'))break;
    const step=f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});state=JSON.parse(step.snapshot);
    for(const key of step.residency?.missing??[]){const [cx,cz]=key.split(',').map(Number);f.command({kind:'addChunk',cx,cz});}
    if(state.workers[0].status==='home')atHome=true;
    ended??=state.events.find(e=>e.type==='RaidEnded');
   }
   if(order==='foreign-retirement'){
    assert.match(f.host.inspect().errors.join('\n'),/Civil Farm request lacks its acquired Home absence/);
    assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length,1);return;
   }
   assert(atHome&&ended&&retreat&&seenCivilDraw&&secondFarm);
   assert.equal(absent,order==='absence-first');assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&r.committed).length,2);
   const r=secondFarm.reference,q=r.sourceRequest;
   assert.throws(()=>copyFarmRequest({...hire.sourceRequest,refugeSequence:undefined}),/Invalid native farm arrival source/);
   assert.throws(()=>copyFarmRequest({...q,refugeSequence:q.requestSequence}),/Invalid native farm arrival source/);
   assert.equal(q.version,2);assert.equal(q.refugeSequence,firstHome.retiredSequence);
   assert.equal(q.actorId,hire.actorId);assert.notEqual(r.bodyId,hire.bodyId);assert.notEqual(r.bodyId,retreat.bodyId);
   assert(q.requestedAt>=ended.simulationTime);assert.equal(r.motionFlags,0);
   assert.deepEqual([q.pose.x,q.pose.z],[60,0]);
   for(const key of ['yaw','walkPhase','runPhase','carryPhase','runRemaining'])assert.equal(q.pose[key],firstHome.reference.pose[key]);
   const last=state.workers[0];assert.equal(last.status,'idle');assert.equal(last.raidReturn,false);
   assert.equal(last.nativeRouteAdmission,'native-idle');assert.equal(last.nativeRefugeSequence,undefined);
   assert.equal(last.contractDay,original.contractDay);assert.equal(last.personId,original.personId);
   assert.deepEqual(state.ledger,initial.ledger);assert.deepEqual(f.faults,[]);
  }finally{release();await f.close();}
 });
}
