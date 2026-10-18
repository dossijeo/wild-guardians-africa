import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

// A synthetic night-100 state tests the terminal pipeline on the real C++
// spatial world. It is not evidence that a virtual-player campaign survived.
for(const [balance,expected,event] of [
  [10000,'victory','CampaignWon'],
  [0,'defeat','GameOver']
])test(`a native spatial raid resolves before night-100 ${expected}`,async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening({
    seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:`spatial-terminal-${expected}`
  });
  try{
    const crop=start.farm[0];
    assert.equal(Game.plant(state,'terminal-crop','mijo',crop.x,crop.z,nav),true);
    state.tutorial.step='done';state.initialPreparation=false;
    state.day=100;state.completedNights=99;state.time=599.5;
    state.dayPlan={done:true};state.nightPlan={done:true};
    state.ledger.balance=rational(balance);
    assert.notEqual(spawnRaid(state,{at:599.5,group:['warthog'],
      done:false,introductory:false},nav),false);
    assert.equal(state.result,null);
    const spawn=state.raid.animals[0],origin={x:spawn.x,z:spawn.z};
    Game.tick(state,.5,nav);
    assert.equal(state.result,null,'the terminal event must wait for the raid');
    for(let step=0;step<2500&&state.raid&&!state.result;step++)
      Game.tick(state,.25,nav);
    assert.equal(state.raid,null,'the physical raid must finish within the bound');
    assert(state.events.some(item=>item.type==='RaidEnded'));
    assert(Math.hypot(spawn.x-origin.x,spawn.z-origin.z)>1||spawn.status==='gone');
    assert.equal(state.result,expected);
    const ended=state.events.findIndex(item=>item.type==='RaidEnded');
    const terminal=state.events.findIndex(item=>item.type===event);
    assert(terminal>ended,'the raid resolves before the terminal event');
    assert.equal(state.events.filter(item=>item.type===event).length,1);
    const restored=deserialize(serialize(state));
    assert.equal(serialize(restored),serialize(state));
    const frozen=serialize(restored);
    Game.tick(restored,30,nav);
    assert.equal(serialize(restored),frozen,'a terminal save stays inert');
    if(expected==='victory'){
      Game.continuePostgame(state);
      assert.equal(state.postgame,true);
      assert.equal(state.result,null);
      Game.hire(state,'native-postgame-hire',{});
      for(let i=0;i<20;i++)Game.tick(state,30,nav);
      assert.equal(state.day,102,'the native spatial world advances after victory');
      assert.equal(state.completedNights,101);
      assert.equal(state.raid,null,'postgame stays peaceful');
      assert.equal(state.events.filter(item=>item.type==='PostgameStarted').length,1);
      assert.equal(state.events.filter(item=>item.type==='CampaignWon').length,1);
      assert.equal(serialize(deserialize(serialize(state))),serialize(state));
    }
  }finally{session.dispose();}
});

for(const withWalls of [false,true])test(
  `a dense native raid resumes after ${withWalls?'wall collapse and ':''}save/load`,async()=>{
  let {state,nav,session,start,loaded}=await createSpatialCampaignOpening({
    seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:withWalls?'spatial-wall-collapse-reload':'spatial-dense-reload'});
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.ledger.balance=rational(1000000);
    const {x:cx,z:cz}=start.site.center;
    let ringBounds=null;
    if(withWalls){
      const x0=cx-10,x1=cx+22,
        z0=Math.min(...start.farm.map(point=>point.z))-10,z1=cz+10;
      ringBounds={x0,x1,z0,z1};
      assert.equal(Game.buildWallChain(state,'spatial-reload-ring','zarzas',
        [[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],nav,
        {smooth:false,snap:false}),true);
      assert(state.structures.some(item=>item.kind==='wall'&&item.gate));
    }
    let planted=0;
    for(let dz=-38;dz<=38&&planted<100;dz+=2)
      for(let dx=-38;dx<=38&&planted<100;dx+=2){
        const x=cx+dx,z=cz+dz;
        if(ringBounds&&(x<=ringBounds.x0+2||x>=ringBounds.x1-2||
          z<=ringBounds.z0+2||z>=ringBounds.z1-2))continue;
        if(!nav.placement(x,z,.4).valid)continue;
        assert.equal(Game.plant(state,`dense-${planted}`,'mijo',x,z,nav),true);
        planted++;
      }
    assert.equal(planted,100);
    state.day=50;state.completedNights=49;state.time=310;
    state.dayPlan={done:true};state.nightPlan={done:true};
    const group=[...Array(4).fill('warthog'),...Array(5).fill('hyena'),
      ...Array(4).fill('buffalo'),...Array(3).fill('lion')];
    assert.notEqual(spawnRaid(state,{at:310,group,done:false},nav),false);
    for(let i=0;i<(withWalls?800:80);i++){
      Game.tick(state,.25,nav);
      nav.serviceRaidConnectivityDemand?.();
      if(withWalls&&state.structures.some(item=>item.kind==='wall'&&
        item.status==='ruined'))break;
    }
    assert(state.raid,'the save occurs while attackers are still active');
    const ruinedBefore=state.structures.filter(item=>item.kind==='wall'&&
      item.status==='ruined').length;
    if(withWalls)assert(ruinedBefore>0,'the save follows a physical wall collapse');
    const saved=deserialize(serialize(state));
    assert.equal(saved.raid.animals.length,16);
    assert.equal(saved.structures.filter(item=>item.kind==='wall'&&
      item.status==='ruined').length,ruinedBefore);
    const bounds=[...nav.activeBounds],raidView=structuredClone(nav.raidView);
    const keys=[...loaded.keys()];
    session.dispose();
    loaded=new Map();state=saved;
    session=createSpatialGameSession(module,state,{loaded:()=>loaded,
      onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    for(const key of keys){
      const [x,z]=key.split(',').map(Number);
      if(session.core.selectChunk(x,z)<0)assert(session.core.addChunk(x,z)>=0);
      loaded.set(key,session.core.chunkPayload());
    }
    nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds(bounds);
    nav.setRaidView(raidView.eye,raidView.target);
    if(withWalls){
      const gate=state.structures.find(item=>item.kind==='wall'&&item.gate&&
        item.status!=='ruined');
      assert(gate,'the restored perimeter retains its automatic gate');
      const [inside,outside]=gatePortalPoints(gate);
      assert(nav.workerPath(inside,outside,.28),
        'workers retain a route through the automatic gate after wall collapse and reload');
    }
    nav.serviceRaidConnectivityDemand=()=>{
      const key=[...(nav.raidConnectivityDemand??[])].find(item=>!loaded.has(item));
      if(!key)return false;
      const [x,z]=key.split(',').map(Number);
      if(session.core.selectChunk(x,z)<0)assert(session.core.addChunk(x,z)>=0);
      loaded.set(key,session.core.chunkPayload());
      return true;
    };
    for(let i=0;i<2400&&state.raid&&!state.result;i++){
      const actors=state.raid.animals;
      const previous=actors.map(actor=>({x:actor.x,z:actor.z}));
      const previousPaths=actors.map(actor=>actor.path?.slice()??[]);
      Game.tick(state,.25,nav);
      nav.serviceRaidConnectivityDemand?.();
      for(const [index,actor] of actors.entries()){
        if(Math.hypot(actor.x-previous[index].x,actor.z-previous[index].z)<1e-8)
          continue;
        // A single tick may finish a waypoint and turn toward the next one.
        // Validate the segments actually traversed, not the chord across the
        // turn, which can cut a wall corner despite both legs being clear.
        const oldPath=previousPaths[index],remaining=actor.path??[];
        const retained=remaining.length?oldPath.indexOf(remaining[0]):-1;
        const consumed=retained>=0?oldPath.slice(0,retained):[];
        const travelled=[previous[index],...consumed,actor];
        for(let leg=1;leg<travelled.length;leg++)
          assert(nav.segmentClear(travelled[leg-1],travelled[leg],actor.radius,null,false),
            `saved ${actor.species} crossed a static barrier after reload (leg ${leg})`);
      }
    }
    assert.equal(state.raid,null,'the reloaded raid must finish');
    if(withWalls)assert(state.structures.filter(item=>item.kind==='wall'&&
      item.status==='ruined').length>=ruinedBefore);
    assert.equal(state.events.filter(item=>item.type==='RaidEnded').length,1);
    assert(state.events.some(item=>item.type==='CropHit'||item.type==='StructureHit'));
  }finally{session.dispose();}
});
