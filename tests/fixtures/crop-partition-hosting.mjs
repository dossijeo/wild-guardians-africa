import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {Assets} from '../../src/rendering/assets.js';
import {CropPartition} from '../../src/rendering/crop-partition.js';
const directory=path.resolve('.cache/maize-partition-lifecycle'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'partition-manifest.json')));
const base=new URL('../',process.env.CROP_HOST_MODULE),expected=new URL('content/partition/',base).href;
globalThis.document={};globalThis.location={href:'https://itch.io/embed/unrelated-host'};globalThis.self=globalThis;
globalThis.ProgressEvent=class {constructor(type,fields){Object.assign(this,{type},fields);}};
const assets=new Assets(),requests=[],images=[];let partition;
globalThis.fetch=async request=>{
 const url=typeof request==='string'?request:request.url;requests.push(url);assert.ok(url.startsWith(expected),url);
 if(url.endsWith('manifest.json'))return new Response(JSON.stringify(manifest));
 const file=url.slice(expected.length),bytes=fs.readFileSync(path.join(directory,file));assert.equal(partition.expectedBytes(url),bytes.length,'size must match resolved URL before first request');
 return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});
};
assets.textures.loadAsync=async url=>{images.push(url);assert.ok(url.startsWith(expected+'textures/'));assert.ok(partition.expectedBytes(url)>0);return new THREE.Texture();};
try{
 partition=await CropPartition.load(assets,'/content/partition/manifest.json');assert.equal(partition.base.href,expected);
 const direct=new CropPartition(assets,manifest,'/content/partition/manifest.json');assert.equal(direct.base.href,expected);direct.dispose();
 await partition.models('maize');assert.equal(requests[0],expected+'manifest.json');assert.equal(requests[1],expected+'maize-steady.glb');assert.equal(images.length,2);
 console.log('Resolved manifest, first GLB/texture URLs and expected bytes PASS: '+base.href);
}finally{partition?.dispose();assets.disposeModels();}
