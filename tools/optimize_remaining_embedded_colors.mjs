// Explicit batch of offline candidates. Runtime assets and recipes are untouched.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {TinifyImageCache} from './tinify-image-cache.mjs';
import {replaceWebGlbColorImages} from './repack_web_glb_images.mjs';
import {verifyEmbeddedColorCandidate} from './verify-embedded-color-candidate.mjs';
import {prepareEmbeddedColorInput} from './embedded-color-input.mjs';

const [directory,...extra]=process.argv.slice(2),validateOnly=extra.length===1&&extra[0]==='--validate-only';assert.ok(directory&&(!extra.length||validateOnly),'Provide the prepared cache directory and optional --validate-only');
const root=process.cwd(),cache=resolve(root,'.cache'),input=resolve(root,directory);
assert.ok(input.startsWith(cache+'\\')||input.startsWith(cache+'/'),'Candidates must remain under .cache');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),plan=JSON.parse(await readFile(resolve(input,'plan.json'),'utf8'));
const manifestBytes=await readFile('content/manifests/web-assets.json'),manifest=JSON.parse(manifestBytes);
assert.equal(sha(manifestBytes),plan.manifestSha256,'Manifest changed; prepare again');
assert.equal(sha(await readFile('content/manifests/embedded-color-recipes.json')),plan.recipesSha256,'Recipes changed; prepare again');
const pending=plan.rows.filter(r=>r.disposition==='original-derived-input-ready'),identities=new Set();
assert.equal(pending.length,plan.summary.prepared);
for(const entry of pending){
 const record=manifest.records.find(r=>r.source===entry.source);
 assert.ok(record&&record.runtime===entry.runtime&&record.sourceSha256===entry.originalGlbSha256&&record.runtimeSha256===entry.runtimeGlbSha256,'Input is not owned by the current manifest');
 assert.ok(Number.isSafeInteger(entry.index)&&entry.index>=0);
 assert.ok(/^[a-f0-9]{64}$/.test(entry.originalImageSha256)&&/^[a-f0-9]{64}$/.test(entry.uploadSha256));
 assert.equal(entry.inputFile,entry.uploadSha256+'.png');
 const identity=entry.source+':'+entry.index;assert.ok(!identities.has(identity),'Duplicate input');identities.add(identity);
}
const client=validateOnly?null:new TinifyImageCache({key:process.env.TINIFY_API_KEY,cacheDirectory:resolve(cache,'tinify-images')}),rows=[];
const report=()=>({manifestSha256:plan.manifestSha256,recipesSha256:plan.recipesSha256,requested:plan.summary.prepared,completed:rows.length,rows,acceptedForRuntime:false,scope:'Actual Tinify output candidates from original-derived lossless inputs at current dimensions, with independent decoded geometry/metadata/alpha/PSNR/conformance checks. No runtime assets or recipes installed; native appearance and package/device acceptance required.'});
for(const entry of pending){
 const original=await readFile(resolve(root,'public',entry.source)),runtime=await readFile(resolve(root,'public',entry.runtime)),upload=await readFile(resolve(input,entry.inputFile));
 assert.equal(sha(original),entry.originalGlbSha256);assert.equal(sha(runtime),entry.runtimeGlbSha256);assert.equal(sha(upload),entry.uploadSha256);
 const prepared=await prepareEmbeddedColorInput(original,runtime,entry.index);
 assert.equal(prepared.provenance.originalImageSha256,entry.originalImageSha256);assert.equal(prepared.provenance.uploadSha256,entry.uploadSha256,'Input no longer matches original-derived preparation');
 if(validateOnly)continue;
 const optimized=await client.optimize(upload,{format:'png'}),candidate=await replaceWebGlbColorImages(runtime,new Map([[entry.index,optimized.bytes]]));
 const candidateDirectory=resolve(input,entry.originalImageSha256+'-'+entry.index);await mkdir(candidateDirectory,{recursive:true});
 await writeFile(resolve(candidateDirectory,'candidate.webp'),optimized.bytes);await writeFile(resolve(candidateDirectory,'candidate.glb'),candidate);
 let verification=null,error=null;
 try{verification=await verifyEmbeddedColorCandidate(original,runtime,candidate,entry.index);}catch(e){error=e.message.split('\n')[0];}
 const row={source:entry.source,runtime:entry.runtime,index:entry.index,originalImageSha256:entry.originalImageSha256,...optimized.receipt,reused:optimized.reused,savedImageBytes:entry.runtimeImageBytes-optimized.bytes.length,savedRuntimeBytes:runtime.length-candidate.length,candidateGlbSha256:sha(candidate),candidateDirectory:entry.originalImageSha256+'-'+entry.index,verification,error,acceptedForRuntime:false};
 rows.push(row);await writeFile(resolve(candidateDirectory,'report.json'),JSON.stringify(row,null,2)+'\n');await writeFile(resolve(input,'candidates.json'),JSON.stringify(report(),null,2)+'\n');
 console.log(JSON.stringify({image:entry.originalImageSha256,index:entry.index,savedRuntimeBytes:row.savedRuntimeBytes,psnr:verification?.psnr??null,gate:error?'failed':'passed',reused:optimized.reused}));
}
if(validateOnly)console.log(JSON.stringify({validatedInputs:pending.length,providerRequests:0}));
if(rows.some(r=>r.error))process.exitCode=1;
