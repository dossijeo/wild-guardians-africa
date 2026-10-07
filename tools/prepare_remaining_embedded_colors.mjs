// Offline preparation only: no credentials, provider requests or runtime edits.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readGlb} from './glb-container.mjs';
import {gltfImageRoles} from './audit_image_assets.mjs';
import {prepareEmbeddedColorInput} from './embedded-color-input.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const [outputDirectory,...extra]=process.argv.slice(2);assert.ok(outputDirectory&&!extra.length,'Provide one ignored output directory');
const directory=resolve(root,outputDirectory),cache=resolve(root,'.cache');
assert.ok(directory.startsWith(cache+'\\')||directory.startsWith(cache+'/'),'Prepared source images must stay under .cache');
await mkdir(directory,{recursive:true});
const manifestBytes=await readFile(resolve(root,'content/manifests/web-assets.json')),recipeBytes=await readFile(resolve(root,'content/manifests/embedded-color-recipes.json'));
const manifest=JSON.parse(manifestBytes),recipes=JSON.parse(recipeBytes),rows=[];
for(const record of manifest.records){
 assert.ok(/^assets\/[a-f0-9]{64}\.glb$/.test(record.source)&&/^assets\/web\/[a-f0-9]{64}\.glb$/.test(record.runtime));
 const original=await readFile(resolve(root,'public',record.source)),runtime=await readFile(resolve(root,'public',record.runtime));
 assert.equal(sha(original),record.sourceSha256);assert.equal(sha(runtime),record.runtimeSha256);
 const a=readGlb(original),b=readGlb(runtime);assert.equal(a.json.images.length,b.json.images.length);
 for(let index=0;index<a.json.images.length;index++){
  const roles=gltfImageRoles(a.json,index),runtimeRoles=gltfImageRoles(b.json,index);
  assert.deepEqual(runtimeRoles,roles,'Original/runtime image consumers differ');
  const common={source:record.source,runtime:record.runtime,index,...roles};
  if(roles.requiresExactPixels){rows.push({...common,disposition:'exact-data-review'});continue;}
  const approved=recipes.images.filter(r=>r.source===record.source&&r.index===index);assert.ok(approved.length<=1);
  if(approved.length){
   const entry=approved[0],output=await readFile(resolve(root,entry.file)),image=b.json.images[index],view=b.json.bufferViews[image.bufferView];
   assert.equal(sha(output),entry.outputSha256);assert.equal(output.length,entry.outputBytes);
   const installed=b.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
   assert.ok(Buffer.from(installed).equals(output),'Approved image is not installed byte-exact');
   rows.push({...common,disposition:'reviewed-output-installed',outputSha256:entry.outputSha256,outputBytes:output.length});continue;
  }
  const prepared=await prepareEmbeddedColorInput(original,runtime,index),file=prepared.provenance.uploadSha256+'.png';
  await writeFile(resolve(directory,file),prepared.bytes);
  assert.equal(sha(await readFile(resolve(directory,file))),prepared.provenance.uploadSha256);
  rows.push({...common,disposition:'original-derived-input-ready',...prepared.provenance,inputFile:file});
 }
}
const summary={models:manifest.records.length,images:rows.length,prepared:rows.filter(r=>r.disposition==='original-derived-input-ready').length,installed:rows.filter(r=>r.disposition==='reviewed-output-installed').length,exactDataReview:rows.filter(r=>r.disposition==='exact-data-review').length};
const report={manifestSha256:sha(manifestBytes),recipesSha256:sha(recipeBytes),summary,rows,scope:'Offline original-derived lossless PNG inputs at existing runtime resolution. Installed reviewed colors verified against recipe bytes. No Tinify calls, conversions installed, encoded savings, visual or device acceptance claimed.'};
await writeFile(resolve(directory,'plan.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({directory:relative(root,directory),...summary}));
