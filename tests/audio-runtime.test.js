import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assetUrl,resolveAssetValues} from '../src/rendering/asset-url.js';
import {publicText} from '../tools/web-package.mjs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('content/manifests/audio-runtime.json');
test('musical catalogue aliases use the same full Opus file for windows and fallback',()=>{
 for(const pack of ['a','b']){
  const source=read(`public/content/music-${pack}.json`),runtime=resolveAssetValues(source),index=read(`public/content/music-opus-windows-${pack}.json`);
  assert.equal(assetUrl(`/content/music-windows-${pack}.json`),`/content/music-opus-windows-${pack}.json`);
  for(const track of index.tracks){
   const original=source.tracks.find(t=>t.id===track.id),resolved=runtime.tracks.find(t=>t.id===track.id);
   assert(original.data.url.endsWith('.mp3'),'Original provenance remains intact');
   assert.equal(resolved.data.url,track.fullUrl);assert.equal(track.url,track.fullUrl);
   assert(track.fullUrl.endsWith('.opus'));
  }
 }
});
test('all musical aliases remain relative in native documents and nested menu',()=>{
 for(const record of manifest.records){
  assert.equal(publicText(JSON.stringify({url:'/'+record.source}),'content/music.json',manifest),JSON.stringify({url:record.runtime}));
  assert.equal(publicText(`fetch('/${record.source}')`,'menu/native.js',manifest),`fetch('../${record.runtime}')`);
 }
});
test('SFX source provenance remains available while runtime uses matching Opus metadata',()=>{
 const sfxManifest=read('content/manifests/sfx-runtime.json');
 for(const item of read('public/content/sfx.json').items){
  const r=sfxManifest.records.find(r=>r.id===item.id),runtime=read('public/content/sfx-opus.json').items.find(i=>i.id===item.id);
  assert.equal(assetUrl(item.audio.url),'/'+r.runtime);assert(item.audio.url.endsWith('.mp3'));
  assert.equal(runtime.sha256,r.runtimeSha256);assert.equal(runtime.normalizedSource.sha256,item.sha256);
 }
});
