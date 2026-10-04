import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCampaign} from '../tools/check_campaign.mjs';
import {BIOMES,CULTURES} from '../src/simulation/game.js';
for(const biome of BIOMES)for(const culture of CULTURES)
 test(`${biome}/${culture}: paid idle labour without replanting, repairs or protection loses before night 100`,()=>{
  const report=simulateCampaign({biome,culture,seed:712,slotId:'neglected-campaign'});
  assert.equal(report.result,'defeat');assert.equal(report.postgame,false);assert.ok(report.completedNights<100);
  assert.ok(report.reloads>0);assert.equal(report.events.CampaignWon??0,0);assert.equal(report.events.GameOver,1);
 });
