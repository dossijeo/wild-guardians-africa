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
import {spawnRaid} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';
import {syncNativeCampaignRaidView} from '../tools/native-campaign-runner.mjs';
import {createNativeCampaignPlots} from '../tools/native-campaign-plots.mjs';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',
  import.meta.url),'utf8'))[0];

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
    let stopWorld,stopTasks,nativeCropStatus=[];
    if(count===1){
      const planner=createEventDrivenTaskPlanner(session);
      planner.resetFromState(state);
      stopWorld=planner.observeWorld(state);stopTasks=planner.observeTasks(state);
      const planCrop=planner.planAttackCrop;
      planner.planAttackCrop=(...args)=>{
        const result=planCrop(...args);
        nativeCropStatus.push(result?.status??'fallback');return result;
      };
      nav.intentTaskPlanner=planner;
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
      assert(nativeCropStatus.length>0);
      assert(nativeCropStatus.every(status=>status!=='found'),
        'a closed crop enclosure must not produce a native crop route');
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
      for(const animal of attackers){
        session.actorSectorRevision({worker:false,species:animal.species});
        assert(wasm.nav_intent_track_wall_opportunities(
          Number(animal.id.split('-').at(-1)),animal.x,animal.z,
          animal.radius)>0,'the native intent should remember a blocked crop group');
      }
      const priorTargets=new Map(attackers.map(animal=>[animal.id,animal.targetId]));
      const walls=state.structures.filter(wall=>wall.kind==='wall'&&
        wall.status==='intact');
      const breach=walls.filter(wall=>
        ![...priorTargets.values()].includes(wall.id));
      assert(breach.length>=2);
      for(const wall of breach){
        wall.status='ruined';wall.hp=0;
        Game.emit(state,'StructureRuined',{targetId:wall.id});
      }
      nav.setState(state);
      Game.tick(state,.25,nav);
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
    }finally{stopTasks();stopWorld();delete nav.intentTaskPlanner;}
  }finally{session.dispose();}
});
