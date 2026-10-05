// Experimental full-file ranges with precomputed header recipes; no duplicate stems.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readOggOpus,cropOpusWindow,opusWindowRecipe} from './ogg-opus-windows.mjs';
import {assembleOpusWindow} from '../src/audio/opus-window-recipe.js';
const sha=b=>createHash('sha256').update(b).digest('hex'),root=new URL('../',import.meta.url),out=new URL('../.cache/opus-recipes/',import.meta.url);
mkdirSync(out,{recursive:true});const conversion=JSON.parse(readFileSync(new URL('../.cache/opus-audit/report.json',import.meta.url)));assert.equal(conversion.status,'measured');
for(const pack of ['a','b']){
 const bank=JSON.parse(readFileSync(new URL(`public/content/music-${pack}.json`,root))),tracks=[];
 for(const track of bank.tracks.filter(t=>!t.silent)){
  const record=conversion.records.find(r=>r.source===track.data.url);assert.ok(record);
  const url=`/.cache/opus-audit/${record.sourceSha256}.opus`,encoded=readFileSync(new URL(url.slice(1),root));assert.equal(sha(encoded),record.opusSha256);
  const stream=readOggOpus(encoded);assert.equal(stream.decodedSamples,Math.round(bank.duration*48000));const windows=[];
  for(let start=0;start<stream.decodedSamples;start+=288000){
   const end=Math.min(stream.decodedSamples,start+288000),window=cropOpusWindow(stream,start,end),parts=opusWindowRecipe(stream,window);
   const bytes=encoded.subarray(parts.startByte,parts.endByte);assert.deepEqual(Buffer.from(assembleOpusWindow(bytes,parts.recipe)),window.bytes,'Recipe changed encoded window bytes');
   windows.push({startSample:start,endSample:end,firstSample:window.firstSample,decodedSamples:window.decodedSamples,...parts});
  }
  tracks.push({id:track.id,url,fullUrl:url,sha256:record.opusSha256,bytes:encoded.length,windows});
 }
 const index={version:4,codec:'ogg-opus-recipe',sampleRate:48000,supportedSampleRates:[44100,48000],secondsPerWindow:6,prerollPackets:30,pcmPrerollPackets:2,tailPackets:2,duration:bank.duration,tracks},text=JSON.stringify(index)+'\n';
 writeFileSync(new URL(`music-windows-${pack}.json`,out),text);console.log(JSON.stringify({pack,windows:tracks.reduce((n,t)=>n+t.windows.length,0),indexBytes:Buffer.byteLength(text),encodedBytes:tracks.reduce((n,t)=>n+t.bytes,0)}));
}
