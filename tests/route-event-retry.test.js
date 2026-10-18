import test from 'node:test';
import assert from 'node:assert/strict';
import {walkTo} from '../src/simulation/game.js';

test('a physically rejected route retries once, then waits for a relevant navigation change',()=>{
 const animal={id:'animal-1',species:'buffalo',status:'retreating',
  hitsRemaining:0,x:0,z:0,radius:.97,path:null};
 const state={elapsed:0,workers:[],structures:[],raid:{animals:[animal]},
  events:[],sequence:1};
 const destination={id:'exit-animal-1',x:10,z:0};
 let routeCalls=0;
 const events=[];
 const nav={version:1,
  path:()=>{routeCalls++;return [{x:1,z:0},destination];},
  walkable:()=>true,segmentClear:()=>false,
  terrainValid:()=>false,
  planningObserver:event=>events.push(event)};
 const advance=()=>{
  state.elapsed+=.1;
  return walkTo(state,animal,destination,.1,nav,
   {speed:3.8,worker:false,expandRoute:true});
 };
 assert.equal(advance(),false);
 assert.equal(routeCalls,1);
 assert.equal(advance(),false);
 assert.equal(routeCalls,2,'one immediate retry can repair a transient local failure');
 assert(animal.exitRouteRecovery,
  'a second static rejection starts the existing bounded exit recovery');
 for(let step=0;step<8;step++)assert.equal(advance(),false);
 assert.equal(routeCalls,3,
  'one recovery attempt checks for a newly valid native route without polling it every tick');
 nav.version++;
 assert.equal(advance(),false);
 assert.equal(routeCalls,4,'a topology revision wakes the waiting actor');
 let abandoned=false;
 for(let step=0;step<200&&!abandoned;step++)abandoned=advance();
 assert(abandoned,'the existing bounded fallback eventually ends an impossible retreat');
 assert.equal(routeCalls,6,
  'bounded physical recovery does not resubmit the same grid route each tick');
 assert.equal(events.filter(event=>event.kind==='routeRefresh').length,4);
 assert(events.some(event=>event.kind==='routeRecoveryStep'));
 assert(state.events.some(event=>event.type==='AnimalRetreatExitAbandoned'));
});

test('a repeated static retreat failure preserves its recovery deadline',()=>{
 const destination={id:'exit-animal-2',x:10,z:0};
 const animal={id:'animal-2',species:'warthog',status:'retreating',
  hitsRemaining:0,x:0,z:0,radius:1.1,path:[{x:1,z:0}],
  destinationId:destination.id,pathVersion:1,
  mobileRecoveryDestinationId:destination.id,mobileRecoveryVersion:1,
  mobileRecoveryAttempts:0,mobileProgressDistance:10,mobileProgressAt:0,
  exitRouteRecovery:{destinationId:destination.id,version:1,
   startedAt:1,x:0,z:0}};
 const state={elapsed:100,workers:[],structures:[],raid:{animals:[animal]},
  events:[],sequence:1};
 const nav={version:1,segmentClear:()=>false,walkable:()=>false};
 assert.equal(walkTo(state,animal,destination,.1,nav,
  {speed:3.8,worker:false,expandRoute:true}),false);
 assert.equal(animal.path,null);
 assert.equal(animal.exitRouteRecovery.startedAt,1,
  'another rejected connector must not reset the first recovery deadline');
 assert.equal(state.events.filter(e=>e.type==='AnimalExitRouteRecovery').length,0,
  'an existing recovery episode must not emit a duplicate event');
 state.elapsed=1501;
 assert.equal(walkTo(state,animal,destination,.1,nav,
  {speed:3.8,worker:false,expandRoute:true}),true);
 assert(state.events.some(e=>e.type==='AnimalRetreatExitAbandoned'&&
  e.reason==='recovery-timeout'));
 assert.equal(animal.x,0);assert.equal(animal.z,0);
});
