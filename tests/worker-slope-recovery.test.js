import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {workerSlopeRecoveryPath} from '../src/world/worker-slope-recovery.js';
import {walkTo} from '../src/simulation/game.js';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';

function world(slope=x=>x<.01?.505:.49,fluid=()=>false){
 const nav=new Navigation(712,'sabana',{});
 nav.field={slope,fluidInside:fluid};nav.propsAt=()=>[];nav.version=1;
 return nav;
}
const start=()=>({id:'worker',status:'returning',x:0,z:0,radius:.28});
const home={id:'home-village',x:4,z:0};

test('returning worker leaves a marginal slope physically and reaches home without changing ordinary terrain rules',()=>{
 const nav=world(),worker=start(),s={structures:[],workers:[worker]};
 assert.equal(nav.path(worker,home,.28,null,true),null);
 assert.equal(nav.walkable(0,0,.28,null,true),false);
 let moved=false,reached=false;
 for(let i=0;i<Math.ceil(5/(L.walkMetresPerSecond*.05));i++){
  const before={x:worker.x,z:worker.z};reached=walkTo(s,worker,home,.05,nav);
  assert(Math.hypot(worker.x-before.x,worker.z-before.z)<=L.walkMetresPerSecond*.05+1e-9,'No teleport or speed boost');
  moved||=worker.x!==before.x||worker.z!==before.z;if(reached)break;
 }
 assert(moved);assert(reached);assert.equal(worker.x,home.x);assert.equal(worker.z,home.z);
 assert.equal(nav.walkable(0,0,.28,null,true),false,'The general slope restriction remains intact');
});

for(const status of ['idle','walking','acting','carrying'])test(`${status} workers cannot use slope recovery to reach tasks`,()=>{
 const nav=world(),worker={...start(),status};
 assert.equal(walkTo({structures:[],workers:[worker]},worker,home,.1,nav),false);
 assert.equal(worker.x,0);assert.equal(worker.z,0);
});

test('steep slope, fluid, a flat invalid plateau and intervening structures cannot be escaped',()=>{
 for(const nav of [world(()=>.52),world(undefined,()=>true),world(()=>.505)])assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);
 const nav=world();nav.obstacles=[{id:'enclosing-house',kind:'house',x:0,z:0,radius:1}];
 assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);
});

test('a new water strip and blocked native return tail both prevent recovery',()=>{
 const nav=world(undefined,x=>x>.01&&x<.3);
 assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);
 const blocked=world();blocked.path=()=>null;
 assert.equal(workerSlopeRecoveryPath(blocked,start(),home),null);
});

test('failed recovery is bounded and memoized until the route epoch changes',()=>{
 let calls=0;const nav=world(()=>{calls++;return .505;});
 assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);const first=calls;
 for(let i=0;i<100;i++)assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);
 assert.equal(calls,first);
 nav.version++;assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);assert(calls>first);
});

test('no new destination route is sought when the start is already valid',()=>{
 const nav=world(()=>.49);let calls=0;nav.path=()=>{calls++;return [];};
 assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);assert.equal(calls,0);
});

test('a valid endpoint cannot justify first moving into a worse slope',()=>{
 const nav=world((x,z)=>{const d=Math.hypot(x,z);return d<.1?.505+.03*d:.49;});
 assert.equal(nav.walkable(.5,0,.28,null,true),true);
 assert.equal(workerSlopeRecoveryPath(nav,start(),home),null);
});

test('saving a partial physical exit preserves the route and the following movement',()=>{
 const nav=world(),worker=start(),state={structures:[],workers:[worker]};
 walkTo(state,worker,home,.01,nav);
 assert(worker.x!==0||worker.z!==0);assert.equal(nav.walkable(worker.x,worker.z,.28,null,true),false);
 const loaded=structuredClone(worker),restored=world();
 for(let i=0;i<150;i++){
  walkTo(state,worker,home,.05,nav);
  walkTo({structures:[],workers:[loaded]},loaded,home,.05,restored);
  assert.deepEqual(loaded,worker);
 }
 assert.equal(loaded.x,home.x);assert.equal(loaded.z,home.z);
});
