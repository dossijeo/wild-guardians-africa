import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readOggOpus} from './ogg-opus-windows.mjs';
import {assetUrl} from '../src/rendering/asset-url.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=json('content/manifests/sfx-runtime.json');assert.equal(manifest.records.length,129);assert.equal(new Set(manifest.records.map(r=>r.runtime)).size,129);
for(const r of manifest.records){
 const original=read('public/'+r.source),runtime=read('public/'+r.runtime);
 assert.equal(sha(original),r.sourceSha256);assert.equal(sha(runtime),r.runtimeSha256);assert.equal(original.length,r.beforeBytes);assert.equal(runtime.length,r.afterBytes);
 assert.equal(assetUrl('/'+r.source),'/'+r.runtime);
 if(r.kind==='sfx'){const ogg=readOggOpus(runtime);assert.equal(ogg.decodedSamples,r.samples48000);}
}
const source=json('public/content/sfx.json'),game=json('public/content/sfx-opus.json'),lab=json('public/library/sfx/bankData-opus.json'),routing=json('public/content/sfx-routing-opus.json');
assert.equal(game.items.length,126);assert.equal(lab.items.length,126);assert.equal(lab.manifest.items.length,126);assert.equal(routing.items.length,126);
for(const item of game.items){
 const original=source.items.find(o=>o.id===item.id),preview=lab.items.find(o=>o.id===item.id),meta=lab.manifest.items.find(o=>o.id===item.id),route=routing.items.find(o=>o.id===item.id),bytes=read('public'+item.audio.url),ogg=readOggOpus(bytes);
 assert.equal(item.filename,original.filename.replace(/\.mp3$/,'.opus'));assert.equal(item.bytes,bytes.length);assert.equal(item.sha256,sha(bytes));assert.equal(item.duration,ogg.decodedSamples/48000);
 assert.equal(item.normalizedSource.sha256,original.sha256);assert.equal(item.normalizedSource.bytes,original.bytes);assert.equal(item.normalizedSource.filename,original.filename);
 assert.equal(item.loop,original.loop);assert.deepEqual(item.waveform,original.waveform);assert.equal(item.number,original.number);
 assert.deepEqual(item,preview);assert.equal(meta.sha256,item.sha256);assert.equal(meta.bytes,item.bytes);assert.equal(meta.file,'audio/'+item.filename);assert.equal(meta.mime_type,'audio/ogg');assert.equal(meta.samples48000,ogg.decodedSamples);
 assert.equal(route.sha256,item.sha256);assert.equal(route.filename,item.filename);assert.equal(item.runtimeFormat.sampleRate,48000);
}
assert.equal(lab.original_audit_csv,json('public/library/sfx/bankData.json').audit_csv);
console.log(JSON.stringify({sfx:126,metadataFiles:3,hashesAndExportsValid:true,sourceBytes:manifest.records.reduce((n,r)=>n+r.beforeBytes,0),runtimeBytes:manifest.records.reduce((n,r)=>n+r.afterBytes,0)}));
