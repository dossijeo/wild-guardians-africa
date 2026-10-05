import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicWindowPool} from '../src/audio/music-window-pool.js';
const entry=(n)=>({startSample:n*288000,endSample:(n+1)*288000,firstSample:n*288000,decodedSamples:288000,startByte:n*100,endByte:(n+1)*100});
const index={sampleRate:48000,secondsPerWindow:6,duration:18,tracks:Array.from({length:10},(_,i)=>({id:'s'+i,url:'track'+i,windows:[entry(0),entry(1),entry(2)]}))};
const buffer=()=>({length:288000,sampleRate:48000,numberOfChannels:2});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('only the requested audible stems and short byte ranges are read and decoded',async()=>{
  const reads=[],pool=new MusicWindowPool(index,{readRange:async(...range)=>{reads.push(range);return {};},decode:async()=>buffer()});
  await Promise.all(['s0','s2','s4'].map(id=>pool.load(id,1)));
  assert.deepEqual(reads,[['track0',100,200],['track2',100,200],['track4',100,200]]);
  assert.equal(pool.pcmBytes(),3*288000*2*4);assert.equal(pool.at('s7',10).window,1);assert.equal(pool.pending.has('s7:1'),false);
  pool.retain(['s2:1']);assert.equal(pool.pcmBytes(),288000*2*4);pool.dispose();assert.equal(pool.pcmBytes(),0);
});
test('duplicate prefetches coalesce and failed decoding is retryable',async()=>{
  let reads=0,fail=true;const pool=new MusicWindowPool(index,{readRange:async()=>{reads++;return {};},decode:async()=>{if(fail)throw Error('decode');return buffer();}});
  await assert.rejects(Promise.all([pool.load('s0',0),pool.load('s0',0)]),/decode/);assert.equal(reads,1);
  fail=false;await pool.load('s0',0);assert.equal(reads,2);assert.equal(pool.ready.size,1);
});
test('evicting an in-flight range prevents obsolete PCM decoding',async()=>{
  let finish,decoded=0;const pool=new MusicWindowPool(index,{readRange:()=>new Promise(resolve=>{finish=resolve;}),decode:async()=>{decoded++;return buffer();}});
  const old=pool.load('s0',0);await settle();pool.retain([]);finish({});assert.equal(await old,null);assert.equal(decoded,0);assert.equal(pool.pcmBytes(),0);
});
test('decodes already in progress do not reappear after window eviction or disposal',async()=>{
  let finish;const pool=new MusicWindowPool(index,{readRange:async()=>({}),decode:()=>new Promise(resolve=>{finish=resolve;})});
  const old=pool.load('s0',0);await settle();pool.dispose();finish(buffer());assert.equal(await old,null);assert.equal(pool.ready.size,0);
});
test('invalid decoder lengths, channels and unvalidated resampling cannot silently shift the music clock',async()=>{
  assert.throws(()=>new MusicWindowPool(index,{sampleRate:44100}),/sample rate/);
  for(const invalid of [{...buffer(),length:288001},{...buffer(),sampleRate:44100},{...buffer(),numberOfChannels:1}]){
    const pool=new MusicWindowPool(index,{readRange:async()=>({}),decode:async()=>invalid});await assert.rejects(pool.load('s0',0),/source index/);assert.equal(pool.pcmBytes(),0);
  }
});
