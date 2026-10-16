import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {villageLayout} from '../src/world/villages.js';
import {spawnRaid,targetFor} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';
import {syncNativeCampaignRaidView} from '../tools/native-campaign-runner.mjs';
import {simulateNativeCampaign} from '../tools/native-campaign-runner.mjs';
import {createNativeCampaignPlots} from '../tools/native-campaign-plots.mjs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

const module=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??new URL(
    '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',
  import.meta.url),'utf8'))[0];

test('a native raid approaches an active shield border before waiting on its old route',async()=>{
  let sawShieldApproach=false;
  const result=await simulateNativeCampaign({days:1,seed:712,
    biome:'manglares',culture:'mapungubwe',strategy:'good',nativeIntents:true,
    spatialAdvice:true,defensePolicy:'expanding',reloadRaids:false,
    nativeEvidence:false,openingFactory:createSpatialCampaignOpening,
    entryDriverFactory:()=>({async advancePresentation(){},
      async waitForEntry(){},report(){return {};},async dispose(){}}),
    onTick:state=>{
      const animal=state.raid?.animals[0];
      const shield=state.spells.find(spell=>spell.kind==='shield'&&
        spell.remaining>0);
      if(shield&&animal?.approachShieldId===shield.id&&
        animal.status==='attacking')sawShieldApproach=true;
    }});
  const raid=result.raidEvidence.raids[0];
  assert.equal(result.completedNights,1);
  assert.equal(result.raidEvidence.status,'verified');
  assert(sawShieldApproach,
    'a pending native crop route must be replaced by the new shield-border route');
  assert.equal(raid.shieldContacts,2);
  assert.equal(raid.cropsDestroyed,0);
});

test('Volcanes day-10 raid uses the replacement center for the headless camera',()=>{
  const artifact=JSON.parse(gunzipSync(readFileSync(new URL(
    './fixtures/volcanes-907-day10-native-entry.json.gz',import.meta.url))));
  const state=deserialize(artifact.partialState),loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const center=state.structures.find(s=>s.kind==='center'&&s.status==='intact');
    assert.deepEqual({x:center.x,z:center.z},{x:83,z:0});
    const stale={x:84,z:9},eye={x:100.70247532024266,z:39.57367599590944};
    const bounds=activeChunkRegion(eye).bounds;
    const cx=Math.floor((eye.x+24)/48),cz=Math.floor((eye.z+24)/48);
    const load=(x,z)=>{
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    };
    for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++)load(x,z);
    const nav=createSpatialNavigationMovement(session,state);
    const currentCenter=syncNativeCampaignRaidView(state,nav,null);
    assert.equal(currentCenter.key,`${center.id}:83:0`);
    // Plot search can focus a previously explored parcel without replacing
    // the operational center. Use its real focus path to overwrite raidView.
    const placement=nav.placement,path=nav.path;
    nav.placement=()=>({valid:true});nav.path=()=>[];
    try{
      const plotState={...state,structures:[{...center,x:84,z:9}],plants:[]};
      createNativeCampaignPlots(nav,()=>plotState,{spacing:48,checksPerDecision:1}).choose();
    }finally{nav.placement=placement;nav.path=path;}
    assert.deepEqual(nav.raidView.target,stale);
    assert.deepEqual(nav.raidView.eye,eye);
    assert.deepEqual(nav.activeBounds,bounds);
    assert.equal(spawnRaid(state,state.nightPlan,nav),false);
    assert(nav.raidEntryFailure);
    assert.equal(syncNativeCampaignRaidView(state,nav,currentCenter),currentCenter);
    const pose=nativeCameraPose(session.field,[center.x,0,center.z],.5,1.16,38);
    assert.deepEqual(nav.raidView,{eye:{x:pose.eye[0],z:pose.eye[2]},target:{x:83,z:0}});
    assert.equal(spawnRaid(state,state.nightPlan,nav),true);
    assert.equal(nav.raidEntryFailure,undefined);
    assert.equal(state.raid.animals.length,state.nightPlan.group.length);
    assert(state.raid.animals.every(a=>nav.walkable(a.x,a.z,a.radius,null,false)&&
      nav.segmentClear(a,a.exit,a.radius,null,false)));
    const entryBounds=nav.activeBounds;
    syncNativeCampaignRaidView(state,nav,currentCenter);
    assert.deepEqual(nav.activeBounds,entryBounds,'valid raid residency remains pinned');
    const replacement={...center,id:'structure-3',x:251,z:144};
    const changed=syncNativeCampaignRaidView({...state,structures:[replacement]},nav,currentCenter);
    const movedPose=nativeCameraPose(session.field,[251,0,144],.5,1.16,38);
    assert.equal(changed.key,'structure-3:251:144');
    assert.deepEqual(nav.raidView.target,{x:251,z:144});
    assert.deepEqual(nav.activeBounds,activeChunkRegion({x:movedPose.eye[0],z:movedPose.eye[2]}).bounds);
  }finally{session.dispose();}
});

test('a native Sabana incursion spawns physically and advances through Game.tick',async t=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'spatial-native-raid'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  let restoredSession,controlSession;
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-36,-36,36,36]);
    nav.setRaidView({x:12,z:12},{x:0,z:0});
    let crop;
    for(let z=-14;z<=14&&!crop;z+=2)for(let x=-14;x<=14&&!crop;x+=2)
      if(nav.placement(x,z,.4).valid)crop={x,z};
    assert(crop);
    assert.equal(Game.plant(state,'raid-crop','mijo',crop.x,crop.z,nav),true);
    let valuable;
    for(let z=-14;z<=14&&!valuable;z+=2)for(let x=-14;x<=14&&!valuable;x+=2)
      if(Math.hypot(x-crop.x,z-crop.z)>3&&nav.placement(x,z,.4).valid)
        valuable={x,z};
    assert(valuable);
    assert.equal(Game.plant(state,'raid-valuable-crop','platano',
      valuable.x,valuable.z,nav),true);
    state.day=6;state.time=310;
    const plan={at:310,group:['warthog'],done:false,introductory:false};
    assert.notEqual(spawnRaid(state,plan,nav),false,
      'an animal needs a physically exterior resident entrance');
    assert.equal(state.raid?.animals.length,1);
    const control=deserialize(serialize(state)),controlLoaded=new Map();
    controlSession=createSpatialGameSession(module,control,{
      loaded:()=>controlLoaded,
      onData:data=>controlLoaded.set(`${data.cx},${data.cz}`,data)});
    controlSession.stream.plan(jobs);await controlSession.stream.whenIdle();
    const controlNav=createSpatialNavigationMovement(controlSession,control);
    controlNav.setActiveBounds([-36,-36,36,36]);
    controlNav.setRaidView(nav.raidView.eye,nav.raidView.target);
    const controlAnimal=control.raid.animals[0];
    const pathDistance=(origin,path)=>{
      let previous=origin,length=0;
      for(const point of path??[]){
        length+=Math.hypot(point.x-previous.x,point.z-previous.z);
        previous=point;
      }
      return length;
    };
    let controlInitialPathLength;
    for(let step=0;step<500&&controlAnimal.status!=='attacking';step++){
      Game.tick(control,.2,controlNav);
      if(controlInitialPathLength===undefined&&controlAnimal.path?.length)
        controlInitialPathLength=pathDistance(controlAnimal,controlAnimal.path);
    }
    assert.equal(controlAnimal.status,'attacking',
      'the baseline raid must reach a comparable physical attack');
    const controlFirstAttackAt=control.elapsed;
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    const probeAnimal=state.raid.animals[0];
    const freePlan=planner.planAttackCrop(state,probeAnimal);
    assert.equal(freePlan?.status,'found');
    planner.cancelAttackIntent(probeAnimal.id);
    const mobileBlocker={id:'animal-999999',status:'waiting',
      x:freePlan.approach.point.x,z:freePlan.approach.point.z,radius:.28};
    state.raid.animals.push(mobileBlocker);
    const busyPlan=planner.planAttackCrop(state,probeAnimal);
    assert.notEqual(busyPlan?.status,'unknown',
      'mobile occupancy must not become unknown topology');
    if(busyPlan?.status==='found'){
      assert(Math.hypot(busyPlan.approach.point.x-mobileBlocker.x,
        busyPlan.approach.point.z-mobileBlocker.z)>=
        (probeAnimal.radius??.28)+mobileBlocker.radius-1e-8,
      'the native planner must choose another physically free site');
      planner.cancelAttackIntent(probeAnimal.id);
    }
    state.raid.animals.pop();
    const reservedSite={id:'animal-999998',status:'walking',
      x:probeAnimal.x+12,z:probeAnimal.z+12,radius:.28,
      targetId:state.plants.find(plant=>plant.id!==freePlan.target.id).id,
      approach:freePlan.approach.point};
    state.raid.animals.push(reservedSite);
    const reservedPlan=planner.planAttackCrop(state,probeAnimal);
    assert.equal(reservedPlan?.status,'found',
      'a reserved attack site leaves another reachable physical approach');
    assert(Math.hypot(reservedPlan.approach.point.x-reservedSite.approach.x,
      reservedPlan.approach.point.z-reservedSite.approach.z)>=
      (probeAnimal.radius??.28)+reservedSite.radius+.1-1e-8,
    'native crop selection must honor another animal’s future attack site');
    planner.cancelAttackIntent(probeAnimal.id);
    state.raid.animals.pop();
    const leasedCrop={id:'animal-999997',status:'walking',
      x:30,z:30,radius:.28,targetId:freePlan.target.id,
      approach:{x:30,z:30}};
    state.raid.animals.push(leasedCrop);
    const leasedPlan=planner.planAttackCrop(state,probeAnimal);
    assert.notEqual(leasedPlan?.target?.id,freePlan.target.id,
      'a JS crop lease between strikes cannot be offered to another animal');
    if(leasedPlan?.status==='found')planner.cancelAttackIntent(probeAnimal.id);
    state.raid.animals.pop();
    planner.resetFromState(state);
    let stopWorld=planner.observeWorld(state),stopTasks=planner.observeTasks(state);
    const intentCalls={registered:0,committed:0,finished:0,
      nativeCropPlans:0,nativeCropFound:0};
    let nativeInitialPathLength;
    const nativeCropPlan=planner.planAttackCrop;
    planner.planAttackCrop=(...args)=>{
      const result=nativeCropPlan(...args);
      intentCalls.nativeCropPlans++;
      if(result?.status==='found'){
        intentCalls.nativeCropFound++;
        nativeInitialPathLength=pathDistance(args[1],result.approach.path);
      }
      return result;
    };
    for(const [method,key] of [['registerAttackIntent','registered'],
      ['markAttackActive','committed'],['finishAttackIntent','finished']]){
      const native=planner[method];
      planner[method]=(...args)=>{intentCalls[key]++;return native(...args);};
    }
    nav.intentTaskPlanner=planner;
    const animal=state.raid.animals[0],start={x:animal.x,z:animal.z},
      initialHits=animal.hitsRemaining;
    let restoredCommittedStrike=false;
    for(let i=0;i<500&&animal.status!=='gone';i++){
      Game.tick(state,.2,nav);
      if(!restoredCommittedStrike&&animal.status==='attacking'){
        t.diagnostic(JSON.stringify({controlFirstAttackAt,
          nativeFirstAttackAt:state.elapsed,
          controlTargetId:controlAnimal.targetId,nativeTargetId:animal.targetId,
          controlApproach:controlAnimal.approach,nativeApproach:animal.approach,
          controlInitialPathLength,nativeInitialPathLength,
          nativeCropPlans:intentCalls.nativeCropPlans}));
        assert.equal(animal.targetId,controlAnimal.targetId,
          'native crop selection preserves this fixture\'s highest-priority target');
        assert(state.elapsed<=controlFirstAttackAt+.2,
          'native crop planning must not delay the first physical strike');
        assert.equal(intentCalls.nativeCropPlans,1,
          'ordinary travel ticks never request another native crop plan');
        assert.equal(planner.metrics(state.elapsed).nativeAnimalPlans,1);
        assert.deepEqual(Object.values(planner.metrics(state.elapsed).perAnimalPerMinute),[1]);
        assert.deepEqual(Object.values(planner.metrics(state.elapsed+61).perAnimalPerMinute),[0]);
        assert.deepEqual(Object.values(planner.metrics(state.elapsed+61).animalPlansByActor),[1]);
        assert.deepEqual(Object.values(planner.metrics(state.elapsed+61).animalPeakPlansPerMinute),[1]);
        const saved=deserialize(serialize(state));
        const committed=saved.raid.animals.find(item=>item.id===animal.id);
        assert.equal(committed.attackId,animal.attackId);
        assert.equal(committed.attackRemaining,animal.attackRemaining);
        const restoredLoaded=new Map();
        restoredSession=createSpatialGameSession(module,saved,{
          loaded:()=>restoredLoaded,
          onData:data=>restoredLoaded.set(`${data.cx},${data.cz}`,data)});
        const savedChunks=new Map();
        for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
          savedChunks.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
        restoredSession.stream.plan(savedChunks);
        await restoredSession.stream.whenIdle();
        const restoredNav=createSpatialNavigationMovement(restoredSession,saved);
        restoredNav.setActiveBounds([-36,-36,36,36]);
        restoredNav.setRaidView(nav.raidView.eye,nav.raidView.target);
        const restoredPlanner=createEventDrivenTaskPlanner(restoredSession);
        assert.equal(restoredPlanner.resetFromState(saved).restoredAnimalAttacks,1);
        const stopRestoredWorld=restoredPlanner.observeWorld(saved);
        const stopRestoredTasks=restoredPlanner.observeTasks(saved);
        restoredNav.intentTaskPlanner=restoredPlanner;
        stopTasks();stopWorld();
        const report=planner.resetFromState(state);
        assert.equal(report.restoredAnimalAttacks,1);
        stopWorld=planner.observeWorld(state);stopTasks=planner.observeTasks(state);
        for(let step=0;step<15;step++){
          Game.tick(state,.1,nav);Game.tick(saved,.1,restoredNav);
          assert.equal(serialize(saved),serialize(state),
            'native session restoration preserves the committed raid outcome');
        }
        stopRestoredTasks();stopRestoredWorld();
        delete restoredNav.intentTaskPlanner;
        restoredCommittedStrike=true;
      }
    }
    assert(restoredCommittedStrike,JSON.stringify({status:animal.status,
      hitsRemaining:animal.hitsRemaining,targetId:animal.targetId,
      x:animal.x,z:animal.z,approach:animal.approach,pathLength:animal.path?.length,
      start,intentCalls,events:state.events.slice(-6).map(event=>event.type)}));
    assert(Math.hypot(animal.x-start.x,animal.z-start.z)>1||animal.status==='gone',
      'the real raid should advance on native routes');
    for(let i=0;i<2000&&state.raid;i++)Game.tick(state,.25,nav);
    assert.equal(state.raid,null,JSON.stringify({status:animal.status,
      hitsRemaining:animal.hitsRemaining,x:animal.x,z:animal.z,time:state.time}));
    assert(state.events.some(event=>event.type==='RaidEnded'));
    assert(animal.hitsRemaining<initialHits,
      'the native route should lead to a physical attack, not only a retreat');
    assert(intentCalls.registered>=intentCalls.committed&&intentCalls.committed>0);
    assert(intentCalls.nativeCropPlans>0&&intentCalls.nativeCropFound>0,
      'the real raid chooses at least one accessible crop through Wild Engine');
    assert.equal(intentCalls.committed,intentCalls.finished,
      'real native raid intentions finish once at each committed damage frame');
    stopTasks();stopWorld();delete nav.intentTaskPlanner;
  }finally{restoredSession?.dispose();controlSession?.dispose();session.dispose();}
});

test('an opt-in raider keeps its crop lease when a new wall only invalidates its route',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'spatial-native-reroute'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,
    culture:'mapungubwe',villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  let restoredSession;
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-36,-36,36,36]);
    nav.setRaidView({x:12,z:12},{x:0,z:0});
    let crop;
    for(let z=-14;z<=14&&!crop;z+=2)for(let x=-14;x<=14&&!crop;x+=2)
      if(nav.placement(x,z,.4).valid)crop={x,z};
    assert(crop);
    assert.equal(Game.plant(state,'reroute-crop','mijo',crop.x,crop.z,nav),true);
    state.day=6;state.time=310;
    assert.notEqual(spawnRaid(state,{at:310,group:['warthog'],
      done:false,introductory:false},nav),false);
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    const stopWorld=planner.observeWorld(state),stopTasks=planner.observeTasks(state);
    nav.intentTaskPlanner=planner;
    const animal=state.raid.animals[0];
    Game.tick(state,.2,nav);
    assert(animal.path?.length>4,'the native crop plan has a route to obstruct');
    const targetId=animal.targetId,reservation=animal.reservation;
    const oldVersion=nav.version;
    const wallPoint=animal.path[Math.floor(animal.path.length/2)];
    const blockingRouteWall=session.core.addWall(wallPoint.x,wallPoint.z,.3,.3);
    assert(blockingRouteWall>0);
    assert(planner.reconcileNavigationRevision(state,oldVersion+1)>0);
    planner.reconcileWorkerRoutes(state,{navVersion:oldVersion+1});
    assert.equal(animal.targetId,targetId);
    assert.equal(animal.reservation,reservation);
    assert.equal(state.raid.reservations[reservation],animal.id);
    assert(animal.path?.length>0,'Wild Engine supplies the replacement route');
    assert.equal(planner.attackRoutePending(animal.id),false);
    assert.equal(planner.metrics(state.elapsed).nativeAnimalPlans,2,
      'one target plan and one event-triggered route replacement');
    const blockedApproach=session.core.addWall(animal.approach.x,
      animal.approach.z,.3,.3);
    assert(blockedApproach>0);
    assert(planner.reconcileNavigationRevision(state,oldVersion+2)>0);
    planner.reconcileWorkerRoutes(state,{navVersion:oldVersion+2});
    assert.equal(planner.attackRoutePending(animal.id),true,
      'one unavailable interaction point remains unknown, not a lost target');
    assert.equal(animal.targetId,targetId);
    assert.equal(state.raid.reservations[reservation],animal.id);
    const pendingPlans=planner.metrics(state.elapsed).nativeAnimalPlans;
    for(let tick=0;tick<10;tick++)
      planner.reconcileWorkerRoutes(state,{navVersion:oldVersion+2});
    assert.equal(planner.metrics(state.elapsed).nativeAnimalPlans,pendingPlans,
      'an unresolved route does not replan on ordinary ticks');
    assert.equal(session.core.removeBarrier(blockedApproach),1);
    assert(planner.reconcileNavigationRevision(state,oldVersion+3)>0);
    planner.reconcileWorkerRoutes(state,{navVersion:oldVersion+3});
    assert.equal(planner.attackRoutePending(animal.id),false);
    assert(animal.path?.length>0);
    assert.equal(animal.targetId,targetId);
    assert.equal(session.core.removeBarrier(blockingRouteWall),1);
    animal.path=null;
    const saved=deserialize(serialize(state)),restoredLoaded=new Map();
    restoredSession=createSpatialGameSession(module,saved,{
      loaded:()=>restoredLoaded,
      onData:data=>restoredLoaded.set(`${data.cx},${data.cz}`,data)});
    restoredSession.stream.plan(jobs);await restoredSession.stream.whenIdle();
    const restoredNav=createSpatialNavigationMovement(restoredSession,saved);
    const restoredPlanner=createEventDrivenTaskPlanner(restoredSession);
    const report=restoredPlanner.resetFromState(saved);
    assert.equal(report.restoredAnimalRoutes,0);
    restoredPlanner.reconcileWorkerRoutes(saved,{navVersion:restoredNav.version});
    const restoredAnimal=saved.raid.animals[0];
    assert.equal(restoredAnimal.targetId,targetId);
    assert.equal(saved.raid.reservations[reservation],restoredAnimal.id);
    assert(restoredAnimal.path?.length>0,
      'a saved pending attack restores its native lease and obtains one fresh route');
    stopTasks();stopWorld();delete nav.intentTaskPlanner;
  }finally{restoredSession?.dispose();session.dispose();}
});

for(const count of [1,5])test(`${count} native raiders attack an accessible wall instead of crossing a closed crop enclosure`,async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'spatial-walled-raid'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-36,-36,36,36]);
    let ring,inside;
    for(let z=-14;z<=14&&!ring;z+=4)for(let x=-14;x<=14&&!ring;x+=4){
      const candidate=[[x,z],[x+8,z],[x+8,z+8],[x,z+8],[x,z]];
      const crop={x:x+4,z:z+4};
      if(!nav.placement(crop.x,crop.z,.4).valid)continue;
      const plan=Game.previewWallChain(state,'zarzas',candidate,nav,
        {smooth:false,snap:false});
      if(plan.gates===1&&plan.pieces.length>=12){ring=candidate;inside=crop;}
    }
    assert(ring);
    assert.equal(Game.plant(state,'protected-crop','mijo',inside.x,inside.z,nav),true);
    assert.equal(Game.buildWallChain(state,'protected-ring','zarzas',ring,nav,
      {smooth:false,snap:false}),true);
    const walls=state.structures.filter(item=>item.kind==='wall');
    assert(walls.length>=12);
    nav.setRaidView({x:ring[0][0]-7,z:ring[0][1]+4},inside);
    state.day=6;state.time=310;
    assert.notEqual(spawnRaid(state,{at:310,group:Array(count).fill('warthog'),done:false,
      introductory:false},nav),false);
    assert.equal(state.raid.animals.length,count);
    let stopWorld,stopTasks,nativeCropStatus=[],routeRefreshDuringAttack=0;
    let nativeWallIds;
    if(count===1){
      const planner=createEventDrivenTaskPlanner(session);
      planner.resetFromState(state);
      planner.nativeWallSelectionEnabled=true;
      nav.raidSelectionStats={};
      session.actorSectorRevision({worker:false,species:state.raid.animals[0].species});
      const wasm=session.core.wasm;
      const initialBuilds=wasm.nav_intent_wall_portal_builds();
      const portalCount=wasm.nav_intent_wall_portals(state.raid.animals[0].radius);
      assert(portalCount>0,'the native region graph exposes wall-side portals');
      assert.equal(wasm.nav_intent_wall_portal_builds(),initialBuilds+1);
      assert.equal(wasm.nav_intent_wall_portals(state.raid.animals[0].radius),
        portalCount);
      assert.equal(wasm.nav_intent_wall_portal_builds(),initialBuilds+1,
        'unchanged topology reuses the profile-specific wall graph');
      const rows=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_wall_portals_ptr(),portalCount*5);
      const wallIds=new Set(walls.map(wall=>Number(wall.id.split('-').at(-1))));
      nativeWallIds=new Set();
      for(let offset=0;offset<rows.length;offset+=5){
        assert(wallIds.has(rows[offset]));
        nativeWallIds.add(rows[offset]);
        assert.notEqual(rows[offset+1],rows[offset+2]);
        assert(Number.isFinite(rows[offset+3])&&Number.isFinite(rows[offset+4]));
      }
      const cropId=Number(state.plants.find(plant=>plant.alive).id.split('-').at(-1));
      assert.equal(wasm.nav_intent_perimeter_walls(
        state.raid.animals[0].x,state.raid.animals[0].z,
        state.raid.animals[0].radius,cropId),1,
      'the native region graph finds a wall crossing toward the sealed crop');
      const perimeterCount=wasm.nav_intent_perimeter_wall_count();
      assert(perimeterCount>0);
      const perimeterRows=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_perimeter_walls_ptr(),perimeterCount*3);
      const perimeterIds=new Set([...Array(perimeterCount).keys()].map(
        index=>perimeterRows[index*3]));
      assert([...perimeterIds].every(id=>nativeWallIds.has(id)));
      assert.equal(wasm.nav_intent_plan_attack_wall(
        Number(state.raid.animals[0].id.split('-').at(-1)),
        state.raid.animals[0].x,state.raid.animals[0].z,
        state.raid.animals[0].radius),1,
      'a certified perimeter yields one native wall, route and lease');
      const proposal=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_wall_attack_result_ptr(),10);
      assert(wallIds.has(proposal[1]));
      assert(wasm.nav_intent_route_points(...proposal.slice(4,7))>0);
      assert.equal(wasm.nav_intent_attack_cancel(
        Number(state.raid.animals[0].id.split('-').at(-1))),1);
      assert.equal(session.core.removeChunk(0,0),1);
      session.actorSectorRevision({worker:false,species:state.raid.animals[0].species});
      assert.equal(wasm.nav_intent_wall_portals(state.raid.animals[0].radius),0,
        'unloaded sectors cannot certify a wall-side portal');
      assert.equal(wasm.nav_intent_wall_portal_builds(),initialBuilds+2);
      assert(session.core.addChunk(0,0)>0);
      session.actorSectorRevision({worker:false,species:state.raid.animals[0].species});
      assert(wasm.nav_intent_wall_portals(state.raid.animals[0].radius)>0,
        'the portal graph recovers when the sector becomes resident again');
      assert.equal(wasm.nav_intent_wall_portal_builds(),initialBuilds+3);
      stopWorld=planner.observeWorld(state);stopTasks=planner.observeTasks(state);
      const planCrop=planner.planAttackCrop;
      planner.planAttackCrop=(...args)=>{
        const result=planCrop(...args);
        nativeCropStatus.push(result?.status??'fallback');return result;
      };
      nav.intentTaskPlanner=planner;
      nav.planningObserver=event=>{
        if(event.kind==='routeRefresh'&&state.raid?.animals.some(animal=>
          animal.id===event.actorId&&animal.targetId))routeRefreshDuringAttack++;
      };
    }
    const animals=[...state.raid.animals],initialHits=animals.map(animal=>animal.hitsRemaining);
    for(let i=0;i<2000&&state.raid;i++)Game.tick(state,.25,nav);
    assert.equal(state.raid,null,JSON.stringify(animals.map(animal=>({
      status:animal.status,hitsRemaining:animal.hitsRemaining,x:animal.x,z:animal.z}))));
    assert(animals.some((animal,i)=>animal.hitsRemaining<initialHits[i]));
    if(count>1)assert(animals.filter((animal,i)=>animal.hitsRemaining<initialHits[i]).length>=2,
      'independent attackers should spend their own attack budgets');
    assert(state.events.some(event=>event.type==='StructureHit'&&
      walls.some(wall=>wall.id===event.targetId)),
    'the animal should damage a real wall rather than cross the closed perimeter');
    if(count===1){
      assert(state.events.some(event=>event.type==='StructureHit'&&
        nativeWallIds.has(Number(event.targetId?.split('-').at(-1)))),
      'the native portal graph nominates a wall the raider can actually hit');
      assert(nativeCropStatus.length>0);
      assert(nativeCropStatus.every(status=>status!=='found'),
        'a closed crop enclosure must not produce a native crop route');
      assert.equal(routeRefreshDuringAttack,0,
        'an active wall intention must not invoke the legacy route planner');
      assert((nav.raidSelectionStats.nativeWallResults?.found??0)>0,
        'the opt-in raid uses a native wall proposal against the closed ring');
      stopTasks();stopWorld();delete nav.intentTaskPlanner;
    }
  }finally{session.dispose();}
});

test('a confirmed enclosure breach reconsiders other wall attackers at an event boundary',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'spatial-breach-reconsideration'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  let restoredSession,stopRestoredWorld=()=>{},stopRestoredTasks=()=>{};
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-36,-36,36,36]);
    let ring,inside;
    for(let z=-14;z<=14&&!ring;z+=4)for(let x=-14;x<=14&&!ring;x+=4){
      const candidate=[[x,z],[x+8,z],[x+8,z+8],[x,z+8],[x,z]];
      const crop={x:x+4,z:z+4};
      if(!nav.placement(crop.x,crop.z,.4).valid)continue;
      const plan=Game.previewWallChain(state,'zarzas',candidate,nav,
        {smooth:false,snap:false});
      if(plan.gates===1&&plan.pieces.length>=12){ring=candidate;inside=crop;}
    }
    assert(ring);
    assert.equal(Game.plant(state,'protected-crop','mijo',inside.x,inside.z,nav),true);
    assert.equal(Game.buildWallChain(state,'protected-ring','zarzas',ring,nav,
      {smooth:false,snap:false}),true);
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    const stopWorld=planner.observeWorld(state),stopTasks=planner.observeTasks(state);
    nav.intentTaskPlanner=planner;
    try{
      nav.setRaidView({x:ring[0][0]-7,z:ring[0][1]+4},inside);
      state.day=6;state.time=310;
      assert.notEqual(spawnRaid(state,{at:310,group:['warthog','warthog'],
        done:false,introductory:false},nav),false);
      let attackers=[];
      for(let i=0;i<100;i++){
        Game.tick(state,.25,nav);
        attackers=state.raid?.animals.filter(animal=>
          state.structures.some(wall=>wall.id===animal.targetId&&
            wall.kind==='wall'))??[];
        if(attackers.length===2)break;
      }
      assert.equal(attackers.length,2,'both animals should target the closed enclosure');
      const wasm=session.core.wasm;
      session.actorSectorRevision({worker:false,species:attackers[0].species});
      const beforePortals=wasm.nav_intent_wall_portals(attackers[0].radius);
      const beforeRows=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_wall_portals_ptr(),beforePortals*5);
      const beforePortalIds=new Set([...Array(beforePortals).keys()].map(
        index=>beforeRows[index*5]));
      assert([...attackers].some(animal=>beforePortalIds.has(
        Number(animal.targetId.split('-').at(-1)))));
      for(const animal of attackers){
        session.actorSectorRevision({worker:false,species:animal.species});
        assert(wasm.nav_intent_track_wall_opportunities(
          Number(animal.id.split('-').at(-1)),animal.x,animal.z,
          animal.radius)>0,'the native intent should remember a blocked crop group');
      }
      assert.equal(wasm.nav_intent_wall_opportunity_candidates(),2,
        'the native inverse index should contain both wall attackers');
      const priorTargets=new Map(attackers.map(animal=>[animal.id,animal.targetId]));
      const saved=deserialize(serialize(state)),restoredLoaded=new Map();
      restoredSession=createSpatialGameSession(module,saved,{
        loaded:()=>restoredLoaded,
        onData:data=>restoredLoaded.set(`${data.cx},${data.cz}`,data)});
      restoredSession.stream.plan(jobs);
      await restoredSession.stream.whenIdle();
      const restoredNav=createSpatialNavigationMovement(restoredSession,saved);
      restoredNav.setActiveBounds([-36,-36,36,36]);
      restoredNav.setRaidView(nav.raidView.eye,nav.raidView.target);
      const restoredPlanner=createEventDrivenTaskPlanner(restoredSession);
      assert.equal(restoredPlanner.resetFromState(saved).restoredAnimalRoutes,2);
      stopRestoredWorld=restoredPlanner.observeWorld(saved);
      stopRestoredTasks=restoredPlanner.observeTasks(saved);
      restoredNav.intentTaskPlanner=restoredPlanner;
      const walls=state.structures.filter(wall=>wall.kind==='wall'&&
        wall.status==='intact');
      const breach=walls.filter(wall=>
        ![...priorTargets.values()].includes(wall.id));
      assert(breach.length>=2);
      for(const wall of breach){
        wall.status='ruined';wall.hp=0;
        Game.emit(state,'StructureRuined',{targetId:wall.id});
        const restoredWall=saved.structures.find(item=>item.id===wall.id);
        restoredWall.status='ruined';restoredWall.hp=0;
        Game.emit(saved,'StructureRuined',{targetId:wall.id});
      }
      nav.setState(state);
      restoredNav.setState(saved);
      const originalPlanAttackCrop=planner.planAttackCrop;
      const nativeBreachPlans=[];
      planner.planAttackCrop=(...args)=>{
        const result=originalPlanAttackCrop(...args);
        nativeBreachPlans.push(result&&{status:result.status,
          regionQueries:result.regionQueries,routeQueries:result.routeQueries,
          diagnostics:result.diagnostics});
        return result;
      };
      Game.tick(state,.25,nav);
      Game.tick(saved,.25,restoredNav);
      session.actorSectorRevision({worker:false,species:attackers[0].species});
      const afterPortals=wasm.nav_intent_wall_portals(attackers[0].radius);
      const afterRows=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_wall_portals_ptr(),afterPortals*5);
      const ruinedIds=new Set(breach.map(wall=>Number(wall.id.split('-').at(-1))));
      for(let index=0;index<afterPortals;index++)
        assert(!ruinedIds.has(afterRows[index*5]),
          'a ruined wall cannot remain a native attackable portal');
      if(process.env.WILD_ENGINE_NATIVE_ROUTE_WASM)
        assert(nativeBreachPlans.some(plan=>plan?.status==='found'),
          `native crop planner should resolve the opened access: ${JSON.stringify(nativeBreachPlans)}`);
      const survivingWallAttackers=state.raid.animals.filter(animal=>
        state.structures.some(wall=>wall.id===priorTargets.get(animal.id)&&
          wall.status==='intact'));
      assert(survivingWallAttackers.length>0,
        'the scenario must retain an unaffected wall target');
      assert(survivingWallAttackers.some(animal=>
        state.plants.some(crop=>crop.id===animal.targetId)),
      `an attacker of a different wall must reconsider the opened enclosure: ${
        JSON.stringify(state.raid.animals.map(animal=>({id:animal.id,
          before:priorTargets.get(animal.id),after:animal.targetId,
          status:animal.status})))}`);
      assert.equal(new Set(Object.values(state.raid.reservations)).size,
        Object.values(state.raid.reservations).length,
        'reconsideration must not duplicate animal reservations');
      for(const animal of state.raid.animals){
        const resumed=saved.raid.animals.find(item=>item.id===animal.id);
        assert.equal(resumed.targetId,animal.targetId,
          'loaded attackers reconsider the same target after the breach');
        assert.equal(resumed.reservation,animal.reservation);
        assert.equal(resumed.hitsRemaining,animal.hitsRemaining);
      }
      assert.deepEqual(saved.raid.reservations,state.raid.reservations);
      const continuousState=JSON.parse(serialize(state));
      const resumedState=JSON.parse(serialize(saved));
      for(const copy of [continuousState,resumedState]){
        for(const animal of copy.raid.animals){
          delete animal.pathVersion;
          delete animal.mobileRecoveryVersion;
          if(animal.raidWait)delete animal.raidWait.epoch;
        }
      }
      const continuous=JSON.stringify(continuousState),resumed=JSON.stringify(resumedState);
      if(continuous!==resumed){
        let index=0;
        while(index<Math.min(continuous.length,resumed.length)&&
          continuous[index]===resumed[index])index++;
        assert.fail(`saved breach state diverged at ${index}: ${
          continuous.slice(index-150,index+90)} versus ${resumed.slice(index-150,index+90)}`);
      }
      assert.equal(wasm.nav_intent_wall_opportunity_candidates(),0,
        'releasing wall intentions must remove inverse dependencies');
    }finally{stopTasks();stopWorld();delete nav.intentTaskPlanner;}
  }finally{stopRestoredTasks();stopRestoredWorld();restoredSession?.dispose();session.dispose();}
});

test('animal damage ruins a saved enclosure wall without changing the restored raid',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'spatial-real-breach-restore'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,
    culture:'mapungubwe',villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const jobs=new Map();
  for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
    jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  let restoredSession,stopWorld=()=>{},stopTasks=()=>{},
    stopRestoredWorld=()=>{},stopRestoredTasks=()=>{};
  try{
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-36,-36,36,36]);
    let ring,inside;
    for(let z=-14;z<=14&&!ring;z+=4)for(let x=-14;x<=14&&!ring;x+=4){
      const candidate=[[x,z],[x+8,z],[x+8,z+8],[x,z+8],[x,z]];
      const crop={x:x+4,z:z+4};
      if(!nav.placement(crop.x,crop.z,.4).valid)continue;
      const plan=Game.previewWallChain(state,'zarzas',candidate,nav,
        {smooth:false,snap:false});
      if(plan.gates===1&&plan.pieces.length>=12){ring=candidate;inside=crop;}
    }
    assert(ring);
    assert.equal(Game.plant(state,'fragile-ring-crop','mijo',inside.x,inside.z,nav),true);
    assert.equal(Game.buildWallChain(state,'fragile-ring','zarzas',ring,nav,
      {smooth:false,snap:false}),true);
    const walls=state.structures.filter(item=>item.kind==='wall');
    assert(walls.length>=12);
    for(const wall of walls)wall.hp=Math.floor(wall.maxHp*.2)+1;
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    stopWorld=planner.observeWorld(state);stopTasks=planner.observeTasks(state);
    nav.intentTaskPlanner=planner;
    nav.setRaidView({x:ring[0][0]-7,z:ring[0][1]+4},inside);
    state.day=6;state.time=310;
    assert.notEqual(spawnRaid(state,{at:310,group:['warthog','warthog'],
      done:false,introductory:false},nav),false);
    for(let i=0;i<100;i++){
      Game.tick(state,.25,nav);
      if(state.raid?.animals.every(animal=>walls.some(wall=>
        wall.id===animal.targetId)))break;
    }
    assert(state.raid?.animals.every(animal=>walls.some(wall=>
      wall.id===animal.targetId)),'both animals target real walls before saving');
    const saved=deserialize(serialize(state)),restoredLoaded=new Map();
    restoredSession=createSpatialGameSession(module,saved,{
      loaded:()=>restoredLoaded,
      onData:data=>restoredLoaded.set(`${data.cx},${data.cz}`,data)});
    restoredSession.stream.plan(jobs);await restoredSession.stream.whenIdle();
    const restoredNav=createSpatialNavigationMovement(restoredSession,saved);
    restoredNav.setActiveBounds([-36,-36,36,36]);
    restoredNav.setRaidView(nav.raidView.eye,nav.raidView.target);
    const restoredPlanner=createEventDrivenTaskPlanner(restoredSession);
    assert.equal(restoredPlanner.resetFromState(saved).restoredAnimalRoutes,2);
    stopRestoredWorld=restoredPlanner.observeWorld(saved);
    stopRestoredTasks=restoredPlanner.observeTasks(saved);
    restoredNav.intentTaskPlanner=restoredPlanner;
    let ticks=0;
    while(!state.events.some(event=>event.type==='StructureRuined')&&ticks<800){
      Game.tick(state,.25,nav);
      Game.tick(saved,.25,restoredNav);
      ticks++;
    }
    assert(ticks<800,'an animal opens a real breach');
    assert(state.events.some(event=>event.type==='StructureHit'&&
      walls.some(wall=>wall.id===event.targetId)));
    const ruined=state.events.filter(event=>event.type==='StructureRuined');
    assert(ruined.length>0);
    assert.deepEqual(saved.events.filter(event=>event.type==='StructureRuined'),ruined);
    for(let i=0;i<8;i++){
      Game.tick(state,.25,nav);
      Game.tick(saved,.25,restoredNav);
    }
    const continuous=JSON.parse(serialize(state)),resumed=JSON.parse(serialize(saved));
    for(const copy of [continuous,resumed])for(const animal of copy.raid?.animals??[]){
      delete animal.pathVersion;
      delete animal.mobileRecoveryVersion;
      if(animal.raidWait)delete animal.raidWait.epoch;
    }
    assert.deepEqual(resumed,continuous,
      'confirmed damage, breach and follow-up decisions survive save/load');
  }finally{
    stopRestoredTasks();stopRestoredWorld();stopTasks();stopWorld();
    restoredSession?.dispose();session.dispose();
  }
});

test('a stalled retreat can phase past a mobile body occupying its exit',()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/sabana712-d9-native-stalled-raid.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    const walking=state.raid.animals.find(item=>item.id==='animal-8736');
    const walkingBefore={x:walking.x,z:walking.z};
    walking.pathVersion=nav.version;
    walking.mobileRecoveryDestinationId=walking.approach.id;
    walking.mobileRecoveryVersion=nav.version;
    assert(nav.segmentClear(walkingBefore,walking.path[0],walking.radius,null,false));
    Game.walkTo(state,walking,walking.approach,.1,nav,{speed:1.5,
      worker:false,externallyPlanned:true});
    assert(state.events.some(event=>event.type==='ActorMobileCollisionRecovery'&&
      event.actorId===walking.id),
    'an occupied crop approach may phase mobile bodies while the attack gate stays authoritative');
    assert(nav.segmentClear(walkingBefore,walking,walking.radius,null,false));
    const animal=state.raid.animals.find(item=>item.id==='animal-8730');
    assert.equal(animal.status,'retreating');
    assert.equal(animal.hitsRemaining,0);
    const exit={...animal.exit,id:`exit-${animal.id}`};
    const before={x:animal.x,z:animal.z};
    animal.pathVersion=nav.version;
    animal.mobileRecoveryDestinationId=exit.id;
    animal.mobileRecoveryVersion=nav.version;
    const next=animal.path[0];
    assert(nav.segmentClear(before,next,animal.radius,null,false),
      'the remaining path has static clearance');
    Game.walkTo(state,animal,exit,.1,nav,{speed:3.8,worker:false,
      expandRoute:true,routeVia:animal.spawn});
    assert(state.events.some(event=>event.type==='ActorMobileCollisionRecovery'&&
      event.actorId===animal.id),
    'a mobile body at the exit does not disable short-lived collision phasing');
    assert(Math.hypot(animal.x-before.x,animal.z-before.z)>0);
    assert(nav.segmentClear(before,animal,animal.radius,null,false),
      'the phased step still respects static obstacles');
    assert.equal(animal.hitsRemaining,0);
  }finally{session.dispose();}
});

test('the saved day-nine traffic jam finishes without an emergency disappearance',()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/sabana712-d9-native-stalled-raid.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const planner=createEventDrivenTaskPlanner(session);
    const restored=planner.resetFromState(state);
    assert.equal(restored.restoredAnimalRoutes,1);
    assert.equal(restored.invalidSavedAnimalRoutes,1);
    const nav=createSpatialNavigationMovement(session,state);
    const stopTasks=planner.observeTasks(state),stopWorld=planner.observeWorld(state);
    nav.intentTaskPlanner=planner;
    try{
      const oldEndCount=state.events.filter(event=>event.type==='RaidEnded').length;
      const oldAbandonCount=state.events.filter(event=>
        event.type==='AnimalRetreatExitAbandoned').length;
      let ticks=0;
      while(state.raid&&ticks<500){
        Game.tick(state,.1,nav);
        nav.serviceRaidConnectivityDemand?.();
        ticks++;
      }
      assert.equal(state.raid,null,'all animals resolve their actions or retreat');
      assert.equal(state.events.filter(event=>event.type==='RaidEnded').length,
        oldEndCount+1);
      assert.equal(state.events.filter(event=>
        event.type==='AnimalRetreatExitAbandoned').length,oldAbandonCount);
    }finally{stopTasks();stopWorld();}
  }finally{session.dispose();}
});

test('an unresolved native crop group can still expose a certified reachable enclosure wall',()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/sabana712-d10-native-unknown-enclosure.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    planner.nativeWallSelectionEnabled=true;
    const nav=createSpatialNavigationMovement(session,state);
    nav.intentTaskPlanner=planner;
    nav.raidSelectionStats={};
    const animal=state.raid.animals[0];
    const native=planner.planAttackCrop(state,animal);
    assert.equal(native.status,'unknown');
    assert(native.diagnostics.unknownCauseMask>0,
      'an inconclusive native crop plan reports its diagnostic cause');
    assert.equal(native.routeQueries,0);
    session.actorSectorRevision({worker:false,species:animal.species});
    const count=session.core.wasm.nav_intent_wall_portals(animal.radius);
    const rows=new Float64Array(session.core.wasm.memory.buffer,
      session.core.wasm.nav_intent_wall_portals_ptr(),count*5);
    const wallProposal=planner.planAttackWall(state,animal);
    assert.equal(wallProposal.status,'found');
    assert.equal(wallProposal.target.id,'structure-9100',
      'the native wall proposal matches the frozen policy target');
    assert(wallProposal.approach.path.length>0);
    let previous=animal;
    for(const next of wallProposal.approach.path){
      assert(nav.segmentClear(previous,next,animal.radius,null,false));
      previous=next;
    }
    assert.equal(planner.cancelAttackIntent(animal.id),true);
    const externalLease={...animal,id:'animal-999999',x:999,z:999,
      targetId:wallProposal.target.id,approach:wallProposal.approach.point,
      status:'walking'};
    state.raid.animals.push(externalLease);
    try{
      const alternate=planner.planAttackWall(state,animal);
      if(alternate?.status==='found'){
        assert.notEqual(alternate.target.id,wallProposal.target.id,
          'a JS-held wall lease excludes that target from native selection');
        assert.equal(planner.cancelAttackIntent(animal.id),true);
      }
    }finally{state.raid.animals.pop();}
    const groupCount=session.core.wasm.nav_intent_crop_groups(animal.radius);
    const groupRows=Array.from(new Float64Array(session.core.wasm.memory.buffer,
      session.core.wasm.nav_intent_crop_groups_ptr(),groupCount*12));
    const perimeterCandidates=[];
    for(let index=0;index<groupCount;index++){
      const id=groupRows[index*12];
      const status=session.core.wasm.nav_intent_perimeter_walls(
        animal.x,animal.z,animal.radius,id);
      const found=session.core.wasm.nav_intent_perimeter_wall_count();
      const candidates=Array.from(new Float64Array(session.core.wasm.memory.buffer,
        session.core.wasm.nav_intent_perimeter_walls_ptr(),found*3));
      if(status===1)perimeterCandidates.push(...[...Array(found).keys()].map(
        row=>candidates[row*3]));
    }
    const selected=targetFor(state,animal,nav);
    assert.equal(selected?.target?.kind,'wall');
    assert.equal(selected.target.id,'structure-9100');
    assert.equal(selected.native,true);
    assert([...Array(count).keys()].some(index=>
      rows[index*5]===Number(selected.target.id.split('-').at(-1))),
    'the native portal graph exposes the wall selected by the current raid policy');
    assert(perimeterCandidates.includes(
      Number(selected.target.id.split('-').at(-1))),
    'the native region-to-crop query includes the reachable wall selected by the raid');
    assert.equal(nav.raidSelectionStats.cropAttempts??0,0);
    assert.ok(selected.approach.path?.length);
  }finally{session.dispose();}
});
