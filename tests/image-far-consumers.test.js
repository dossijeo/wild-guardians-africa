import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {farAtlasImageReferences,loadingOrnamentImageReferences,requireUnpinnedImageAlias} from '../tools/audit_image_assets.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('public/content/far-vegetation.json')),consumer=read('src/rendering/far-vegetation.js');

test('actual six-biome day/night atlases and fallback backgrounds retain their baked contracts',()=>{
 const refs=farAtlasImageReferences(manifest,consumer);
 assert.equal(refs.length,50);assert.equal(new Set(refs.map(r=>r.path)).size,50);
 for(const {path,reference} of refs){
  assert.ok(readFileSync(new URL('../public/'+path,import.meta.url)).length>0);
  assert.equal(reference.role,'color-atlas');assert.equal(reference.requiresAtlasExport,true);
  assert.throws(()=>requireUnpinnedImageAlias([reference]),/Pinned atlas/);
 }
});

test('unknown atlas phases, unsafe paths, duplicate slots and changed consumers fail closed',()=>{
 for(const mutate of [m=>m.views=4,m=>delete m.biomes.desert,m=>m.biomes.savanna[0].day='../other.webp',m=>m.biomes.savanna.push(m.biomes.savanna[0])]){
  const changed=structuredClone(manifest);mutate(changed);assert.throws(()=>farAtlasImageReferences(changed,consumer),/requires review/);
 }
 assert.throws(()=>farAtlasImageReferences(manifest,''),/consumer requires review/);
});

test('loading frame is classified from its real image consumer without making arbitrary script URLs safe',()=>{
 const refs=loadingOrnamentImageReferences(read('src/ui/loading-ornament-loader.js'));
 assert.deepEqual(refs.map(r=>r.path),['assets/ui/loading-ornament-v2.webp']);assert.equal(refs[0].reference.role,'color');
 assert.throws(()=>loadingOrnamentImageReferences("const normal='/assets/ui/loading-ornament-v2.webp'"),/requires review/);
});
