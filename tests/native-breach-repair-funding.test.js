// Synthetic damaged-wall fixtures test policy decisions, not campaign success.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {breachRepairFunding,settledRepairQuote} from '../tools/native-repair-funding.mjs';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
test('whole-coin quotes match native upward rounding and full reconstruction',()=>{
 assert.equal(settledRepairQuote({cost:35,hp:219,maxHp:300,status:'intact'}),10);
 assert.equal(settledRepairQuote({cost:20,hp:0,maxHp:200,status:'ruined'}),20);
});
test('breached funding prioritizes ruined pieces and preserves native minimum without mutating state',()=>{
 const s={structures:[{id:'scratched',kind:'wall',hp:100,maxHp:200,status:'intact'},
  {id:'gap',kind:'wall',hp:0,maxHp:200,status:'ruined'}]},before=JSON.stringify(s),owned=new Set(['gap','scratched']);
 const p=breachRepairFunding(s,owned,210);assert.equal(p.protectedCash,30);assert.equal(p.ordered[0].id,'gap');
 assert.equal(JSON.stringify(s),before);s.structures[1].status='intact';s.structures[1].hp=200;
 assert.equal(breachRepairFunding(s,owned,210).protectedCash,210);
});
test('native repair requests are funded before scratches, survive reload and do not grant free HP or coins',()=>{
 const {s,nav}=createOpeningWorld();let seq=0;const c=s.structures[0];
 Game.plant(s,'seed','mijo',c.x+6,c.z+1,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 const build=createNativeFundedDefensePolicy({startDay:1,material:'empalizada'});
 build.act(s,nav,{command:k=>'setup-'+k+seq++,reserve:30});
 const walls=s.structures.filter(w=>w.kind==='wall');assert(walls.length>=3);
 // Explicit synthetic test damage/cash only; never used in campaign evidence.
 walls[0].hp=100;walls[1].hp=0;walls[1].status='ruined';walls[2].hp=0;walls[2].status='ruined';
 s.ledger.balance=rational(70);nav.setState(s);
 const legacy=createNativeFundedDefensePolicy({startDay:1,material:'empalizada'});
 legacy.act(s,nav,{command:k=>'legacy-'+k+seq++,reserve:210});assert.equal(s.tasks.filter(t=>t.kind==='repair').length,0);
 const policy=createNativeFundedDefensePolicy({startDay:1,material:'empalizada',repairPolicy:'breach-first'});
 const hp=walls.map(w=>w.hp),cash=numberOf(s.ledger.balance),rng=s.rng;
 policy.act(s,nav,{command:k=>'breach-'+k+seq++,reserve:210});
 const tasks=s.tasks.filter(t=>t.kind==='repair');assert.deepEqual(tasks.map(t=>t.targetId),walls.slice(1,3).map(w=>w.id).sort());
 assert.deepEqual(walls.map(w=>w.hp),hp);assert.equal(numberOf(s.ledger.balance),cash);assert.equal(s.rng,rng);
 const reloaded=deserialize(serialize(s));assert.deepEqual(reloaded.tasks.filter(t=>t.kind==='repair'),tasks);
 assert.equal(tasks.reduce((n,t)=>n+settledRepairQuote(s.structures.find(w=>w.id===t.targetId)),0),40);
 nav.setState(reloaded);
 for(let i=0;i<300&&reloaded.tasks.some(t=>t.kind==='repair');i++)Game.tick(reloaded,1,nav);
 for(const t of tasks){
  const wall=reloaded.structures.find(w=>w.id===t.targetId);
  assert.equal(wall.hp,wall.maxHp);assert.equal(wall.status,'intact');
  assert.equal(numberOf(reloaded.ledger.entries['repair:'+t.id]),-20);
 }
 assert.equal(Object.keys(reloaded.ledger.entries).filter(id=>id.startsWith('repair:')).length,2);
});
test('repair candidate is opt-in, named in provenance and requires supported defense policy',()=>{
 const o=parseNativeCampaignArgs(['--out','fixture','--defense-policy','shore','--repair-policy','breach-first']);
 const p=nativeCampaignProvenance(o);assert.equal(p.protocol.repairPolicy,'breach-first');
 assert.ok(p.sourceHashes['tools/native-repair-funding.mjs']);
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).repairPolicy,'legacy');
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--repair-policy','breach-first']));
});
