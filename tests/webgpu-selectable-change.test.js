import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';
import {createWebGpuCropRoster} from '../src/rendering/webgpu-crop-roster.js';

test('settlement reconciliation and terrain changes invalidate selectable content',()=>{
 let changes=0;const view=createWebGpuSettlements({scene:new Scene(),state:{villages:[],structures:[]},residency:{get:()=>null},onSelectableChange:()=>changes++});
 view.sync();assert.equal(changes,1);view.terrainChanged();assert.equal(changes,2);view.tick(0);assert.equal(changes,2);view.dispose();view.sync();assert.equal(changes,2);
});
test('crop reconciliation invalidates selectable content even before assets arrive',()=>{
 let changes=0;const view=createWebGpuCropRoster({scene:new Scene(),state:{plants:[]},residency:{},renderer:{backend:{isWebGPUBackend:true}},onSelectableChange:()=>changes++});
 const initial=changes;view.sync();assert.equal(changes,initial+1);view.terrainChanged();assert.equal(changes,initial+2);view.dispose();view.sync();assert.equal(changes,initial+2);
});
