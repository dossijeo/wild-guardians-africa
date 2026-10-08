import test from 'node:test';
import assert from 'node:assert/strict';
import {mountainProfileImageReferences,requireUnpinnedImageAlias} from '../tools/audit_image_assets.mjs';
import {requireTinifyColorInput} from '../tools/tinify-color-policy.mjs';
const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
const profiles=()=>Object.fromEntries(biomes.map(b=>[b,{atlas:`assets/far-vegetation/${b}-hq-backdrop.webp`,bytes:700000,sha256:'a'.repeat(64),dimensions:[2048,512]}]));
const module=p=>`const atlases=${JSON.stringify(p,null,2)};\nexport function mountainBackdropProfile(){}`;
test('all six contracted mountain atlases are classified without enabling Tinify or aliases',async()=>{
 const refs=mountainProfileImageReferences(module(profiles()));assert.equal(refs.length,6);
 for(const {path,reference} of refs){
  assert.ok(path.endsWith('-hq-backdrop.webp'));assert.equal(reference.role,'color-atlas');
  assert.equal(reference.encodedContract,true);
  assert.throws(()=>requireUnpinnedImageAlias([reference]),/regenerated export contract/);
  // Reject before even inspecting/uploading bytes, including an incorrect
  // exact-pixel flag from a caller: the role alone still prevents conversion.
  await assert.rejects(requireTinifyColorInput({distributed:true,requiresExactPixels:false,roles:[reference.role]},Buffer.alloc(0)),/reviewed distributed color/);
 }
 assert.doesNotThrow(()=>requireUnpinnedImageAlias([{role:'color'}]));
 assert.doesNotThrow(()=>requireUnpinnedImageAlias([{role:'data'}]));
});
test('unknown biome, path, hash, dimensions and generated dictionary changes require review',()=>{
 for(const mutate of [p=>delete p.desert,p=>p.unknown={},p=>p.desert.atlas='assets/unknown.webp',p=>p.desert.sha256='bad',p=>p.desert.dimensions=[4096,512],p=>p.desert.bytes=0]){
  const p=profiles();mutate(p);assert.throws(()=>mountainProfileImageReferences(module(p)),/requires? review/);
 }
 assert.throws(()=>mountainProfileImageReferences('const atlases=loadSomething();'),/requires review/);
});
