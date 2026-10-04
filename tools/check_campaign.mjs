// Adverse strategy: one initial crop, paid labour every day, no replanting,
// repairs or defensive magic. This is a loss test, not campaign balance acceptance.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {simulateOpening} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
export function simulateCampaign(options={}){
 let s,nav,reloads=0;
 const seenEvents=new Set(),loadedRaids=new Set(),events={};
 const collect=()=>{for(const e of s.events)if(!seenEvents.has(e.id)){seenEvents.add(e.id);events[e.type]=(events[e.type]??0)+1;}};
 const reload=()=>{const text=serialize(s);s=deserialize(text);assert.equal(serialize(s),text);nav.setState(s);reloads++;};
 const opening=simulateOpening('olderMale',1,{...options,onTick:(current,routes)=>{
  s=current;nav=routes;collect();
  if(s.raid&&!loadedRaids.has(s.raid.id)){loadedRaids.add(s.raid.id);reload();}
  return s;
 }});s=opening.state;nav=opening.nav;collect();
 assert.equal(s.result,null,'One opening crop leaves a viable first dawn');assert.equal(s.day,2);
 for(let day=2;day<=100&&!s.result;day++){
  assert.equal(s.day,day);assert.deepEqual(s.pauses,['hiring']);
  if(day%7===0){reload();const frozen=serialize(s);Game.tick(s,30,nav);assert.equal(serialize(s),frozen);}
  const before=numberOf(s.ledger.balance);Game.hire(s,'neglect-hire-'+day,{olderMale:1});assert.equal(numberOf(s.ledger.balance),before-30);
  const started=s.elapsed;
  while(s.day===day&&!s.result){
   options.onTick?.(s,nav);
   if(s.raid&&!loadedRaids.has(s.raid.id)){loadedRaids.add(s.raid.id);reload();}
   const untilRaid=s.time<300?300-s.time:s.nightPlan&&!s.nightPlan.done?s.nightPlan.at-s.time:Infinity;
   Game.tick(s,Math.min(5,Math.max(.001,untilRaid)),nav);collect();
   if(s.elapsed-started>2400)throw new Error(`Raid did not finish on ${s.biome}/${s.culture}/day ${day}: ${JSON.stringify(s.raid)}`);
  }
 }
 assert.equal(s.result,'defeat','Spending on idle labour and neglecting planting/defences must not win');
 assert.ok(s.completedNights<100);assert.equal(events.CampaignWon??0,0);assert.equal(events.GameOver,1);
 assert.equal(s.plants.length,1);assert.ok(s.crates.length<=1);assert.ok(events.RaidSpawned>0);assert.ok(reloads>0);
 let balance=1500n;for(const v of Object.values(s.ledger.entries)){assert.equal(v.d,'1');balance+=BigInt(v.n);}
 assert.equal(s.ledger.balance.n,String(balance));assert.equal(s.ledger.balance.d,'1');
 const terminal=serialize(s);Game.tick(s,600,nav);assert.equal(serialize(s),terminal);reload();
 const defeated=serialize(s);Game.continuePostgame(s);assert.equal(serialize(s),defeated);
 return {biome:s.biome,culture:s.culture,seed:s.seed,strategy:'neglect',result:s.result,completedNights:s.completedNights,postgame:s.postgame,
  money:numberOf(s.ledger.balance),reloads,events};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log(JSON.stringify(simulateCampaign({biome:process.argv[2]??'sabana',culture:process.argv[3]??'mapungubwe'})));
