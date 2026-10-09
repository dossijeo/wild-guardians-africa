import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

// Run the real generator against isolated input files. A rejected revision must
// fail before replacing the generated module, rather than merely fail a test
// after silently changing production values.
function fixture(run) {
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'wg-balance-audio-'));
 try {
  mkdirSync(join(dir,'tools'));mkdirSync(join(dir,'content','balance'),{recursive:true});mkdirSync(join(dir,'src','simulation'),{recursive:true});
  writeFileSync(join(dir,'tools','generate_balance.py'),readFileSync(new URL('../tools/generate_balance.py',import.meta.url)));
  const canonical=JSON.parse(readFileSync(new URL('../content/balance/balance_confirmado.json',import.meta.url)));
  const revisions=JSON.parse(readFileSync(new URL('../content/balance/player_revisions.json',import.meta.url)));
  const output=join(dir,'src','simulation','balance.js'),sentinel='// existing generated module\n';writeFileSync(output,sentinel);
  const generate=()=>{
   writeFileSync(join(dir,'content','balance','balance_confirmado.json'),JSON.stringify(canonical));
   writeFileSync(join(dir,'content','balance','player_revisions.json'),JSON.stringify(revisions));
   return spawnSync('python',[join(dir,'tools','generate_balance.py')],{cwd:dir,encoding:'utf8'});
  };
  return run({canonical,revisions,output,sentinel,generate});
 } finally {
  assert.equal(dirname(resolve(dir)),parent);assert.ok(dir.startsWith(join(parent,'wg-balance-audio-')));
  rmSync(dir,{recursive:true,force:true});
 }
}

for(const [name,mutate,message] of [
 ['600-coin centre',f=>{f.canonical.work_center.cost=600;},/work centre price of 800/],
 ['changed older-worker wage',f=>{f.revisions.workers.older_wage=31;},/older-worker wage of 30/],
 ['wage below the minimum',f=>{f.revisions.workers.young_wage=29;},/no wage below 30/]
]) test(`balance generation rejects ${name} without writing`,()=>fixture(f=>{
 mutate(f);const result=f.generate();assert.ifError(result.error);assert.notEqual(result.status,0);assert.match(result.stderr,message);
 assert.equal(readFileSync(f.output,'utf8'),f.sentinel);
}));

test('audio-backed prices allow independent harvest, threat and movement revisions',()=>fixture(f=>{
 const expected=f.revisions.crop_harvest_values.mijo*3;
 f.revisions.crop_harvest_values.mijo=expected;
 f.revisions.structure_hit_damage.warthog=10;
 f.revisions.workers.daily_run_distance_long_trips=4;
 const result=f.generate();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
 const text=readFileSync(f.output,'utf8'),generated=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf(';')));
 assert.equal(generated.work_center.cost,800);assert.equal(generated.workers.older_wage,30);
 assert.equal(generated.crops.find(c=>c.id==='mijo').base_harvest_value,expected);
 assert.equal(generated.animals.find(a=>a.id==='warthog').structure_hit_damage,10);
 assert.equal(generated.workers.daily_run_distance_long_trips,4);
}));
