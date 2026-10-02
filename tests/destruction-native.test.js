import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {createNativeDestruction,COLLAPSE_THRESHOLD,COLLAPSE_SECONDS,destructionVertex,destructionDamageGLSL,destructionFragment,destructionDepthFragment,destructionOpeningFragment} from '../src/rendering/destruction-native.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const manifest=JSON.parse(read('content/manifests/destruction-native.json'));
const source=read(manifest.source).toString().replace(/\r\n/g,'\n');
const hash=data=>createHash('sha256').update(data).digest('hex');
function model(building){
  const buffer=read('public'+building.url),array=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),view=new DataView(array);
  let gltf,bin;
  for(let offset=12;offset<array.byteLength;){const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);if(type===0x4e4f534a)gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(array,offset+8,length)));if(type===0x004e4942)bin=offset+8;offset+=length+8;}
  assert.equal(gltf.meshes.length,1);assert.equal(gltf.meshes[0].primitives.length,1);
  const accessor=id=>{const a=gltf.accessors[id],b=gltf.bufferViews[a.bufferView],Type=({5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array})[a.componentType],n=({SCALAR:1,VEC2:2,VEC3:3})[a.type],result=new Type(a.count*n),offset=bin+(b.byteOffset??0)+(a.byteOffset??0),stride=b.byteStride??n*Type.BYTES_PER_ELEMENT;for(let i=0;i<a.count;i++)result.set(new Type(array,offset+i*stride,n),i*n);return result;};
  const primitive=gltf.meshes[0].primitives[0],positions=accessor(primitive.attributes.POSITION),normals=accessor(primitive.attributes.NORMAL),uv=accessor(primitive.attributes.TEXCOORD_0),indices=accessor(primitive.indices),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i++) {const axis=i%3;min[axis]=Math.min(min[axis],positions[i]);max[axis]=Math.max(max[axis],positions[i]);}
  const center=[(min[0]+max[0])/2,min[1],(min[2]+max[2])/2];for(let i=0;i<positions.length;i++)positions[i]-=center[i%3];
  return {positions,normals,uv,indices,bounds:{min:min.map((v,i)=>v-center[i]),max:max.map((v,i)=>v-center[i])}};
}
const originals=manifest.buildings.map(building=>({building,input:model(building)}));
const kernels=originals.map(({building,input})=>createNativeDestruction(building,input));
const native=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const clamp='),source.indexOf('const M='))+'const COLLAPSE_THRESHOLD=.79;let damage=0;'+source.slice(source.indexOf('function collapsedPoint('),source.indexOf('function raycast('))+source.slice(source.indexOf('function stages('),source.indexOf('function updateUI('))+'this.sample=(p,g,d)=>{damage=d;return collapsedPoint(p,g)};this.stage=d=>{damage=d;return stages()};',native);
test('DEST extraction and five original GLBs retain audited source hashes',()=>{
  assert.equal(hash(read(manifest.source)),manifest.sourceSha256);assert.equal(hash(read('src/rendering/destruction-native.js')),manifest.moduleSha256);
  assert.equal(COLLAPSE_THRESHOLD,.79);assert.equal(COLLAPSE_SECONDS,3.2);
  assert.deepEqual(manifest.buildings.map(b=>b.culture).sort(),['etiope','mapungubwe','musgum','saheliana','suajili']);
  const registry=vm.createContext({$:()=>({src:'native-preview'})});
  vm.runInContext(source.slice(source.indexOf('const BUILDINGS='),source.indexOf('// Keep encoded assets'))+'this.buildings=BUILDINGS;',registry);
  for(let i=0;i<manifest.buildings.length;i++){
    const b=manifest.buildings[i],original=registry.buildings[i];assert.equal(hash(read('public'+b.url)),b.sha256);
    for(const key of ['name','dataId','seed','repairPlaster','fitSites','fitGround','roofCap'])assert.equal(JSON.stringify(b[key]),JSON.stringify(original[key]));
  }
});
test('Original GLSL masks, opening-depth guard and collapse programs are retained verbatim',()=>{
  for(const [name,shader] of [['vertexBase',destructionVertex],['damageGLSL',destructionDamageGLSL],['fragmentMain',destructionFragment],['fragmentDepth',destructionDepthFragment],['fragmentOpening',destructionOpeningFragment]]){
    const raw=source.slice(source.indexOf('const '+name+'=`')+('const '+name+'=`').length);const end=raw.indexOf('`;');
    assert.equal(shader,raw.slice(0,end).replace('${damageGLSL}',destructionDamageGLSL));
  }
  assert.match(destructionFragment,/texelFetch\(uOpeningMask,pixel,0\)/);assert.match(destructionFragment,/originalDepth\+2\.\/16777215\./);
});
test('All original triangle pivots follow exact native trajectories and six damage stages',()=>{
  for(const kernel of kernels){
    for(const damage of [0,.0049,.005,.1999,.2,.5199,.52,.7899,.79,.82,.9,.98,.99979,.9998,1]){
      kernel.setDamage(damage);assert.equal(JSON.stringify(kernel.stages()),JSON.stringify(native.stage(damage)));
      for(let face=0;face<kernel.triangles.length;face+=97){const group=kernel.triangles[face],id=kernel.indices[face*3],p=[...kernel.positions.subarray(id*3,id*3+3)],actual=kernel.collapsedPoint(p,group),expected=native.sample(p,group,damage);assert.equal(JSON.stringify(actual),JSON.stringify(expected));assert.ok(actual.every(Number.isFinite));}
    }
    kernel.setDamage(0);assert.ok(kernel.holes.every((v,i)=>i%4!==3||v===0));assert.equal(kernel.stages()[0],'Intacto');assert.throws(()=>kernel.setDamage(NaN));
  }
});
test('Only native Sahelian roof patch adds geometry; original UVs and buffers stay unchanged',()=>{
  for(let i=0;i<kernels.length;i++){
    const kernel=kernels[i],{input,building}=originals[i],extra=building.roofCap?8:0;
    assert.equal(kernel.positions.length,input.positions.length+extra*3);assert.equal(kernel.indices.length,input.indices.length+(extra?12:0));
    assert.deepEqual(kernel.positions.subarray(0,input.positions.length),input.positions);assert.deepEqual(kernel.uv.subarray(0,input.uv.length),input.uv);assert.deepEqual(kernel.normals.subarray(0,input.normals.length),input.normals);assert.ok(input.indices.every((value,index)=>kernel.indices[index]===value));
    assert.equal(kernel.vertices.length,kernel.indices.length*12);assert.equal(kernel.repairNormals.length,kernel.indices.length*3);assert.ok(kernel.repairNormals.every(Number.isFinite));
    for(let corner=0;corner<kernel.indices.length;corner+=89){const id=kernel.indices[corner],group=kernel.triangles[Math.floor(corner/3)];assert.deepEqual([...kernel.vertices.subarray(corner*12+8,corner*12+11)],group.anchor.map(Math.fround));assert.deepEqual([...kernel.vertices.subarray(corner*12+6,corner*12+8)],[...kernel.uv.subarray(id*2,id*2+2)]);}
  }
});
test('Eight fitted damage sites and footprint ash regenerate deterministically after repair',()=>{
  for(let i=0;i<kernels.length;i++){
    const kernel=kernels[i],copy=createNativeDestruction(originals[i].building,originals[i].input);
    assert.equal(kernel.hitSites.length,8);assert.equal(kernel.ash.length,160*18*6*12);assert.ok(kernel.ash.every(Number.isFinite));assert.deepEqual(kernel.noiseBytes,copy.noiseBytes);assert.deepEqual(kernel.vertices,copy.vertices);
    for(const damage of [.1,.4,.78,1,0,.4]){kernel.setDamage(damage);copy.setDamage(damage);assert.deepEqual(kernel.holes,copy.holes);assert.ok(kernel.holes.every(Number.isFinite));for(const s of kernel.hitSites)assert.equal(kernel.field(s.p),copy.field(s.p));}
    for(const site of kernel.hitSites){assert.ok(site.p.every(Number.isFinite));assert.ok(site.n.every(Number.isFinite));}
    kernel.setDamage(0);
  }
});
