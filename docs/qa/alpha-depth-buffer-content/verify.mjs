import fs from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(await fs.readFile(new URL('receipt.json',dir),'utf8'));
for(const file of receipt.files){const packed=await fs.readFile(new URL(file.archive,dir)),bytes=file.archive.endsWith('.gz')?gunzipSync(packed):packed;assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(new URL(name+'.json.gz',dir))));
const all=[];
for(const name of ['probe','repeat']){
 const {result,errors}=await read(name);assert.deepEqual(errors,[]);assert.equal(result.logicalStateUnchanged,true);assert.equal(result.width,1280);assert.equal(result.height,720);
 assert.deepEqual(result.gpuProbe.selection,{method:'explicit-resident-asset-group',assetGroup:'18:2'});
 const seen=new Map();let count=0,totalBytes=0;
 assert.deepEqual(result.gpuProbe.frames.map(f=>f.label),['N1','N2','G','B1','B2','N3']);
 for(const frame of result.gpuProbe.frames){assert.equal(frame.rows.length,1);const row=frame.rows[0];assert.equal(row.assetGroup,'18:2');const ids=new Set(row.bufferContents.map(b=>b.id));assert.equal(ids.size,row.bufferContents.length);assert.ok(ids.has(row.indexBuffer));for(const a of row.attributes.filter(a=>a.enabled))assert.ok(ids.has(a.buffer));
  for(const b of row.bufferContents){assert.match(b.sha256,/^[a-f0-9]{64}$/);if(seen.has(b.id))assert.deepEqual(b,seen.get(b.id));seen.set(b.id,b);count++;totalBytes+=b.byteLength;}
 }
 assert.equal(count,38);assert.equal(totalBytes,187632);assert.equal(result.gpuProbe.bufferReadback.completeCopies,count);assert.equal(result.gpuProbe.bufferReadback.totalBytes,totalBytes);assert.equal(seen.size,7);
 for(const pair of ['N1/N2','N2/G','N2/N3'])assert.equal(result.comparisons.find(p=>p.pair===pair).depth.differentPixels,0);
 assert.equal(result.comparisons.find(p=>p.pair==='N2/B1').depth.differentPixels,7);all.push([...seen.values()]);
}
assert.deepEqual(all[0],all[1]);
assert.deepEqual((await read('before')).result.comparisons.map(p=>p.depth.differentPixels),[0,0,0,0,0,0,0]);
assert.deepEqual(await read('console'),[]);
console.log(JSON.stringify({files:receipt.files.length,frames:12,completeCopies:76,uniqueBuffersPerRun:7,hashesStable:true,scope:receipt.scope}));
