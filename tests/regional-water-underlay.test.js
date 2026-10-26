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
