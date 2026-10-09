import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url);
const hashes={'report.json':'c87eaf7513cdc57d2d125d2490ead7c6981c636b45d1f2ff9d0f3716adde4bce','atlas.png':'cf120d3c82ab8c4fee3e6968b2bbb94e7f47328d85beb6c569279fc4f7c0c384','last-frame.png':'b2725757e47a5c4c3ef9aaee01fe6546940b5166f422bebd3f0e67387eb00dd1'};
for(const [name,hash]of Object.entries(hashes)){const b=fs.readFileSync(new URL(name,dir));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);if(name.endsWith('.png'))assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
const r=JSON.parse(fs.readFileSync(new URL('report.json',dir)));
assert.equal(r.selectedDoubleControl,true);assert.equal(r.samples.length,60);assert.equal(new Set(r.samples.map(s=>s.clip)).size,12);
assert.equal(r.reviewAtlas.rows.length,60);assert.equal(r.reviewAtlas.omitted,0);assert.equal(r.reviewAtlas.width,1440);assert.equal(r.reviewAtlas.height,5240);
assert.deepEqual(Buffer.from(r.reviewAtlas.atlasPng.split(',')[1],'base64'),fs.readFileSync(new URL('atlas.png',dir)));
for(const arm of [0,1])assert.equal(r.materialSides.find(m=>m.side===arm&&m.mesh==='Mesh0').colorSide,0);
assert.equal(r.selectedCoverageSummary.length,5);for(const part of r.selectedCoverageSummary)for(const arm of part.arms)assert.ok(arm.maxVisiblePixels>0);
assert.equal(r.visualReview.status,'HUMAN_REVIEW_PENDING');
console.log('PASS: retained 907 raw/PNG/atlas, 60 poses, 12 clips, original Front body and five visible selected parts; no category approval.');

