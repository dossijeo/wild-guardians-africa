// Audit original provenance and the single distributed musical representation.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readOggOpus,cropOpusWindow} from './ogg-opus-windows.mjs';
import {assembleOpusWindow} from '../src/audio/opus-window-recipe.js';
import {assetUrl} from '../src/rendering/asset-url.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL('public/'+p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('content/manifests/audio-runtime.json',root)));assert.equal(manifest.records.length,23);
assert.equal(new Set(manifest.records.map(r=>r.runtime)).size,23);
for(const record of manifest.records){
 assert.equal(sha(read(record.source)),record.sourceSha256);assert.equal(sha(read(record.runtime)),record.runtimeSha256);
 assert.equal(read(record.source).length,record.beforeBytes);assert.equal(read(record.runtime).length,record.afterBytes);
 assert.equal(assetUrl('/'+record.source),'/'+record.runtime);
}
let windows=0;
for(const pack of ['a','b']){
 const bank=JSON.parse(read(`content/music-${pack}.json`)),index=JSON.parse(read(`content/music-opus-windows-${pack}.json`));
 assert.equal(index.codec,'ogg-opus-recipe');assert.equal(index.duration,bank.duration);assert.deepEqual(index.supportedSampleRates,[44100,48000]);assert.equal(index.tracks.length,bank.tracks.filter(t=>!t.silent).length);
 for(const track of index.tracks){
  const original=bank.tracks.find(t=>t.id===track.id);assert.equal(track.url,assetUrl(original.data.url));assert.equal(track.fullUrl,track.url);
  const data=read(track.url.slice(1)),stream=readOggOpus(data);assert.equal(sha(data),track.sha256);assert.equal(stream.decodedSamples,Math.round(bank.duration*48000));let cursor=0;
  for(const window of track.windows){
   assert.equal(window.startSample,cursor);assert.equal(window.firstSample*44100%48000,0);
   const range=data.subarray(window.startByte,window.endByte),reconstructed=Buffer.from(assembleOpusWindow(range,window.recipe));
   assert.deepEqual(reconstructed,cropOpusWindow(stream,window.startSample,window.endSample).bytes);assert.equal(readOggOpus(reconstructed).decodedSamples,window.decodedSamples);
   cursor=window.endSample;windows++;
  }
  assert.equal(cursor,stream.decodedSamples);
 }
}
const source=manifest.records.reduce((n,r)=>n+r.beforeBytes,0),runtime=manifest.records.reduce((n,r)=>n+r.afterBytes,0);
console.log(JSON.stringify({musicFiles:21,indexFiles:2,windows,sourceBytes:source,runtimeBytes:runtime,savedBytes:source-runtime,sourceHashesValid:true,singleFileForWindowsAndCompatibility:true}));
