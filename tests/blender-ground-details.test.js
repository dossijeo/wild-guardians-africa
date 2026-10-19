import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {TerrainField} from '../src/world/terrain.js';
import {BlenderGroundDetails} from '../src/rendering/blender-ground-details.js';
import {groundSample417} from '../src/rendering/ground-mask.js';

const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
const state={plants:[{x:7,z:8,alive:true}],structures:[{x:12,z:12,kind:'wall',status:'active'}],villages:[]};

function details(biome){
  const scene=new THREE.Scene(),result=new BlenderGroundDetails({},scene,biome);
  result.global=true;
  result.geometry=new THREE.BoxGeometry();
  result.material=new THREE.MeshBasicMaterial();
  result.mesh=new THREE.InstancedMesh(result.geometry,result.material,1);
  scene.add(result.mesh);
  return result;
}

test('3D biome details are deterministic and release chunk instances without accumulation',()=>{
  for(const biome of biomes){
    const field=new TerrainField({seed:'712',biome,river:true,relief:1});
    const d=details(biome);
    d.chunk(0,0,field,state);
    const first=d.chunks.get('0,0');
    assert.ok(first.length>0,`${biome}: expected a small ground-detail pilot`);
    for(const {x,z} of first){
      const sample=groundSample417(field,field.c.profile??{},x,z);
      assert.equal(field.waterInfo(x,z).inside,false,`${biome}: no detail in water`);
      assert.ok(field.slope(x,z)<=.42,`${biome}: no detail on steep ground`);
      assert.ok(sample[3]<=.27,`${biome}: no detail in a worn clearing`);
      assert.ok((x-7)**2+(z-8)**2>=1.8**2,`${biome}: crop remains visible`);
    }
    assert.equal(d.count,first.length);
    d.release('0,0');
    assert.equal(d.count,0,`${biome}: released chunk must not retain instances`);
    d.chunk(0,0,field,state);
    assert.deepEqual(d.chunks.get('0,0'),first,`${biome}: regeneration remains deterministic`);
    assert.equal(d.count,first.length);
    d.dispose();
    d.geometry.dispose();
    d.material.dispose();
  }
});
