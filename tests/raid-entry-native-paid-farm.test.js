import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {reachableApproach,spawnRaid} from '../src/simulation/raids.js';
import {contiguousGroup} from '../src/simulation/crops.js';
import {defensiveGroups} from '../src/simulation/defensive-groups.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const hash=s=>createHash('sha256').update(s).digest('hex');
test('Paid native multiple crop groups preserve complete entry, reversible escapes and exclusive claims',async()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',slotId:'paid-horde-preflight'}),center=s.structures[0],p=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('Explicit no-worker QA');}});
 try{
  // Ordinary paid placements on native terrain. Failed points remain failures;
  // the fixed set must succeed, not search/reroll until acceptance.
  const points=[[5,-6],[6.2,-6],[10,-6],[11.2,-6],[5,6],[6.2,6]];
  for(const [i,[dx,dz]] of points.entries())assert.equal(Game.plant(s,'paid-'+i,'mijo',center.x+dx,center.z+dz,nav),true);
  const cropGroups=new Set(s.plants.map(c=>contiguousGroup(s.plants,c).map(v=>v.id).sort()[0]));assert.equal(cropGroups.size,3);
  const plantDebits=Object.entries(s.ledger.entries).filter(([id])=>id.startsWith('paid-'));assert.equal(plantDebits.length,6);for(const [,v]of plantDebits)assert.ok(numberOf(v)<0);
  const balance=numberOf(s.ledger.balance);assert.equal(balance,670);
  const eye={x:center.x+16,z:center.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.initialPreparation=false;s.tutorial.step='done';s.time=400;s.dayPlan={done:true};s.nightPlan={at:400,group:[...group],done:false};
  const initial=serialize(s);let slices=0;while(!p.ready){p.update(s);assert.ok(++slices<20000);assert.equal(p.cooperativeError,undefined);await new Promise(resolve=>setImmediate(resolve));}assert.ok(p.ready.entry);assert.equal(serialize(s),initial);
  assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');const actors=[...s.raid.animals];assert.equal(actors.length,12);
  for(const a of actors){assert.ok(nav.walkable(a.x,a.z,a.radius,null,false));assert.ok(nav.walkable(a.exit.x,a.exit.z,a.radius,null,false));assert.ok(nav.segmentClear(a,a.exit,a.radius,null,false));assert.ok(nav.segmentClear(a.exit,a,a.radius,null,false));assert.ok([center,...s.plants].some(target=>reachableApproach(a,target,nav)),'Actual attack route, not worker delivery point');}
  const claims=[],events=[],seen=new Set();let intervals=0,maxOwners=0;
  while(s.raid){Game.tick(s,.05,nav);assert.ok(++intervals<2000);for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);events.push(structuredClone(e));}
   if(!s.raid)break;
   const owners=new Map();for(const a of s.raid.animals)if(a.reservation){const ids=owners.get(a.reservation)??[];ids.push(a.id);owners.set(a.reservation,ids);claims.push({elapsed:s.elapsed,id:a.id,reservation:a.reservation,targetId:a.targetId});}
   for(const ids of owners.values())assert.equal(ids.length,1);maxOwners=Math.max(maxOwners,owners.size);
   for(const g of defensiveGroups(s)){const owners=s.raid.animals.filter(a=>g.targets.some(t=>t.id===a.targetId));assert.ok(owners.length<=1);}
   for(const crop of s.plants.filter(c=>c.alive)){const ids=new Set(contiguousGroup(s.plants,crop).map(c=>c.id));assert.ok(s.raid.animals.filter(a=>ids.has(a.targetId)).length<=1);}
  }
  assert.ok(maxOwners>=2,'Fixture actually exercised concurrent distinct reserved targets');for(const a of actors){assert.equal(a.status,'gone');assert.ok(Math.hypot(a.x-a.exit.x,a.z-a.exit.z)<1e-8,'Physical native exit within floating-point tolerance');}assert.equal(numberOf(s.ledger.balance),balance);assert.equal(serialize(deserialize(serialize(s))),serialize(s));
  assert.equal(events.filter(e=>e.type==='RaidSpawned').length,1);assert.equal(events.filter(e=>e.type==='RaidEnded').length,1);
  const report={scope:'Native paid seed712/Mapungubwe Sabana multi-target entry/raid fixture, not campaign balance',initialSHA256:hash(initial),finalSHA256:hash(serialize(s)),paidCropCount:6,paidCropGroups:3,initialBalance:balance,finalBalance:numberOf(s.ledger.balance),wholeEntry:12,physicalExits:actors.filter(a=>a.status==='gone').length,maxConcurrentOwners:maxOwners,claims,logicalHits:events.filter(e=>e.type==='AnimalLogicalHit').length,cropHits:events.filter(e=>e.type==='CropHit').length,cropDestroyed:events.filter(e=>e.type==='CropDestroyed').length,checks:{entry:true,reversibleEscapes:true,actualAttackApproaches:true,exclusiveClaims:true,physicalExits:true,paidLedger:true,roundtrip:true},preparationMetrics:p.cooperativeMetrics};
  if(process.env.HORDE_PAID_EVIDENCE)writeFileSync(process.env.HORDE_PAID_EVIDENCE,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,claims:undefined}));
 }finally{p.dispose();}
});
