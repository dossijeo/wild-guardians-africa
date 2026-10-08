import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeSourceVertex} from './lib/frontside-source-native-growth.mjs';
const u={ground:.10,height:2,clock:1.75,wind:0};
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-12));
test('native root anchors remain fixed and growth transports source normals per vertex',()=>{
 const root=nativeSourceVertex([.3,.05,.2],[0,1,0],[.4,.6,.2,5],{...u,wind:1});close(root.objectPosition,[.3,.05,.2]);
 const state=nativeSourceVertex([.2,1,.1],[1,1,0],[.5,.8,1,0],u);close(state.objectPosition,[.16,.55,.08]);
 const length=Math.hypot(1/.8,1/.5);close(state.viewVertexNormal,[1/.8/length,1/.5/length,0]);
});
test('source instance scale and view transforms follow Three defaultnormal convention',()=>{
 const instance=[0,0,-2,0,0,3,0,0,2,0,0,0,4,5,6,1],view=[1,0,0,0,0,1,0,0,0,0,1,0,-1,-2,-3,1];
 const result=nativeSourceVertex([.2,1,.1],[1,0,0],[1,1,1,0],u,{instanceMatrix:instance,modelViewMatrix:view});close(result.viewPosition,[3.2,6,2.6]);close(result.viewVertexNormal,[0,0,-1]);
 const flipped=nativeSourceVertex([.2,1,.1],[1,0,0],[1,1,1,0],u,{instanceMatrix:instance,flipSided:true});close(flipped.viewVertexNormal,[0,0,1]);
});
