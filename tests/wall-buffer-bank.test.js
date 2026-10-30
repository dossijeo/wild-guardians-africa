import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {packWallBuffers} from '../tools/pack-wall-buffers.mjs';
test('wall bank retains every installed geometry and destruction byte',()=>{
 const pack=JSON.parse(fs.readFileSync('public/content/walls.json')),before=JSON.stringify(pack),read=url=>fs.readFileSync('public/'+url.replace(/^\//,''));
 const {binary,ranges}=packWallBuffers(pack,read);assert.ok(ranges.length>70);assert.equal(JSON.stringify(pack),before);
 let end=0;for(const r of ranges){assert.equal(r.offset%4,0);assert.ok(r.offset>=end);assert.deepEqual(binary.subarray(r.offset,r.offset+r.byteLength),read(r.url));end=r.offset+r.byteLength;}
 assert.ok(binary.length-end<4);
});
