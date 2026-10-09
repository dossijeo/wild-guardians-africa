import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WebGLUniforms} from 'three/src/renderers/webgl/WebGLUniforms.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {standardDepthMaterial} from '../src/rendering/standard-depth.js';
const ground=(bounds,Basic=true)=>{const m=Basic?new THREE.MeshBasicMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true});Object.assign(m.userData,{toonGround:true,nativeGroundColor:true,biomeGround:{uGroundOn:{value:1}}});if(bounds)m.userData.horizonBounds=bounds;return m;};
const compile=m=>{const lib=m.isMeshBasicMaterial?THREE.ShaderLib.basic:THREE.ShaderLib.standard,s={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};m.onBeforeCompile(s,{});return s;};
test('opt-in Basic ground has identical color source/key with independent resident/horizon bounds',()=>{
 const bounds=new THREE.Vector4(-48,-48,48,48),resident=ground(),horizon=ground(bounds),second=ground(),toon=new AfricanToon({sharedGroundClip:true});[resident,horizon,second].forEach(m=>toon.material(m));const a=compile(resident),b=compile(horizon),c=compile(second);assert.equal(a.vertexShader,b.vertexShader);assert.equal(a.fragmentShader,b.fragmentShader);assert.equal(resident.customProgramCacheKey(),horizon.customProgramCacheKey());assert.notEqual(a.uniforms.uHorizonBounds.value,c.uniforms.uHorizonBounds.value);assert.deepEqual(a.uniforms.uHorizonBounds.value.toArray(),[0,0,0,0]);assert.equal(b.uniforms.uHorizonBounds.value,bounds);assert.ok(b.fragmentShader.includes('vToonWorld.x<uHorizonBounds.z&&vToonWorld.z<uHorizonBounds.w)discard;'));
 const inside=(x,z,r)=>x>=r.x&&z>=r.y&&x<r.z&&z<r.w;for(const x of [-100,-48,0,47.9,48,100])assert.equal(inside(x,0,a.uniforms.uHorizonBounds.value),false);assert.equal(inside(-48,-48,bounds),true);assert.equal(inside(48,0,bounds),false);assert.equal(inside(0,48,bounds),false);
 resident.dispose();horizon.dispose();second.dispose();
});
test('actual Three uniform cache uploads resident/horizon/resident and moved bounds independently',()=>{
 const a=ground(),bounds=new THREE.Vector4(-48,-48,48,48),b=ground(bounds),toon=new AfricanToon({sharedGroundClip:true});[a,b].forEach(m=>toon.material(m));const sa=compile(a),sb=compile(b),uploads=[];const gl={ACTIVE_UNIFORMS:0x8B86,getProgramParameter:()=>1,getActiveUniform:()=>({name:'uHorizonBounds',type:0x8B52,size:1}),getUniformLocation:()=>0,uniform4f:(location,...values)=>uploads.push(values)},shared=new WebGLUniforms(gl,{});for(const shader of [sa,sb,sa])WebGLUniforms.upload(gl,shared.seq,shader.uniforms);bounds.set(0,0,96,96);WebGLUniforms.upload(gl,shared.seq,sb.uniforms);assert.deepEqual(uploads,[[0,0,0,0],[-48,-48,48,48],[0,0,0,0],[0,0,96,96]]);assert.deepEqual(sa.uniforms.uHorizonBounds.value.toArray(),[0,0,0,0]);a.dispose();b.dispose();
});
test('depth recipes retain original separate resident and clipped silhouette signatures',()=>{
 const a=ground(),b=ground(new THREE.Vector4(-48,-48,48,48)),toon=new AfricanToon({sharedGroundClip:true});[a,b].forEach(m=>toon.material(m));const da=standardDepthMaterial(a),db=standardDepthMaterial(b);assert.notEqual(da.customProgramCacheKey(),db.customProgramCacheKey());const depth=m=>{const s={uniforms:{},vertexShader:THREE.ShaderLib.depth.vertexShader,fragmentShader:THREE.ShaderLib.depth.fragmentShader};m.onBeforeCompile(s,{});return s;};const x=depth(da),y=depth(db);assert.equal(x.uniforms.uHorizonBounds,undefined);assert.equal(y.uniforms.uHorizonBounds.value,b.userData.horizonBounds);assert.ok(y.fragmentShader.includes('vDepthWorld.x<uHorizonBounds.z'));a.dispose();b.dispose();
});
test('default and Standard ground keep their original distinct color recipes',()=>{
 for(const [Basic,sharedGroundClip] of [[true,false],[false,true]]){const a=ground(undefined,Basic),b=ground(new THREE.Vector4(-1,-1,1,1),Basic),toon=new AfricanToon({sharedGroundClip});[a,b].forEach(m=>toon.material(m));assert.notEqual(a.customProgramCacheKey(),b.customProgramCacheKey());assert.equal(compile(a).uniforms.uHorizonBounds,undefined);a.dispose();b.dispose();}
});
