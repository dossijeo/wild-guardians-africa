import fs from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),receipt=JSON.parse(await fs.readFile(new URL('receipt.json',dir),'utf8'));
for(const file of receipt.files){const packed=await fs.readFile(new URL(file.archive,dir)),bytes=file.archive.endsWith('.gz')?gunzipSync(packed):packed;assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(new URL(name+'.json.gz',dir))));let reference;
for(const mode of ['linear','nearest']){
 for(const arm of ['before','probe']){
  const {result,errors}=await read(mode+'-'+arm);assert.deepEqual(errors,[]);assert.equal(result.width,1280);assert.equal(result.height,720);assert.equal(result.logicalStateUnchanged,true);assert.equal(result.alphaSampler.mode,mode);assert.equal(result.alphaSampler.textures.length,1);
  assert.deepEqual(result.comparisons.map(p=>p.depth.differentPixels),[0,0,7,7,0,7,0]);
  const coords=result.comparisons.find(p=>p.pair==='N2/B1').depth.firstDifferentDepthPixels.map(p=>[p.x,p.y]);if(reference)assert.deepEqual(coords,reference);else reference=coords;
  if(arm==='probe')for(const f of result.gpuProbe.frames){assert.equal(f.rows.length,1);assert.equal(f.rows[0].assetGroup,'18:2');const maps=Object.entries(f.rows[0].textures).filter(([name])=>name.startsWith('map:'));assert.equal(maps.length,1);const map=maps[0][1];assert.equal(map.min,mode==='linear'?9729:9728);assert.equal(map.mag,map.min);assert.equal(map.id,5);}
 }
 assert.deepEqual(await read(mode+'-console'),[]);
}
console.log(JSON.stringify({files:receipt.files.length,cases:4,sameSevenPixelCoordinates:true,effectiveFiltersVerified:true,scope:receipt.scope}));
