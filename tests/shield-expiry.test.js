import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Production Navigation, paid commands, native bodies and complete AI/animation
// advancement. Flat, prop-free QA terrain isolates barrier transitions; it is
// not evidence for every original biome or a natural campaign opening.
function navigation(s){
  const nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);return nav;
}
function fixture(species,culture='mapungubwe',travel=19.5,seed=712){
  const s=Game.newGame({seed,culture,slotId:'shield-expiry'});Game.resume(s,'intro');const nav=navigation(s);
  Game.placeStructure(s,'center',{x:-20,z:-20},nav);Game.plant(s,'seed','mijo',0,0,nav);
  s.day=2;s.time=320;s.initialPreparation=false;s.tutorial.step='done';s.nightPlan={done:true,group:[]};
  spawnRaid(s,{group:[species]},nav);const a=s.raid.animals[0];
  // Controlled entry position, outside the shield, with a straight legal
  // walking approach that starts the native attack shortly before second 20.
  a.x=-(a.radius+Game.spellRadius('shield')+.1+1.5*travel);a.z=0;a.status='walking';
  a.spawn={x:a.x,z:0};a.exit={x:a.x-3,z:0};assert.equal(nav.walkable(a.x,a.z,a.radius,null,false),true);
  Game.cast(s,'shield','shield',0,0,nav);return {s,nav};
}

for(const species of ['warthog','hyena','buffalo','lion','rhino'])test(`${species}: a committed border attack cannot damage its distant crop when the Shield expires`,()=>{
  for(const culture of Game.CULTURES){
    let {s,nav}=fixture(species,culture);let a=s.raid.animals[0];const budget=a.hitsRemaining;
    while(s.elapsed<19.8-1e-8){Game.tick(s,.05,nav);assert.equal(s.plants[0].alive,true);assert.ok(Math.hypot(a.x,a.z)>=a.radius+Game.spellRadius('shield')-1e-8);}
    assert.equal(a.status,'attacking');assert.ok(a.attackRemaining>s.spells[0].remaining);
    const attackId=a.attackId,border={x:a.x,z:a.z};
    Game.pause(s,'qa');const paused=serialize(s);Game.advanceReal(s,2,nav);assert.equal(serialize(s),paused);
    s=deserialize(paused);nav=navigation(s);a=s.raid.animals[0];Game.resume(s,'qa');
    while(a.status==='attacking')Game.tick(s,.05,nav);
    assert.equal(s.spells.length,0);assert.equal(s.plants[0].alive,true,'The completed edge animation must not become a ranged crop hit');
    assert.deepEqual({x:a.x,z:a.z},border);assert.equal(a.hitsRemaining,budget-1);
    const miss=s.events.filter(e=>e.type==='AnimalLogicalMiss'&&e.attackId===attackId);
    assert.equal(miss.length,1);assert.equal(miss[0].reason,'shield-expired');
    assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId===attackId).length,0);
    let moved=false;
    for(let i=0;i<160&&s.plants[0].alive;i++){
      const before={x:a.x,z:a.z};Game.tick(s,.05,nav);
      assert.equal(nav.segmentClear(before,a,a.radius,null,false),true);
      moved||=Math.hypot(a.x-border.x,a.z-border.z)>.1;
    }
    assert.equal(moved,true);assert.equal(s.plants[0].alive,false);assert.ok(Math.hypot(a.x,a.z)<=a.radius+.600001);
    assert.equal(a.hitsRemaining,budget-2);assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,1);
    assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,1);
  }
});

test('All native species: Shield placement checks the whole body against real Navigation, without moving or teleporting it',()=>{
  for(const species of ['warthog','hyena','buffalo','lion','rhino']){
    const {s,nav}=fixture(species),a=s.raid.animals[0];s.spells=[];s.cooldowns.shield=0;nav.setState(s);
    a.x=-(a.radius+Game.spellRadius('shield')-.001);a.z=0;
    const before=serialize(s),draft=Game.previewSpell(s,'shield',0,0,nav);
    assert.equal(draft.valid,false);assert.throws(()=>Game.cast(s,'overlap','shield',0,0,nav),/animal/);assert.equal(serialize(s),before);
    a.x=-(a.radius+Game.spellRadius('shield')+.001);const position={x:a.x,z:a.z};
    assert.equal(Game.previewSpell(s,'shield',0,0,nav).valid,true);Game.cast(s,'clear','shield',0,0,nav);
    assert.deepEqual({x:a.x,z:a.z},position);assert.equal(nav.walkable(a.x,a.z,a.radius,null,false),true);
    assert.equal(nav.walkable(0,0,a.radius,null,false),false);
    assert.equal(nav.segmentClear(a,{x:0,z:0},a.radius,null,false),false);
    assert.equal(nav.walkable(0,0,.28,null,true),true,'Workers retain the authored ability to pass through the shield');
  }
});

test('Each species blocks a real hit on the active dome, then physically resumes its crop attack after expiry',()=>{
  for(const species of ['warthog','hyena','buffalo','lion','rhino']){
    // Seed 123 naturally rolls enough of the authored hit budget to retain
    // strikes after a confirmed block and any expiry-crossing animation.
    const {s,nav}=fixture(species,'mapungubwe',16,123),a=s.raid.animals[0],budget=a.hitsRemaining;
    for(let i=0;i<600&&s.plants[0].alive;i++){
      const before={x:a.x,z:a.z};Game.tick(s,.05,nav);assert.equal(nav.segmentClear(before,a,a.radius,null,false),true);
      if(s.spells.length){assert.equal(s.plants[0].alive,true);assert.ok(Math.hypot(a.x,a.z)>=a.radius+Game.spellRadius('shield')-1e-8);}
    }
    const hits=s.events.filter(e=>e.type==='AnimalLogicalHit'),blocked=hits.filter(e=>e.presentation.shield);
    assert.ok(blocked.length>0);assert.equal(s.plants[0].alive,false);assert.equal(hits.filter(e=>!e.presentation.shield).length,1);
    const actual=hits.find(e=>!e.presentation.shield);assert.ok(actual.presentation.elapsed>20);
    assert.ok(Math.hypot(actual.presentation.animal.x,actual.presentation.animal.z)<=a.radius+.600001);
    const misses=s.events.filter(e=>e.type==='AnimalLogicalMiss');assert.equal(a.hitsRemaining,budget-hits.length-misses.length);
    assert.equal(new Set([...hits,...misses].map(e=>e.attackId)).size,hits.length+misses.length);
  }
});
