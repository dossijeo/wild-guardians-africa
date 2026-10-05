import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioSystem} from '../src/audio/audio.js';
import {MusicWindowTransport} from '../src/audio/music-window-transport.js';
import {MusicTransport} from '../src/audio/music-transport.js';
const banks=Object.fromEntries(['a','b'].map(pack=>[pack,JSON.parse(readFileSync(new URL(`../public/content/music-${pack}.json`,import.meta.url)))]));
const indices=Object.fromEntries(['a','b'].map(pack=>[pack,JSON.parse(readFileSync(new URL(`../public/content/music-windows-${pack}.json`,import.meta.url)))]));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture({read,decode,rate=48000}={}){
 const reads=[],decoded=[],fullReads=[],sources=[];
 const audio=new AudioSystem({sfx:0,music:0},{json:async url=>{
  const pack=url.includes('-a')?'a':'b';return url.includes('windows')?indices[pack]:banks[pack];
 },bytes:async url=>{fullReads.push(url);return {full:true,url};},musicReader:{readRange:async(url,start)=>{
  const pack=indices.a.tracks.some(t=>t.url===url)?'a':'b',track=indices[pack].tracks.find(t=>t.url===url),entry=track.windows.find(w=>w.startByte===start);
  const item={pack,id:track.id,entry};reads.push(item);await read?.(item);return item;
 }}});
 audio.context={state:'running',sampleRate:rate,currentTime:1,
  createGain:()=>({gain:{value:1,setValueAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),
  createBufferSource:()=>{const source={playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};sources.push(source);return source;},
  async decodeAudioData(item){decoded.push(item);await decode?.(item);return item.full?item:{length:item.entry.decodedSamples,sampleRate:48000,numberOfChannels:2};}
 };
 audio.sfx={items:[]};audio.musicGain={};return {audio,reads,decoded,fullReads,sources};
}
test('production gameplay selects short windows, keeps silent tracks logical and releases old pack PCM',async()=>{
 const {audio,reads,fullReads}=fixture();
 await audio.gameplay(1);assert.ok(audio.transport instanceof MusicWindowTransport);
 assert.equal(reads.length,8);assert.ok(reads.every(r=>!['s5','s7'].includes(r.id)));
 assert.equal(audio.buffers.size,0);assert.equal(fullReads.length,0);assert.ok(audio.musicWindowPool.pcmBytes()<20*1024*1024);
 const old=audio.musicWindowPool;audio.updateMusic({day:1,time:0,workers:[],spells:[]});assert.equal(audio.active.length,8);
 await audio.gameplay(2);assert.equal(old.pcmBytes(),0);assert.equal(old.disposed,true);
 assert.ok(reads.filter(r=>r.pack==='b').every(r=>!['s0','s6'].includes(r.id)));
 audio.stop();assert.equal(audio.active.length,0);assert.equal(audio.musicWindowPool,null);
});
test('a scene change during initial loading primes the new audible group before starting its clock',async()=>{
 const wait=deferred();let hold=true;
 const {audio,reads}=fixture({read:()=>hold?wait.promise:undefined});audio.musicScene='minimal';
 const pending=audio.gameplay(2);await settle();assert.equal(reads.length,2);assert.equal(audio.transport,null);
 audio.musicScene='day';hold=false;wait.resolve();await pending;
 assert.equal(reads.length,8);assert.ok(audio.transport instanceof MusicWindowTransport);assert.equal(audio.transport.scene,'day');audio.stop();
});
test('replacing a pack skips obsolete queued windows and shares the global two-job decoder limit',async()=>{
 const wait=deferred();let active=0,peak=0;
 const {audio,reads,decoded}=fixture({read:item=>item.pack==='a'?wait.promise:undefined,decode:async()=>{peak=Math.max(peak,++active);await settle();active--;}});
 const a=audio.gameplay(1);await settle();const old=audio.musicWindowPool;assert.equal(reads.length,2);
 const b=audio.gameplay(2);await settle();assert.equal(reads.length,2);wait.resolve();await Promise.all([a,b]);
 assert.equal(reads.filter(r=>r.pack==='a').length,2);assert.equal(decoded.filter(r=>r.pack==='a').length,0);assert.equal(peak,2);
 assert.equal(old.pcmBytes(),0);assert.equal(audio.pack,'b');assert.ok(audio.transport instanceof MusicWindowTransport);audio.stop();
});
test('leaving or suspending during a short decode cannot start stale music or retain its windows',async()=>{
 for(const leaving of [true,false]){
  const wait=deferred();const {audio,sources}=fixture({decode:()=>wait.promise});
  const pending=audio.gameplay(1);await settle();const pool=audio.musicWindowPool;
  if(leaving)audio.stop();else audio.context.state='suspended';wait.resolve();await pending;
  assert.equal(audio.pack,null);assert.equal(pool.pcmBytes(),0);assert.equal(pool.disposed,true);assert.equal(sources.length,0);
 }
});
test('an unvalidated sample rate preserves the original source transport',async()=>{
 const {audio,reads,fullReads}=fixture({rate:44100});await audio.gameplay(1);
 assert.equal(audio.transport.constructor,MusicTransport);assert.equal(reads.length,0);assert.equal(fullReads.length,10);assert.equal(audio.musicWindowPool,null);audio.stop();
});
