import test from 'node:test';
import assert from 'node:assert/strict';
import {compareNativeCampaigns} from '../tools/evolutionary-balance/compare-native-campaigns.mjs';

test('campaign parity ignores measured time but catches economic and raid differences',()=>{
 const base={status:'completed',biome:'sabana',seed:712,days:14,strategy:'evolved',
  genes:{plantsPerWorker:6},completedNights:14,result:null,policy:{profile:'evolved'},
  defense:{paidCost:30,paidPieces:1},
  rows:[{day:1,money:520,living:60,destroyed:0,wallTime:{gameTickMs:100}}],
  raid:[{day:1,animals:1,cropsDestroyed:0}]};
 const slower={...base,rows:[{...base.rows[0],wallTime:{gameTickMs:300}}]};
 assert.equal(compareNativeCampaigns(base,slower).equal,true);
 const changed={...slower,raid:[{...base.raid[0],cropsDestroyed:1}]};
 assert.deepEqual(compareNativeCampaigns(base,changed).mismatchedSections,['raid']);
 assert.equal(compareNativeCampaigns(base,changed).equal,false);
 assert.throws(()=>compareNativeCampaigns({...base,status:'error'},base),/complete native/);
});
