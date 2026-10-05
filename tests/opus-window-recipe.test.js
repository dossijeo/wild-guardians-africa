import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readOggOpus,cropOpusWindow,opusWindowRecipe} from '../tools/ogg-opus-windows.mjs';
import {assembleOpusWindow} from '../src/audio/opus-window-recipe.js';
import {MusicWindowPool} from '../src/audio/music-window-pool.js';
const raw=readFileSync(new URL('./fixtures/opus-window-source.opus',import.meta.url)),stream=readOggOpus(raw);
test('partial full-file recipes reconstruct the already validated Ogg windows byte for byte',()=>{
 for(const start of [0,288000,576000]){
  const cropped=cropOpusWindow(stream,start,Math.min(stream.decodedSamples,start+288000)),entry=opusWindowRecipe(stream,cropped);
  const data=raw.subarray(entry.startByte,entry.endByte),assembled=Buffer.from(assembleOpusWindow(data,entry.recipe));
  assert.deepEqual(assembled,cropped.bytes);assert.equal(readOggOpus(assembled).decodedSamples,cropped.decodedSamples);
  assert.ok(data.length<raw.length);assert.ok(entry.recipe.chunks.some(c=>c.ranges.length>0));
 }
});
test('truncated input, corrupt data, oversized allocation and inconsistent recipes cannot silently reach decode',()=>{
 const cropped=cropOpusWindow(stream,288000,576000),entry=opusWindowRecipe(stream,cropped),data=raw.subarray(entry.startByte,entry.endByte);
 assert.throws(()=>assembleOpusWindow(data.subarray(0,data.length-1),entry.recipe));
 const corrupt=Buffer.from(data);corrupt[0]^=1;assert.throws(()=>readOggOpus(Buffer.from(assembleOpusWindow(corrupt,entry.recipe))));
 for(const change of [{bytes:2097153},{bytes:entry.recipe.bytes+1},{chunks:[]}])assert.throws(()=>assembleOpusWindow(data,{...entry.recipe,...change}));
 const invalid=structuredClone(entry.recipe);invalid.chunks.find(c=>c.ranges.length).ranges[0][0]=-1;assert.throws(()=>assembleOpusWindow(data,invalid));
});
test('pool reads only requested original-file bytes and passes the reconstructed Opus to native decode',async()=>{
 const cropped=cropOpusWindow(stream,288000,576000),recipe=opusWindowRecipe(stream,cropped),entry={startSample:288000,endSample:576000,firstSample:cropped.firstSample,decodedSamples:cropped.decodedSamples,...recipe};
 const reads=[];let decodes=0;const pool=new MusicWindowPool({sampleRate:48000,duration:12,secondsPerWindow:6,tracks:[{id:'audible',url:'full.opus',windows:[null,entry]},{id:'silent',url:'other.opus',windows:[null,entry]}]},
  {readRange:async(url,start,end)=>{reads.push([url,start,end]);return raw.subarray(start,end);},decode:async(encoded)=>{decodes++;assert.deepEqual(Buffer.from(encoded),cropped.bytes);return {sampleRate:48000,numberOfChannels:2,length:cropped.decodedSamples};}});
 await pool.load('audible',1);assert.equal(decodes,1);assert.deepEqual(reads,[['full.opus',entry.startByte,entry.endByte]]);assert.equal(pool.ready.has('silent:1'),false);pool.dispose();assert.equal(pool.pcmBytes(),0);
});
