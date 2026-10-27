import assert from 'node:assert/strict';
import {canyonDepositMask} from './qa-canyon-deposit-mask.js';
for(const origin of [-96,0,96]){
 const a=new Uint8Array(4900).fill(42),copy=a.slice();
 const x=canyonDepositMask(a,{minX:origin,minZ:-48}),y=canyonDepositMask(a,{minX:origin+48,minZ:-48});
 assert.deepEqual(a,copy);
 for(let i=0;i<a.length;i++)if(i%4!==1)assert.equal(x[i],a[i]);
 for(let z=0;z<35;z++)for(let k=0;k<3;k++)assert.equal(x[(z*35+32+k)*4+1],y[(z*35+k)*4+1]);
}
console.log('Preserved input/RBA; exact adjacent overlaps at three origins.');
