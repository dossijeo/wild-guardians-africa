import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Navigation} from '../src/world/navigation.js';
import {gateFrameFootprints} from '../src/world/gate-passages.js';
import {gateBodyHeight,nativeGateFrames} from '../src/world/gate-frames-native.js';
import {containsPoint,footprintDistance} from '../src/world/footprints.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/gate-frames-native.json',import.meta.url)));
function navFor(gate){const nav=Object.create(Navigation.prototype);nav.field={blocked:()=>false,slope:()=>0};nav.obstacles=[gate];nav.propsAt=()=>[];nav.walkCache=new Map();nav.segmentCache=new Map();return nav;}
const gate=(material,yaw=0,baseScaleX=1)=>({kind:'wall',id:'gate',gate:true,material,yaw,baseScaleX,x:0,z:0});
test('Gate frames retain original mesh hashes and the height of all four exported bodies',()=>{
  for(const [path,hash] of Object.entries(manifest.sources))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../src/world/gate-frames-native.js',import.meta.url))).digest('hex'),manifest.moduleSha256);
  assert.ok(gateBodyHeight>=1.7&&gateBodyHeight<1.70001);
  assert.deepEqual(Object.keys(nativeGateFrames),['adobe','piedra']);
});
test('Worker controllers pass through open native arches while their pillars remain solid',()=>{
  for(const material of ['adobe','piedra'])for(const yaw of [0,Math.PI/4,Math.PI/2]){
    const entity=gate(material,yaw),nav=navFor(entity),c=Math.cos(yaw),s=Math.sin(yaw);
    const at=(x,z)=>({x:x*c+z*s,z:-x*s+z*c});
    const a=at(.05,-2),b=at(.05,2);
    assert.ok(nav.segmentClear(a,b,.28,null,true),material+' opening');
    assert.equal(nav.segmentClear(a,b,.28,null,false),false,'animals still face a closed barrier');
    const pillar=at(.9,0);assert.equal(nav.walkable(pillar.x,pillar.z,.28,null,true),false);
    assert.equal(nav.segmentClear(at(.9,-2),at(.9,2),.28,null,true),false);
    assert.equal(nav.segmentClear(at(-2,0),at(2,0),.28,null,true),false,'cannot travel sideways through frame');
  }
});
test('Short modules preserve their actual opening width instead of ignoring the whole gate',()=>{
  for(const material of ['adobe','piedra']){
    const nav=navFor(gate(material,0,.35));
    assert.equal(nav.segmentClear({x:0,z:-2},{x:0,z:2},.28,null,true),false);
    assert.equal(nav.walkable(0,0,.28,null,true),false);
  }
});
test('Frame transforms are cached and update when placement or scale changes',()=>{
  const entity=gate('adobe'),a=gateFrameFootprints(entity);assert.equal(gateFrameFootprints(entity),a);
  entity.x=5;entity.yaw=Math.PI/2;entity.baseScaleX=.5;const b=gateFrameFootprints(entity);assert.notEqual(a,b);
  for(const polygon of b)assert.ok(polygon.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
  assert.equal(gateFrameFootprints(gate('zarzas')),null,'closed leaves remain explicitly outside extraction scope');
});
test('Convex frame projection retains side boundaries and a positive controller clearance',()=>{
  for(const material of ['adobe','piedra']){
    const frames=gateFrameFootprints(gate(material));
    assert.ok(frames.every(p=>p.length>=3));
    assert.ok(frames.every(p=>!containsPoint(p,.05,0)&&footprintDistance(p,.05,0)>.28));
  }
});
test('Every original triangle below native body height is covered by the physical frame projection',()=>{
  const pack=JSON.parse(readFileSync(new URL('../public/content/walls.json',import.meta.url)));
  const array=(descriptor,Type)=>{const bytes=readFileSync(new URL('../public'+descriptor.url,import.meta.url));return new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
  for(const material of ['adobe','piedra']){
    const piece=pack.pieces[material+'_puerta'],p=array(piece.p,Float32Array),index=array(piece.i,Uint16Array),ceiling=gateBodyHeight/1.4;
    const sides=nativeGateFrames[material].map(poly=>poly.map(([x,z])=>({x,z})));
    let verified=0;
    for(let j=0;j<index.length;j+=3){
      const triangle=[...index.slice(j,j+3)].map(i=>[p[i*3],p[i*3+1],p[i*3+2]]),samples=[];
      for(let i=0;i<3;i++){
        const a=triangle[i],b=triangle[(i+1)%3];if(a[1]<=ceiling)samples.push(a);
        if((a[1]<=ceiling)!==(b[1]<=ceiling)){const t=(ceiling-a[1])/(b[1]-a[1]);samples.push(a.map((v,k)=>v+(b[k]-v)*t));}
      }
      for(const [x,,z] of samples){assert.ok(footprintDistance(sides[x<0?0:1],x,z)<1e-7);verified++;}
    }
    assert.ok(verified>1000,material+' source coverage');
  }
});
