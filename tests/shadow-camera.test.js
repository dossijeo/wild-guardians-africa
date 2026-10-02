import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {NATIVE_LIGHT_DIRECTION,configureShadowCamera,updateShadowCamera,resizeShadowMap,nativeShadowSize} from '../src/rendering/shadow-camera.js';

const source=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
// Execute the original matrix functions, rather than comparing Three to a
// second handwritten projection with the same assumptions as production.
const functions=['mm','lookAt','ortho'].map(name=>source.match(new RegExp('function '+name+'\\([^\\n]+'))[0]).join('\n');
const original=Function('norm','sub','cross','dot',functions+';return {mm,lookAt,ortho};')(
 a=>{const n=Math.hypot(...a);return a.map(v=>v/n);},(a,b)=>a.map((v,i)=>v-b[i]),(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0));

test('terrain shadow VP matches the native light and quantized focus through positive, negative and distant targets',()=>{
 assert.ok(source.includes('this.lightDir=norm([-.82,.52,.31])'));assert.ok(source.includes('Math.round(target[0]/8)*8,0,Math.round(target[2]/8)*8'));assert.ok(source.includes('this.updateLight(terrain?150:195,lightFocus)'));
 assert.ok(source.includes('e=add(target,mul(this.lightDir,size*1.6))'));assert.ok(source.includes('ortho(-r,r,-r,r,.1,size*3.6)'));
 const scene=new THREE.Scene(),light=new THREE.DirectionalLight();scene.add(light,light.target);configureShadowCamera(light);
 for(const coords of [[0,20,0],[185,12,36],[-4,9,-12],[10004,200,-50004]]){
  const target=new THREE.Vector3(...coords);updateShadowCamera(light,target);scene.updateMatrixWorld(true);light.shadow.updateMatrices(light);
  const focus=[Math.round(coords[0]/8)*8,0,Math.round(coords[2]/8)*8],eye=focus.map((v,i)=>v+NATIVE_LIGHT_DIRECTION.toArray()[i]*240),expected=original.mm(original.ortho(-75,75,-75,75,.1,540),original.lookAt(eye,focus));
  const actual=new THREE.Matrix4().multiplyMatrices(light.shadow.camera.projectionMatrix,light.shadow.camera.matrixWorldInverse);
  for(let i=0;i<16;i++)assert.ok(Math.abs(actual.elements[i]-expected[i])<.00008,`VP[${i}] at ${coords}: ${actual.elements[i]} != ${expected[i]}`);
  assert.deepEqual(light.target.position.toArray(),focus);
 }
});

test('focus ignores terrain height and sub-grid movement but advances at the native grid boundary',()=>{
 const light=new THREE.DirectionalLight();configureShadowCamera(light);
 assert.equal(updateShadowCamera(light,new THREE.Vector3(1,8,1)),true);const position=light.position.clone();light.shadow.needsUpdate=false;
 assert.equal(updateShadowCamera(light,new THREE.Vector3(3.999,300,-3.999)),false);assert.deepEqual(light.position,position);assert.equal(light.shadow.needsUpdate,false);
 assert.equal(updateShadowCamera(light,new THREE.Vector3(4,-20,0)),true);assert.deepEqual(light.target.position.toArray(),[8,0,0]);assert.equal(light.shadow.needsUpdate,true);
});

test('quality changes replace allocated targets once and same resolution retains GPU resources',()=>{
 assert.ok(source.includes("state.quality==='eco'?768:state.quality==='high'?2048:1024"));
 const light=new THREE.DirectionalLight();light.shadow.mapSize.set(1024,1024);let released=0;light.shadow.map={dispose(){released++;}};light.shadow.mapPass={dispose(){released++;}};
 assert.equal(resizeShadowMap(light,'media'),false);assert.equal(released,0);
 assert.equal(resizeShadowMap(light,'alta'),true);assert.equal(released,2);assert.equal(light.shadow.map,null);assert.equal(light.shadow.mapPass,null);assert.deepEqual(light.shadow.mapSize.toArray(),[2048,2048]);
 light.shadow.map={dispose(){released++;}};assert.equal(resizeShadowMap(light,'alta'),false);assert.equal(released,2);
 assert.equal(resizeShadowMap(light,'baja'),true);assert.equal(released,3);assert.deepEqual(light.shadow.mapSize.toArray(),[768,768]);
 for(const [q,size] of [['muy_baja',768],['baja',768],['media',1024],['alta',2048]])assert.equal(nativeShadowSize(q),size);
});
