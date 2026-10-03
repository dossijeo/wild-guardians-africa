// Legal minimal campaign route: one crop on day one, then zero-worker hiring.
// This tests the campaign clock/raid/save/victory pipeline, not all threat tiers.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {simulateOpening} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {reachableApproach} from '../src/simulation/raids.js';
export function simulateCampaign(options={}){
  const opening=simulateOpening('olderMale',1,options),nav=opening.nav;
  let s=opening.state,reloads=0,tutorialReachable=null;
  const seenEvents=new Set(),loadedRaids=new Set(),events={};
  const collect=()=>{
    for(const event of s.events)if(!seenEvents.has(event.id)){
      seenEvents.add(event.id);events[event.type]=(events[event.type]??0)+1;
    }
  };
  const reload=()=>{
    const text=serialize(s);s=deserialize(text);assert.equal(serialize(s),text);
    nav.setState(s);reloads++;
  };
  collect();assert.equal(s.result,null,'The first crop must finance continuing the campaign');
  assert.equal(s.day,2);assert.equal(opening.delivered,1);assert.equal(opening.living,0);
  const openingMoney=numberOf(s.ledger.balance),initialCenterHp=s.structures[0].hp;
  for(let day=2;day<=100&&!s.result;day++){
    assert.equal(s.day,day);assert.equal(s.completedNights,day-1);assert.deepEqual(s.pauses,['hiring']);
    if(day%7===0){reload();const paused=serialize(s);Game.tick(s,30,nav);assert.equal(serialize(s),paused);}
    Game.hire(s,'campaign-hire-'+day,{});const started=s.elapsed;
    while(s.day===day&&!s.result){
      if(s.raid&&!loadedRaids.has(s.raid.id)){tutorialReachable=!!reachableApproach(s.raid.animals[0],s.structures[0],nav);loadedRaids.add(s.raid.id);reload();}
      // Stop exactly at planning/spawn boundaries so even a short, legitimate
      // withdrawal can be saved while active, rather than missed by a 30s tick.
      const untilRaid=s.time<300?300-s.time:s.nightPlan&&!s.nightPlan.done?s.nightPlan.at-s.time:Infinity;
      Game.tick(s,Math.min(30,Math.max(.001,untilRaid)),nav);collect();
      // Diagnostic bound only: never expire or alter an animal in the game.
      if(s.elapsed-started>2400)throw new Error(`Raid did not finish on ${s.biome}/${s.culture}/day ${day}: ${JSON.stringify(s.raid)}`);
    }
    assert.equal(numberOf(s.ledger.balance),openingMoney,'Zero-worker hiring and combat must not invent payments');
  }
  assert.equal(s.result,'victory');assert.equal(s.completedNights,100);assert.equal(s.day,101);assert.equal(s.raid,null);
  assert.equal(events.CampaignWon,1);assert.equal(events.GameOver??0,0);
  assert.equal(events.RaidSpawned,1);assert.equal(events.RaidEnded,1);
  assert.notEqual(tutorialReachable,null,'The guaranteed tutorial raid must actually spawn');
  if(tutorialReachable)assert.ok(s.structures[0].hp<initialCenterHp,'A reachable tutorial target must actually receive damage');
  else {assert.equal(s.structures[0].hp,initialCenterHp,'An inaccessible island must not receive remote damage');assert.equal(events.StructureHit??0,0);}
  const victory=serialize(s);Game.tick(s,600,nav);assert.equal(serialize(s),victory);reload();
  const centerHp=s.structures[0].hp;Game.continuePostgame(s);collect();
  for(let day=101;day<=102;day++){
    assert.equal(s.day,day);assert.deepEqual(s.pauses,['hiring']);Game.hire(s,'postgame-hire-'+day,{});
    while(s.day===day){Game.tick(s,30,nav);collect();assert.equal(s.raid,null);assert.equal(s.result,null);}
  }
  assert.equal(s.postgame,true);assert.equal(s.day,103);assert.equal(s.completedNights,102);
  assert.equal(s.structures[0].hp,centerHp);assert.equal(events.CampaignWon,1);assert.equal(events.PostgameStarted,1);
  return {biome:s.biome,culture:s.culture,seed:s.seed,completedNights:s.completedNights,postgame:s.postgame,
    money:numberOf(s.ledger.balance),centerHp,reloads,tutorialReachable,events};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(simulateCampaign({biome:process.argv[2]??'sabana',culture:process.argv[3]??'mapungubwe'})));
