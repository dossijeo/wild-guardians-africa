// Experimental only: reuse encoded Opus packets, never transcode windows again.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readOggOpus,cropOpusWindow} from './ogg-opus-windows.mjs';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex'),root=new URL('../',import.meta.url),out=new URL('../.cache/opus-windows/',import.meta.url);
mkdirSync(out,{recursive:true});const conversion=JSON.parse(readFileSync(new URL('report.json',new URL('../.cache/opus-audit/',import.meta.url))));assert.equal(conversion.status,'measured');
for(const pack of ['a','b']){
 const bank=JSON.parse(readFileSync(new URL(`public/content/music-${pack}.json`,root))),tracks=[];
 for(const track of bank.tracks.filter(t=>!t.silent)){
  const record=conversion.records.find(r=>r.source===track.data.url);assert.ok(record&&record.channels===2);
  const encoded=readFileSync(new URL(`../.cache/opus-audit/${record.sourceSha256}.opus`,import.meta.url));assert.equal(sha(encoded),record.opusSha256);
  const stream=readOggOpus(encoded);assert.equal(stream.decodedSamples,Math.round(bank.duration*48000));
  const chunks=[],windows=[];let byte=0;
  for(let start=0;start<stream.decodedSamples;start+=288000){
   const end=Math.min(stream.decodedSamples,start+288000),window=cropOpusWindow(stream,start,end);
   const parsed=readOggOpus(window.bytes);assert.equal(parsed.decodedSamples,window.decodedSamples);
   windows.push({startSample:start,endSample:end,firstSample:window.firstSample,decodedSamples:window.decodedSamples,startByte:byte,endByte:byte+window.bytes.length,preSkip:window.preSkip});
   chunks.push(window.bytes);byte+=window.bytes.length;
  }
  const bytes=Buffer.concat(chunks),file=`${pack}-${track.id}-${sha(bytes)}.bin`;writeFileSync(new URL(file,out),bytes);
  tracks.push({id:track.id,url:`/.cache/opus-windows/${file}`,fullUrl:`/.cache/opus-audit/${record.sourceSha256}.opus`,sha256:sha(bytes),bytes:bytes.length,fullBytes:encoded.length,windows});
 }
 const index={version:3,codec:'ogg-opus',sampleRate:48000,supportedSampleRates:[44100,48000],secondsPerWindow:6,prerollPackets:30,pcmPrerollPackets:2,tailPackets:2,duration:bank.duration,tracks};
 writeFileSync(new URL(`music-windows-${pack}.json`,out),JSON.stringify(index)+'\n');console.log(JSON.stringify({pack,tracks:tracks.length,windows:tracks.reduce((n,t)=>n+t.windows.length,0),bytes:tracks.reduce((n,t)=>n+t.bytes,0),fullBytes:tracks.reduce((n,t)=>n+t.fullBytes,0)}));
}
