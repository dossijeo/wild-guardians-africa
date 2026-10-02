import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {buildContactData,CONTACT_SOURCE_SHA256} from '../src/rendering/contact-source.js';
import {NativeContacts,contactPrototypes} from '../src/rendering/contacts.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {groundLightingFunctions} from '../src/rendering/ground-lighting-source.js';
const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8').replaceAll('\r\n','\n');
const start=source.indexOf(' prepareContacts(){'),body=source.slice(source.indexOf('  for(let slot=0;slot<20;slot++){',start),source.indexOf('  gl.activeTexture(gl.TEXTURE7);',start));
const reference=Function('prototypes','instances','bo','layers','clamp','const world={instances},state={layers},size=256,bytes=new Uint8Array(size*size).fill(255),width=bo[2]-bo[0],height=bo[3]-bo[1];'+body+'return bytes;');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),layers=Array(6).fill(true),empty=()=>Array.from({length:20},()=>[]);
const prototypes=()=>Array.from({length:20},(_,i)=>({radius:4,group:i%6}));

test('native contact pixels match the original rasterizer across biomes, bounds and filtered instances',()=>{
 assert.equal(createHash('sha256').update(source).digest('hex'),CONTACT_SOURCE_SHA256);
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
  const pack=JSON.parse(readFileSync('public/content/biome-'+biome+'.json')),binary=readFileSync('public'+pack.binary.url),fallback=[];
  for(const [i,a]of pack.assets.entries()){const d=a.lods[0].position,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(binary.buffer,binary.byteOffset+d.offset,d.count),3));fallback[i]=[{geometry:g}];}
  const p=contactPrototypes(pack,fallback);for(const [i,a]of fallback.entries()){const g=a[0].geometry;g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());assert.equal(p[i].radius,Math.max(size.x,size.z)*.5);}
  const instances=p.map((_,i)=>Array.from({length:7},(_,j)=>({x:i*3-24+j*.7,z:j*4-16,sx:.5+j*.2,sz:1+i*.025})));
  for(const bo of [[-120,-120,120,120],[-168,-168,168,168],[-72,-24,168,216]]){
   for(const visible of [layers,[true,false,true,true,false,true]]){
    const filtered=instances.map(list=>list.filter((_,j)=>j!==3)),actual=buildContactData(p,filtered,bo,visible);
    assert.deepEqual(actual.pixels,reference(p,filtered,bo,visible,clamp));assert.deepEqual(actual.bounds,[bo[0],bo[1],bo[2]-bo[0],bo[3]-bo[1]]);
   }
  }
  fallback.flat().forEach(p=>p.geometry.dispose());
 }
});

test('contacts ignore grass and disabled layers, clamp radii and take the darkest overlapping stamp',()=>{
 const p=prototypes(),instances=empty();p[0].group=0;p[1].group=3;p[2].group=2;
 for(const i of [0,1,2])instances[i].push({x:128.5,z:128.5,sx:2,sz:1});
 const both=buildContactData(p,instances,[0,0,256,256],layers);assert.equal(both.pixels[128*256+128],168);
 const grass=empty();grass[2]=instances[2];assert.ok(buildContactData(p,grass,[0,0,256,256],layers).pixels.every(v=>v===255));
 assert.ok(buildContactData(p,instances,[0,0,256,256],Array(6).fill(false)).pixels.every(v=>v===255));
 const oversized=empty();oversized[0]=[{x:128.5,z:128.5,sx:1e3,sz:1e3}];const map=buildContactData(p,oversized,[0,0,256,256],layers).pixels;
 assert.equal(map[128*256+138],255);assert.ok(map[128*256+136]<255);
});

test('resident contact texture is stable, updates on streaming or removal and releases its owner resource',()=>{
 const c=new NativeContacts(),texture=c.texture,bounds=c.uniforms.uContactBounds.value,p=prototypes(),instances=empty();
 instances[0]=[{x:128.5,z:128.5,sx:2,sz:2}];const group={userData:{contactInstances:instances}},chunks=new Map([['0,0',group]]);
 assert.equal(texture.image.data.length,65536);assert.equal(texture.generateMipmaps,false);assert.equal(texture.colorSpace,THREE.NoColorSpace);
 assert.equal(texture.minFilter,THREE.LinearFilter);assert.equal(texture.wrapS,THREE.ClampToEdgeWrapping);assert.equal(texture.unpackAlignment,1);
 assert.equal(c.update(chunks,p,[0,0,256,256],1,layers),true);const version=texture.version;
 assert.equal(c.update(chunks,p,[0,0,256,256],1,layers),false);assert.equal(texture.version,version);assert.equal(c.uploads,1);
 assert.equal(c.update(chunks,p,[256,0,512,256],1,layers),true);assert.equal(c.uniforms.uContactBounds.value,bounds);assert.deepEqual(bounds.toArray(),[256,0,256,256]);
 chunks.clear();assert.equal(c.update(chunks,p,[0,0,256,256],2,layers),true);assert.ok(texture.image.data.every(v=>v===255));assert.equal(c.texture,texture);
 const toon=new AfricanToon();toon.contactUniforms=c.uniforms;
 for(const Material of [THREE.MeshBasicMaterial,THREE.MeshStandardMaterial]){
  const m=new Material();m.userData.toonGround=true;toon.material(m);const shader={uniforms:{},...THREE.ShaderLib[m.isMeshBasicMaterial?'basic':'standard']};m.onBeforeCompile(shader,{});
  assert.equal(shader.uniforms.uContactMap,c.uniforms.uContactMap);assert.ok(shader.fragmentShader.includes('groundReflection,nativeContact4(vToonWorld)'));m.dispose();
 }
 assert.ok(groundLightingFunctions.includes('if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return 1.'));
 let disposed=0;texture.addEventListener('dispose',()=>disposed++);c.dispose();assert.equal(disposed,1);assert.equal(c.uniforms.uContactOn.value,0);assert.equal(c.uniforms.uContactMap.value,null);
});
