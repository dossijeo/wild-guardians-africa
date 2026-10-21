import test from 'node:test';
import assert from 'node:assert/strict';
import {observeSuppressionRecords} from '../src/rendering/wild-renderer/suppression-events.js';
import {emit} from '../src/simulation/game.js';

test('suppression records read only appended identities at confirmed events',()=>{
 let reads=0;const values=['spatial:0:1:2'];
 const state={sequence:1,events:[],suppressed:new Proxy(values,{get(target,key){if(/^\d+$/.test(String(key)))reads++;return target[key];}})};
 const notifications=[];const observer=observeSuppressionRecords(state,(records,first)=>notifications.push({count:records.length/3,first}));assert.equal(reads,1);
 const first=observer.records;
 for(let i=0;i<100;i++)assert.equal(observer.records,first);
 emit(state,'StructureHit');assert.equal(reads,1);assert.equal(notifications.length,1);
 values.push('spatial:2:-4:9');emit(state,'PlacementCommitted');
 assert.equal(reads,2);assert.deepEqual(notifications,[{count:1,first:0},{count:2,first:1}]);assert.deepEqual(Array.from(observer.records),[0,1,2,2,-4,9]);
 observer.dispose();values.push('spatial:1:7:8');emit(state,'CropPlaced');
 assert.equal(reads,2);assert.equal(observer.records.length,6);
});
