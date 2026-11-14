import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),catalogue=JSON.parse(readFileSync('public/content/villages.json','utf8'));
test('all village previews match authored geometry, source atlas and WebGPU-aligned colors',()=>{
 for(const village of catalogue){const m=JSON.parse(readFileSync(`public/content/structure-preview/village-${village.id}.json`,'utf8')),source=readFileSync('public'+village.binary.url),atlas=readFileSync('public'+village.textures.color),preview=readFileSync('public'+m.binary);assert.equal(m.culture,village.id);assert.equal(m.texture,village.textures.color);assert.equal(m.sourceSha256,hash(source));assert.equal(m.textureSha256,hash(atlas));assert.equal(m.sha256,hash(preview));assert.equal(m.vertices,village.vertexCount);assert.equal(m.bytes,preview.length);assert.equal(preview.length,village.vertexCount*4);for(let i=3;i<preview.length;i+=4)assert.equal(preview[i],255);}
});
