import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {packWallBuffers} from '../tools/pack-wall-buffers.mjs';
test('wall bank retains every installed geometry and destruction byte',()=>{
 const pack=JSON.parse(fs.readFileSync('public/content/walls.json')),before=JSON.stringify(pack),read=url=>fs.readFileSync('public/'+url.replace(/^\//,''));
 const {binary,ranges}=packWallBuffers(pack,read);assert.ok(ranges.length>70);assert.equal(JSON.stringify(pack),before);
 let end=0;for(const r of ranges){assert.equal(r.offset%4,0);assert.ok(r.offset>=end);assert.deepEqual(binary.subarray(r.offset,r.offset+r.byteLength),read(r.url));end=r.offset+r.byteLength;}
 assert.ok(binary.length-end<4);
});
test('vertex-color sidecar validates packed wall UVs without retaining removed buffer paths',()=>{
 const pack=JSON.parse(fs.readFileSync('public/content/walls.json')),manifest=JSON.parse(fs.readFileSync('public/content/structure-preview/walls-zarzas.json')),read=url=>fs.readFileSync('public/'+url.replace(/^\//,'')),{binary,ranges}=packWallBuffers(pack,read),byUrl=new Map(ranges.map(range=>[range.url,range]));
 for(const [key,record] of Object.entries(manifest.records)){const range=byUrl.get(pack.pieces[key].uv.url);assert.ok(range);const uv=binary.subarray(range.offset,range.offset+range.byteLength);assert.equal(createHash('sha256').update(uv).digest('hex'),record.uvSha256);assert.equal(uv.length,record.count*8);}
 const text=JSON.stringify(manifest);for(const range of ranges)assert.equal(text.includes(range.url.split('/').at(-1)),false);
});
