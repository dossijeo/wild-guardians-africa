import {riverFringeMask} from './qa-river-fringe-mask.js';
import assert from 'node:assert/strict';
for(const wear of [0,10,64,100,153,255]){
 const a=new Uint8Array(35*35*4).fill(wear),copy=a.slice();
 const x=riverFringeMask(a,{minX:-48,minZ:0}),y=riverFringeMask(a,{minX:0,minZ:0});
 assert.deepEqual(a,copy);
 for(let i=0;i<a.length;i++)if(i%4!==3)assert.equal(x[i],a[i]);else assert.ok(x[i]>=a[i]);
 if(wear===0||wear>=153)assert.deepEqual(x,a);
 for(let z=0;z<35;z++)for(let k=0;k<3;k++)assert.equal(x[(z*35+32+k)*4+3],y[(z*35+k)*4+3]);
}
console.log('Source/RGB preserved; wear never decreases; protected interiors unchanged; adjacent chunk overlap exact.');
