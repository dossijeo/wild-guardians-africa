import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGuardianAuthoredMetadata} from '../src/simulation/guardian-authored-metadata.js';
import {BIOME_IDS} from '../src/world/biome-ids.js';
import {calculateGuardianBounds} from '../tools/guardian-biome-bounds.mjs';

const fetcher=async path=>{try{const data=readFileSync('public'+path,'utf8');return {ok:true,json:async()=>JSON.parse(data)};}catch{return {ok:false,status:404};}};
for(const [biome,id] of Object.entries(BIOME_IDS))test(`guardian metadata is complete for ${biome}`,async()=>{
 const metadata=await loadGuardianAuthoredMetadata(biome,{fetcher});
 const pack=JSON.parse(readFileSync(`public/content/biome-${id}.json`));assert.equal(metadata.assets.length,pack.assets.length);
 if(['mangrove','canyons','desert'].includes(id)){
  const binary=readFileSync('public'+pack.binary.url);
  // Rebuilt bounds enclose every LOD vertex; the original authored tree bounds
  // are retained unchanged and have a separate authoring provenance.
  for(let i=id==='canyons'?0:4;i<pack.assets.length;i++){const expected=calculateGuardianBounds(pack.assets[i],binary);assert.deepEqual(metadata.assets[i],expected);}
 }
});
test('metadata reports the failed resource and keeps bounds validation strict',async()=>{
 await assert.rejects(loadGuardianAuthoredMetadata('manglares',{fetcher:async path=>path.includes('crop-stage-heights')?{ok:false,status:503}:fetcher(path)}),/crop-stage-heights\.json \(503\)/);
 await assert.rejects(loadGuardianAuthoredMetadata('manglares',{fetcher:async path=>{const response=await fetcher(path);if(!path.includes('biome-mangrove'))return response;const pack=await response.json();delete pack.assets[4].min;return {ok:true,json:async()=>pack};}}),/bounds unavailable/);
});
