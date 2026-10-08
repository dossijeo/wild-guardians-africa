import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {createNativeDestruction,COLLAPSE_THRESHOLD,COLLAPSE_SECONDS,destructionVertex,destructionDamageGLSL,destructionFragment,destructionDepthFragment,destructionOpeningFragment} from '../src/rendering/destruction-native.js';
import {createNativeDestructionEffects,destructionSmokeVertex,destructionSmokeFragment,destructionDebrisVertex,destructionDebrisFragment,destructionDebrisVertices} from '../src/rendering/destruction-effects-native.js';
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
function nativeEffectsOracle(kernel,building){
  const context=vm.createContext({sites:JSON.parse(JSON.stringify(kernel.hitSites)),seed:building.seed,radiusAt:kernel.radiusAt});
  const extract=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
  const helpers=extract('const clamp=','const M=')+extract('function rng(','let rand=');
  const fakeGPU=`let drawCount=0;const gl={useProgram(){},bindVertexArray(){},bindBuffer(){},bufferSubData(){},drawArraysInstanced(a,b,c,n){drawCount=n},disable(){},enable(){},blendFuncSeparate(){},depthMask(){}};const uniform=()=>{},ui=()=>{},bindTexture=()=>{},debrisProgram={p:1},smokeProgram={p:1},debrisVAO=1,smokeVAO=1,debrisInstanceBuffer=1,smokeInstanceBuffer=1,noiseTex=1,sceneDepth=1;let viewProjection=[],sun=[],cameraRight=[],cameraUp=[],width=1280,height=720;`;
  vm.runInContext(helpers+`
    let rand=rng(seed),damage=0,time=0,quality='medium',smokeEnabled=true,debrisEnabled=true,embersEnabled=true,smokeAmount=.65,destructionAt=-100,lastHitStage=-1,shadowDirty=true,openingDirty=true,playing=false,collapsing=false,collapseElapsed=0,collapseSpeed=1,collapseFrom=.79;
    const COLLAPSE_THRESHOLD=.79,smoke=[],debris=[],hitSites=sites,holes=new Float32Array(32),stats={particles:0,drawCalls:0};let eye=[10,8,15];
    for(const site of hitSites){site.radius=0;site.emission=0;rand();rand();}
    const $=()=>({textContent:'0'}),updateUI=()=>{},toast=()=>{};
    `+fakeGPU+extract('const shape=','let debrisBuffer=')+extract('let ashChips=[];','const finalFS=')+extract('function emitPuff(','const smokeUpload=')+extract('function updateHoles(','resetSites();')+extract('function applyDamage(','function setDamage(')+extract('const smokeUpload=','function render(){')+`
    this.frame=(value,dt)=>{time+=dt;if(damage<.79&&value>=.79){applyDamage(.79,false);startCollapse(false);}applyDamage(value,true);for(let left=dt;left>1e-7;){const sub=Math.min(1/30,left);updateEffects(sub);left-=sub;}};
    this.configure=value=>{quality=value};this.burst=burst;this.emitPuff=emitPuff;this.emitDebris=emitDebris;
    this.snapshot=()=>JSON.stringify({smoke,debris,ashChips,damage,time,destructionAt});
    this.pack=()=>{drawCount=0;renderDebris();const d={count:drawCount,data:Array.from(debrisUpload.subarray(0,drawCount*12))};drawCount=0;renderSmoke();return {debris:d,smoke:{count:drawCount,data:Array.from(smokeUpload.subarray(0,drawCount*11))}}};
    this.shapes=debrisVerts;`,context);
  return context;
}
test('Native particle shaders and fragment geometry retain source hashes and exact source code',()=>{
  assert.equal(hash(read('src/rendering/destruction-effects-native.js')),manifest.effectsModuleSha256);
  for(const [name,shader] of [['smokeVS',destructionSmokeVertex],['smokeFS',destructionSmokeFragment],['debrisVS',destructionDebrisVertex],['debrisFS',destructionDebrisFragment]]){const raw=source.slice(source.indexOf('const '+name+'=`')+('const '+name+'=`').length);assert.equal(shader,raw.slice(0,raw.indexOf('`;')));}
  const original=nativeEffectsOracle(kernels[0],manifest.buildings[0]);assert.deepEqual([...destructionDebrisVertices],[...original.shapes].map(Math.fround));
});
test('All five houses reproduce original ash scatter, emissions, gravity, bounce, friction and upload data',()=>{
  for(let i=0;i<kernels.length;i++){
    const fx=createNativeDestructionEffects(kernels[i],manifest.buildings[i]),original=nativeEffectsOracle(kernels[i],manifest.buildings[i]);
    for(const [value,dt] of [[.1,.1],[.35,.5],[.65,.7],[.79,.1],[.82,.1],[.88,.2],[.95,.2],[.97,.1],[1,.2],[1,2],[1,5]]){
      fx.frame(value,dt);original.frame(value,dt);
      assert.equal(JSON.stringify({smoke:fx.smoke,debris:fx.debris,ashChips:fx.ashChips,damage:fx.damage,time:fx.time,destructionAt:fx.destructionAt}),original.snapshot());
      const expected=original.pack(),debris=fx.debrisInstances(),smoke=fx.smokeInstances([10,8,15]);
      assert.equal(debris.count,expected.debris.count);assert.deepEqual([...debris.data.subarray(0,debris.count*12)],[...expected.debris.data]);assert.equal(smoke.count,expected.smoke.count);assert.deepEqual([...smoke.data.subarray(0,smoke.count*11)],[...expected.smoke.data]);
    }
    assert.equal(fx.ashChips.length,175);assert.equal(fx.debris.length,0);assert.equal(fx.smoke.length,0);assert.equal(fx.debrisInstances().count,175);
  }
});
test('Original smoke quality caps and 340-fragment cap remain bounded under repeated structural bursts',()=>{
  for(const [quality,limit] of [['low',125],['medium',240],['high',330]]){
    const fx=createNativeDestructionEffects(kernels[0],manifest.buildings[0]),original=nativeEffectsOracle(kernels[0],manifest.buildings[0]);fx.configure(quality);original.configure(quality);
    for(let i=0;i<50;i++){fx.burst([0,3.3,0],[0,1,0],1.6,true);original.burst([0,3.3,0],[0,1,0],1.6,true);}
    assert.equal(fx.smoke.length,limit);assert.equal(fx.debris.length,340);assert.equal(JSON.stringify({smoke:fx.smoke,debris:fx.debris,ashChips:fx.ashChips,damage:fx.damage,time:fx.time,destructionAt:fx.destructionAt}),original.snapshot());
    fx.advance(20);assert.equal(fx.smoke.length,0);assert.equal(fx.debris.length,0);assert.equal(fx.stats.particles,0);assert.throws(()=>fx.configure('invented'));
  }
});
test('Loaded collapse does not replay bursts; zero elapsed freezes particles and full repair clears emitters',()=>{
  const fx=createNativeDestructionEffects(kernels[0],manifest.buildings[0]);fx.initialize(.9);assert.equal(fx.smoke.length,0);assert.equal(fx.debris.length,0);assert.equal(fx.debrisInstances().count,175);
  fx.frame(.92,.1);const before=JSON.stringify({smoke:fx.smoke,debris:fx.debris,sites:fx.hitSites,time:fx.time});fx.frame(.92,0);assert.equal(JSON.stringify({smoke:fx.smoke,debris:fx.debris,sites:fx.hitSites,time:fx.time}),before);
  fx.frame(.97,.1);assert.ok(fx.debris.length>0);fx.frame(0,0);assert.equal(fx.smoke.length,0);assert.equal(fx.debris.length,0);assert.ok(fx.hitSites.every(s=>s.emission===0&&s.radius===0));assert.equal(fx.debrisInstances().count,0);assert.equal(fx.destructionAt,-100);assert.throws(()=>fx.frame(.1,-1));
});

test('all native cultures rehydrate transferred loading data without changing geometry or damage/picking',()=>{
 for(const {building,input} of originals){const source=createNativeDestruction(building,input),prepared=structuredClone(Object.fromEntries(['positions','normals','uv','indices','bounds','triangles','vertices','repairNormals','ash','hull','noiseBytes','holes','hitSites'].map(key=>[key,source[key]]))),restored=createNativeDestruction(building,{},prepared);
  for(const key of Object.keys(prepared))assert.deepEqual(restored[key],source[key],building.culture+':'+key);
  for(const damage of [0,.2,.79,.85,.98,1]){source.setDamage(damage);restored.setDamage(damage);assert.deepEqual(restored.holes,source.holes);for(const origin of [[0,2,20],[20,2,0],[0,20,0]]){const length=Math.hypot(...origin),direction=origin.map(v=>-v/length);assert.deepEqual(restored.raycast(origin,direction),source.raycast(origin,direction));}for(const point of [[0,0,0],[1,3,-1]]){assert.equal(restored.field(point),source.field(point));assert.deepEqual(restored.collapsedPoint(point,restored.triangles[0]),source.collapsedPoint(point,source.triangles[0]));}}
 }
});
