import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {TerrainField,scatterWorld} from '../src/world/terrain.js';
import {buildGroundMask417} from '../src/rendering/ground-mask.js';
import {chunkBounds} from '../src/rendering/water-source.js';
import {BiomeGround} from '../src/rendering/biome-ground.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {updateGroundQuality} from '../src/rendering/render-quality.js';
import {Navigation} from '../src/world/navigation.js';

const source=readFileSync('references/extracted/Bioma_Lab_V4_1_10_3_Manglar_Barro_Humedo/script-28.js','utf8');
const fragment=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const native=Function('const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;'+fragment('const smooth=','const BIOMES=')+fragment('function settlementBlend410(','function installSettlement(')+fragment('function canyonFrame(','function mm(')+fragment('function groundWear417(','function setGround417(')+'return {TerrainField,scatterWorld,buildGroundMask417};')();
const ids=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];

test('actual native map, placement and RGBA context recipes match all six biomes with a saved village pad',()=>{
  for(const biome of ids){
    const profile=JSON.parse(readFileSync('public/content/biome-'+biome+'.json')).profile;
    const config={seed:'712',biome,relief:1,density:1,river:true,n:1,layers:Array(6).fill(true),settlementSite:{x:60,z:0,y:3,yaw:.35,hx:14,hz:14,clearRadius:19,softRadius:25,haloRadius:32}};
    const field=new TerrainField(config),reference=new native.TerrainField(config);
    for(const [cx,cz] of [[0,0],[1,0],[-1,1]]){
      const bo=chunkBounds(cx,cz);
      for(let z=bo.minZ;z<=bo.maxZ;z+=4)for(let x=bo.minX;x<=bo.maxX;x+=4){assert.equal(field.height(x,z),reference.height(x,z));assert.deepEqual(field.waterInfo(x,z),reference.waterInfo(x,z));}
      assert.deepEqual(scatterWorld({...config,cx,cz},profile,field),native.scatterWorld({...config,cx,cz},profile,reference));
      assert.deepEqual(buildGroundMask417(config,profile,field,bo),native.buildGroundMask417(config,profile,reference,bo));
    }
  }
});

test('context halos share exact world samples across positive and negative chunk seams',()=>{
  const profile=JSON.parse(readFileSync('public/content/biome-mangrove.json')).profile;
  const field=new TerrainField({seed:'712',biome:'mangrove',relief:1,river:true});
  for(const cx of [-2,-1,0,1]){
    const a=buildGroundMask417(field.c,profile,field,chunkBounds(cx,0)),b=buildGroundMask417(field.c,profile,field,chunkBounds(cx+1,0));
    for(let z=0;z<35;z++)for(let x=0;x<3;x++)assert.deepEqual(a.slice((z*35+x+32)*4,(z*35+x+33)*4),b.slice((z*35+x)*4,(z*35+x+1)*4));
  }
});

test('ground material retains packed maps and masks across live quality changes and releases them once',()=>{
  const ground=new BiomeGround();ground.field=new TerrainField({seed:'712',biome:'mangrove',relief:1,river:true});ground.profile=JSON.parse(readFileSync('public/content/biome-mangrove.json')).profile;ground.tile={scale:.115,blend:1,normalBoost:1.3,relief:.18};ground.textures=Array.from({length:3},()=>new THREE.Texture());
  const material=new THREE.MeshStandardMaterial();material.userData.toonGround=true;ground.attach(material,-1,0);
  const mask=material.userData.biomeGround.uGroundMask.value;let disposed=0;mask.addEventListener('dispose',()=>disposed++);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(),material),toon=new AfricanToon();toon.material(material);const shader={uniforms:{},...THREE.ShaderLib.standard};material.onBeforeCompile(shader,{});
  assert.equal(shader.uniforms.uGroundARH.value,ground.textures[2]);assert.ok(shader.fragmentShader.includes('groundMaterial417(vToonWorld'));assert.ok(shader.fragmentShader.includes('mudWet'));assert.equal(shader.uniforms.uGroundRect.value.x,-72);
  updateGroundQuality([mesh],'muy_baja');assert.equal(disposed,0);assert.equal(mesh.material.userData.biomeGround.uGroundMask.value,mask);
  mesh.material.dispose();assert.equal(disposed,1);ground.dispose();assert.equal(disposed,1);mesh.geometry.dispose();
});

test('new terrain pad survives navigation recreation while an earlier snapshot keeps its original field',()=>{
  const profile=JSON.parse(readFileSync('public/content/biome-savanna.json')).profile;
  const state={terrainVersion:'4.1.10.3',navigationVersion:1,suppressed:[],structures:[],spells:[],villages:[{id:'v',x:60,z:0,buildings:[{kind:'house',x:60,z:0,radius:3}]}]};
  const nav=new Navigation('712','sabana',profile);nav.setState(state);const saved=structuredClone(state),again=new Navigation('712','sabana',profile);again.setState(saved);assert.deepEqual(saved,state);assert.deepEqual(again.config,nav.config);assert.equal(nav.field.height(60,0),state.villages[0].terrainSite.y);
  const old=structuredClone(state);delete old.terrainVersion;delete old.villages[0].terrainSite;const legacy=new Navigation('712','sabana',profile);legacy.setState(old);assert.equal(legacy.config.settlementSite,undefined);assert.equal(legacy.field.height(60,0),legacy.field.naturalHeight(60,0));
});
