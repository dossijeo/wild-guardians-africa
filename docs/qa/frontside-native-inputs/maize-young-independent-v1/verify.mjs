import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const get=p=>read(new URL(p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(get('receipt.json'));
for(const p of receipt.pieces){const encoded=get(p.path),bytes=p.gzip?gunzipSync(encoded):encoded;assert.equal(bytes.length,p.bytes);assert.equal(hash(bytes),p.sha256);}
assert(receipt.tabClosed&&receipt.gpuDisposed&&receipt.profileRejected&&receipt.laterBlocksNotRun);assert.equal(receipt.productionAssetPromoted,false);assert.equal(receipt.benchmark,false);assert.deepEqual(receipt.warningErrorLogs,[]);
assert.equal(hash(gunzipSync(get('fixture.js.gz'))),receipt.fixtureSha256);assert.equal(hash(get('profile.json')),receipt.profileSha256);
const r=JSON.parse(gunzipSync(get('report.json.gz')));
assert.equal(r.independentProfileSha256,receipt.profileSha256);assert(r.localStemIndependentScreen&&r.frontArmRendered);assert.equal(r.caseOffset,0);assert.equal(r.samples.length,16);assert(!r.invalidControl&&!r.preFrontInvalidDouble);
assert.equal(r.localStemCaseCpuContracts.length,16);
for(let i=0;i<r.samples.length;i++){const s=r.samples[i];assert(s.controls.every(c=>c.differentBytes===0&&!c.alphaDifferences));assert(s.comparisons.slice(0,2).every(c=>c.passes));assert.equal(s.comparisons[2].passes,i<15);}
const s=r.samples.at(-1),front=s.comparisons[2];assert.equal(s.biome,'volcanes');assert.equal(s.growth,.43562);assert.equal(s.clock,6.3125);assert.equal(s.elevation,-15);assert.equal(s.azimuth,351.3125);assert.equal(s.night,0);assert.equal(s.phase,'original');assert.equal(front.alphaIoU,1);assert.equal(front.missingPixels,0);assert.equal(front.addedPixels,0);assert(front.maxTileMae>.01);assert.equal(front.maxTileMae,.020548151432648945);
for(const c of r.localStemCpuContracts){assert.equal(c.mesh,'maiz_02_joven');assert.equal(c.geometry.indexCount,3762);assert.equal(c.geometry.attributes.position.count,2132);assert(c.materials.every(m=>m.shadowSide===2));}
assert.deepEqual(r.localStemCpuContracts[3].materials.map(m=>m.side),[0,2]);assert('DOUBLE_SIDED' in r.localStemCpuContracts[3].materials[0].defines);
assert.deepEqual(r.localStemCpuContracts[3].geometry.groups.map(g=>g.count),[735,3027]);assert(r.referenceDrawInfo.every(d=>d.triangles===2508));assert(r.effectiveShadowDraws.every(d=>d.side===2));
assert.equal(r.source,receipt.sourceGlb.runtime);
console.log('PASS evidence integrity: independent V1 rejected at case15 after valid Double controls; no category/GPU approval.');
