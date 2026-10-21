import test from 'node:test';
import assert from 'node:assert/strict';
import {riverYardIslands,nativePathNoise} from '../tools/experiments/qa-river-yard-islands.js';
import {hashCell} from '../src/world/terrain.js';
test('yard visual mask preserves input/RGB, shared samples and approach center',()=>{
 const seed=712,site={x:0,z:0,clearRadius:32,softRadius:38,haloRadius:45},field={seed,c:{biome:'grand_river',settlementSite:site}};
 const source=new Uint8Array(35*35*4);for(let i=0;i<source.length;i+=4)source.set([90,110,150,220],i);
 const before=source.slice(),a=riverYardIslands(source,{minX:-24,minZ:-24},field),b=riverYardIslands(source,{minX:24,minZ:-24},field);
 assert.deepEqual(source,before);let changed=0;
 for(let i=0;i<source.length;i+=4){assert.deepEqual(a.slice(i,i+3),source.slice(i,i+3));assert.ok(a[i+3]<=source[i+3]);changed+=a[i+3]!==source[i+3];}
 assert.ok(changed>0);
 for(let z=0;z<35;z++)for(let x=0;x<3;x++)assert.deepEqual(a.slice((z*35+x+32)*4,(z*35+x+33)*4),b.slice((z*35+x)*4,(z*35+x+1)*4));
 // Both axes near the settlement center remain at least the path wear floor.
 for(let z=12;z<=22;z++)assert.ok(a[(z*35+17)*4+3]>=Math.round(.74*255));
});
test('path noise matches native cubic reference including negative coordinates',()=>{
 const seed=0xabcdef01;
 for(const [x,z] of [[.25,.75],[-2.25,3.125],[0,0],[19.9,-24.1]]){
  const ix=Math.floor(x),iz=Math.floor(z),u=(x-ix)**2*(3-2*(x-ix)),v=(z-iz)**2*(3-2*(z-iz));
  const h=(a,b)=>hashCell(seed^97137,a,b)/4294967296;
  const expected=(h(ix,iz)+(h(ix+1,iz)-h(ix,iz))*u)*(1-v)+(h(ix,iz+1)+(h(ix+1,iz+1)-h(ix,iz+1))*u)*v;
  assert.equal(nativePathNoise(x,z,seed),expected);
 }
});

test('multiple settlement paths are preserved regardless of snapshot order',()=>{
 const source=new Uint8Array(35*35*4).fill(220),field={seed:712,c:{biome:'grand_river'}},sites=[{x:0,z:0,hx:20,hz:15},{x:30,z:12,hx:20,hz:15}];
 const old=globalThis.qaCampaignWorld;
 try{
  globalThis.qaCampaignWorld={spatialSession:{horizonSource:{snapshot:()=>({settlements:sites})}}};
  const a=riverYardIslands(source,{minX:0,minZ:0},field);sites.reverse();
  const b=riverYardIslands(source,{minX:0,minZ:0},field);assert.deepEqual(a,b);
  // Centers and nearby approach samples of both settlements remain worn.
  for(const [x,z] of [[0,0],[0,6],[30,12],[30,18],[24,12]]){
   const ix=x/1.5+1,iz=z/1.5+1;assert.ok(a[(iz*35+ix)*4+3]>=Math.round(.74*255));
  }
  assert.deepEqual(source,new Uint8Array(source.length).fill(220));
 }finally{globalThis.qaCampaignWorld=old;}
});
