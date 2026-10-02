import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createNativeVfx,createVfxAtlasRects,createVfxGeometries,packVfxSprites,vfxDefinitions,vfxSpriteVertex,vfxSpriteFragment,vfxGeometryVertex,vfxGeometryFragment,vfxRigidVertex,vfxRigidFragment,vfxShadowVertex,vfxShadowFragment,vfxEnvironment,MAX_SPRITES,MAX_FX_VERTS} from '../src/rendering/vfx-native.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const manifest=JSON.parse(read('content/manifests/vfx-native.json'));
const source=read(manifest.source).toString().replace(/\r\n/g,'\n');
const assets=JSON.parse(read('public/content/vfx.json'));
const rects=createVfxAtlasRects(assets,...manifest.atlasDimensions);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('World surface replaces the demonstration crop bed and follows drifting sprite contacts',()=>{
  const surface=(x,z)=>.18+.02*x-.01*z,fx=createNativeVfx('dig',rects,{surface});fx.advance(1.5);
  assert.ok(fx.rigids.some(r=>r.landed));
  for(const r of fx.rigids)assert.ok(r.p[1]>=surface(r.p[0],r.p[2])+r.size[1]*.36-1e-9);
  for(const p of fx.parts){assert.equal(p.ground,surface(p.p[0],p.p[2]));if(p.orient!==1)assert.ok(p.p[1]>=p.ground+.025-1e-9);}
  const frozen=JSON.stringify(fx.rigids);fx.advance(0);assert.equal(JSON.stringify(fx.rigids),frozen);
  assert.throws(()=>createNativeVfx('dig',rects,{surface:12}),/Superficie/);
  assert.throws(()=>createNativeVfx('dig',rects,{surface:()=>NaN}).advance(1),/Superficie/);
});
const json=value=>JSON.parse(JSON.stringify(value));
const section=(start,end)=>{const a=source.indexOf(start);return source.slice(a,source.indexOf(end,a));};
function oracle(id){
  const context=vm.createContext({console,window:{dispatchEvent(){}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});
  const cpu='const TAU=Math.PI*2;'+section('const clamp=','const settings=')+section('const settings=','const canvas=')+
    'const MAX_SPRITES=760;const atlasImage={width:4096,height:2048};const ASSETS='+JSON.stringify(assets)+';'+section('const spriteRects={};','const MAX_SPRITES=')+
    section('function tri(','class Builder{')+section('const definitions=','let current=')+
    'let toolModel=M.I(),toolVisible=false,wallVisible=true,lightPos0=[0,1,0],lightPos1=[0,1,0],lightCol0=[0,0,0],lightCol1=[0,0,0];function buildStation(){}'+
    section('let current=','function updateRigidBuffers(')+'let fxVertices=[];'+section('function fxTri(','function paintGeometryFX(')+section('const DUST_TEXTURES=','const paths=')+section('const style=','function makeWaterCan(')+
    'const rigidPacked={},rigidGeo=Object.fromEntries(Object.keys(style).map(k=>[k,{instancesFrom(data,count){rigidPacked[k]={data,count}}}])),rigidBuffers=Object.fromEntries(Object.keys(style).map(k=>[k,new Float32Array(256*23)]));'+section('function updateRigidBuffers(','function renderScene(');
  vm.runInContext(cpu+`
    current=definitions.find(d=>d.id===${JSON.stringify(id)});restartEffect(false);
    this.step=simulate;this.seek=seekTo;
    this.snapshot=()=>({parts,rigids,clock,wetness,toolModel:Array.from(toolModel),toolVisible,lastImpact});
    this.output=()=>({sprites:spriteInstances(),geometry:Array.from(new Float32Array((composeGeometryFX(),fxVertices))),lights:{positions:[lightPos0,lightPos1],colors:[lightCol0,lightCol1]}});
    this.shapes=()=>{const leaf=G.leaf.slice();for(let i=0;i<leaf.length;i+=6)leaf[i+1]-=.5;return {soil:G.rock,wood:roundedBox(1,1,1,.07,3),stone:G.rock,adobe:G.box,leaf,water:G.small,corn:G.ball}};
    this.rigidInstances=()=>{updateRigidBuffers();return rigidPacked};
  `,context);
  const paint=section('function paintSprites(','gl.useProgram(spriteP.p);');
  vm.runInContext('const spriteData=new Float32Array(MAX_SPRITES*25);'+paint.replace('if(!list.length)return;','if(!list.length)return {count:0,data:spriteData};')+'return {count,data:spriteData};}\nthis.pack=list=>paintSprites(list,{}, {eye:[4,3,8],forward:[0,0,-1]});',context);
  return context;
}

test('VFX extraction traces the original atlas, 19 resources, 18 definitions and eight shaders',()=>{
  assert.equal(hash(read(manifest.source)),manifest.sourceSha256);assert.equal(hash(read('src/rendering/vfx-native.js')),manifest.moduleSha256);
  assert.equal(hash(read('public'+manifest.atlas)),manifest.atlasSha256);assert.deepEqual(manifest.atlasDimensions,[4096,2048]);
  assert.equal(assets.resources.length,19);assert.equal(vfxDefinitions.length,18);assert.equal(MAX_SPRITES,760);assert.equal(MAX_FX_VERTS,48000);
  assert.equal(manifest.structuralDamage,'external');assert.equal(manifest.previewContactsOnly,true);
  const worldVertex=source.match(/const worldVertex=`([\s\S]*?)`;/)[1];
  for(const [name,v,f] of [['spriteP',vfxSpriteVertex,vfxSpriteFragment],['fxP',vfxGeometryVertex,vfxGeometryFragment],['meshP',vfxRigidVertex,vfxRigidFragment],['shadowP',vfxShadowVertex,vfxShadowFragment]]){
    const match=source.match(new RegExp('const '+name+'=program\\(`([\\s\\S]*?)`,\\s*`([\\s\\S]*?)`\\);'));assert.equal(v,match[1].replace('${worldVertex}',worldVertex));assert.equal(f,match[2]);
  }
  const original=JSON.parse(read('references/extracted/Wild_Guardians_VFX_Atelier_V4/embedded-assets.json'));assert.deepEqual(assets,original);
});

test('Day, sunset and night environment values match original source lighting and matrices',()=>{
  const context=vm.createContext({});vm.runInContext('const TAU=Math.PI*2;'+section('const clamp=','let seed=')+'const settings={nightFill:.14};'+section("let environmentMode='sunset'",'// Test maquettes only.')+'this.env=v=>{environmentValue=environmentTarget=v;return environment(0)};',context);
  for(const value of [0,.15,.43,.7,1])assert.deepEqual(json(vfxEnvironment(value)),json(context.env(value)));
});

test('All 18 compositions reproduce source scheduling, particles, tool poses, geometry and local lights',()=>{
  let comparisons=0;
  for(const definition of vfxDefinitions){
    const fx=createNativeVfx(definition.id,rects),original=oracle(definition.id);
    for(const time of [.2,.6,.9,1.05,1.27,1.43,1.7,1.85,2.8,definition.duration]){
      fx.seek(time);original.seek(time);
      const state=original.snapshot();assert.deepEqual(json({parts:fx.parts,rigids:fx.rigids,clock:fx.time,wetness:fx.wetness,toolModel:[...fx.tool.matrix],toolVisible:fx.tool.visible,lastImpact:fx.contacts.at(-1)??null}),json(state),definition.id+' state '+time);
      const expected=original.output();assert.deepEqual(json(fx.sprites()),json(expected.sprites));assert.deepEqual([...fx.geometry()],Array.from(expected.geometry));assert.deepEqual(json(fx.lights),json(expected.lights));
      const packed=packVfxSprites(fx.sprites(),rects,{eye:[4,3,8],forward:[0,0,-1]}),originalPacked=original.pack(expected.sprites);
      assert.equal(packed.count,originalPacked.count);assert.deepEqual([...packed.data.subarray(0,packed.count*25)],[...originalPacked.data.subarray(0,packed.count*25)]);comparisons++;
      const rigids=fx.rigidInstances(),originalRigids=original.rigidInstances();for(const id of Object.keys(rigids)){assert.equal(rigids[id].count,originalRigids[id].count);assert.deepEqual([...rigids[id].data.subarray(0,rigids[id].count*23)],Array.from(originalRigids[id].data.subarray(0,rigids[id].count*23)));}
    }
  }
  assert.equal(comparisons,180);
});

test('Seven rigid particle geometries preserve every original position and normal',()=>{
  const expected=oracle('dig').shapes(),actual=createVfxGeometries();assert.equal(Object.keys(actual).length,7);
  for(const [id,vertices] of Object.entries(actual)){assert.deepEqual([...vertices],Array.from(expected[id],Math.fround));assert.equal(vertices.length%18,0);assert.ok(vertices.length>0);}
});

test('Atlas frames retain original inset, flipped rows and interpolated final frame',()=>{
  assert.equal(rects.cloud.length,64);assert.equal(rects.impact.length,15);assert.equal(rects.aura.length,30);
  assert.deepEqual(rects.cloud[0],[.7/4096,1-(128-.7)/2048,126.6/4096,126.6/2048]);
  assert.deepEqual(rects.cloud[63],[(896+.7)/4096,1-(1024-.7)/2048,126.6/4096,126.6/2048]);
  const s={tex:'cloud',p:[0,1,0],size:[1,2],col:[1,1,1],alpha:.4,frame:62.5},packed=packVfxSprites([s],rects,{eye:[0,2,4],forward:[0,0,-1]});
  assert.deepEqual([...packed.data.slice(6,10)],rects.cloud[62].map(Math.fround));assert.deepEqual([...packed.data.slice(10,14)],rects.cloud[63].map(Math.fround));assert.equal(packed.data[18],.5);
});

test('Private VFX clocks freeze at zero elapsed, keep preview contacts external and clear resources',()=>{
  const lion=createNativeVfx('lion',rects),dig=createNativeVfx('dig',rects);lion.advance(2);assert.equal(lion.contacts.length,3);assert.equal(dig.time,0);assert.equal(dig.parts.length,0);
  assert.ok(lion.contacts.every(c=>c.preview&&c.space==='lab-world'&&c.structuralDamage==='external'));
  const before=JSON.stringify({parts:lion.parts,rigids:lion.rigids,time:lion.time,contacts:lion.contacts});lion.advance(0);assert.equal(JSON.stringify({parts:lion.parts,rigids:lion.rigids,time:lion.time,contacts:lion.contacts}),before);
  for(const id of ['dig','water','harvest','wood','adobe','stone']){const fx=createNativeVfx(id,rects);fx.advance(6);assert.equal(fx.parts.length,0,id);assert.equal(fx.rigids.length,0,id);assert.equal(fx.contacts.length,0,id);}
  lion.clear();assert.equal(lion.parts.length,0);assert.equal(lion.rigids.length,0);assert.equal(lion.contacts.length,0);assert.deepEqual(lion.lights.colors,[[0,0,0],[0,0,0]]);
  assert.throws(()=>createNativeVfx('invented',rects));assert.throws(()=>createNativeVfx('dig',rects,{density:NaN}));assert.throws(()=>dig.step(-1));assert.throws(()=>dig.advance(Infinity));assert.throws(()=>dig.seek(NaN));
});

test('Original presentation caps bound dense particle bursts and layer switches hide their own outputs',()=>{
  const fx=createNativeVfx('dig',rects,{density:100});fx.advance(.6);assert.equal(fx.rigids.length,230);assert.ok(fx.parts.length<=660);assert.ok(fx.parts.length>0);
  const packed=fx.rigidInstances();assert.equal(packed.soil.count,230);assert.ok(Object.values(packed).every(p=>p.count<=256));fx.advance(5);assert.equal(fx.parts.length,0);assert.equal(fx.rigids.length,0);
  const hidden=createNativeVfx('shield',rects,{layers:{textures:false,ribbons:false,lights:false}});hidden.seek(2);assert.equal(hidden.sprites().length,0);assert.equal(hidden.geometry().length,0);assert.deepEqual(hidden.lights.colors,[[0,0,0],[0,0,0]]);
});
