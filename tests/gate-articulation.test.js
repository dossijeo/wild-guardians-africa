import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {wallBridge,NativeWall} from '../src/rendering/walls.js';
import {splitGateBridge,articulateGate,partitionGateTriangle} from '../src/rendering/gate-articulation.js';
import {nativeGateLeaves,gateBodyHeight} from '../src/world/gate-frames-native.js';
import {sweptFootprintDistance} from '../src/world/footprints.js';
const pack=JSON.parse(readFileSync(new URL('../public/content/walls.json',import.meta.url)));
const array=(p,T)=>{const b=readFileSync(new URL('../public'+p.url,import.meta.url));return new T(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
function source(material){const p=pack.pieces[material+'_puerta'];return {p:array(p.p,Float32Array),n:array(p.n,Float32Array),uv:array(p.uv,Float32Array),i:array(p.i,Uint16Array),faceRegions:array(p.faceRegions,Uint16Array),regions:p.regions,morph:{}};}
function area(pos){let sum=0;for(let i=0;i<pos.length;i+=9){const a=new THREE.Vector3(...pos.slice(i,i+3)),b=new THREE.Vector3(...pos.slice(i+3,i+6)),c=new THREE.Vector3(...pos.slice(i+6,i+9));sum+=b.sub(a).cross(c.sub(a)).length()/2;}return sum;}
function below(vertices,ceiling){const out=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];if(a[1]<=ceiling)out.push(a);if((a[1]<=ceiling)!==(b[1]<=ceiling)){const t=(ceiling-a[1])/(b[1]-a[1]);out.push(a.map((v,k)=>v+(b[k]-v)*t));}}return out;}
test('Partition clips triangles into frame and leaf while retaining interpolated texture coordinates',()=>{
  const triangle=[[-1,0,0,0,0],[1,0,0,1,0],[0,2,0,.5,1]],leaf={left:-.5,right:.5,top:1};
  const split=partitionGateTriangle(triangle,leaf);assert.ok(split.frame.length>0&&split.leaf.length>=3);
  for(const polygon of [...split.frame,split.leaf])for(const vertex of polygon){assert.ok(Math.abs(vertex[3]-(vertex[0]+1)/2)<1e-12);assert.ok(Math.abs(vertex[4]-vertex[1]/2)<1e-12);}
});
test('Every closed native leaf preserves total source surface area, bounds and regional pivots',()=>{
  for(const material of Object.keys(nativeGateLeaves)){
    const raw=wallBridge(source(material)),bridge=splitGateBridge(raw,nativeGateLeaves[material]);
    assert.ok(Math.abs(area(raw.pos)-area(bridge.pos))<area(raw.pos)*1e-6,material+' surface');
    assert.equal(bridge.pos.length,bridge.normal.length);assert.equal(bridge.uv.length,bridge.pos.length/3*2);
    assert.ok(bridge.leafFlags.some(v=>v===0)&&bridge.leafFlags.some(v=>v===1));
    const normals=bridge.normal.slice();assert.deepEqual(articulateGate(bridge,0,bridge.pos,normals),bridge.pos);assert.deepEqual(normals,bridge.normal);
    for(let i=0;i<bridge.roots.length;i+=9)for(let j=1;j<3;j++)assert.deepEqual([...bridge.roots.slice(i,i+3)],[...bridge.roots.slice(i+j*3,i+j*3+3)]);
  }
});
test('Opening is a rigid hinge rotation: frames remain fixed and normals do not accumulate rotation',()=>{
  for(const material of Object.keys(nativeGateLeaves)){
    const b=splitGateBridge(wallBridge(source(material)),nativeGateLeaves[material]),normals=b.normal.slice(),open=articulateGate(b,1,b.pos,normals),[hx,hz]=b.leaf.hinge;
    for(let i=0;i<b.leafFlags.length;i++){
      const at=i*3;
      if(!b.leafFlags[i])assert.deepEqual([...open.slice(at,at+3)],[...b.pos.slice(at,at+3)]);
      else {assert.ok(Math.abs(Math.hypot(open[at]-hx,open[at+2]-hz)-Math.hypot(b.pos[at]-hx,b.pos[at+2]-hz))<1e-6);assert.equal(open[at+1],b.pos[at+1]);}
      assert.ok(Math.abs(Math.hypot(...normals.slice(at,at+3))-Math.hypot(...b.normal.slice(at,at+3)))<1e-6);
    }
    assert.deepEqual(open,articulateGate(b,1,b.pos,b.normal.slice()));assert.deepEqual(articulateGate(b,0,b.pos,b.normal.slice()),b.pos);
  }
});
test('Full original gate geometry leaves a swept controller corridor when the leaf is open',()=>{
  for(const material of Object.keys(nativeGateLeaves)){
    const b=splitGateBridge(wallBridge(source(material)),nativeGateLeaves[material]),open=articulateGate(b,1,b.pos,b.normal.slice()),scale=material==='reforzado'?1.6:1;
    for(let i=0;i<open.length;i+=9){
      const polygon=below([[...open.slice(i,i+3)],[...open.slice(i+3,i+6)],[...open.slice(i+6,i+9)]],gateBodyHeight/scale).map(([x,,z])=>({x:x*scale,z:z*scale}));
      if(polygon.length>=2)assert.ok(sweptFootprintDistance({x:.05,z:-2},{x:.05,z:2},polygon)>=.28-1e-6,material+' triangle '+i/9+' blocks actual opening');
    }
  }
});
test('Production mesh applies opening changes without changing health, opacity or the closed source bridge',()=>{
  for(const material of Object.keys(nativeGateLeaves)){
    const prototype=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial());prototype.userData.nativePiece=source(material);
    const entity={id:'gate',material,gate:true,hp:60,maxHp:60,status:'intact'},wall=new NativeWall({[material+'_puerta']:prototype},entity),closed=wall.parts[0].mesh.geometry.attributes.position.array.slice();
    entity.gateOpen=1;wall.update(entity);const open=wall.parts[0].mesh.geometry.attributes.position.array.slice();assert.notDeepEqual(open,closed);assert.equal(entity.hp,60);assert.equal(wall.parts[0].mesh.material.transparent,false);
    wall.update(entity);assert.deepEqual(wall.parts[0].mesh.geometry.attributes.position.array,open);
    entity.gateOpen=0;wall.update(entity);assert.deepEqual(wall.parts[0].mesh.geometry.attributes.position.array,closed);wall.dispose();
  }
});
