import test from 'node:test';
import assert from 'node:assert/strict';
import {musicRangeReader} from '../src/audio/music-range-reader.js';
function cache(){const entries=new Map();return {async match(key){return entries.get(key)?.clone();},async put(key,response){entries.set(key,new Response(await response.blob()));}};}
const decoded=async bytes=>new TextDecoder().decode(bytes);
test('a compressed disk file supplies repeated windows without any network request',async()=>{
 const disk=cache();await disk.put('/music.mp3',new Response('0123456789'));
 const reader=musicRangeReader({caches:{open:async()=>disk},resolve:x=>x,fetch:async()=>{throw Error('offline');}});
 assert.equal(await decoded(await reader.readRange('/music.mp3',2,5)),'234');assert.equal(await decoded(await reader.readRange('/music.mp3',7,10)),'789');assert.deepEqual(reader.stats,{diskReads:2,networkReads:0});
});
test('concurrent first windows download and store the compressed file once',async()=>{
 const disk=cache(),reader=musicRangeReader({caches:{open:async()=>disk},resolve:x=>x,fetch:async()=>new Response('0123456789')});
 const windows=await Promise.all([reader.readRange('/music.mp3',0,3),reader.readRange('/music.mp3',6,9)]);
 assert.deepEqual(await Promise.all(windows.map(decoded)),['012','678']);assert.equal(reader.stats.networkReads,1);assert.equal(reader.stats.diskReads,2);
});
test('denied storage uses network ranges and does not require whole-track PCM',async()=>{
 const requests=[],reader=musicRangeReader({caches:{open:async()=>{throw Error('denied');}},resolve:x=>x,fetch:async(url,options)=>{requests.push(options.headers.Range);return new Response('345',{status:206,headers:{'Content-Range':'bytes 3-5/10'}});}});
 assert.equal(await decoded(await reader.readRange('/music.mp3',3,6)),'345');assert.deepEqual(requests,['bytes=3-5']);
});
test('quota failure returns the requested bytes and subsequent reads use HTTP ranges',async()=>{
 let requests=0;const reader=musicRangeReader({caches:{open:async()=>({match:async()=>undefined,put:async()=>{throw Error('quota');}})},resolve:x=>x,fetch:async(url,options)=>{requests++;return options?new Response('67',{status:206,headers:{'Content-Range':'bytes 6-7/10'}}):new Response('0123456789');}});
 assert.equal(await decoded(await reader.readRange('/music.mp3',1,3)),'12');assert.equal(await decoded(await reader.readRange('/music.mp3',6,8)),'67');assert.equal(requests,2);
});

test('storage becoming unreadable after open falls back to ranges without downloading a whole file',async()=>{
 let matches=0;const requests=[],reader=musicRangeReader({caches:{open:async()=>({match:async()=>{matches++;throw Error('storage unavailable');},put:async()=>{throw Error('must not write');}})},resolve:x=>x,fetch:async(url,options)=>{requests.push(options.headers.Range);return new Response('345',{status:206,headers:{'Content-Range':'bytes 3-5/10'}});}});
 assert.equal(await decoded(await reader.readRange('/music.mp3',3,6)),'345');
 assert.equal(await decoded(await reader.readRange('/music.mp3',3,6)),'345');
 assert.equal(matches,1);assert.deepEqual(requests,['bytes=3-5','bytes=3-5']);assert.deepEqual(reader.stats,{diskReads:0,networkReads:2});
});

test('storage becoming unreadable after the first fill falls back and stays disabled',async()=>{
 let matches=0;const requests=[],reader=musicRangeReader({caches:{open:async()=>({match:async()=>{if(++matches===1)return undefined;throw Error('read revoked');},put:async()=>{}})},resolve:x=>x,fetch:async(url,options)=>{requests.push(options?.headers.Range??'full');return options?new Response('67',{status:206,headers:{'Content-Range':'bytes 6-7/10'}}):new Response('0123456789');}});
 assert.equal(await decoded(await reader.readRange('/music.mp3',6,8)),'67');
 assert.equal(await decoded(await reader.readRange('/music.mp3',6,8)),'67');
 assert.equal(matches,2);assert.deepEqual(requests,['full','bytes=6-7','bytes=6-7']);
});

test('quota fallback rejects a truncated original file before handing bytes to the decoder',async()=>{
 const reader=musicRangeReader({caches:{open:async()=>({match:async()=>undefined,put:async()=>{throw Error('quota');}})},resolve:x=>x,fetch:async()=>new Response('short')});
 await assert.rejects(reader.readRange('/music.mp3',3,10),/truncated/);
});
test('incorrect ranges and truncated cached files are rejected before decoding',async()=>{
 const reader=musicRangeReader({caches:undefined,resolve:x=>x,fetch:async()=>new Response('345',{status:206,headers:{'Content-Range':'bytes 4-6/10'}})});await assert.rejects(reader.readRange('/music.mp3',3,6),/index/);
 const disk=cache();await disk.put('/music.mp3',new Response('short'));const fromDisk=musicRangeReader({caches:{open:async()=>disk},resolve:x=>x});await assert.rejects(fromDisk.readRange('/music.mp3',3,10),/truncated/);
});
