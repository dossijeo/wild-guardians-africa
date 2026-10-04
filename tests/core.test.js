import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BALANCE} from '../src/simulation/balance.js';
import {rational,transact,multiply,negate,numberOf,formatMoney} from '../src/simulation/money.js';
import {allocateWorkers,hiringCost,distributeProfiles} from '../src/simulation/workforce.js';
import {compositions,threatTier,attraction,villageCost,hitStructure,permission,dawnMinimum} from '../src/simulation/rules.js';
import {createPlant,advancePlant,waterPlant,isMature,contiguousGroup} from '../src/simulation/crops.js';
import {enqueue,reserveTasks,releaseTask} from '../src/simulation/tasks.js';
import {serialize,deserialize,SaveRepository} from '../src/persistence/snapshots.js';
import {newGame} from '../src/simulation/game.js';

test('Original balance preserves unrelated values with explicit approved wage, raid and damage revisions',()=>{
 const original=JSON.parse(fs.readFileSync(new URL('../content/balance/balance_confirmado.json',import.meta.url),'utf8'));
 original.initial_money=1500;
 original.animals.forEach((a,i)=>{a.structure_hit_damage=[20,25,35,40,60][i];});
 original.workers.older_wage=30;original.workers.young_wage=40;
 const boundaries=[0,100,300,800,2000];
 original.threat_tiers.forEach((t,i)=>{t.attraction_min=boundaries[i];t.attraction_max_exclusive=boundaries[i+1]??null;t.night_attack_probability=1;});
 assert.deepEqual(BALANCE,original);
});
test('Ledger rounds an exact repair fraction upward only at settlement',()=>{
  const ledger={balance:rational(100),entries:{}};
  transact(ledger,'repair',negate(multiply(rational(35),27,100)));
  assert.equal(numberOf(ledger.balance),90);assert.equal(ledger.balance.d,'1');
  assert.equal(transact(ledger,'repair',rational(-10)),false);assert.equal(numberOf(ledger.balance),90);
  assert.throws(()=>transact(ledger,'invalid',rational(-100)),/Fondos/);
  assert.equal(numberOf(ledger.balance),90);assert.ok(!ledger.entries.invalid);
});
test('Money formatter never changes accounting',()=>{assert.equal(formatMoney(rational(1250000)),'1,25M');assert.equal(formatMoney(rational(150000)),'150K');});
const centers=(weights)=>weights.map((plants,i)=>({id:`c${i}`,created:i,plants}));
test('Global allocation: 60/30/10, seven workers -> 4/2/1',()=>assert.deepEqual(Object.values(allocateWorkers(centers([60,30,10]),7)),[4,2,1]));
test('Stable equal residues and empty centers retain base assignment',()=>assert.deepEqual(Object.values(allocateWorkers(centers([100,20,0]),6)),[4,1,1]));
test('Scarce workforce covers highest plant weights before adding a second worker',()=>assert.deepEqual(Object.values(allocateWorkers(centers([1,100,20]),2)),[0,1,1]));
test('Zero weights divide without fictitious plants; no centers divide nowhere',()=>{assert.deepEqual(Object.values(allocateWorkers(centers([0,0,0]),8)),[3,3,2]);assert.deepEqual(allocateWorkers([],4),{});});
test('Allocation conserves every worker over 3000 seeded scenarios',()=>{
  let seed=81271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let i=0;i<3000;i++) {
    const cs=centers(Array.from({length:1+random()%30},()=>random()%1000));const total=random()%200;
    const result=allocateWorkers(cs,total);
    assert.equal(Object.values(result).reduce((s,n)=>s+n,0),total);
    if(total>=cs.length)assert.ok(Object.values(result).every(n=>n>=1));
  }
});
test('Hiring rejects negatives and unknown profiles; balanced profiles preserve totals',()=>{
  assert.equal(hiringCost({olderMale:1,youngFemale:2}),110);
  assert.throws(()=>hiringCost({olderMale:-1}));assert.throws(()=>hiringCost({other:1}));
  const result=distributeProfiles({a:2,b:1,c:1},{olderMale:2,olderFemale:1,youngFemale:1});
  assert.deepEqual(Object.values(result).map(x=>x.length),[2,1,1]);assert.equal(Object.values(result).flat().filter(p=>p==='olderMale').length,2);
});
for(const c of BALANCE.crops) {
  test(`${c.id}: first combined task gates growth; mandatory watering gates maturity`,()=>{
    const p=createPlant('p',c.id,0,0,'c');advancePlant(p,10000);assert.equal(p.growth,0);
    waterPlant(p);advancePlant(p,c.growth_seconds*2);assert.ok(!isMature(p));
    for(let i=0;i<c.total_waters+2;i++){while(waterPlant(p)){} advancePlant(p,c.growth_seconds);}
    assert.ok(isMature(p));const value=p.growth;advancePlant(p,10000);assert.equal(p.growth,value);
  });
  test(`${c.id}: magic satisfies only crossed checkpoints, no initial water debt`,()=>{
    const p=createPlant('p',c.id,0,0,'c');advancePlant(p,10000,true);assert.equal(p.growth,0);
    waterPlant(p);advancePlant(p,c.growth_seconds/10,true);
    assert.ok(p.water.slice(1).some(w=>w.status==='future'));
    advancePlant(p,c.growth_seconds,true);assert.ok(isMature(p));assert.ok(p.water.slice(1).every(w=>w.status==='magic'));
  });
}
test('Growth magic does not clear earlier water debt',()=>{
  const p=createPlant('p','maiz',0,0,'c');waterPlant(p);advancePlant(p,126);
  assert.equal(p.growth,126);assert.equal(p.water[1].status,'due');
  advancePlant(p,30,true);assert.equal(p.growth,126);
  waterPlant(p);advancePlant(p,30,true);assert.equal(p.growth,171);
});
test('Contiguous harvest selection does not include distant same-species plants',()=>{
  const ps=[createPlant('a','mijo',0,0,'c'),createPlant('b','mijo',1.5,0,'c'),createPlant('c','mijo',3,0,'c'),createPlant('d','mijo',10,0,'c'),createPlant('e','maiz',0,1.5,'c')];
  assert.deepEqual(contiguousGroup(ps,ps[0]).map(p=>p.id),['a','b','c']);
});
test('FIFO chooses oldest task, proximity chooses its worker and reserves atomically',()=>{
  const s={nextId:1,sequence:1,tasks:[],plants:[{id:'p',x:10,z:0},{id:'q',x:0,z:0}],crates:[],structures:[],workers:[{id:'a',centerId:'c',status:'idle',x:0,z:0},{id:'b',centerId:'c',status:'idle',x:9,z:0}]};
  const first=enqueue(s,'c','water','p');assert.equal(enqueue(s,'c','water','p'),null);
  enqueue(s,'c','water','q');reserveTasks(s);assert.equal(first.workerId,'b');assert.equal(s.tasks[1].workerId,'a');
  reserveTasks(s);assert.equal(s.tasks.length,2);releaseTask(s,s.workers[1]);assert.equal(first.workerId,null);
});
test('Threat boundaries and attraction are live plant base values',()=>{
  assert.equal(attraction(Array.from({length:20},()=>({species:'mijo',alive:true}))),180);
  assert.equal(attraction(Array.from({length:10},()=>({species:'platano',alive:true}))),2400);
  assert.equal(threatTier(0).threat_max,2);assert.equal(threatTier(99).threat_max,2);assert.equal(threatTier(100).threat_max,4);assert.equal(threatTier(2000).night_attack_probability,1);
});
test('Every reachable threat budget has unique legal unordered compositions',()=>{
  for(const t of BALANCE.threat_tiers)for(let budget=t.threat_min;budget<=t.threat_max;budget++) {
    const groups=compositions(budget,t.unlocked_species);assert.ok(groups.length);
    assert.equal(new Set(groups.map(g=>JSON.stringify(g))).size,groups.length);
    for(const group of groups) {
      const cost=group.reduce((s,id)=>s+BALANCE.animals.find(a=>a.id===id).threat_cost,0);
      assert.ok(cost>=Math.ceil(.75*budget)&&cost<=budget);assert.ok(group.length<=5);
      for(const a of BALANCE.animals)assert.ok(group.filter(id=>id===a.id).length<=a.max_per_raid);
    }
  }
  assert.deepEqual(compositions(5,['warthog','hyena','buffalo']),[['buffalo'],['warthog','hyena'],['warthog','warthog','hyena']]);
  assert.ok(!compositions(14,BALANCE.animals.map(a=>a.id)).some(g=>g.length===1&&g[0]==='rhino'));
});
test('Building collapse thresholds remain distinct and irreversible',()=>{
  const center={kind:'center',hp:600,maxHp:600,status:'intact'};hitStructure(center,473);assert.equal(center.status,'intact');hitStructure(center,1);assert.equal(center.status,'collapsing');assert.equal(center.collapseRemaining,3.2);assert.equal(hitStructure(center,1),false);
  const wall={kind:'wall',hp:100,maxHp:100,status:'intact'};hitStructure(wall,80);assert.equal(wall.status,'collapsing');assert.equal(wall.collapseRemaining,1.4);
});
test('Permission matrix handles stacked pauses, night, raid and center recovery',()=>{
  const s={pauses:[],structures:[],workers:[],time:0};assert.ok(permission(s,'center'));assert.ok(!permission(s,'plant'));assert.ok(!permission(s,'shield'));
  s.structures=[{kind:'center',status:'intact'}];assert.ok(permission(s,'plant'));s.time=300;assert.ok(!permission(s,'center'));assert.ok(permission(s,'shield'));
  s.pauses=['hiring','hidden'];assert.ok(!permission(s,'shield'));s.pauses.pop();assert.ok(!permission(s,'shield'));s.pauses=[];s.time=0;s.raid={};assert.ok(!permission(s,'plant'));
});
test('Economic dawn thresholds and linear unlimited village costs',()=>{
  const s={structures:[],plants:[],crates:[]};assert.equal(dawnMinimum(s),835);s.crates=[{}];assert.equal(dawnMinimum(s),830);s.structures=[{kind:'center',status:'intact'}];assert.equal(dawnMinimum(s),30);s.crates=[];assert.equal(dawnMinimum(s),35);
  for(const [n,cost] of [[2,50000],[3,75000],[10,250000],[50,1250000],[100,2500000]])assert.equal(villageCost(n),cost);
});
const snapshot=()=>newGame({seed:123,slotId:'one'});
class Storage {
  data=new Map();get length(){return this.data.size;}key(i){return [...this.data.keys()][i];}getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,v);}removeItem(k){this.data.delete(k);}
}
test('Snapshots reject malformed data, roundtrip random state and isolate slots',()=>{
  const s=snapshot();assert.deepEqual(deserialize(serialize(s)),s);assert.throws(()=>deserialize('{}'));assert.throws(()=>serialize({...s,time:NaN}));
  const storage=new Storage(),repo=new SaveRepository(storage);repo.save(s);repo.save({...s,day:2});repo.save({...s,slotId:'two',day:5});
  assert.equal(repo.load('one').day,2);assert.equal(repo.load('two').day,5);storage.setItem(repo.key('one'),'corrupt');assert.equal(repo.load('one').day,1);assert.equal(repo.list().length,2);
});
