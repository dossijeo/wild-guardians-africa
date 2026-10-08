import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(readFileSync(new URL('receipt.json',dir))),sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of receipt.pieces){const bytes=readFileSync(new URL(p.path,dir)),b=p.gzip?gunzipSync(bytes):bytes;assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);}
assert.equal(receipt.productionChanged,false);assert.equal(receipt.candidateCompared,true);assert.equal(receipt.benchmark,false);assert.equal(receipt.tabClosed,785);assert(receipt.gpuDisposed);assert.equal(receipt.warningErrorLogs[0].count,2);
const r=JSON.parse(gunzipSync(readFileSync(new URL('report.json.gz',dir))));assert.equal(r.viewProfile,'SORGO_NATIVE_STEM_TRAINING_V1');assert.equal(r.pilotSpecies,'sorgo');assert.equal(r.samples.length,1);assert(!r.invalidControl);
const s=r.samples[0];assert.deepEqual([s.growth,s.clock,s.biome,s.night,s.elevation,s.azimuth],[1,2.375,'sabana',0,37.5,38.75]);assert(s.controls.every(x=>x.differentBytes===0&&x.alphaDifferences===0));assert.equal(s.controls.length,3);
const [indexed,grouped,front]=s.comparisons;assert(indexed.passes&&grouped.passes&&!front.passes);assert.equal(indexed.linearRgbMae,0);assert(grouped.maxTileMae<.001);assert(front.maxTileMae>.019&&front.maxTileMae<.02);assert.equal(front.alphaIoU,1);assert.equal(front.missingPixels,0);assert.equal(front.addedPixels,0);assert.deepEqual(front.rgbOutlierRegions.slice(0,3).map(x=>x.pixels),[115,28,19]);
const contracts=r.sorgoSourceStateCpuContracts;assert.equal(contracts.length,4);
for(const c of contracts){assert.equal(c.geometry.indexType,'Uint16Array');assert.equal(c.geometry.indexCount,19188);assert.equal(c.geometry.attributes.position.count,13097);assert.deepEqual(c.geometry.boundingBox,contracts[0].geometry.boundingBox);}
assert.deepEqual(contracts[3].geometry.groups.map(g=>g.count),[1284,17904]);assert.equal(contracts[3].materials[0].side,0);assert.equal(contracts[3].materials[1].side,2);assert.equal(contracts[3].materials[0].defines.DOUBLE_SIDED,'');assert(contracts[3].materials.every(m=>m.shadowSide===2));assert(r.effectiveShadowDraws.every(x=>x.side===2));
for(const a of r.resources){const m=a.meshes.find(m=>m.mesh==='sorgo_05_maduro');assert.equal(m.candidateTriangles,6396);assert.equal(m.candidateVertices,13097);assert.equal(m.indexBytes,38376);assert.equal(m.candidateDecodedGeometryBytes,457512);}
console.log('PASS original controls and archive integrity; partial Sorgo FrontSide fails local RGB quality, not approved');
