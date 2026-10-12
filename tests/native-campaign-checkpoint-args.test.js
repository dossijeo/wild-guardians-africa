import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNativeCampaignArgs} from '../tools/run_native_campaign.mjs';

const base=['--out','docs/qa/checkpoint-args-test','--days','14'];
test('native campaign checkpoint is an explicit bounded diagnostic option',()=>{
 const o=parseNativeCampaignArgs([...base,'--checkpoint-day','13','--checkpoint-time','295','--checkpoint-stop','yes','--timing-day','13','--raid-trace-day','13','--raid-trace-time','385','--phase-trace-day','13','--phase-trace-time','385']);
 assert.equal(o.checkpointDay,13);assert.equal(o.checkpointTime,295);assert.equal(o.checkpointStop,true);
 assert.equal(o.timingDay,13);
 assert.equal(o.raidTraceDay,13);assert.equal(o.raidTraceTime,385);
 assert.equal(o.phaseTraceDay,13);assert.equal(o.phaseTraceTime,385);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--checkpoint-day','15','--checkpoint-time','295']),/Invalid native checkpoint/);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--checkpoint-day','13']),/Invalid native checkpoint/);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--checkpoint-day','13','--checkpoint-time','600']),/Invalid native checkpoint/);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--timing-day','15']),/Invalid native timing day/);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--raid-trace-day','13']),/Invalid native raid trace target/);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--raid-trace-day','15','--raid-trace-time','385']),/Invalid native raid trace target/);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--phase-trace-day','13']),/Invalid native phase trace target/);
 assert.throws(()=>parseNativeCampaignArgs([...base,'--raid-trace-day','13','--raid-trace-time','385','--phase-trace-day','13','--phase-trace-time','386']),/Native traces must target the same tick/);
});
