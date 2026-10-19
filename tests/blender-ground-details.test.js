import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {TerrainField} from '../src/world/terrain.js';
import {BlenderGroundDetails,markGroundDetailEvent} from '../src/rendering/blender-ground-details.js';
import {groundSample417} from '../src/rendering/ground-mask.js';

const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
const state={plants:[{x:7,z:8,alive:true}],structures:[{x:12,z:12,kind:'wall',status:'active'}],villages:[]};

test('grass beds preserve river distribution and savanna occupancy without mutating state',()=>{
  const before=JSON.stringify(state);
  for(const biome of ['savanna','grand_river']){
    const field=new TerrainField({seed:'712',biome,river:true,relief:1});
    const originalLocation=globalThis.location;
    let baseline,candidate;
    try{
      globalThis.location={search:'?visualLab=global-grass'};baseline=details(biome);
      globalThis.location={search:'?visualLab=global-grass-beds'};candidate=details(biome);
    }finally{if(originalLocation===undefined)delete globalThis.location;else globalThis.location=originalLocation;}
    let a=[],b=[];
    for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++){
      const positions=candidate.sampleChunk(cx,cz,field,state);
      assert.deepEqual(positions,candidate.sampleChunk(cx,cz,field,state));
      a.push(...baseline.sampleChunk(cx,cz,field,state));b.push(...positions);
      for(const p of positions){
        assert.ok(Math.abs(p.x-cx*48)<24&&Math.abs(p.z-cz*48)<24,'members stay owned by their resident chunk');
        assert.equal(field.waterInfo(p.x,p.z).inside,false);
        assert.ok(field.slope(p.x,p.z)<=.42);
        assert.ok(groundSample417(field,field.c.profile??{},p.x,p.z)[3]<=.27);
        assert.ok((p.x-7)**2+(p.z-8)**2>=1.8);
        assert.ok((p.x-12)**2+(p.z-12)**2>=1.45);
      }
    }
    if(biome==='grand_river')assert.deepEqual(b,a,'control biome is unchanged');
    else {assert.notDeepEqual(b,a);assert.ok(b.length<a.length*1.2,'grouping cannot buy detail with a large instance increase');}
    for(const d of [baseline,candidate]){d.dispose();d.geometry.dispose();d.material.dispose();}
  }
  assert.equal(JSON.stringify(state),before,'visual distribution never edits simulation state');
});

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

test('confirmed crop and wall events refresh only nearby resident chunks',()=>{
  const field=new TerrainField({seed:'712',biome:'savanna',river:true,relief:1});
  const d=details('savanna'),game={plants:[],structures:[],villages:[]};
  d.chunk(0,0,field,game);
  d.chunk(1,0,field,game);
  const original=d.chunks.get('0,0');
  const other=d.chunks.get('1,0');
  const [site,wallSite]=original.filter(p=>Math.abs(p.x)<10&&Math.abs(p.z)<10);
  assert.ok(site&&wallSite);

  const crop={id:'crop-1',alive:true,x:site.x,z:site.z};
  game.plants.push(crop);
  markGroundDetailEvent(d,game,{type:'CropPlaced',targetId:crop.id});
  assert.deepEqual([...d.dirtyChunks],['0,0']);
  d.flush(field,game);
  assert.ok(d.chunks.get('0,0').every(p=>(p.x-crop.x)**2+(p.z-crop.z)**2>=1.8**2));
  assert.equal(d.chunks.get('1,0'),other,'distant chunk was not regenerated');
  assert.equal(d.refreshStats.candidates,576);

  crop.alive=false;
  markGroundDetailEvent(d,game,{type:'CropPicked',targetId:crop.id});
  d.flush(field,game);
  assert.deepEqual(d.chunks.get('0,0'),original,'harvest restores deterministic detail');

  const wall={id:'wall-1',kind:'wall',status:'intact',x:wallSite.x,z:wallSite.z};
  game.structures.push(wall);
  markGroundDetailEvent(d,game,{type:'WallChainBuilt',targetId:wall.id,count:1});
  d.flush(field,game);
  assert.ok(d.chunks.get('0,0').every(p=>(p.x-wall.x)**2+(p.z-wall.z)**2>=1.45**2));
  game.structures=[];
  markGroundDetailEvent(d,game,{type:'WallRemoved',targetId:wall.id},()=>wall);
  d.flush(field,game);
  assert.deepEqual(d.chunks.get('0,0'),original,'demolition restores deterministic detail');
  assert.equal(d.chunks.get('1,0'),other);
  const center={id:'center-1',kind:'center',status:'intact',x:site.x,z:site.z};
  game.structures.push(center);
  markGroundDetailEvent(d,game,{type:'PlacementCommitted',targetId:center.id});
  d.flush(field,game);
  assert.ok(d.chunks.get('0,0').every(p=>(p.x-center.x)**2+(p.z-center.z)**2>=9));
  const restored=details('savanna');
  restored.chunk(0,0,field,game);
  assert.deepEqual(restored.chunks.get('0,0'),d.chunks.get('0,0'),'restored state needs no replay of saved events');
  restored.dispose();restored.geometry.dispose();restored.material.dispose();
  d.dispose();d.geometry.dispose();d.material.dispose();
});

test('multiple changes in one frame coalesce, while non-topological damage is ignored',()=>{
  const field=new TerrainField({seed:'712',biome:'savanna',river:true,relief:1});
  const d=details('savanna'),game={plants:[],structures:[],villages:[]};
  d.chunk(0,0,field,game);
  const sites=d.chunks.get('0,0').filter(p=>Math.abs(p.x)<10&&Math.abs(p.z)<10);
  game.structures=sites.slice(0,3).map((p,i)=>({id:`wall-${i}`,kind:'wall',status:'intact',x:p.x,z:p.z}));
  markGroundDetailEvent(d,game,{type:'WallChainBuilt',targetId:'wall-0',count:3});
  markGroundDetailEvent(d,game,{type:'RepairApplied',targetId:'wall-0',repair:{previousStatus:'intact'}});
  assert.equal(d.dirtyChunks.size,1);
  d.flush(field,game);
  assert.equal(d.refreshStats.batches,1);
  assert.equal(d.refreshStats.chunks,1);
  assert.equal(d.refreshStats.candidates,576);
  assert.equal(d.flush(field,game),0,'idle frames do no resampling');
  game.structures[0].status='ruined';
  markGroundDetailEvent(d,game,{type:'StructureRuined',targetId:'wall-0'});
  d.flush(field,game);
  assert.equal(d.refreshStats.chunks,2);
  d.dispose();d.geometry.dispose();d.material.dispose();
});
