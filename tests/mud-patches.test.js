import test from 'node:test';
import {readFileSync} from 'node:fs';
import {nativeGroundGeometry} from '../src/rendering/terrain-geometry.js';
import assert from 'node:assert/strict';
import {TerrainField} from '../src/world/terrain.js';
import {mudPatchGeometry,clipMudTriangle} from '../src/rendering/mud-patches.js';
import {renderedTerrainSurface} from '../src/rendering/terrain-surface.js';

test('independent mud conforms to actual terrain triangles in signed chunks without inverted faces',()=>{
  const field=new TerrainField({seed:'712',biome:'mangrove',river:true,relief:1});let patches=0;
  for(const [cx,cz] of [[0,0],[1,0],[-1,-1]]){
    const g=mudPatchGeometry(field,cx,cz);assert.ok(g);patches+=g.userData.mudPatches;
    assert.equal(g.attributes.position.count%3,0);assert.ok(g.boundingSphere.radius>0);
    const native=nativeGroundGeometry(field,JSON.parse(readFileSync('public/content/biome-mangrove.json')).profile,cx,cz),ground=native.attributes.position;
    // Read the emitted renderer buffer, independently of the surface helper.
    const actualHeight=(x,z)=>{
      const lx=x-cx*48+24,lz=z-cz*48+24,ix=Math.min(47,Math.floor(lx)),iz=Math.min(47,Math.floor(lz)),u=lx-ix,v=lz-iz;
      const k=(iz*48+ix)*6+(u+v<=1?0:3);
      const a=[ground.getX(k),ground.getY(k),ground.getZ(k)],b=[ground.getX(k+1),ground.getY(k+1),ground.getZ(k+1)],c=[ground.getX(k+2),ground.getY(k+2),ground.getZ(k+2)];
      const dx=x-cx*48-a[0],dz=z-cz*48-a[2],bx=b[0]-a[0],bz=b[2]-a[2],cxv=c[0]-a[0],czv=c[2]-a[2],det=bx*czv-bz*cxv;
      return a[1]+(dx*czv-dz*cxv)/det*(b[1]-a[1])+(bx*dz-bz*dx)/det*(c[1]-a[1]);
    };
    const p=g.attributes.position;
    for(let i=0;i<p.count;i+=3){let x=0,y=0,z=0;for(let j=0;j<3;j++){const n=i+j,px=p.getX(n)+cx*48,pz=p.getZ(n)+cz*48;assert.ok(Math.abs(p.getX(n))<24&&Math.abs(p.getZ(n))<24);assert.ok(Math.abs(p.getY(n)-renderedTerrainSurface(field,px,pz)-.024)<1e-5);x+=px/3;y+=p.getY(n)/3;z+=pz/3;assert.ok(g.attributes.normal.getY(n)>0);}assert.ok(Math.abs(y-actualHeight(x,z)-.024)<1e-5);}
    assert.deepEqual(g.attributes.position.array,mudPatchGeometry(field,cx,cz).attributes.position.array);g.dispose();native.dispose();
  }
  assert.ok(patches>3);
});
test('mud clipping preserves a crossing triangle and rejects disjoint outlines',()=>{
  const tile=[[0,0],[1,0],[0,1]];
  assert.deepEqual(clipMudTriangle([[2,2],[3,2],[2,3]],tile),[]);
  const clipped=clipMudTriangle([[-1,.2],[.8,.2],[.2,1.5]],tile);assert.ok(clipped.length>=3);
  assert.ok(clipped.every(([x,z])=>x>=-1e-8&&z>=-1e-8&&x+z<=1+1e-8));
});
test('mud creates no objects in other biomes, open water or the protected village clearing',()=>{
  assert.equal(mudPatchGeometry({c:{biome:'savanna'}},0,0),null);
  const field=new TerrainField({seed:'712',biome:'mangrove',river:true,relief:1});
  field.waterInfo=()=>({inside:true});assert.equal(mudPatchGeometry(field,0,0),null);
  field.waterInfo=()=>({inside:false});field.c.settlementSite={x:0,z:0,clearRadius:50};assert.equal(mudPatchGeometry(field,0,0),null);
});
