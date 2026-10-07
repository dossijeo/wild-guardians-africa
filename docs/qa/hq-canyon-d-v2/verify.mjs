import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url);
const receipt=JSON.parse(await readFile(new URL('receipt.json',base),'utf8'));
assert.equal(receipt.source,'1f9acab559777905a25c00f28e9038c3872282be');
assert.equal(Object.keys(receipt.files).length,8);
for(const [name,hash] of Object.entries(receipt.files)){
  const bytes=await readFile(new URL(name,base));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);
}
for(const height of [80,120])for(const phase of ['day','night']){
  const data=JSON.parse(await readFile(new URL(`canyon-d-${height}-${phase}.json`,base),'utf8'));
  assert.equal(data.cameraElevation,height);assert.equal(data.phase,phase);
  assert.equal(data.yaw,275);assert.equal(data.anchor[1],2.36);
  assert.deepEqual(data.errors,[]);assert.equal(data.glError,0);
  assert.deepEqual(data.drawingBuffer,[1280,720]);
  assert.equal(data.texture.width,2048);assert.equal(data.texture.height,512);
  assert.equal(data.texture.samplers,1);assert.equal(data.night,phase==='night'?1:0);
  assert.equal(data.arcStableAltitude,true);assert.equal(data.arcCells,4);
}
console.log('PASS: four original receipts and screenshots verified; selected-pose scope only.');
