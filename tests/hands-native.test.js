import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import * as THREE from 'three';
import {NativeHands} from '../src/rendering/hands.js';
import {HandHints3D,HAND_ASSETS,HAND_INFO,handEffects} from '../src/rendering/hands-native.js';
import {quadTerrainLift} from '../src/rendering/hand-terrain.js';
import {tutorialHandTarget} from '../src/rendering/tutorial-hand-target.js';
const source=readFileSync(new URL('../references/extracted/Guardian_Tutorial_V8_Avatar_y_Manos_3D/script-0.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/hands-native.json',import.meta.url),'utf8'));
const plain=value=>JSON.parse(JSON.stringify(value));
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const HAND_ASSETS ='),source.indexOf('const $ ='))+
  source.slice(source.indexOf('const clamp ='),source.indexOf('const reducedMotion ='))+
  source.slice(source.indexOf('const V3='),source.indexOf('const M4='))+
  source.slice(source.indexOf('function clipQuadXZ('),source.indexOf('class FarmWorld3D {'))+';this.Hand=HandHints3D;',context);
const scene=()=>({objects:new Map(),colliders:[],handMotion:true,surfaceAt:()=>0});
const camera={right:[1,0,0],up:[0,Math.SQRT1_2,-Math.SQRT1_2]};
test('Native hand source, reproducible module and all six original textures retain registered hashes',()=>{
  for(const [path,hash] of [[manifest.source,manifest.sourceSha256],['src/rendering/hands-native.js',manifest.moduleSha256]])assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
  for(const path of Object.values(HAND_ASSETS))assert.equal(createHash('sha256').update(readFileSync(new URL('../public'+path,import.meta.url))).digest('hex'),path.split('/').at(-1).split('.')[0]);
});
for(const kind of Object.keys(HAND_INFO))test(`Native ${kind} pivot and motion exactly match V8 across camera orientations`,()=>{
  const actual=new HandHints3D(scene(),{}),expected=new context.Hand(scene(),{});
  actual.custom=expected.custom={kind,position:[1,.025,2]};
  for(const angle of [0,.2,.8,1.4])for(let i=0;i<120;i++){
    const cam={right:[Math.cos(angle),0,-Math.sin(angle)],up:[Math.sin(angle)*.6,.8,Math.cos(angle)*.6]},t=i*.113;
    assert.deepEqual(plain(actual.makePose(t,cam)),plain(expected.makePose(t,cam)));
  }
});
test('Quad protection catches a building crossing the middle while every corner lies outside its footprint',()=>{
  const s=scene();s.colliders=[{id:'building',min:[-.1,0,-.1],max:[.1,3,.1]}];
  const hints=new HandHints3D(s,{}),pose={type:'open',root:[0,.2,0],corners:[[-2,.2,-2],[2,.2,-2],[2,.2,2],[-2,.2,2]]};
  hints.protect(pose,.016);assert.ok(pose.corners.every(p=>p[1]>=3.085));assert.deepEqual(hints.intersections(pose),[]);
});
test('Target rings, dashed contact lines and drag corridor reuse the original native effect geometry',()=>{
  const native=vm.createContext({});
  let draw=source.slice(source.indexOf(' drawEffects(p,cam){'),source.indexOf('  gl.enable(gl.BLEND);gl.depthMask(false);',source.indexOf(' drawEffects(p,cam){')));
  draw=draw.replace(' drawEffects(p,cam){','function originalEffects(p){');draw+='return {triangles:g.array(),lines:l.array(),ringAlpha:a*.90,lineAlpha:a*.70};}';
  vm.runInContext(source.slice(source.indexOf('const V3='),source.indexOf('const M4='))+source.slice(source.indexOf('const rgb8='),source.indexOf('function compileWorldProgram('))+draw+';this.draw=originalEffects;',native);
  const hints=new HandHints3D(scene(),{});hints.opacity=.8;hints.routeFloor=4.3;
  for(const type of Object.keys(HAND_INFO)){
    hints.custom={kind:type,position:[3,.025,4]};const pose=hints.protect(hints.makePose(1.32,camera),.016);
    const expected=native.draw.call({hands:hints},pose),actual=handEffects(pose,hints);
    assert.deepEqual(Array.from(actual.triangles),Array.from(expected.triangles));assert.deepEqual(Array.from(actual.lines),Array.from(expected.lines));
    assert.equal(actual.ringAlpha,expected.ringAlpha);assert.equal(actual.lineAlpha,expected.lineAlpha);
    assert.equal(actual.triangles.length/9,576);assert.ok(actual.lines.length/9<=98);
  }
});
test('Terrain protection includes interior ridges between low quad corners',()=>{
  const corners=[[-1.5,.1,-1.5],[1.5,.1,-1.5],[1.5,.1,1.5],[-1.5,.1,1.5]],surface=(x,z)=>x===0&&z===0?3:0;
  const lift=quadTerrainLift(corners,surface);assert.ok(Math.abs(lift-2.935)<1e-9);
  assert.equal(quadTerrainLift(corners.map(p=>[p[0],p[1]+lift,p[2]]),surface),0);
});
test('Terrain adapter permits negative elevations and follows moving targets without lifting to world zero',()=>{
  const s=scene();s.terrainClearance=c=>quadTerrainLift(c,()=>-12);
  s.objects.set('worker',{position:[0,-11,0],anchor:[0,0,0]});
  const hints=new HandHints3D(s,{});hints.custom={kind:'open',target:'worker'};
  let pose=hints.protect(hints.makePose(0,camera),.016);assert.ok(pose.root[1]<-9);assert.deepEqual(hints.intersections(pose),[]);
  s.objects.get('worker').position=[5,-11,8];pose=hints.protect(hints.makePose(0,camera),.016);assert.equal(pose.target[0],5);assert.equal(pose.target[2],8);
});
test('Day-one hand targets actionable planting, never asks for automatic harvesting and preserves game state',()=>{
  const state={culture:'mapungubwe',day:1,result:null,tutorial:{step:'intro'},villages:[{id:'v',x:0,z:0,entry:{x:2,z:3}}],structures:[],plants:[],workers:[]};
  const nav={field:{surface:()=>-3},placement:()=>({valid:true}),path:(_a,b)=>[{x:b.x,z:b.z}]};
  const check=(step,kind,id)=>{state.tutorial.step=step;const before=JSON.stringify(state),target=tutorialHandTarget(state,nav,step);assert.equal(target.kind,kind);assert.equal(target.target,id);assert.equal(JSON.stringify(state),before);return target;};
  assert.equal(tutorialHandTarget(state,nav),null);state.tutorial.step='center';assert.equal(tutorialHandTarget(state,nav),null);
  state.structures.push({id:'c',kind:'center',x:4,z:5,status:'intact'});
  check('plant','tap','plant-site');state.plants.push({id:'p',species:'mijo',alive:true,x:6,z:7,growth:140});
  state.tutorial.step='hire';assert.equal(tutorialHandTarget(state,nav),null);state.workers.push({id:'w',status:'walking',x:7,z:8,path:[{x:9,z:10}]});
  state.tutorial.step='observe';assert.equal(tutorialHandTarget(state,nav),null);
  state.tutorial.step='harvest';assert.equal(tutorialHandTarget(state,nav),null);state.day=2;assert.equal(tutorialHandTarget(state,nav),null);
  state.day=1;state.tutorial.step='done';assert.equal(tutorialHandTarget(state,nav),null);
});
test('Production renderer uses a depth-tested four-vertex quad, follows targets and removes all resources',async()=>{
  const world=new THREE.Scene(),loaded=[],textures=[];
  const textureLoader={loadAsync:async url=>{loaded.push(url);const texture=new THREE.Texture();textures.push(texture);return texture;}};
  const hands=new NativeHands(world,()=>-4,{textureLoader});await hands.ready;
  assert.deepEqual(loaded.sort(),Object.values(HAND_ASSETS).sort());
  assert.equal(hands.mesh.geometry.getAttribute('position').count,4);assert.equal(hands.mesh.geometry.getIndex().count,6);
  assert.equal(hands.material.depthTest,true);assert.equal(hands.material.depthWrite,false);
  const camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(5,4,8);camera.lookAt(0,0,0);
  hands.show({kind:'tap',target:'real-plant',position:[0,-3.975,0]});hands.update(.1,camera);assert.equal(hands.mesh.visible,true);
  hands.show({kind:'tap',target:'real-plant',position:[5,-3.975,2]});hands.update(.1,camera);assert.deepEqual(hands.hints.last.target,[5,-3.975,2]);
  hands.show(null);hands.update(.016,camera);assert.equal(hands.mesh.visible,false);assert.ok(hands.effects.every(object=>!object.visible));
  let disposed=0;for(const texture of textures)texture.addEventListener('dispose',()=>disposed++);hands.dispose();assert.equal(disposed,6);assert.equal(world.children.length,0);
});
