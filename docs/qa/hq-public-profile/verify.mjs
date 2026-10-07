import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),receipt=JSON.parse(await readFile(new URL('receipt.json',base),'utf8'));
assert.equal(receipt.source,'32d546c159a4cdc48d334364110c7fb1c16f343d');
assert.equal(Object.keys(receipt.files).length,4);
for(const [name,hash] of Object.entries(receipt.files))assert.equal(createHash('sha256').update(await readFile(new URL(name,base))).digest('hex'),hash);
for(const phase of ['day','night']){
 const r=JSON.parse(await readFile(new URL(phase+'.json',base),'utf8'));
 assert.equal(r.runtimeHQ,true);assert.equal(r.phase,phase);assert.equal(r.yaw,275);assert.equal(r.cameraElevation,80);
 assert.equal(r.texture.url,'/assets/far-vegetation/canyons-hq-backdrop.webp');
 assert.equal(r.texture.samplers,1);assert.equal(r.texture.width,2048);assert.equal(r.texture.height,512);
 assert.equal(r.anchor[1],2.36);assert.deepEqual(r.drawingBuffer,[1280,720]);
 assert.deepEqual(r.errors,[]);assert.equal(r.glError,0);assert.equal(r.night,phase==='night'?1:0);
}
console.log('PASS: selected day/night public-profile receipts and screenshots verified.');
