import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url);
const hashes={'report.json':'a5e5cd0ec55faed6edab0a333668b59d9f6f81d021ee9d7dd9c74f8d2633a9d7','atlas.png':'49b4b276fd1550362a9edf94ddd63779c3a4056803823a115b9de1916f8b6b1f','last-frame.png':'b2725757e47a5c4c3ef9aaee01fe6546940b5166f422bebd3f0e67387eb00dd1'};
for(const [name,hash]of Object.entries(hashes)){const b=fs.readFileSync(new URL(name,dir));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);if(name.endsWith('.png'))assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
const r=JSON.parse(fs.readFileSync(new URL('report.json',dir)));
assert.equal(r.selectedDoubleControl,false);assert.equal(r.samples.length,60);assert.equal(new Set(r.samples.map(s=>s.clip)).size,12);
assert.equal(r.reviewAtlas.rows.length,60);assert.equal(r.reviewAtlas.omitted,0);assert.equal(r.reviewAtlas.width,1440);assert.equal(r.reviewAtlas.height,5240);
assert.deepEqual(Buffer.from(r.reviewAtlas.atlasPng.split(',')[1],'base64'),fs.readFileSync(new URL('atlas.png',dir)));
for(const arm of [0,1])assert.equal(r.materialSides.find(m=>m.side===arm&&m.mesh==='Mesh0').colorSide,0);
assert.equal(r.selectedCoverageSummary.length,5);for(const part of r.selectedCoverageSummary)for(const arm of part.arms)assert.ok(arm.maxVisiblePixels>0);
assert.equal(r.visualReview.status,'HUMAN_REVIEW_PENDING');
console.log('PASS: retained 906 raw/PNG/atlas, 60 poses, 12 clips, original Front body and five visible selected parts; no category approval.');
