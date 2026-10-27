import test from 'node:test';
import assert from 'node:assert/strict';
import {riverBankMask,riverBankEnabled} from '../src/rendering/river-bank-mask.js';
const field={seed:712,waterInfo:(x,z)=>({shore:Math.abs(Math.sin(z*.05)+x-24)})};
test('bank mask owns its copy and preserves other channels and existing wear',()=>{
 const input=new Uint8Array(35*35*4).fill(77),before=input.slice();input[3]=255;before[3]=255;
 const result=riverBankMask(input,field,{minX:-24,minZ:-24});assert.notEqual(result,input);assert.deepEqual(input,before);
 for(let i=0;i<result.length;i++)assert.ok(i%4===3?result[i]>=input[i]:result[i]===input[i]);
 assert.ok(result.some((v,i)=>i%4===3&&v>input[i]));
});
test('neighbor chunks agree on all three overlapping columns',()=>{
 const input=new Uint8Array(35*35*4),a=riverBankMask(input,field,{minX:-24,minZ:-24}),b=riverBankMask(input,field,{minX:24,minZ:-24});
 for(let z=0;z<35;z++)for(let x=0;x<3;x++)assert.equal(a[(z*35+32+x)*4+3],b[(z*35+x)*4+3]);
});
test('bank requires explicit laboratory and soil options',()=>{
 assert.equal(riverBankEnabled('?visualLab=global-lighting&riverSoil=1&riverBank=soil'),true);
 for(const q of ['', '?riverBank=soil','?visualLab=global-lighting&riverBank=soil','?visualLab=global-lighting&riverSoil=1'])assert.equal(riverBankEnabled(q),false);
});
