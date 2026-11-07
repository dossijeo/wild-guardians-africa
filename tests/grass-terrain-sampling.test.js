import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleGrassTerrain} from '../src/rendering/grass-terrain-sampling.js';

test('grass terrain sampling follows both native terrain triangles and interpolates the mask',()=>{
 const h=new Float32Array(49*49),data=new Uint8Array(35*35*4);h[1]=2;h[49]=4;h[50]=10;
 for(let z=0;z<35;z++)for(let x=0;x<35;x++)data.set([x*4,z*4,128,255],(z*35+x)*4);
 const c={cx:0,cz:0,h,mask:{data}};
 const a=sampleGrassTerrain(c,-23.75,-23.75);assert.equal(a.y,1.5);assert.equal(a.sx,2);assert.equal(a.sz,4);assert.ok(Math.abs(a.ctx[0]-4*(1+1/6)/255)<1e-12);assert.equal(a.ctx[2],128/255);
 const b=sampleGrassTerrain(c,-23.25,-23.25);assert.equal(b.y,6.5);assert.equal(b.sx,6);assert.equal(b.sz,8);assert.equal(b.ctx[3],1);
});

test('chunk origin and edges are clamped without reading beyond terrain buffers',()=>{
 const c={cx:2,cz:-1,h:new Float32Array(49*49).fill(7),mask:{data:new Uint8Array(35*35*4).fill(255)}};
 for(const [x,z] of [[72,-72],[120,-24],[-1000,1000]]){const s=sampleGrassTerrain(c,x,z);assert.equal(s.y,7);assert.equal(s.sx,0);assert.equal(s.sz,0);assert.deepEqual(s.ctx,[1,1,1,1]);}
});
