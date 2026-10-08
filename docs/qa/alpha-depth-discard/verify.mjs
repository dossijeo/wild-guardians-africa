import fs from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(await fs.readFile(new URL('receipt.json',dir),'utf8'));
for(const file of receipt.files){const packed=await fs.readFile(new URL(file.archive,dir)),bytes=file.archive.endsWith('.gz')?gunzipSync(packed):packed;assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(new URL(name+'.json.gz',dir))));
for(const name of ['on-before','on-probe','off-before','off-probe','on-restored']){
 const {result,errors}=await read(name);assert.deepEqual(errors,[]);assert.equal(result.width,1280);assert.equal(result.height,720);assert.equal(result.logicalStateUnchanged,true);assert.equal(result.alphaDiscard.enabled,!name.startsWith('off'));assert.equal(result.alphaDiscard.compiles.length,57);
 for(const pair of ['N1/N2','N2/G','N2/N3'])assert.equal(result.comparisons.find(p=>p.pair===pair).depth.differentPixels,0);
 assert.ok(result.comparisons.some(p=>p.depth.differentPixels));
}
const on=(await read('on-probe')).result.gpuProbe,off=(await read('off-probe')).result.gpuProbe;assert.deepEqual(on.programs,off.programs);
for(let i=0;i<6;i++){
 assert.equal(on.frames[i].label,off.frames[i].label);assert.equal(on.frames[i].rows.length,1);assert.equal(off.frames[i].rows.length,1);
 const a=on.frames[i].rows[0],b=off.frames[i].rows[0];assert.equal(a.assetGroup,'18:2');assert.equal(b.assetGroup,'18:2');assert.equal(a.uniforms.uQaAlphaDiscard.value,1);assert.equal(b.uniforms.uQaAlphaDiscard.value,0);
 const withoutToggle=row=>{const copy=structuredClone(row);delete copy.uniforms.uQaAlphaDiscard;return copy;};assert.deepEqual(withoutToggle(a),withoutToggle(b));
}
assert.deepEqual((await read('off-probe')).result.comparisons.map(p=>p.depth.differentPixels),[0,0,12,12,0,12,0]);assert.deepEqual(await read('console'),[]);
console.log(JSON.stringify({files:receipt.files.length,cases:5,compileCallbacks:57,programsUnchanged:true,otherObservedDrawStateUnchanged:true,offStillDifferent:true,scope:receipt.scope}));
