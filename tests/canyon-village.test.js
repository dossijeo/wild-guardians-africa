import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {TerrainField,canyonFrame} from '../src/world/terrain.js';
import {Navigation} from '../src/world/navigation.js';
import {WorldScene} from '../src/rendering/scene.js';
import {centerServicePoint} from '../src/world/centers.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const catalog=JSON.parse(readFileSync('public/content/villages.json'));
for(const culture of ['mapungubwe','saheliana','suajili','musgum','etiope'])test(`canyon opening keeps ${culture} at native scale on both banks, with a surviving river and save`,()=>{
  const {s,nav}=createOpeningWorld({biome:'gran-canon',culture});
  const village=s.villages[0],field=nav.field;
  const natural=new TerrainField({...nav.config,settlementSite:null});
  assert.ok(village.buildings.some(b=>b.x<field.riverX(b.z)));
  assert.ok(village.buildings.some(b=>b.x>field.riverX(b.z)));
  for(const b of village.buildings){
    assert.ok(field.surface(b.x,b.z)<field.riverLevel+2,'houses stand on the canyon floor');
    assert.ok(nav.placementFootprint(b).reason!=='Agua, lava o pendiente no edificable');
    for(const p of b.footprint)assert.ok(Math.abs(p.x-field.riverX(p.z))>canyonFrame(field,p.z).waterHalf+.6,'house hull stays outside water');
  }
  for(let z=village.z;z<=s.structures[0].z;z+=2){
    const x=field.riverX(z);
    assert.equal(field.height(x,z),natural.height(x,z),'bank pads do not fill the channel');
    assert.equal(field.waterInfo(x,z).inside,true);
    assert.equal(nav.workerSurface(x,z),field.riverLevel);
    assert.equal(nav.terrainValid(x,z,.28,true),true);
    assert.equal(nav.terrainValid(x,z,.28,false),false);
    assert.equal(nav.placement(x,z,.4).valid,false,'water is still not buildable');
  }
  const z=village.z-4,x=field.riverX(z),a={x:x-10,z},b={x:x+10,z};
  assert.ok(nav.path(a,b,.28,null,true),'workers cross the actual river');
  assert.equal(nav.segmentClear(a,b,.28,null,false),false,'animals retain their terrain restrictions');
  const saved=deserialize(serialize(s)),restored=new Navigation(s.seed,s.biome,nav.profile);restored.setState(saved);
  assert.deepEqual(saved,s);assert.deepEqual(restored.config,nav.config);
  assert.deepEqual(restored.path(a,b,.28,null,true),nav.path(a,b,.28,null,true));
  const payload=catalog.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));
  const templates=payload.units.map(unit=>{const mesh=new THREE.Mesh();mesh.userData.unit=unit;return mesh;});
  const scene={nav,villageTemplates:new Map([[culture,templates]])};
  const group=WorldScene.prototype.villageMesh.call(scene,village);group.updateMatrixWorld(true);
  for(const mesh of group.children){
    const u=mesh.userData.unit,layout=village.buildings.find(b=>b.key===u.key);
    assert.equal(mesh.scale.x,16);
    const center=new THREE.Vector3((u.min[0]+u.max[0])/2,u.min[1],(u.min[2]+u.max[2])/2).applyMatrix4(mesh.matrixWorld);
    assert.ok(Math.abs(center.x-layout.x)<1e-8&&Math.abs(center.z-layout.z)<1e-8,'rendered and logical centres agree');
    for(const [i,p] of u.hull.entries()){
      const point=new THREE.Vector3(p[0],u.min[1],p[1]).applyMatrix4(mesh.matrixWorld);
      assert.ok(Math.abs(point.x-layout.footprint[i].x)<1e-8&&Math.abs(point.z-layout.footprint[i].z)<1e-8);
    }
  }
});
test('crew can cross fluid in every biome while solid collision remains active',()=>{
  for(const biome of ['sabana','gran-rio']){
    const profile=JSON.parse(readFileSync('public/content/biome-'+(biome==='sabana'?'savanna':'grand_river')+'.json')).profile;
    const nav=new Navigation(712,biome,profile),z=0,x=nav.field.riverX(z);
    assert.equal(nav.terrainValid(x,z,.28,true),true);
    assert.equal(nav.terrainValid(x,z,.28,false),false);
    assert.equal(nav.workerSurface(x,z),nav.field.surface(x,z));
  }
  const {s,nav}=createOpeningWorld({biome:'gran-canon'}),house=s.villages[0].buildings.find(b=>b.kind!=='Zona común');
  assert.equal(nav.walkable(house.x,house.z,.28,null,true),false);
});

test('river-bank layouts also work for different seeds without reusing a single suitable location',()=>{
  for(const seed of [31,918271])for(const culture of ['mapungubwe','saheliana','suajili','musgum','etiope']){
    const {s,nav}=createOpeningWorld({biome:'gran-canon',culture,seed});
    const buildings=s.villages[0].buildings;
    assert.ok(buildings.some(b=>b.x<nav.field.riverX(b.z)));
    assert.ok(buildings.some(b=>b.x>nav.field.riverX(b.z)));
    assert.ok(buildings.every(b=>nav.field.surface(b.x,b.z)<nav.field.riverLevel+2));
    assert.ok(nav.path(s.villages[0].entry,centerServicePoint(s.structures[0],s,.8),.28,null,true));
  }
});
