import test from 'node:test';
import assert from 'node:assert/strict';
import {actorFluidClear} from '../src/simulation/actor-fluid-clearance.js';
import {Navigation} from '../src/world/navigation.js';
import {walkTo} from '../src/simulation/game.js';
import {animalRouteClearance} from '../src/simulation/animal-route-clearance.js';

function world(canyon=false){
 const nav=new Navigation(712,'sabana',{});
 nav.field={canyon,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:x=>Math.abs(x-.1)<.01};
 nav.propsAt=()=>[];nav.setState({structures:[],villages:[],spells:[],suppressed:[]});return nav;
}
for(const worker of [true,false])test(`${worker?'worker':'animal'} rejects a wet landing missed by a dry coarse route`,()=>{
 const nav=world(),actor={id:'actor',x:0,z:0,status:'walking',radius:.28,path:[{x:4,z:0}],pathVersion:nav.version,destinationId:'task'};
 const state={structures:[],workers:worker?[actor]:[],raid:worker?null:{animals:[actor]}};
 assert(nav.coarseSegmentClear(actor,{x:4,z:0},.28,null,worker));
 assert.equal(walkTo(state,actor,{id:'task',x:4,z:0},.05,nav,{speed:2,worker}),false);
 assert.equal(actor.x,0);assert.equal(actor.z,0);assert.equal(actor.path,null);
 assert(actorFluidClear(nav,actor,.28));
 if(worker)assert.deepEqual(actor.terrainAvoidance,[{x:.1,z:0}]);
});

test('cached animal prefixes still check the next actual fluid landing',()=>{
 const nav=world(),actor={x:0,z:0,path:[{x:4,z:0}]};
 assert(animalRouteClearance(actor,nav,{radius:.28},null).clear(actor,{x:.05,z:0}));
 actor.x=.05;const guard=animalRouteClearance(actor,nav,{radius:.28},null);
 assert.equal(guard.clear(actor,{x:.1,z:0}),false);assert(guard.blocked());
});

test('fluid footprint uses all five native sample positions without querying slopes',()=>{
 let calls=0;const field={fluidInside:(x,z)=>{calls++;return x===1.28&&z===2;},slope:()=>assert.fail('No slope resampling')};
 assert.equal(actorFluidClear({field},{x:1,z:2},.28),false);assert.equal(calls,2);
 field.fluidInside=()=>{calls++;return false;};calls=0;
 assert(actorFluidClear({field},{x:1,z:2},.28));assert.equal(calls,5);
});

for(const worker of [true,false])test(`Canyon water remains traversable for ${worker?'workers':'animals'}`,()=>{
 const nav=world(true),actor={id:'actor',x:0,z:0,status:'walking',radius:.28,path:[{x:4,z:0}],pathVersion:nav.version,destinationId:'task'};
 const state={structures:[],workers:worker?[actor]:[],raid:worker?null:{animals:[actor]}};
 walkTo(state,actor,{id:'task',x:4,z:0},.05,nav,{speed:2,worker});assert.equal(actor.x,.1);assert.equal(actor.terrainAvoidance,undefined);
});

test('minimal adapters keep their dynamic-motion contract and blockers precede fluids',()=>{
 assert(actorFluidClear({}, {x:1,z:2},.3));
 const actor={x:0,z:0,path:[{x:4,z:0}]},nav={field:{fluidInside:()=>assert.fail('Dynamic blocker must take priority')}};
 const guard=animalRouteClearance(actor,nav,{radius:.28},()=>false);
 assert.equal(guard.clear(actor,{x:.1,z:0}),false);assert.equal(guard.blocked(),false);
});
