import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {villageLayout} from '../src/world/villages.js';
import {spawnRaid} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',
  import.meta.url),'utf8'))[0];

test('a native Sabana incursion spawns physically and advances through Game.tick',async()=>{
  const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'spatial-native-raid'});
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
    const animal=state.raid.animals[0],start={x:animal.x,z:animal.z},
      initialHits=animal.hitsRemaining;
    for(let i=0;i<150&&animal.status!=='gone';i++)Game.tick(state,.2,nav);
    assert(Math.hypot(animal.x-start.x,animal.z-start.z)>1||animal.status==='gone',
      'the real raid should advance on native routes');
    for(let i=0;i<2000&&state.raid;i++)Game.tick(state,.25,nav);
    assert.equal(state.raid,null,JSON.stringify({status:animal.status,
      hitsRemaining:animal.hitsRemaining,x:animal.x,z:animal.z,time:state.time}));
    assert(state.events.some(event=>event.type==='RaidEnded'));
    assert(animal.hitsRemaining<initialHits,
      'the native route should lead to a physical attack, not only a retreat');
  }finally{session.dispose();}
});
