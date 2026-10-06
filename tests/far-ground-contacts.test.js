import test from 'node:test';import assert from 'node:assert/strict';
import {farGroundData,farGroundHeight} from '../tools/experiments/far-ground-data.js';
import {fitFarGroundContacts,groundTriangleWeights} from '../tools/experiments/far-ground-contacts.js';
import {readFileSync} from 'node:fs';
import {buildFarSceneData} from '../tools/experiments/far-scene-data.js';
import {treeAtlasAnchor} from '../tools/experiments/far-tree-sampling.js';
test('contact insertion reaches authored foot height without moving trees or increasing base sampling',()=>{
 let samples=0;const data=farGroundData({surface(){samples++;return 0;}},{minX:0,maxX:16,minZ:0,maxZ:16},{step:8});const before=samples;
 const anchors=[{id:'a',x:3,y:.5,z:4},{id:'b',x:5,y:-.2,z:3}],original=structuredClone(anchors),fitted=fitFarGroundContacts(data,anchors);
 assert.deepEqual(anchors,original);assert.equal(samples,before);assert.equal(fitted.contactAnchors.length,2);
 for(const a of anchors)assert.ok(Math.abs(farGroundHeight(fitted,a.x,a.z)-a.y)<1e-6);
 assert.equal(fitted.indices.length,data.indices.length+12);assert.equal(fitted.positions.length,data.positions.length+6);
});
test('grid edge and triangle diagonal contacts share a vertex across all affected triangles',()=>{
 const data=farGroundData({surface:()=>0},{minX:0,maxX:16,minZ:0,maxZ:16},{step:8});
 const fitted=fitFarGroundContacts(data,[{id:'edge',x:8,y:1,z:4},{id:'diagonal',x:4,y:.5,z:4}]);
 for(const [x,z,y] of [[8,4,1],[4,4,.5]])assert.ok(Math.abs(farGroundHeight(fitted,x,z)-y)<1e-6);
 for(let i=0;i<fitted.indices.length;i+=3){const triangle=Array.from(fitted.indices.slice(i,i+3));assert.ok(groundTriangleWeights(fitted.positions,triangle,0,0));}
 assert.ok(Object.keys(fitted.contactCells).length>=2);
});
test('outside and duplicate contacts do not add unused vertices',()=>{
 const data=farGroundData({surface:()=>0},{minX:0,maxX:8,minZ:0,maxZ:8},{step:8});
 const anchor={id:'a',x:2,y:1,z:2},fitted=fitFarGroundContacts(data,[anchor,anchor,{id:'out',x:20,y:0,z:2}]);assert.equal(fitted.contactAnchors.length,1);
});
test('seeded regional terrain reaches every native anisotropic foot without changing procedural instances',()=>{
 const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile,base=[.05150783061981201,0,1.2762385308742523];
 const request={config:{seed:'712',biome:'savanna',relief:1,river:true,density:1,n:1,cx:0,cz:0,layers:Array(6).fill(true)},profile,treeBounds:{minX:-180,maxX:180,minZ:-180,maxZ:180},groundBounds:{minX:-212,maxX:212,minZ:-212,maxZ:212},step:8};
 const original=buildFarSceneData(request),fitted=buildFarSceneData({...request,treeBase:base});assert.deepEqual(fitted.trees,original.trees);assert.equal(fitted.ground.contactAnchors.length,fitted.trees.length);
 for(const tree of fitted.trees){const foot=treeAtlasAnchor(tree,base);assert.ok(Math.abs(farGroundHeight(fitted.ground,Math.fround(foot.x),Math.fround(foot.z))-Math.fround(foot.y))<1e-6);}
 assert.ok(fitted.ground.indices.length<original.ground.indices.length*1.1);
});
