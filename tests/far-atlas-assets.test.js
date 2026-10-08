import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {NATIVE_LIGHT_DIRECTION} from '../src/rendering/shadow-camera.js';
const manifest=JSON.parse(await fs.readFile('public/content/far-vegetation.json','utf8'));
test('offline atlases cover the native tree slots, preserve alpha and match both baked phases',async()=>{
 let bytes=0;
 for(const [biome,species] of Object.entries(manifest.biomes)){
  const pack=JSON.parse(await fs.readFile(`public/content/biome-${biome}.json`,'utf8')),binary=await fs.readFile('public'+pack.binary.url);
  assert.deepEqual(species.map(s=>s.slot),biome==='canyons'?[0,1]:[0,1,2,3]);
  for(const tree of species){
   assert.equal(tree.species,pack.assets[tree.slot].name);const position=pack.assets[tree.slot].lods[0].position,bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(let i=0;i<position.count;i++){const value=binary.readFloatLE(position.offset+i*4),axis=i%3;bounds.min[axis]=Math.min(bounds.min[axis],value);bounds.max[axis]=Math.max(bounds.max[axis],value);}for(const edge of ['min','max'])for(let axis=0;axis<3;axis++)assert.ok(Math.abs(tree.sourceBounds[edge][axis]-bounds[edge][axis])<1e-12);
   assert.equal(tree.bakedLod,2);assert.equal(tree.views,8);assert.equal(tree.rotationViews,8);assert.equal(tree.nativeSunDirection,true);assert.deepEqual(tree.sunPosition,manifest.sunPosition);const length=Math.hypot(...tree.sunPosition);for(let i=0;i<3;i++)assert.ok(Math.abs(tree.sunPosition[i]/length-NATIVE_LIGHT_DIRECTION.getComponent(i))<1e-12);
   for(const phase of ['day','night']){
    assert.match(tree[phase],/^\.\/assets\/far-vegetation\//);const file='public/'+tree[phase].slice(2),stat=await fs.stat(file),meta=await sharp(file).metadata();
    bytes+=stat.size;assert.equal(meta.width,1024);assert.equal(meta.height,1024);assert.equal(meta.hasAlpha,true);
    const data=await sharp(file).raw().toBuffer();let transparent=0,opaque=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++;else opaque++;}
    assert.ok(transparent>0);assert.ok(opaque>0);
   }
  }
 }
 assert.equal(bytes,manifest.totalTextureBytes);assert.ok(bytes<24*1024*1024);
});


test('runtime baobab uses the exact GPU-reviewed linear-alpha pair and explicit metadata',async()=>{
 const tree=manifest.biomes.savanna.find(t=>t.slot===2);assert.equal(tree.prelitAlphaEncoding,'srgb-encoded-linear-premultiplied');
 for(const phase of ['day','night'])assert.deepEqual(await fs.readFile('public/'+tree[phase].slice(2)),await fs.readFile('docs/qa/far-prelit-linear-alpha/'+phase+'-exact.webp'));
});
