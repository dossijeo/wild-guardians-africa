import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {applyApprovedEmbeddedColors} from '../tools/approved-embedded-colors.mjs';
const root=new URL('../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const recipes=JSON.parse(await readFile(new URL('content/manifests/embedded-color-recipes.json',root),'utf8'));
const entry=recipes.images[0],source=await readFile(new URL('public/'+entry.source,root));
const runtime=await readFile(new URL('public/'+entry.source.replace('assets/','assets/web/'),root));
const output=await readFile(new URL(entry.file,root));
// Also verify reapplication to current bytes without depending on a historical
// Git blob. The production compressor separately checks the frozen baseline hash.
const current={...recipes,images:[{...entry,baselineGlbSha256:hash(runtime)}]};

test('reviewed output is reapplied offline, with all expected hashes checked',async()=>{
 let loads=0;const result=await applyApprovedEmbeddedColors(source,runtime,entry.source,current,async path=>{assert.equal(path,entry.file);loads++;return output;});
 assert.equal(loads,1);assert.equal(result.applied.length,1);
 const again=await applyApprovedEmbeddedColors(source,result.bytes,entry.source,{...current,images:[{...current.images[0],baselineGlbSha256:hash(result.bytes)}]},async()=>output);
 assert.deepEqual(again.bytes,result.bytes);
});

test('missing recipes retain bytes and do not read unrelated files',async()=>{
 const result=await applyApprovedEmbeddedColors(source,runtime,entry.source,{version:1,images:[]},()=>{throw Error('Unexpected file read');});
 assert.deepEqual(result.bytes,new Uint8Array(runtime));assert.deepEqual(result.applied,[]);
});

test('changed sources, preparation, output and unsafe recipe paths fail instead of silently falling back',async()=>{
 for(const changed of [{originalGlbSha256:'0'.repeat(64)},{baselineGlbSha256:'0'.repeat(64)},{uploadSha256:'0'.repeat(64)},{originalImageSha256:'0'.repeat(64)},{file:'../private.webp'}]){
  await assert.rejects(applyApprovedEmbeddedColors(source,runtime,entry.source,{...current,images:[{...current.images[0],...changed}]},async()=>output));
 }
 await assert.rejects(applyApprovedEmbeddedColors(source,runtime,entry.source,current,async()=>Buffer.from('corrupted')),/integrity mismatch/);
 await assert.rejects(applyApprovedEmbeddedColors(source,runtime,entry.source,{...current,images:[current.images[0],current.images[0]]},async()=>output),/duplicate/);
 await assert.rejects(applyApprovedEmbeddedColors(source,runtime,entry.source,{...current,images:[{...current.images[0],index:0}]},async()=>output),/exclusively color/);
});
