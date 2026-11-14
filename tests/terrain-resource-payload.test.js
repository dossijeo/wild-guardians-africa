import test from 'node:test';
import assert from 'node:assert/strict';
import {copyTerrainResourcePayload,sameTerrainResourcePayload} from '../src/world/terrain-resource-payload.js';

test('canonical resource equality covers only the exact typed view, including its first and last byte',()=>{
 for(const Type of [Uint8Array,Uint16Array,Int32Array,Float32Array,Float64Array,BigUint64Array,DataView]){
  const size=Type===DataView?1:Type.BYTES_PER_ELEMENT,length=65*size;
  const a=new ArrayBuffer(length+size*2),b=new ArrayBuffer(length+size*2);
  new Uint8Array(a).fill(7);new Uint8Array(b).fill(7);
  const x=Type===DataView?new DataView(a,size,length):new Type(a,size,65),y=Type===DataView?new DataView(b,size,length):new Type(b,size,65);
  new Uint8Array(b)[0]=99;new Uint8Array(b)[b.byteLength-1]=99;
  assert.equal(sameTerrainResourcePayload(x,y),true,Type.name+' ignores unrelated prefix/suffix');
  for(const index of [0,1,length>>1,length-1]){
   new Uint8Array(b)[size+index]^=1;
   assert.equal(sameTerrainResourcePayload(x,y),false,Type.name+' rejects changed byte '+index);
   new Uint8Array(b)[size+index]^=1;
  }
  assert.equal(sameTerrainResourcePayload(x,y),true);
 }
});

test('canonical float equality retains bit identity for signed zero and distinct NaN payloads',()=>{
 const a=new Float32Array(2),b=new Float32Array(2),x=new Uint32Array(a.buffer),y=new Uint32Array(b.buffer);
 x.set([0,0x7fc00001]);y.set(x);
 assert.equal(sameTerrainResourcePayload(a,b),true);
 y[0]=0x80000000;assert(a[0]===b[0]);assert.equal(sameTerrainResourcePayload(a,b),false);
 y[0]=x[0];y[1]=0x7fc00002;assert(Number.isNaN(a[1])&&Number.isNaN(b[1]));assert.equal(sameTerrainResourcePayload(a,b),false);
 assert.equal(sameTerrainResourcePayload(new Uint32Array(a.buffer),a),false,'equal bytes do not erase the typed contract');
});

test('exact resource proof rejects changes in owned projection bytes and canonical metadata',()=>{
 const source={authority:'spatial-wasm',cx:1,cz:-1,terrain:{positions:new Float32Array([0,1,0]),colors:new Float32Array([1,1,1]),indices:new Uint16Array([0])},groundMask:new Uint8Array(35*35*4),instances:Array.from({length:20},()=>[])};
 source.instances[3].push({id:'spatial:3:1:-1',slot:3,x:1,y:1,z:-1,yaw:0,sx:1,sy:1,sz:1});
 const owned=copyTerrainResourcePayload(source,10),confirmed=copyTerrainResourcePayload(source,10);
 assert.equal(sameTerrainResourcePayload(owned,confirmed),true);
 confirmed.groundMask[confirmed.groundMask.length-1]=1;assert.equal(sameTerrainResourcePayload(owned,confirmed),false);
 confirmed.groundMask[confirmed.groundMask.length-1]=0;confirmed.instances[3][0].id+=':changed';assert.equal(sameTerrainResourcePayload(owned,confirmed),false);
 confirmed.instances[3][0].id=owned.instances[3][0].id;confirmed.capturedAt=11;assert.equal(sameTerrainResourcePayload(owned,confirmed),false);
 confirmed.capturedAt=10;assert.equal(sameTerrainResourcePayload(owned,confirmed),true);
 source.terrain.positions[1]=99;assert.equal(sameTerrainResourcePayload(owned,confirmed),true,'caller arrays cannot modify the retained canonical proof');
});
