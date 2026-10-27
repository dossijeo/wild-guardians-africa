import test from 'node:test';
import assert from 'node:assert/strict';
import {farWaterUnits,prepareFarWaterIncremental} from '../tools/experiments/prepare-far-water-incremental.js';
test('incremental water preserves every authoritative query and exact attribute',()=>{
 const positions=Float32Array.from({length:999},(_,i)=>Math.sin(i)*100),calls=[];
 const field={waterInfo(x,z){calls.push([x,z]);return {inside:x+z>0};}},data={positions};
 const it=farWaterUnits(data,field,{batchSize:17});let next,steps=0;
 do{next=it.next();if(!next.done)steps++;}while(!next.done);
 assert.equal(steps,20);assert.equal(calls.length,333);
 assert.deepEqual(next.value,Float32Array.from({length:333},(_,i)=>positions[i*3]+positions[i*3+2]>0?1:0));
 assert.equal(data.water,undefined);
});
test('cancelled preparation never publishes partial values',async()=>{
 let cancelled=false,queries=0;
 const data={positions:new Float32Array(600)},field={waterInfo(){queries++;return {inside:true};}};
 const world={nav:{field},frameScheduler:{async submit(it){it.next();cancelled=true;it.next();}}};
 await assert.rejects(prepareFarWaterIncremental(data,world,()=>cancelled),{name:'AbortError'});
 assert.equal(queries,64);assert.equal(data.water,undefined);
});
test('completed preparation publishes once; existing data is borrowed unchanged',async()=>{
 const data={positions:new Float32Array(600)},field={waterInfo:()=>({inside:true})};
 const world={nav:{field},frameScheduler:{async submit(it){while(!it.next().done){assert.equal(data.water,undefined);}}}};
 await prepareFarWaterIncremental(data,world,()=>false);assert.deepEqual(data.water,new Float32Array(200).fill(1));
 const original=data.water;await prepareFarWaterIncremental(data,{},()=>false);assert.equal(data.water,original);
});
