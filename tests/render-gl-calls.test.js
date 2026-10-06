import test from 'node:test';
import assert from 'node:assert/strict';
import {RenderGlCalls} from './browser/render-gl-calls.js';

test('frame counters forward receiver, arguments and return values without counting outside the frame',()=>{
 const args=[],gl={bufferData(...values){assert.equal(this,gl);args.push(values);return 42;}};
 const original=gl.bufferData,probe=new RenderGlCalls(gl);assert.equal(gl.bufferData(1,2),42);probe.begin();
 assert.equal(gl.bufferData(3,4),42);const sample=probe.end();assert.equal(sample.bufferData,1);assert.equal(sample.compileShader,0);
 gl.bufferData(5);assert.equal(sample.bufferData,1);assert.deepEqual(args,[[1,2],[3,4],[5]]);
 probe.begin();assert.throws(()=>probe.begin(),/Nested/);assert.equal(probe.end().bufferData,0);probe.dispose();assert.equal(gl.bufferData,original);
});

test('native errors propagate; inherited methods and newer hooks retain their ownership',()=>{
 const original=function(){throw Error('GL failure');},prototype={compileShader:original},gl=Object.create(prototype),probe=new RenderGlCalls(gl);
 probe.begin();assert.throws(()=>gl.compileShader(),/GL failure/);assert.equal(probe.end().compileShader,1);probe.dispose();assert.equal(Object.hasOwn(gl,'compileShader'),false);
 const newer=()=>{};const second=new RenderGlCalls(gl);gl.compileShader=newer;second.dispose();assert.equal(gl.compileShader,newer);
});

test('a failed constructor removes preceding wrappers instead of leaving a partial probe',()=>{
 const compileShader=()=>{},gl={compileShader};Object.defineProperty(gl,'linkProgram',{value:()=>{},writable:false});
 assert.throws(()=>new RenderGlCalls(gl),TypeError);assert.equal(gl.compileShader,compileShader);
});


test('draw attribution observes the actual temporary material and preserves renderer calls',()=>{
 const gl={linkProgram(){}},material={type:'MeshDepthMaterial',uniforms:{uCut:{}},userData:{worldDepthCompatible:true},colorWrite:false};
 const args=[],renderer={renderBufferDirect(...values){assert.equal(this,renderer);args.push(values);gl.linkProgram();return 7;}};
 const original=renderer.renderBufferDirect,probe=new RenderGlCalls(gl,renderer),camera={type:'PerspectiveCamera'},object={name:'test'};
 probe.begin();assert.equal(renderer.renderBufferDirect(camera,null,null,material,object),7);
 const frame=probe.end();assert.equal(frame.linkProgram,1);assert.deepEqual(frame.drawCompiles,[{links:1,object:'test',material:'MeshDepthMaterial',uniforms:['uCut'],metadata:['worldDepthCompatible'],colorWrite:false,camera:'PerspectiveCamera'}]);
 assert.equal(args[0][3],material);probe.dispose();assert.equal(renderer.renderBufferDirect,original);
});


test('optional program diagnostics record pre/post cache state and the original draw geometry without changing calls',()=>{
 const prior={id:1,cacheKey:'old'},next={id:2,cacheKey:'new'},programs=new Map([['old',prior]]),material={type:'MeshStandardMaterial',userData:{paintUniforms:{}},colorWrite:true},geometry={type:'BufferGeometry'},object={isInstancedMesh:true,receiveShadow:true,userData:{nativeFluid:'asset'},parent:{name:'chunk'}};
 const gl={linkProgram(){}},renderer={properties:{get:m=>{assert.equal(m,material);return {programs};}},renderBufferDirect(camera,scene,g,m,o){assert.equal(g,geometry);assert.equal(o,object);programs.set('new',next);gl.linkProgram();return 8;}};
 const probe=new RenderGlCalls(gl,renderer,{programDetails:true});probe.begin();assert.equal(renderer.renderBufferDirect({type:'PerspectiveCamera'},null,geometry,material,object),8);const row=probe.end().drawCompiles[0];
 assert.deepEqual(row.beforePrograms,[{id:1,key:'old'}]);assert.deepEqual(row.afterPrograms,[{id:1,key:'old'},{id:2,key:'new'}]);assert.equal(row.instanced,true);assert.equal(row.fluidKind,'asset');assert.equal(row.geometry,'BufferGeometry');probe.dispose();
});
