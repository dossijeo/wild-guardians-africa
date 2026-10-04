import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCampaign} from '../tools/check_campaign.mjs';
import {BIOMES,CULTURES} from '../src/simulation/game.js';
for(const biome of BIOMES)for(const culture of CULTURES)
  test(`${biome}/${culture}: legal minimal campaign reaches night 100, reloads active raid and continues postgame`,()=>{
    const report=simulateCampaign({biome,culture,seed:712,slotId:'campaign'});
    assert.equal(report.completedNights,102);assert.equal(report.postgame,true);assert.equal(report.money,676);
    assert.ok(report.reloads>=16);assert.equal(report.events.CampaignWon,1);
  });
