import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNativeVfx,createVfxAtlasRects,packVfxSprites,MAX_SPRITES} from '../src/rendering/vfx-native.js';
import {bakeWebGpuCombatWindow} from '../src/rendering/webgpu-combat-samples.js';

const rects=createVfxAtlasRects(JSON.parse(readFileSync('public/content/vfx.json')),4096,2048),camera={eye:[4,3,8],forward:[-.4,-.2,-.8]};
for(const species of ['lion','hyena','rhino','buffalo','warthog'])test(`${species} samples preserve original topology, colors and sorted sprites and roll back native state`,()=>{
 const surface=(x,z)=>x*.07-z*.04,native=createNativeVfx(species,rects,{surface,worldLights:false,softParticleDepth:false});native.seek(1.1);
 const before=JSON.stringify({time:native.time,parts:native.parts,rigids:native.rigids,contacts:native.contacts}),sample=bakeWebGpuCombatWindow({native,rects,camera,seconds:.5});
 assert.equal(JSON.stringify({time:native.time,parts:native.parts,rigids:native.rigids,contacts:native.contacts}),before);
 const scratch=new Float32Array(MAX_SPRITES*25);for(let frame=0;frame<sample.frameCount;frame++){
  if(frame)native.advance(1/60);const packed=packVfxSprites(native.sprites(),rects,camera,scratch),geometry=native.geometry(),base=frame*sample.rows*sample.width*4;
  assert.equal(sample.data[base],packed.count);assert.equal(sample.data[base+1],geometry.length/11);
  for(let i=0;i<packed.count;i++)assert.deepEqual(sample.data.slice(base+4+i*28,base+4+i*28+25),packed.data.slice(i*25,i*25+25));
  for(let i=0;i<geometry.length/11;i++)assert.deepEqual(sample.data.slice(base+sample.geometryOffset*4+i*12,base+sample.geometryOffset*4+i*12+11),geometry.slice(i*11,i*11+11));
 }
});
