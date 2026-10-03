import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestVillageRoute} from '../src/world/villages.js';

test('route bound retains reachable detours and stable ties; distant candidates alone are pruned',()=>{
 const start={x:0,z:0},a={id:'a',entry:{x:3,z:0}},b={id:'b',entry:{x:4,z:0}},blocked={id:'blocked',entry:{x:1,z:0}},far={id:'far',entry:{x:100,z:0}};
 const calls=[],paths=new Map([[1,null],[3,[{x:0,z:3},{x:3,z:3},a.entry]],[4,[b.entry]]]);
 const nav={path:(departure,end,radius,ignore,worker)=>{assert.equal(departure,start);assert.equal(radius,.28);assert.equal(ignore,null);assert.equal(worker,true);calls.push(end.x);return paths.get(end.x);}};
 const best=nearestVillageRoute(nav,start,[far,a,b,blocked]);assert.equal(best.v,b);assert.equal(best.length,4);assert.deepEqual(calls,[1,3,4]);
 calls.length=0;paths.set(3,[{x:3.5,z:0},a.entry]);const tie=nearestVillageRoute(nav,start,[b,a,far]);assert.equal(tie.v,a);assert.equal(tie.length,4);assert.deepEqual(calls,[3,4]);
});
test('an unreachable nearer village cannot cap the search and no reachable route returns null',()=>{
 const near={id:'near',x:1,z:0},far={id:'far',x:1000,z:0},calls=[];
 const nav={path:(_,end)=>{calls.push(end.id);return end===far?[end]:null;}};
 assert.equal(nearestVillageRoute(nav,{x:0,z:0},[far,near]).v,far);assert.deepEqual(calls,['near','far']);
 nav.path=()=>null;assert.equal(nearestVillageRoute(nav,{x:0,z:0},[near,far]),null);
});
