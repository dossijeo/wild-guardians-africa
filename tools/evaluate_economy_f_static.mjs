// Static counterfactual, never a native campaign or survival verdict.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {hitStructure,collapseThreshold} from '../src/simulation/rules.js';
const p='docs/qa/economic-candidates-a518/harvest-double-independent-attraction/',s=JSON.parse(readFileSync(p+'state.json','utf8'));
const currentIncome=s.crates.filter(c=>c.delivered).reduce((n,c)=>n+(BigInt(c.value.n)+BigInt(c.value.d)-1n)/BigInt(c.value.d),0n);
const proposedIncome=s.crates.filter(c=>c.delivered).reduce((n,c)=>n+(BigInt(c.value.n)*3n+BigInt(c.value.d)*2n-1n)/(BigInt(c.value.d)*2n),0n);
assert.equal(currentIncome,6710n);assert.equal(proposedIncome,10065n);
const currentDamage={warthog:20,hyena:25,buffalo:35,lion:40,rhino:60},proposalDamage=Object.fromEntries(Object.entries(currentDamage).map(([k,v])=>[k,v*.5]));
const original={kind:'center',maxHp:600,hp:600,status:'intact',collapseRemaining:0},candidate=structuredClone(original);
for(let i=0;i<8;i++){hitStructure(original,60,i);hitStructure(candidate,30,i);}
assert.equal(original.hp,120);assert.equal(original.status,'collapsing');assert.equal(candidate.hp,360);assert.equal(candidate.status,'intact');
for(const damage of Object.values(proposalDamage)){
 const fixture={kind:'center',maxHp:600,hp:600,status:'intact',collapseRemaining:0};hitStructure(fixture,damage,1);
 assert.equal(fixture.hp,600-damage);assert.equal(JSON.parse(JSON.stringify(fixture)).hp,fixture.hp);
}
const out={scope:'Static frozen-service calculation, not a simulation, campaign acceptance, or money injection. Exact same279 delivered receipts, seed3440 and wages3390 from rejected E2. A native F run will change reinvestment, workload/RNG and possibly raid timing/composition, so this cannot predict its outcome.',
 source:'9833b6d9',currentIncome:String(currentIncome),proposedSamePhysicalReceiptsIncome:String(proposedIncome),seedCosts:3440,wages:3390,
 staticOperatingCashflow:Number(proposedIncome)-3440-3390,staticCashAfterCentreAndAlreadyRecordedWages:1500+Number(proposedIncome)-3440-3390-800,
 additionalStaticRepairCostForHalfDamage:Math.ceil(800*(600-360)/600),
 staticCashAfterSameLedgerAndIllustrativeRepair:1500+Number(proposedIncome)-3440-3390-800-320,
 currentDamage,proposalDamage,
 fatal8Hits:{oldHp:original.hp,oldStatus:original.status,proposedHp:candidate.hp,proposedStatus:candidate.status,collapseThreshold:collapseThreshold(candidate),proposedHeadroomAboveCollapse:candidate.hp-collapseThreshold(candidate),oldHitsToCollapse:8,proposedHitsToCollapse:Math.ceil((600-collapseThreshold(candidate))/30)},
 implementation:'Existing canonical structure_hit_damage per species is copied by generator into animal.structure_hit_damage, used only on structure path in raids. Crops use independent attackHits>=2. No new coefficient or harness override is needed. Half values12.5/17.5 are exact binary halves; hp is numerical, not monetary. Integer ledger and repair ceil remain unchanged.',
 unchanged:'Original seed costs,1500 money,30/40 wages,growth/checkpoints,first5 introduction/guaranteed groups/hit budgets,Shield strategy,FIFO,reserve100,baseline explicit attraction. Only harvest×3 and structure damage×0.5 proposed.',
 gates:'No native gates evaluated; F remains unimplemented/unrun pending source/formula review.'};
writeFileSync('docs/qa/economic-candidates-a518/f-static-proposal.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
