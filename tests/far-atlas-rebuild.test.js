import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sha256,admitReviewedAtlasSources,equivalentNativeFrame} from '../tools/rebuild_far_atlases.mjs';
const manifest=JSON.parse(await fs.readFile('tools/sources/far-atlases/manifest.json','utf8'));
const reviewed=JSON.parse(await fs.readFile('public/content/far-vegetation.json','utf8'));
const metadata=()=>Object.fromEntries(manifest.records.map(record=>[record.metadata,{...structuredClone(reviewed.biomes[record.biome].find(s=>s.slot===record.slot)),bakedPhase:record.phase,errors:[],webglError:0}]));

test('preserved source archive and two external linear PNGs have reviewed hashes',async()=>{
 assert.equal(sha256(await fs.readFile('tools/sources/far-atlases/native-inputs.zip')),manifest.archiveSha256);
 assert.equal(Object.keys(manifest.entries).length,130);
 assert.equal(manifest.records.filter(r=>r.encoder==='sharp-lossless').length,42);
 const linear=manifest.records.filter(r=>r.encoder==='pillow-exact');assert.equal(linear.length,2);
 for(const r of linear)assert.equal(sha256(await fs.readFile(r.input)),r.inputSha256);
 assert.equal(sha256(await fs.readFile('public/content/far-vegetation.json')),manifest.publicManifestSha256);
});
test('current complete reviewed recipe admits exactly 44 phases',()=>assert.doesNotThrow(()=>admitReviewedAtlasSources(manifest,reviewed,metadata())));
test('missing/duplicate records and changed encoder/destination fail before output',()=>{
 for(const mutate of [m=>m.records.pop(),m=>m.records[0]=m.records[1],m=>m.records[0].encoder='pillow-exact',m=>m.records[0].publicPath='public/assets/other.webp']){
  const m=structuredClone(manifest);mutate(m);assert.throws(()=>admitReviewedAtlasSources(m,reviewed,metadata()));
 }
});
test('obsolete lighting, mismatched framing and absent alpha metadata fail admission',()=>{
 for(const mutate of [d=>d.sunPosition=[-30,55,25],d=>d.baseV+=.01,d=>delete d.prelitAlphaEncoding,d=>d.elevation.elevationDegrees=22,d=>d.viewResolution=256]){
  const m=metadata(),linear=manifest.records.find(r=>r.encoder==='pillow-exact');mutate(m[linear.metadata]);assert.throws(()=>admitReviewedAtlasSources(manifest,reviewed,m));
 }
});
test('native metadata ordering and sub-picometre serialization drift are explicit, not geometric changes',()=>{
 assert.equal(equivalentNativeFrame({min:[1,2],max:[3,4]},{max:[3+1e-14,4],min:[1,2]}),true);
 assert.equal(equivalentNativeFrame({min:[1,2],max:[3,4]},{max:[3+1e-8,4],min:[1,2]}),false);
 for(const value of [NaN,Infinity])assert.equal(equivalentNativeFrame(value,value),false);
 assert.equal(equivalentNativeFrame([1,2],[1]),false);
});
