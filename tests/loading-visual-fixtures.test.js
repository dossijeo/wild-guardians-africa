import test from 'node:test';import assert from 'node:assert/strict';import {createLoadingVisualFixtures} from '../tools/create_loading_visual_fixtures.mjs';
import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {join,resolve} from 'node:path';
test('day/night saves derive from paid normal commands/ticks and retain the same real cassava',()=>{
 const {day,night}=createLoadingVisualFixtures();assert.equal(day.provenance.time,0);assert.equal(day.provenance.skyNight,0);assert.ok(night.provenance.time>=300);assert.ok(night.provenance.skyNight>=.99);
 assert.deepEqual(day.provenance.plants.map(p=>p.id),night.provenance.plants.map(p=>p.id));assert.equal(day.provenance.plants[0].species,'yuca');assert.equal(night.provenance.plants[0].alive,true);
 for(const row of [day,night]){assert.equal(createHash('sha256').update(row.fixture.snapshot).digest('hex'),row.provenance.snapshotSha256);assert.equal(row.provenance.seed,'712');assert.equal(row.provenance.plants.some(p=>p.species==='maiz'),false);}
 assert.ok(night.provenance.commands.some(c=>c.operation==='Game.tick'&&c.count>0));
});
test('launcher plan hashes actual fixture/executable and creates a new scoped profile without launching',()=>{
 mkdirSync('.cache',{recursive:true});const output=mkdtempSync(resolve('.cache/visual-launch-test-')),exe=join(output,'not-executed.exe'),fixture=join(output,'owned-fixture.json');
 writeFileSync(exe,'CPU fixture only; never executable');writeFileSync(fixture,JSON.stringify({slotId:'owned',snapshot:'snapshot-bytes'}));
 const hash=createHash('sha256').update(readFileSync(exe)).digest('hex'),original=process.env.WEBVIEW2_USER_DATA_FOLDER;
 const args=['tools/run_loading_visual_qa.py','--exe',exe,'--exe-sha256',hash,'--source','qa-frozen-source','--fixture',fixture,'--output',output,'--plant'];
 const first=JSON.parse(readFileSync(execFileSync('python',args,{encoding:'utf8'}).trim(),'utf8')),second=JSON.parse(readFileSync(execFileSync('python',args,{encoding:'utf8'}).trim(),'utf8'));
 assert.equal(first.executed,false);assert.notEqual(first.WEBVIEW2_USER_DATA_FOLDER,second.WEBVIEW2_USER_DATA_FOLDER);assert.ok(first.WEBVIEW2_USER_DATA_FOLDER.startsWith(output));assert.equal(process.env.WEBVIEW2_USER_DATA_FOLDER,original);
 assert.deepEqual(first.argv.slice(-2),['--smoke-visual','--smoke-visual-plant']);assert.equal(first.fixtureSha256,createHash('sha256').update(readFileSync(fixture)).digest('hex'));
});
