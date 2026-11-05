import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';
import {createWebGpuCropRoster} from '../src/rendering/webgpu-crop-roster.js';

test('settlement reconciliation and terrain changes invalidate selectable content',()=>{
 let changes=0;const state={villages:[],structures:[]},view=createWebGpuSettlements({scene:new Scene(),state,residency:{get:()=>null},onSelectableChange:()=>changes++});
 view.sync();assert.equal(changes,1);view.sync();assert.equal(changes,2);state.structures.push({id:'s',kind:'other'});view.sync();assert.equal(changes,3);view.terrainChanged();assert.equal(changes,4);view.tick(0);assert.equal(changes,4);view.dispose();view.sync();assert.equal(changes,4);
});
test('crop reconciliation invalidates selectable content even before assets arrive',()=>{
 let changes=0;const state={plants:[]},view=createWebGpuCropRoster({scene:new Scene(),state,residency:{},renderer:{backend:{isWebGPUBackend:true}},onSelectableChange:()=>changes++});
 const initial=changes;view.sync();assert.equal(changes,initial+1);state.plants.push({id:'p',alive:false,growth:0});view.sync();assert.equal(changes,initial+2);state.plants[0].growth=1;view.sync();assert.equal(changes,initial+3);view.terrainChanged();assert.equal(changes,initial+4);view.dispose();view.sync();assert.equal(changes,initial+4);
});
