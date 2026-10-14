import test from 'node:test';
import assert from 'node:assert/strict';
import {EnclosureBalanceObserver} from '../tools/experiments/enclosure-balance-observer.mjs';
import {ANIMAL_SPATIAL_PROFILES} from '../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {readFileSync} from 'node:fs';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {villageLayout} from '../src/world/villages.js';
import {spawnRaid} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';

function fixture(){
  const state={day:4,elapsed:10,plants:[
    {id:'inside-a',x:5,z:5,alive:true},{id:'inside-b',x:6,z:5,alive:true},
    {id:'outside',x:20,z:5,alive:true}],structures:[{id:'wall-1',kind:'wall',status:'intact'}],
    events:[{id:'event-1',type:'RaidSpawned'}],raid:{id:'raid-4',animals:[
      {id:'a',species:'warthog',radius:ANIMAL_SPATIAL_PROFILES.warthog.radius,
        status:'entering',spawn:{x:0,z:0}}]}};
  let open=false,queries=0,batches=0;
  const session={actorRegionsBatch(points,profile){
    batches++;assert.equal(profile.species,'warthog');
    return points.map(p=>({ids:[p.x<10?2:1],unknown:false}));
  }};
  const nav={version:1,regionFor:p=>({key:p.x<10?'2':'1'}),
    enclosureFor:p=>({status:p.x<10&&!open?'sealed':'open-frontier'}),
    regionConnected:()=>{queries++;return false;}};
  return {state,session,nav,breach:()=>{open=true;state.structures=[];nav.version++;},counts:()=>({queries,batches})};
}

test('classifies crops once per component and only samples on raid/topology events',()=>{
  const f=fixture(),observer=new EnclosureBalanceObserver({session:f.session});
  const first=observer.observe(f.state,f.nav);
  assert.equal(first.reason,'spawn');
  assert.deepEqual(first.profiles[0],{species:'warthog',radius:ANIMAL_SPATIAL_PROFILES.warthog.radius,
    origins:1,regions:2,crops:3,protected:2,exposed:0,open:1,unknown:0});
  assert.equal(f.counts().queries,1);
  assert.equal(observer.observe(f.state,f.nav),null);
  assert.equal(f.counts().batches,1);
  f.breach();
  const broken=observer.observe(f.state,f.nav);
  assert.equal(broken.reason,'topology');
  assert.equal(broken.transition.newlyExposed,2);
  assert.equal(broken.transition.breachExposure,2);
  assert.equal(broken.profiles[0].open,3);
  assert.equal(observer.observe(f.state,f.nav),null);
  f.state.raid=null;f.state.events.push({id:'event-2',type:'RaidEnded'});
  assert.equal(observer.observe(f.state,f.nav).reason,'end');
  assert.equal(observer.report().counters.samples,3);
});

test('unknown enclosure or connectivity never claims physical protection',()=>{
  const f=fixture(),observer=new EnclosureBalanceObserver({session:f.session});
  f.nav.regionConnected=()=>null;
  assert.equal(observer.observe(f.state,f.nav).profiles[0].unknown,2);
  f.nav.enclosureFor=()=>({status:'unknown'});f.nav.version++;
  const sample=observer.observe(f.state,f.nav);
  assert.equal(sample.profiles[0].unknown,3);
  assert.equal(sample.transition.newlyExposed,0);
});

test('Wild Engine observes a real closed crop ring and its wall breach',async()=>{
  const module=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
  const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',
    import.meta.url),'utf8'))[0];
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'enclosure-observer-test'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
    villageId:'village-1',status:'intact',hp:600,maxHp:600});
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.hypot(x,z)});
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
    assert(Game.plant(state,'protected-crop','mijo',inside.x,inside.z,nav));
    assert(Game.buildWallChain(state,'protected-ring','zarzas',ring,nav,
      {smooth:false,snap:false}));
    nav.setRaidView({x:ring[0][0]-7,z:ring[0][1]+4},inside);
    state.time=310;
    assert.notEqual(spawnRaid(state,{at:310,group:['warthog'],done:false,
      introductory:true},nav),false);
    const observer=new EnclosureBalanceObserver({session});
    const closed=observer.observe(state,nav);
    assert.equal(closed.profiles[0].protected,1,JSON.stringify(closed.profiles[0]));
    // Remove the complete side to create a geometrically open passage.
    const left=state.structures.filter(s=>s.kind==='wall'&&s.x<ring[0][0]+1);
    assert(left.length>0);
    const removed=new Set(left.map(w=>w.id));
    state.structures=state.structures.filter(s=>!removed.has(s.id));
    nav.setState(state);
    const breached=observer.observe(state,nav);
    assert.equal(breached.transition.breachExposure,1,JSON.stringify(breached));
    assert.equal(breached.profiles[0].protected,0);
  }finally{session.dispose();}
});
