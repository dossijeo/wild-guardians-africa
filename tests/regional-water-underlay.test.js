import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFarSceneData} from '../tools/experiments/far-scene-data.js';

test('transparent regional water retains native ground height and land palette beneath its banks',()=>{
 const bounds={minX:0,minZ:0,maxX:8,maxZ:8},native={trees:[],colorAt:()=>[.1,.5,.2],field:{wetland:true,surface:()=>2.9,wetlandLevel:()=>3.34,waterInfo:()=>({inside:true,level:3.34,mask:.9,shore:2})}};
 const request={config:{biome:'mangrove'},profile:{colors:{water:'#225588'}},treeBounds:bounds,groundBounds:bounds,step:8,colorMapStep:4,waterSurface:true,groundWash:0};
 const underlay=buildFarSceneData({...request,regionalWaterBed:true},native).ground;
 const painted=buildFarSceneData(request,native).ground;
 assert.ok(underlay.waterBed);
 for(let i=0;i<underlay.positions.length/3;i++){
  assert.ok(Math.abs(underlay.positions[i*3+1]-2.9)<1e-6);
  assert.ok(Math.abs(underlay.colors[i*3+1]-.5)<1e-6);
  assert.ok(Math.abs(painted.positions[i*3+1]-3.34)<1e-6);
 }
 assert.notDeepEqual(underlay.colors,painted.colors);
 for(let i=0;i<underlay.colorMap.data.length;i++)if(i%4!==3)assert.equal(underlay.colorMap.data[i],painted.colorMap.data[i],'Land channels stay unchanged');
 assert.ok(underlay.colorMap.data[3]>127,'Continuous coverage remains wet');
});

test('water-rooted tree contacts preserve submerged terrain without moving trees',()=>{
 const bounds={minX:0,minZ:0,maxX:8,maxZ:8},tree={id:1,x:4,y:3.34,z:4,yaw:0,sx:1,sy:1,sz:1};
 const native={trees:[tree],colorAt:()=>[.1,.5,.2],field:{wetland:true,surface:()=>3.32,wetlandLevel:()=>3.34,waterInfo:()=>({inside:true,level:3.34,mask:1,shore:4})}};
 const request={config:{biome:'mangrove'},profile:{colors:{water:'#225588'}},treeBounds:bounds,groundBounds:bounds,step:8,colorMapStep:4,waterSurface:true,regionalWaterBed:true,treeBase:[0,0,0]};
 const result=buildFarSceneData(request,native);
 assert.equal(result.trees[0].y,3.34);
 assert.ok(result.ground.contactAnchors.length>0);
 for(let i=1;i<result.ground.positions.length;i+=3)assert.ok(Math.abs(result.ground.positions[i]-3.32)<1e-6);
 native.field.waterInfo=()=>({inside:false,level:null,mask:0,shore:4});
 const dry=buildFarSceneData(request,native).ground;
 assert.ok(dry.positions.some((v,i)=>i%3===1&&Math.abs(v-3.34)<1e-6),'Dry authored contacts remain fitted');
});
