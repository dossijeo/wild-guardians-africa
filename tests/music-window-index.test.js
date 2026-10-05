import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
for(const pack of ['a','b'])test(`${pack}: every indexed window references the unchanged original MP3 and covers the full musical timeline`,()=>{
 const bank=JSON.parse(readFileSync(new URL(`../public/content/music-${pack}.json`,import.meta.url)));
 const index=JSON.parse(readFileSync(new URL(`../public/content/music-windows-${pack}.json`,import.meta.url)));
 assert.equal(index.duration,bank.duration);assert.equal(index.sampleRate,48000);assert.equal(index.tracks.length,bank.tracks.filter(t=>!t.silent).length);
 for(const track of index.tracks){
  const original=bank.tracks.find(t=>t.id===track.id);assert.equal(track.url,original.data.url);
  assert.match(track.url,/^\/assets\/[a-f0-9]{64}\.mp3$/);
  const data=readFileSync(new URL('../public'+track.url,import.meta.url));assert.equal(data.length,track.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),track.sha256);
  let cursor=0;
  for(const window of track.windows){
   assert.equal(window.startSample,cursor);assert.ok(window.endSample>cursor);assert.ok(window.endSample-window.startSample<=6*48000);
   assert.ok(window.firstSample<=window.startSample);assert.ok(window.startSample-window.firstSample<=24*1152);
   assert.ok(window.decodedSamples>=window.endSample-window.firstSample);assert.ok(window.decodedSamples-(window.endSample-window.firstSample)<=2*1152);
   assert.ok(window.startByte>=0&&window.endByte>window.startByte&&window.endByte<=data.length);cursor=window.endSample;
  }
  assert.equal(cursor,Math.round(bank.duration*48000));
 }
});
