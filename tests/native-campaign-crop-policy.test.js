import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignCropChoice} from '../tools/native-campaign-crop-policy.mjs';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';
test('legacy selection remains the original day-ten and cash-threshold recipe',()=>{
 const species=['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'];
 for(let purchased=0;purchased<80;purchased++)for(const day of [1,9,10,100])for(const cash of [30,1000,1001]){
  const actual=campaignCropChoice({day,cash,purchased,reserved:0});
  assert.equal(actual,day>=10&&cash>1000?species[purchased%8]:'mijo');
 }
});
test('cashflow mix protects short-cycle startup and liquid working capital without purchase quotas',()=>{
 const choose=(purchased,cash=1000,reserved=180)=>campaignCropChoice({policy:'cashflow',day:1,cash,reserved,purchased});
 for(let i=0;i<30;i++)assert.equal(choose(i),'mijo');
 assert.equal(choose(31,291),'mijo');assert.equal(choose(31,292),'yuca');
 assert.equal(choose(32),'mijo');assert.equal(choose(1000007),'yuca');
 assert.throws(()=>campaignCropChoice({policy:'invented',day:1,cash:100,purchased:0}));
});
test('explicit crop policy and source hash are retained in native CLI provenance',()=>{
 const o=parseNativeCampaignArgs(['--out','.cache/crop-policy-proof','--crop-policy','cashflow','--labour-policy','q8']);
 assert.equal(o.cropPolicy,'cashflow');assert(nativeCampaignProvenance(o).sourceHashes['tools/native-campaign-crop-policy.mjs']);
 assert.equal(parseNativeCampaignArgs(['--out','.cache/default-crop-policy-proof']).cropPolicy,'legacy');
 assert.throws(()=>parseNativeCampaignArgs(['--out','.cache/x','--crop-policy','synthetic']));
});
