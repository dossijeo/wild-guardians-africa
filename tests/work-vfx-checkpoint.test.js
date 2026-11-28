import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeVfx} from '../src/rendering/vfx-native.js';

for(const [id,options] of [['dig',{}],['water',{}],['harvest',{}],['dust',{stepMode:true}]])test(`${id} work checkpoint round-trips and continues deterministically`,()=>{
 let x=0;const make=()=>createNativeVfx(id,{}, {...options,surface:(a,b)=>.02*a+.01*b,waterSource:()=>({position:[x,1.2,0],direction:[.4,0,.9]})}),source=make();source.advance(.9);x=.2;source.advance(.3);const serialized=JSON.parse(JSON.stringify(source.exportWorkCheckpoint())),target=make();target.importWorkCheckpoint(serialized);assert.deepEqual(target.exportWorkCheckpoint(),source.exportWorkCheckpoint());
 serialized.parts.length=0;serialized.rigids.length=0;assert.deepEqual(target.exportWorkCheckpoint(),source.exportWorkCheckpoint());for(let i=0;i<12;i++){x=i*.03;source.advance(.05);target.advance(.05);assert.deepEqual(target.exportWorkCheckpoint(),source.exportWorkCheckpoint());}
});

test('malformed or incompatible checkpoints fail without altering the running effect',()=>{
 const source=createNativeVfx('water',{}, {surface:()=>0,waterSource:()=>({position:[0,1,0],direction:[0,0,1]})});source.advance(1);const before=source.exportWorkCheckpoint();for(const bad of [{...before,version:2},{...before,id:'dig'},{...before,seed:NaN},{...before,eventIndex:999},{...before,config:{...before.config,stepMode:true}},{...before,rigids:[{kind:'bogus'}]}]){assert.throws(()=>source.importWorkCheckpoint(bad));assert.deepEqual(source.exportWorkCheckpoint(),before);}const other=createNativeVfx('water',{},{});assert.throws(()=>other.importWorkCheckpoint(before),/checkpoint/);
});
