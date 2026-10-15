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

test('a native Sabana incursion spawns physically and advances through Game.tick',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'spatial-native-raid'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
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
    assert.equal(Game.plant(state,'raid-crop','mijo',crop.x,crop.z,nav),true);
    state.time=310;
    const plan={at:310,group:['warthog'],done:false,introductory:true};
    assert.notEqual(spawnRaid(state,plan,nav),false,
      'an animal needs a physically exterior resident entrance');
    assert.equal(state.raid?.animals.length,1);
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    let stopWorld=planner.observeWorld(state),stopTasks=planner.observeTasks(state);
    const intentCalls={registered:0,committed:0,finished:0};
    for(const [method,key] of [['registerAttackIntent','registered'],
      ['markAttackActive','committed'],['finishAttackIntent','finished']]){
      const native=planner[method];
      planner[method]=(...args)=>{intentCalls[key]++;return native(...args);};
    }
    nav.intentTaskPlanner=planner;
    const animal=state.raid.animals[0],start={x:animal.x,z:animal.z},
      initialHits=animal.hitsRemaining;
    let restoredCommittedStrike=false;
    for(let i=0;i<150&&animal.status!=='gone';i++){
      Game.tick(state,.2,nav);
      if(!restoredCommittedStrike&&animal.status==='attacking'){
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
    assert(restoredCommittedStrike,'the fixture must reach a committed strike');
    assert(Math.hypot(animal.x-start.x,animal.z-start.z)>1||animal.status==='gone',
      'the real raid should advance on native routes');
    for(let i=0;i<2000&&state.raid;i++)Game.tick(state,.25,nav);
    assert.equal(state.raid,null,JSON.stringify({status:animal.status,
      hitsRemaining:animal.hitsRemaining,x:animal.x,z:animal.z,time:state.time}));
    assert(state.events.some(event=>event.type==='RaidEnded'));
    assert(animal.hitsRemaining<initialHits,
      'the native route should lead to a physical attack, not only a retreat');
    assert(intentCalls.registered>=intentCalls.committed&&intentCalls.committed>0);
    assert.equal(intentCalls.committed,intentCalls.finished,
      'real native raid intentions finish once at each committed damage frame');
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
    state.time=310;
    assert.notEqual(spawnRaid(state,{at:310,group:Array(count).fill('warthog'),done:false,
      introductory:true},nav),false);
    assert.equal(state.raid.animals.length,count);
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
  }finally{session.dispose();}
});
