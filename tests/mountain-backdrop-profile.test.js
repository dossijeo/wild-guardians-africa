import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import sharp from 'sharp';
import {mountainBackdropProfile} from '../src/rendering/mountain-backdrop-profile.js';import {createMountainArcGeometry} from '../src/rendering/mountain-arcs.js';
const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
test('six public HQ atlases match pinned bytes and dimensions in a single bounded native renderable',async()=>{
 for(const biome of biomes){const p=mountainBackdropProfile(biome,712),bytes=await fs.readFile(new URL('../public/'+p.atlas,import.meta.url)),metadata=await sharp(bytes).metadata();assert.equal(bytes.length,p.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);assert.deepEqual(p.dimensions,[metadata.width,metadata.height]);assert.deepEqual(p.dimensions,[2048,512]);assert.equal(metadata.hasAlpha,true);assert.equal(p.stableAltitude,true);assert.equal(p.fogBaseMix,1);assert.equal(p.arcLayout.length,4);const geometry=createMountainArcGeometry(430,p.arcLayout);assert.equal(geometry.index.count,288);assert.equal(geometry.groups.length,0);geometry.dispose();}
});
test('profile retains procedural decorative orientation and returns independent layouts for string/numeric seeds',()=>{
 const a=mountainBackdropProfile('savanna',712);assert.deepEqual(a,mountainBackdropProfile('savanna','712'));assert.notDeepEqual(a.arcLayout,mountainBackdropProfile('savanna',713).arcLayout);assert.deepEqual(mountainBackdropProfile('savanna','one'),mountainBackdropProfile('savanna','one'));a.arcLayout[0].uv[0]=0;a.dimensions[0]=1;assert.notEqual(mountainBackdropProfile('savanna',712).arcLayout[0].uv[0],0);assert.equal(mountainBackdropProfile('savanna',712).dimensions[0],2048);
 for(const seed of [undefined,null,NaN,Infinity,{},true])assert.throws(()=>mountainBackdropProfile('savanna',seed),/seed/);assert.throws(()=>mountainBackdropProfile('unknown',712),/biome/);
 const d=mountainBackdropProfile('canyons',712).arcLayout[3];assert.ok(Math.abs(d.height-110)<1e-12);assert.equal(d.baseY,-35);
});
