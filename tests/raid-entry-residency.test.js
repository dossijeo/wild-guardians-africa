import test from 'node:test';
import assert from 'node:assert/strict';
import {reachableApproach} from '../src/simulation/raids.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from '../src/world/wild-engine/spatial-navigation-movement.js';

test('unknown structure approaches request terrain instead of silently waiting',()=>{
 const actor={id:'animal-1',x:211.2,z:70,radius:1.1};
 const target={id:'structure-1',kind:'hut',x:60,z:0};
 const frontiers=[],requests=[];let unknown=0;
 const nav={walkable:()=>true,path:()=>{throw new SpatialChunkUnavailable(actor,target,[{cx:5,cz:1}]);},
  requestRaidFrontier:p=>frontiers.push(p),requestRaidConnectivity:(...args)=>requests.push(args)};
 assert.equal(reachableApproach(actor,target,nav,null,()=>unknown++),null);
 assert.equal(unknown,6);assert.equal(requests.length,6);
 assert(frontiers.every(p=>p.x===240&&p.z===48));
});

test('connectivity demand includes entry-side neighbors when target corridor is resident',()=>{
 const loaded=new Map();for(let z=-3;z<=3;z++)for(let x=-2;x<=4;x++)loaded.set(`${x},${z}`,{});
 const session={field:{},routeActor:()=>{},actorCanStand:()=>true,actorStepClear:()=>true,
  stream:{loaded:()=>loaded}};
 const nav=createSpatialNavigationMovement(session,{seed:4096,biome:'manglares',structures:[],villages:[],raid:{}});
 assert(nav.requestRaidConnectivity({x:211.2,z:70},{x:60,z:0},1.1));
 assert.deepEqual([...nav.raidConnectivityDemand],['5,0']);
});
