import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import * as THREE from 'three';
import {wallStages,morphedWallPositions} from '../src/rendering/walls-native.js';
import {NativeWall,wallBridge} from '../src/rendering/walls.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/walls-native.json',import.meta.url)));
const source=readFileSync(new URL('../'+manifest.source,import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function regionalEase('),source.indexOf('const MORPH_VS='))+'this.renderer={'+source.slice(source.indexOf(' stages(p){'),source.indexOf(' drawPieces('))+','+source.slice(source.indexOf(' morphedPositions(mesh,morph){'),source.indexOf(' pick(x,y,pieces'))+'};',context);
const pack=JSON.parse(readFileSync(new URL('../public/content/walls.json',import.meta.url)));
const array=(p,type)=>{const buffer=readFileSync(new URL('../public'+p.url,import.meta.url));return new type(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));};
const pieces=Object.fromEntries(Object.entries(pack.pieces).map(([key,p])=>[key,{p:array(p.p,Float32Array),n:array(p.n,Float32Array),uv:array(p.uv,Float32Array),i:array(p.i,Uint16Array),faceRegions:array(p.faceRegions,Uint16Array),regions:p.regions,morph:Object.fromEntries(Object.entries(p.morph).map(([key,m])=>[key,{p:array(m.p,Float32Array),n:array(m.n,Float32Array),peers:m.peers}]))}]));
test('Native Bastion extraction preserves source and module hashes',()=>{
  for(const [file,hash] of [[manifest.source,manifest.sourceSha256],['src/rendering/walls-native.js',manifest.moduleSha256]])assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash);
});
test('All materials and gate stages agree with the original native renderer',()=>{
  for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])for(const kind of ['wall','gate'])for(let i=0;i<=100;i++){
    const p={material,kind,visual:i/100};assert.equal(JSON.stringify(wallStages(p)),JSON.stringify(context.renderer.stages(p)));
  }
});
test('Every original regional bridge keeps triangle pivots and exact native trajectories',()=>{
  for(const [key,p] of Object.entries(pieces))for(const [destination,bridge] of Object.entries(p.morph)){
    const mesh=wallBridge(p,bridge),native={...mesh,lastMorph:NaN,morphed:null};
    for(let i=0;i<=20;i++){
      const actual=morphedWallPositions(mesh,i/20),expected=context.renderer.morphedPositions(native,i/20);
      assert.equal(actual.length,expected.length);assert.ok(actual.every((value,index)=>value===expected[index]),key+'>'+destination+' phase '+i);
    }
    for(let face=0;face<p.i.length/3;face++){
      const root=p.regions[p.faceRegions[face]].root;
      for(let j=0;j<3;j++)assert.deepEqual([...mesh.roots.subarray((face*3+j)*3,(face*3+j+1)*3)],root.map(Math.fround));
    }
    assert.ok([...morphedWallPositions(mesh,1)].every(Number.isFinite));
  }
});
function prototypes(){return Object.fromEntries(Object.entries(pieces).map(([key,p])=>{
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial());mesh.userData.nativePiece=p;return [key,mesh];
}));}
test('Production wall renders opaque native rubble, preserves gate scale and disposes private geometry',()=>{
  const proto=prototypes(),entity={id:'wall',material:'reforzado',gate:true,hp:240,maxHp:240,status:'intact'};
  const wall=new NativeWall(proto,entity),before=JSON.stringify(entity),first=wall.parts[0].mesh;let disposed=false;first.geometry.addEventListener('dispose',()=>disposed=true);
  assert.equal(wall.scale.x,1.6);assert.equal(wall.parts.length,1);
  entity.hp=120;wall.update(entity);assert.ok(disposed);assert.equal(wall.parts.length,2);
  for(const {mesh} of wall.parts){assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.depthWrite,true);assert.ok(mesh.geometry.boundingSphere.radius>0);}
  entity.status='ruined';entity.hp=0;wall.update(entity);assert.equal(wall.parts.length,1);assert.equal(wall.scale.y,1.6);assert.match(wall.stageKey,/reforzado_destruido/);
  const saved=JSON.stringify(entity);wall.update(entity);assert.equal(JSON.stringify(entity),saved);assert.notEqual(saved,before);
  wall.dispose();assert.equal(wall.children.length,0);assert.ok(proto.reforzado_puerta.material.isMaterial);
});
test('Collapse follows simulated remainder and reconstructs correctly after loading or repair',()=>{
  const proto=prototypes(),entity={id:'wall',material:'adobe',gate:false,hp:60,maxHp:300,status:'collapsing',collapseRemaining:.7};
  const wall=new NativeWall(proto,entity);assert.ok(Math.abs(wall.visual-.1)<1e-10);
  const loaded=new NativeWall(proto,structuredClone(entity));assert.equal(loaded.visual,wall.visual);
  entity.hp=300;entity.status='intact';entity.collapseRemaining=0;wall.update(entity);assert.equal(wall.visual,1);assert.match(wall.stageKey,/adobe_intacto/);
  wall.dispose();loaded.dispose();
});
test('Ordinary damage uses native 480 ms cubic easing, pauses hold it and collapse overrides it',()=>{
  const entity={id:'wall',material:'piedra',gate:false,hp:500,maxHp:500,status:'intact'},wall=new NativeWall(prototypes(),entity);
  entity.hp=250;wall.update(entity,0);assert.equal(wall.visual,1);
  wall.update(entity,.24);assert.equal(wall.visual,.5625);
  wall.update(entity,0);assert.equal(wall.visual,.5625);
  wall.update(entity,.24);assert.equal(wall.visual,.5);
  entity.hp=100;entity.status='collapsing';entity.collapseRemaining=1.4;wall.update(entity,0);assert.equal(wall.visual,.5);
  entity.collapseRemaining=.7;wall.update(entity,.7);assert.equal(wall.visual,.25);
  wall.dispose();
});
