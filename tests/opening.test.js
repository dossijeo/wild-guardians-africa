import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateOpening} from '../tools/check_opening.mjs';
import {numberOf} from '../src/simulation/money.js';
for(const profile of ['olderMale','olderFemale','youngMale','youngFemale']){
  test(`${profile}: eight original-terrain crops pay only their physical deliveries and permit dawn hiring`,()=>{
    const report=simulateOpening(profile,8),wage=profile.startsWith('young')?120:100;
    const value=profile.endsWith('Male')?11:9;
    assert.equal(report.initialBalance,1000-800-8*5-wage);
    assert.equal(report.plots,8);assert.ok(report.delivered>0&&report.delivered<=8);
    assert.equal(report.money,report.initialBalance+report.delivered*value);
    assert.equal(report.result,null);assert.equal(report.day,2);assert.deepEqual(report.pauses,['hiring']);
    assert.ok(report.plants.filter(p=>!p.alive).every(p=>p.water.every(w=>w.status==='manual')),'Every harvested plant must complete all required watering');
    for(const crate of report.crates){
      assert.equal(crate.carrierId,null);assert.ok(crate.delivered);
      assert.ok(report.ledger.entries[`deliver:${crate.id}`],'Every delivered box must have exactly one settlement');
    }
    assert.ok(Object.values(report.ledger.entries).every(entry=>entry.d==='1'&&Number.isInteger(numberOf(entry))),
      'The economy may not accumulate invisible currency fractions');
  });
  test(`${profile}: excessive first-day sowing cannot bypass the economic defeat check`,()=>{
    const report=simulateOpening(profile,19);
    assert.equal(report.plots,profile.startsWith('young')?16:19);
    assert.equal(report.day,2);assert.ok(report.money>=0);
    const pending=report.living>0||report.crates.some(c=>!c.delivered);
    const minimum=pending?100:105;
    if(report.money<minimum){
      assert.equal(report.result,'defeat');
      assert.ok(!report.pauses.includes('hiring'),'Defeat must precede opening the next hiring dialog');
    }else{
      assert.equal(report.result,null);assert.deepEqual(report.pauses,['hiring']);
    }
  });
}
