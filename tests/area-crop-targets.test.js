import test from 'node:test';
import assert from 'node:assert/strict';
import {areaCropTargets} from '../src/simulation/area-crop-targets.js';
import {cropBecameInactive} from '../src/simulation/active-crops.js';
import {Navigation} from '../src/world/navigation.js';
const crop=(id,x,z,alive=true)=>({id,x,z,alive,species:'mijo'});
const select=(plants,options={})=>areaCropTargets(plants,plants[0],{radius:3,maxTargets:4,canHit:()=>true,...options});

test('local impact keeps primary, mixed species, nearest targets and deterministic ties',()=>{
 const plants=[crop('root',0,0),crop('b',1,0),crop('a',-1,0),crop('far',10,0),crop('c',0,2),crop('dead',0,.1,false)];plants[2].species='maiz';
 assert.deepEqual(select(plants).map(p=>p.id),['root','a','b','c']);
 assert.deepEqual(select([plants[0],...plants.slice(1).reverse()]).map(p=>p.id),['root','a','b','c']);
 assert.deepEqual(select(plants,{maxTargets:1}).map(p=>p.id),['root']);
 assert.deepEqual(select(plants,{radius:0}).map(p=>p.id),['root']);
});
test('shielded primary emits no area; shielded neighbours cannot displace valid targets',()=>{
 const plants=[crop('root',0,0),crop('shield',1,0),crop('safe',2,0),crop('far',3,0)];
 assert.deepEqual(select(plants,{canHit:p=>p.id!=='root'}),[]);
 assert.deepEqual(select(plants,{maxTargets:2,canHit:p=>p.id!=='shield'}).map(p=>p.id),['root','safe']);
});
test('real native solid wall envelope blocks secondary impact across wall, also an animal gate',()=>{
 // Native solid geometry; terrain and props are isolated, not full-world QA.
 const nav=new Navigation(712,'sabana');nav.terrainValid=()=>true;nav.propsAt=()=>[];
 const plants=[crop('root',0,-1),crop('behind',0,1),crop('same-side',1,-1)];
 const wall={id:'wall',kind:'wall',x:0,z:0,yaw:0,material:'empalizada',baseScaleX:1};
 const origin={x:0,z:-2};
 for(const gate of [false,true]){
  nav.obstacles=[{...wall,gate,gateOpen:1}];nav.segmentCache.clear();
  assert.deepEqual(select(plants,{canHit:p=>nav.segmentClear(origin,p,.01,null,false)}).map(p=>p.id),['root','same-side']);
 }
 nav.obstacles=[];nav.segmentCache.clear();assert.ok(select(plants,{canHit:p=>nav.segmentClear(origin,p,.01,null,false)}).some(p=>p.id==='behind'));
});
test('death invalidation, append and replaced array do not retain stale targets or mutate state',()=>{
 const plants=[crop('root',0,0),crop('a',1,0)];select(plants);
 plants[1].alive=false;cropBecameInactive(plants);plants.push(crop('b',2,0));
 const before=JSON.stringify(plants);assert.deepEqual(select(plants).map(p=>p.id),['root','b']);assert.equal(JSON.stringify(plants),before);
 assert.deepEqual(select(JSON.parse(before)).map(p=>p.id),['root','b']);
});
test('bounded selector agrees with brute-force oracle over dense farms and input permutations',()=>{
 for(let run=0;run<40;run++){
  const root=crop('root',-.25,.3),others=Array.from({length:600},(_,i)=>crop('p'+i,(i%30-15)*.31,(Math.floor(i/30)-10)*.47,i%7!==0));
  const plants=[root,...(run%2?others.reverse():others)],radius=1+(run%5),maxTargets=1+run%8,canHit=p=>p.id==='root'||Number(p.id.slice(1))%3!==0;
  const expected=[root,...plants.slice(1).filter(p=>p.alive&&Math.hypot(p.x-root.x,p.z-root.z)<=radius&&canHit(p)).sort((a,b)=>Math.hypot(a.x-root.x,a.z-root.z)-Math.hypot(b.x-root.x,b.z-root.z)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,maxTargets-1)];
  assert.deepEqual(select(plants,{radius,maxTargets,canHit}),expected);
 }
});
test('rejects unbounded area and forged/dead primary',()=>{
 const plants=[crop('root',0,0)];
 for(const options of [{radius:Infinity},{radius:6},{radius:-1},{maxTargets:9},{maxTargets:0},{maxTargets:1.5},{canHit:null}])assert.throws(()=>select(plants,options),RangeError);
 assert.deepEqual(areaCropTargets(plants,{...plants[0]},{radius:2,maxTargets:2,canHit:()=>true}),[]);
 plants[0].alive=false;assert.deepEqual(select(plants),[]);
});
