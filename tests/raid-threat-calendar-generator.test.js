import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
function fixture(mutate){
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'wg-pressure-calendar-'));
 try{
  mkdirSync(join(dir,'tools'));mkdirSync(join(dir,'content/balance'),{recursive:true});mkdirSync(join(dir,'src/simulation'),{recursive:true});
  writeFileSync(join(dir,'tools/generate_balance.py'),readFileSync(new URL('../tools/generate_balance.py',import.meta.url)));
  const canonical=JSON.parse(readFileSync(new URL('../content/balance/balance_confirmado.json',import.meta.url)));
  const revisions=JSON.parse(readFileSync(new URL('../content/balance/player_revisions.json',import.meta.url)));mutate(revisions);
  writeFileSync(join(dir,'content/balance/balance_confirmado.json'),JSON.stringify(canonical));writeFileSync(join(dir,'content/balance/player_revisions.json'),JSON.stringify(revisions));
  const output=join(dir,'src/simulation/balance.js'),sentinel='unchanged';writeFileSync(output,sentinel);
  const run=spawnSync('python',[join(dir,'tools/generate_balance.py')],{cwd:dir,encoding:'utf8'});assert.ifError(run.error);
  return {exit:run.status,error:run.stderr,output:readFileSync(output,'utf8'),sentinel};
 }finally{
  assert.equal(dirname(resolve(dir)),parent);assert.ok(dir.startsWith(join(parent,'wg-pressure-calendar-')));rmSync(dir,{recursive:true,force:true});
 }
}
for(const [name,mutate] of [
 ['intro override',r=>r.night_raid_budget_calendar[0].first_night=5],
 ['calendar gap',r=>r.night_raid_budget_calendar[1].first_night=17],
 ['incomplete campaign',r=>r.night_raid_budget_calendar[2].last_night=99],
 ['unbounded budget',r=>r.night_raid_budget_calendar[2].tier_budgets[4][1]=257],
 ['noninteger budget',r=>r.night_raid_budget_calendar[0].tier_budgets[4][0]=24.5],
])test(`invalid calendar ${name} fails before write`,()=>{const r=fixture(mutate);assert.notEqual(r.exit,0);assert.equal(r.output,r.sentinel);});
test('omitting calendar retains canonical original intervals and no extra field',()=>{
 const r=fixture(revisions=>delete revisions.night_raid_budget_calendar);assert.equal(r.exit,0,r.error);
 const generated=JSON.parse(r.output.slice(r.output.indexOf('{'),r.output.lastIndexOf(';')));
 assert.equal(generated.raids.night_budget_calendar,undefined);assert.equal(generated.threat_tiers.at(-1).threat_min,10);assert.equal(generated.threat_tiers.at(-1).threat_max,14);assert.equal(generated.work_center.cost,800);assert.equal(generated.workers.older_wage,30);
});
