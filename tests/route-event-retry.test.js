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
 assert.equal(routeCalls,2,'the identical invalid route is not requested every tick');
 nav.version++;
 assert.equal(advance(),false);
 assert.equal(routeCalls,3,'a topology revision wakes the waiting actor');
 let abandoned=false;
 for(let step=0;step<200&&!abandoned;step++)abandoned=advance();
 assert(abandoned,'the existing bounded fallback eventually ends an impossible retreat');
 assert.equal(routeCalls,4,
  'bounded physical recovery does not resubmit the same grid route each tick');
 assert.equal(events.filter(event=>event.kind==='routeRefresh').length,4);
 assert(events.some(event=>event.kind==='routeRecoveryStep'));
 assert(state.events.some(event=>event.type==='AnimalRetreatExitAbandoned'));
});
