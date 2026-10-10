import test from 'node:test';
import assert from 'node:assert/strict';
import {rational} from '../src/simulation/money.js';
import {campaignFinanceCheckpoint,campaignFinanceDelta} from '../tools/native-campaign-finance.mjs';
import {nativeCampaignStrategy,villageSavingsTarget} from '../tools/native-campaign-protocol.mjs';
const money=n=>rational(n);
test('daily exact balance begins before hiring and includes proportional hires, seeds, delivery and repair once',()=>{
 const s={ledger:{balance:money(695),entries:{old:money(-800)}}},before=campaignFinanceCheckpoint(s);
 s.ledger.entries={'old':money(-800),'intensive-hire-0':money(-60),'intensive-hire-2':money(-7),'intensive-plant-1':money(-5),'deliver:crate':money(11),'repair:task':money(-2),'intensive-wall-3':money(-10)};s.ledger.balance=money(622);
 const r=campaignFinanceDelta(before,s);assert.equal(r.wages,67);assert.equal(r.seeds,5);assert.equal(r.income,11);assert.equal(r.repairs,2);assert.equal(r.walls,10);assert.equal(r.reconciliationDifference,0);
 const next=campaignFinanceCheckpoint(s);assert.equal(campaignFinanceDelta(next,s).net,0);s.ledger.balance=money(623);assert.throws(()=>campaignFinanceDelta(next,s),/reconcile/);
});
test('strategies differ through real earned savings; no grants, projected income or double-reserved village charge',()=>{
 const a=nativeCampaignStrategy('expansive'),b=nativeCampaignStrategy('good'),c=nativeCampaignStrategy('bad');
 assert.notEqual(a.cashPolicy,b.cashPolicy);assert.equal(b.foundVillages,true);assert.equal(c.defend,false);assert.equal(c.repair,false);
 const entries={'deliver:a':money(500),'refund':money(4000)};assert.equal(villageSavingsTarget(a,entries),0);assert.equal(villageSavingsTarget(b,entries),100);
 entries['deliver:b']=money(9500);assert.equal(villageSavingsTarget(b,entries),2000);
 entries['intensive-village-8']=money(-2000);assert.equal(villageSavingsTarget(b,entries),0);
 entries['deliver:c']=money(1000);assert.equal(villageSavingsTarget(b,entries),200);
});
