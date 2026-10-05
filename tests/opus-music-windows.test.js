import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readOggOpus,cropOpusWindow,opusPacketSamples} from '../tools/ogg-opus-windows.mjs';
const raw=readFileSync(new URL('./fixtures/opus-window-source.opus',import.meta.url));
const stream=readOggOpus(raw);
test('real Opus crop keeps encoded packets, 48/44.1 kHz alignment and sufficient decoder history',()=>{
 for(const start of [0,288000,576000]){
  const end=Math.min(stream.decodedSamples,start+288000),cropped=cropOpusWindow(stream,start,end),parsed=readOggOpus(cropped.bytes);
  assert.deepEqual(parsed.audio,stream.audio.slice(cropped.firstPacket,cropped.lastPacket));
  assert.equal(parsed.head[9],2);assert.equal(parsed.head.readInt16LE(16),stream.head.readInt16LE(16));
  assert.equal(parsed.decodedSamples,cropped.decodedSamples);
  assert.equal(cropped.firstPacket*960+cropped.preSkip-stream.preSkip,cropped.firstSample);
  assert.equal(cropped.firstSample*44100%48000,0);
  assert.ok(cropped.decodedSamples>=end-cropped.firstSample);
  if(cropped.firstPacket>0)assert.ok(cropped.preSkip>=3840);
  if(end===stream.decodedSamples)assert.equal(cropped.firstSample+cropped.decodedSamples,stream.decodedSamples);
 }
});
test('damaged CRC, truncation, missing end and chained streams are rejected',()=>{
 const corrupt=Buffer.from(raw);corrupt[corrupt.length-1]^=1;
 for(const bytes of [corrupt,raw.subarray(0,20),raw.subarray(0,raw.length-1),Buffer.concat([raw,raw])])assert.throws(()=>readOggOpus(bytes));
});
test('invalid crop ranges or insufficient history never produce a candidate',()=>{
 for(const [start,end] of [[-1,2],[1.5,20],[20,20],[20,stream.decodedSamples+1]])assert.throws(()=>cropOpusWindow(stream,start,end));
 assert.throws(()=>cropOpusWindow(stream,288000,400000,{prerollPackets:3}));
 assert.throws(()=>cropOpusWindow({...stream,samples:[480]},0,100));
});
test('TOC duration includes multi-frame packets and rejects invalid frame counts',()=>{
 assert.equal(opusPacketSamples(Buffer.from([19<<3])),960);
 assert.equal(opusPacketSamples(Buffer.from([(19<<3)|1])),1920);
 assert.equal(opusPacketSamples(Buffer.from([(19<<3)|3,3])),2880);
 assert.throws(()=>opusPacketSamples(Buffer.alloc(0)));
 assert.throws(()=>opusPacketSamples(Buffer.from([(19<<3)|3,0])));
 assert.throws(()=>opusPacketSamples(Buffer.from([(19<<3)|3,7])));
});
