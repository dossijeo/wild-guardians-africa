import test from 'node:test';
import assert from 'node:assert/strict';
import {canyonBankMask} from '../tools/experiments/qa-canyon-bank-mask.js';
test('bank mask preserves source channels and shared chunk samples',()=>{
 const bytes=new Uint8Array(4900).fill(73),field={waterInfo:(x,z)=>({shore:Math.abs(x-z*.1)})};
 const a=canyonBankMask(bytes,{minX:0,minZ:0},field),b=canyonBankMask(bytes,{minX:48,minZ:0},field);
 for(let i=0;i<bytes.length;i++){assert.equal(bytes[i],73);if(i%4!==2)assert.equal(a[i],73);}
 for(let z=0;z<35;z++)for(let x=0;x<3;x++)assert.equal(a[(z*35+x+32)*4+2],b[(z*35+x)*4+2]);
 assert.equal(a[(1*35+1)*4+2],255);assert.equal(a[(1*35+5)*4+2],0);
});

test('inactive river never queries water or marks damp banks',()=>{const a=canyonBankMask(new Uint8Array(4900).fill(255),{}, {riverActive:false,waterInfo(){throw Error('Unexpected query')}});for(let i=2;i<a.length;i+=4)assert.equal(a[i],0);});
