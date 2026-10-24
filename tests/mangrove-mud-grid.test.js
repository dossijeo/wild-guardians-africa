import test from 'node:test';
import assert from 'node:assert/strict';
import {mudTerrainKey} from '../src/rendering/global-mangrove-mud-edges.js';
test('numeric lookup preserves legacy rounded-coordinate equivalence including irregular and signed-zero positions',()=>{
 const values=[-32769,-32768,-24,-1,-.00006,-.00001,-0,0,.00001,.00006,.123456,1,24,32767,32768];
 const legacy=new Map(),fast=new Map();let id=0;
 for(const x of values)for(const z of values){const old=x.toFixed(4)+','+z.toFixed(4),key=mudTerrainKey(x,z);assert.equal(fast.get(key),legacy.get(old));legacy.set(old,id);fast.set(key,id++);}
 for(const x of values)for(const z of values)assert.equal(fast.get(mudTerrainKey(x,z)),legacy.get(x.toFixed(4)+','+z.toFixed(4)));
 const grid=new Map();for(let z=-24;z<=24;z++)for(let x=-24;x<=24;x++)grid.set(mudTerrainKey(x,z),[x,z]);assert.equal(grid.size,49*49);
});
