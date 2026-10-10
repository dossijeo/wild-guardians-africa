import vm from 'node:vm';
import {normalizeCoverageWiring} from './native-smoke-coverage-normalize.js';import {frozenSource} from './frozen-loading-source.js';import {normalizePairWiring} from './world-crop-pair-wiring-normalize.js';
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import {createDesktopVisibilityFixture} from '../tools/create_desktop_visibility_fixture.mjs';import {publishNativeSmokeCoverage} from '../src/app/native-smoke-coverage.js';import {deserialize} from '../src/persistence/snapshots.js';import * as Game from '../src/simulation/game.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('legacy default native fixture remains byte exact without optional provenance',()=>{const f=createDesktopVisibilityFixture();assert.equal(hash(JSON.stringify(f)),'04729f96380a4b597f2d47b2271140f361df18b8fddc3c797b31bc6bc7691c37');assert.equal(hash(JSON.stringify(f,null,2)+'\n'),'28d8bf348c61900a7f4f94a53026a86e638acbca5b058981a43de969788a6406');assert.equal('provenance' in f,false);});
test('representative six biomes and all five cultures retain legal paid first raid night and original visibility invariants',()=>{
 const pairs=Game.BIOMES.map((biome,i)=>[biome,Game.CULTURES[i%5]]);
 assert.equal(new Set(pairs.map(p=>p[1])).size,5);
 for(const [biome,culture] of pairs){const fixture=createDesktopVisibilityFixture({seed:712,biome,culture,slotId:`coverage-${biome}-${culture}`,provenance:true}),s=deserialize(fixture.snapshot);assert.equal(s.biome,biome);assert.equal(s.culture,culture);assert.ok(s.raid&&!s.result);assert.ok(s.spells.some(spell=>spell.kind==='shield'&&spell.remaining===20));assert.equal(s.cooldowns.shield,90);assert.equal(s.ledger.balance.n,'648');assert.ok(s.plants[0].alive&&s.plants[0].species==='yuca'&&s.plants[0].water[0].status==='manual');assert.equal(fixture.provenance.snapshotSha256,hash(fixture.snapshot));assert.ok(fixture.provenance.skyNight>=.99);assert.ok(fixture.provenance.commands.find(c=>c.operation==='Game.tick'&&c.count>0));Game.resume(s,'menu');Game.pause(s,'hidden');const before=JSON.stringify(s);Game.tick(s,600);assert.equal(JSON.stringify(s),before);}
});
test('invalid options fail without selecting another seed or weakening fixture gates',()=>{for(const options of [{biome:'bad'},{culture:'bad'},{seed:-1},{seed:1.5},{seed:4294967296},{slotId:''},{provenance:1}])assert.throws(()=>createDesktopVisibilityFixture(options));});
test('smoke scalar provenance is immutable, reference free, reset between owners and normal OFF does not inspect state',()=>{
 const state={biome:'volcanes',culture:'musgum',seed:712,slotId:'owned',day:1,time:302,plants:[{}]},off={};publishNativeSmokeCoverage(new Proxy({},{get(){throw Error('must not read');}}),'ready',{scope:off});assert.deepEqual(off,{});
 const scope={__desktopSmokeCoverage:true};publishNativeSmokeCoverage(state,'configuration',{scope});const retained=scope.__wildGuardiansSmokeCoverage;assert.ok(Object.isFrozen(retained)&&Object.isFrozen(retained.actual));assert.equal('plants' in retained.actual,false);state.time=303;assert.equal(retained.actual.time,302);publishNativeSmokeCoverage(null,'starting',{scope});assert.equal(scope.__wildGuardiansSmokeCoverage.actual,null);publishNativeSmokeCoverage(state,'ready',{scope});assert.equal(scope.__wildGuardiansSmokeCoverage.actual.time,303);
});
test('selection guards and actual/restored reporting retain original native deadlines and preflight',()=>{
 const rust=readFileSync('src-tauri/src/main.rs','utf8'),smoke=readFileSync('src-tauri/smoke.js','utf8');assert.match(rust,/--smoke-report[\s\S]*smoke_coverage_selection/);assert.match(rust,/Smoke biome and culture must be supplied together/);assert.match(rust,/Duplicate/);for(const id of [...Game.BIOMES,...Game.CULTURES])assert.ok(rust.includes('"'+id+'"'));
 assert.match(smoke,/Actual ready world does not match smoke selection/);assert.match(smoke,/Fixture preview does not match requested smoke selection/);assert.match(smoke,/worldStartedAt \+ 90000/);assert.match(smoke,/await wait\(300000\)/);assert.match(smoke,/for \(const model of models\)/);assert.match(smoke,/biome: selection.biome, culture: selection.culture/);assert.doesNotMatch(smoke,/checks.world = \{biome: 'gran-canon'/);
});

test('exact QA source normalization retains historical runtime invariants',()=>{
 for(const file of ['src/app/main.js','src-tauri/src/main.rs','src-tauri/smoke.js']){
  const current=readFileSync(file,'utf8');assert.equal(normalizePairWiring(file,current),frozenSource('71d4db4e',file));
  assert.notEqual(normalizeCoverageWiring(file,current+'\n// unrelated edit'),normalizeCoverageWiring(file,current));
 }
});

test('actual smoke preview/ready checks reject mismatches and disposed/replaced stale readiness',()=>{
 const text=readFileSync('src-tauri/smoke.js','utf8'),body=text.slice(text.indexOf('  function checkSmokeCoveragePreview'),text.indexOf('  async function listFixtureForSmoke'));
 const {checkSmokeCoveragePreview:preview,checkSmokeCoverageReady:ready}=vm.runInNewContext(body+';({checkSmokeCoveragePreview,checkSmokeCoverageReady})');
 const selection={biome:'sabana',culture:'musgum'},scope={__desktopSmokeCoverage:true},state={...selection,seed:712,slotId:'owned',day:1,time:302};
 assert.doesNotThrow(()=>preview(selection,state));for(const wrong of [{...state,biome:'desierto'},{...state,culture:'etiope'},null])assert.throws(()=>preview(selection,wrong));
 publishNativeSmokeCoverage(state,'ready',{scope});assert.doesNotThrow(()=>ready(selection,scope.__wildGuardiansSmokeCoverage,{slotId:'owned'}));assert.throws(()=>ready(selection,scope.__wildGuardiansSmokeCoverage,{slotId:'other'}));assert.throws(()=>ready({...selection,biome:'volcanes'},scope.__wildGuardiansSmokeCoverage,null));
 publishNativeSmokeCoverage(null,'disposed',{scope});assert.throws(()=>ready(selection,scope.__wildGuardiansSmokeCoverage,null));publishNativeSmokeCoverage(null,'starting',{scope});assert.throws(()=>ready(selection,scope.__wildGuardiansSmokeCoverage,null));publishNativeSmokeCoverage({...state,culture:'etiope'},'configuration',{scope});assert.throws(()=>ready(selection,scope.__wildGuardiansSmokeCoverage,null));
 assert.match(readFileSync('src/app/main.js','utf8'),/function clearWorld\(\)\{if\(globalThis.__desktopSmokeCoverage===true\)publishNativeSmokeCoverage\(null,'disposed'\)/);
});

test('actual smoke whitelist rejects partial or invalid selection before preflight',()=>{
 const text=readFileSync('src-tauri/smoke.js','utf8'),body=text.slice(text.indexOf('    const selection='),text.indexOf('    const load ='));
 for(const value of [{biome:'sabana'},{culture:'musgum'},{biome:'bad',culture:'musgum'},{biome:'sabana',culture:'bad'},{biome:1,culture:'musgum'}])assert.throws(()=>vm.runInNewContext(body,{window:{__desktopSmokeSelection:value}}));
 assert.doesNotThrow(()=>vm.runInNewContext(body,{window:{}}));assert.doesNotThrow(()=>vm.runInNewContext(body,{window:{__desktopSmokeSelection:{biome:'sabana',culture:'musgum'}}}));
});
