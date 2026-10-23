import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createSpatialChunkStream} from '../src/world/wild-engine/spatial-chunk-stream.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {villageLayout} from '../src/world/villages.js';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {refreshResidentProps} from '../src/rendering/resident-props.js';
import {BIOME_IDS} from '../src/world/biome-ids.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('a Sabana game state renders and routes from one spatial authority through topology events',async()=>{
  const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];
  const state={seed:'712',biome:'sabana',villages:[{id:'village-1',x:0,z:0,
    buildings:villageLayout(pack,0,0)}],structures:[{id:'center-1',kind:'center',
      villageId:'village-1',culture:'mapungubwe',status:'intact',x:23,z:0,yaw:0,hp:100}],spells:[]};
  const installed=new Map(),scheduled=[];
  const session=createSpatialGameSession(module,state,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  const {core,stream}=session;
  assert.equal(session.field.surface(0,0),core.surfaceAnywhere(0,0));
  assert.equal(session.field.waterInfo(0,0).inside,core.fluidLevelAnywhere(0,0)>0);
  assert.equal(session.horizonSource.revision(),1);
  const initialTopology=session.topologySource.revision();
  state.plants=[{id:'crop-a',alive:true,x:3,z:3}];
  session.syncState(state);
  state.plants[0].alive=false;
  session.syncState(state);
  assert.equal(session.topologySource.revision(),initialTopology,
    'crop turnover does not invalidate native regions');
  assert.equal(session.horizonSource.snapshot().seed,712);
  assert.deepEqual(Object.keys(session.horizonSource.snapshot()).sort(),
    ['biome','seed','settlements','version']);
  assert.equal(core.snapshot().polygons.length,1+state.villages[0].buildings.filter(b=>b.kind!=='Zona común').length);
  stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]));
  while(scheduled.length)scheduled.shift()();
  await stream.whenIdle();
  assert.equal(installed.size,2);assert.equal(core.metrics().loadedChunks,2);
  const nearby=session.queryPropsAt(0,0,4);
  assert.equal(nearby.status,'ready');
  assert.deepEqual(nearby.props.map(prop=>prop.id),installed.get('0,0').instances.flat()
    .filter(prop=>Math.hypot(prop.x,prop.z)<12).map(prop=>prop.id));
  for(const payload of installed.values()){
    const center=payload.cx*48;
    assert.equal(payload.terrain.positions[(24*49+24)*3+1],Math.fround(core.surface(center,0)));
  }
  let passage;
  for(let z=-18;z<=18&&!passage;z++){
    const start={x:23.8,z},end={x:24.2,z};
    if(session.routeActor(start,end).status==='found'&&
       session.routeActor(start,end,{worker:false,species:'warthog'}).status==='found')
      passage={start,end};
  }
  assert(passage,'workers and animals should share a physically open chunk seam');
  assert.equal(session.actorCanStand(passage.start),true);
  assert.equal(session.actorStepClear(passage.start,passage.end),true);
  assert.equal(session.actorStepClear(passage.start,passage.end,{worker:false,species:'warthog'}),true);
  assert.equal(session.actorConnectivity(passage.start,passage.end),'possible');
  state.structures.push({id:'wall-1',kind:'wall',material:'adobe',status:'intact',
    x:23.5,z:passage.start.z,yaw:0,baseScaleX:1,hp:100,gate:false});
  state.spells.push({id:'shield-1',kind:'shield',x:10,z:10,radius:1.95,remaining:10});
  session.syncState(state);
  const builtTopology=session.topologySource.revision();
  assert(builtTopology>initialTopology);
  state.structures.at(-1).hp=51;state.spells[0].remaining=5;
  session.syncState(state);
  assert.equal(session.topologySource.revision(),builtTopology,
    'damage and shield duration do not change passability');
  assert.equal(session.horizonSource.revision(),1,'wall and shield edits do not change far terrain');
  assert.equal(core.snapshot().barriers.length,1);
  assert.equal(core.snapshot().polygons.length,2+state.villages[0].buildings.filter(b=>b.kind!=='Zona común').length);
  assert.equal(core.localClear(passage.start,passage.end),false);
  assert.equal(session.actorStepClear(passage.start,passage.end),false);
  assert.equal(session.actorStepClear(passage.start,passage.end,{worker:false,species:'warthog'}),false);
  assert.notEqual(session.actorConnectivity(passage.start,passage.end),'possible');
  assert.notEqual(session.routeActor(passage.start,passage.end).status,'found');
  state.structures.at(-1).status='ruined';state.spells[0].remaining=0;
  session.syncState(state);
  assert(session.topologySource.revision()>builtTopology);
  assert.equal(core.snapshot().barriers.length,0);
  assert.equal(core.localClear(passage.start,passage.end),true);
  assert.equal(session.actorStepClear(passage.start,passage.end),true);
  assert.equal(session.actorConnectivity(passage.start,passage.end),'possible');
  assert.equal(session.routeActor(passage.start,passage.end).status,'found');
  const source=[...installed.values()].find(chunk=>chunk.instances.some(list=>list.length));
  const visible=source?.instances.flat()[0];
  assert(visible?.id.startsWith('spatial:'));
  assert.throws(()=>session.syncState({...state,suppressed:['legacy-prop-id']}),/Unsupported spatial prop ID/);
  state.suppressed=[visible.id];
  const change=session.syncState(state);
  const removedTopology=session.topologySource.revision();
  assert.deepEqual(change.removedProps,[visible.id]);
  assert.equal(core.selectChunk(source.cx,source.cz)>=0,true);
  assert.equal(core.instances().flat().some(prop=>prop.id===visible.id),false);
  assert.equal(session.queryPropsAt(visible.x,visible.z,0).props
    .some(prop=>prop.id===visible.id),false);
  const group={children:[],userData:{propSources:source.instances,
    contactInstances:source.instances.map(list=>list.slice())}};
  const refreshed=refreshResidentProps(new Map([[`${source.cx},${source.cz}`,group]]),session.suppressed,()=>{});
  assert.deepEqual(refreshed,{chunks:1,slots:1});
  assert.equal(group.userData.contactInstances.flat().some(prop=>prop.id===visible.id),false);
  assert.deepEqual(session.syncState(state).removedProps,[]);
  assert.equal(session.topologySource.revision(),removedTopology);
  assert.equal(session.horizonSource.revision(),1,'removing an obstacle does not rebuild the far mesh');
  state.villages.push({id:'village-2',x:96,z:0,buildings:villageLayout(pack,96,0)});
  session.syncState(state);
  assert(session.topologySource.revision()>removedTopology);
  assert.equal(session.horizonSource.revision(),2,'a new settlement updates native relief');
  assert.equal(session.field.surface(96,0),core.surfaceAnywhere(96,0));
  const changedKeys=new Set(core.changedChunks().map(({cx,cz})=>`${cx},${cz}`));
  assert.equal(stream.summary().stale,changedKeys.size);
  assert.equal(session.queryPropsAt(0,0,4).status,
    changedKeys.has('0,0')?'unknown':'ready');
  while(scheduled.length)scheduled.shift()();
  await stream.whenIdle();
  assert.equal(session.queryPropsAt(0,0,4).status,'ready');
  assert.equal(stream.summary().stale,0);
  state.villages.push({id:'village-3',x:960,z:0,buildings:villageLayout(pack,960,0)});
  session.syncState(state);
  assert.deepEqual(core.changedChunks(),[],
    'a distant settlement does not invalidate near resident chunks');
  assert.equal(stream.summary().stale,0);
  assert.equal(session.queryPropsAt(0,0,4).status,'ready');
  session.dispose();
});

test('the same game-state session streams and routes in all six biomes',async()=>{
  const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];
  for(const biome of Object.keys(BIOME_IDS)){
    const state={seed:'712',biome,villages:[{id:'village-1',x:0,z:0,
      buildings:villageLayout(pack,0,0)}],structures:[],spells:[],suppressed:[]};
    const installed=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>installed,
      onData:data=>installed.set(`${data.cx},${data.cz}`,data)});
    session.stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}]]));
    await session.stream.whenIdle();
    const payload=installed.get('0,0');
    assert.equal(payload.terrain.positions.length,49*49*3,biome);
    assert.equal(session.core.snapshot().biome,BIOME_IDS[biome]);
    let worker=false,animal=false;
    for(let z=-16;z<=16&&!(worker&&animal);z+=4)for(let x=-16;x<=16;x+=4){
      const point={x,z};
      worker ||= session.routeActor(point,point).status==='found';
      animal ||= session.routeActor(point,point,{worker:false}).status==='found';
    }
    assert(worker&&animal,`${biome} has no usable actor positions`);
    const samples=[{x:-8.2,z:-7.7},{x:0.2,z:.3},{x:8.4,z:7.5}];
    for(const options of [{worker:true},{worker:false,species:'warthog'}])
      assert.deepEqual(session.actorRegionsBatch(samples,options),
        samples.map(point=>session.actorRegions(point,options)),biome);
    if(biome==='gran-canon'){
      let riverCrossing=null;
      for(let z=-20;z<=20&&!riverCrossing;z+=2)for(let x=-22;x<=22;x++){
        const point={x,z};
        if(session.field.fluidInside(x,z)&&session.actorCanStand(point)&&
           !session.actorCanStand(point,{worker:false,species:'warthog'}))
          riverCrossing=point;
      }
      assert(riverCrossing,'a canyon worker should use water that blocks an animal');
      assert(session.actorRegionsBatch([riverCrossing],{worker:true})[0].ids.length>0);
      assert.equal(session.actorRegionsBatch([riverCrossing],
        {worker:false,species:'warthog'})[0].ids.length,0);
    }
    session.dispose();
  }
});

test('chunk selection distinguishes an absent chunk from a resident chunk with zero props',async()=>{
  const real=createSpatialWorld(module);
  real.generate(712,0,0);
  assert.equal(real.selectChunk(9,9),-1);
  const installed=new Map(),scheduled=[];
  let added=0,selected=0;
  const core={currentChunk:()=>({cx:0,cz:0}),selectChunk:()=>{selected++;return 0;},
    addChunk:()=>{added++;throw Error('Resident empty chunk was regenerated');},
    chunkPayload:()=>({cx:2,cz:3})};
  const stream=createSpatialChunkStream(core,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  stream.plan(new Map([['2,3',{cx:2,cz:3,score:0}]]));
  while(scheduled.length)scheduled.shift()();
  await stream.whenIdle();
  assert.equal(selected,1);assert.equal(added,0);
  assert.equal(installed.size,1);
  stream.dispose();
});

test('one resident C++ world supplies streamed render chunks and actor routes',async()=>{
  const core=createSpatialWorld(module),installed=new Map(),scheduled=[];
  core.generate(712,0,0);core.buildNavigation(.28,true);
  const stream=createSpatialChunkStream(core,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  stream.plan(new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]));
  while(scheduled.length)scheduled.shift()();
  await stream.whenIdle();
  assert.equal(stream.summary().created,2);
  assert.equal(core.metrics().loadedChunks,2);
  assert.equal(core.metrics().residentVisiblePropRecords,
    [...installed.values()].reduce((count,data)=>count+data.instances.flat().length,0));
  for(const [key,data] of installed){
    const center=24*49+24;
    assert.equal(data.terrain.positions[center*3+1],
      Math.fround(core.surface(data.cx*48,data.cz*48)),`rendered and navigated height differs at ${key}`);
    assert.equal(data.terrain.positions.length,49*49*3);
    assert.equal(data.instances.length,20);
  }
  let crossing;
  for(let z=-18;z<=18&&!crossing;z++){
    const start={x:23.8,z},end={x:24.2,z};
    if(core.routeWorld(start,end).status==='found')crossing={start,end};
  }
  assert(crossing,'the same spatial world must route through its rendered seam');
  const wall=core.addWall(23.5,0,.8,24);
  assert.notEqual(core.routeWorld(crossing.start,crossing.end).status,'found');
  core.removeWall(wall);
  assert.equal(core.routeWorld(crossing.start,crossing.end).status,'found');
  installed.delete('1,0');
  assert.equal(stream.releaseChunk(1,0),1);
  assert.equal(core.metrics().loadedChunks,1);
  assert.equal(core.metrics().residentVisiblePropRecords,
    installed.get('0,0').instances.flat().length);
  assert.notEqual(core.routeWorld(crossing.start,crossing.end).status,'found');
  stream.dispose();
});

test('stream cancellation does not generate chunks that were never requested by the renderer',()=>{
  const core=createSpatialWorld(module),installed=new Map(),scheduled=[];
  core.generate(712,0,0);core.buildNavigation(.28,true);
  const stream=createSpatialChunkStream(core,{loaded:()=>installed,
    onData:data=>installed.set(`${data.cx},${data.cz}`,data),
    schedule:callback=>{scheduled.push(callback);return callback;},
    cancel:callback=>{const index=scheduled.indexOf(callback);if(index>=0)scheduled.splice(index,1);}});
  stream.plan(new Map([['1,0',{cx:1,cz:0,score:0}]]));
  stream.dispose();
  assert.equal(scheduled.length,0);
  assert.equal(core.metrics().loadedChunks,1);
  assert.equal(installed.size,0);
});

test('production terrain installer accepts the same C++ payload used for navigation',()=>{
  const core=createSpatialWorld(module);core.generate(712,0,0);core.buildNavigation(.28,true);
  const pack=JSON.parse(readFileSync(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
  const data=core.chunkPayload(),geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial();
  geometry.computeBoundingBox();
  const world={prepareTerrainSteps:WorldScene.prototype.prepareTerrainSteps,disposePreparedTerrain:WorldScene.prototype.disposePreparedTerrain,toon:{globalVisualLighting:false},buildPropSlot:WorldScene.prototype.buildPropSlot,nav:{field:core,suppressed:new Set(),
    chunk(){throw Error('The renderer must use the C++ payload');}},pack,
    prototypes:Array.from({length:20},()=>[0,1,2].map(()=>new THREE.Mesh(geometry,material))),
    quality:'media',terrainMeshes:[],waterPrototypes:Array(20).fill(null),
    fluidMaterial:new THREE.MeshBasicMaterial(),state:{biome:'sabana'}};
  let abortedResources=0;
  const disposePrepared=world.disposePreparedTerrain;
  world.disposePreparedTerrain=function(group){group.traverse(object=>{if(object.isMesh)object.geometry.addEventListener('dispose',()=>abortedResources++);});disposePrepared.call(this,group);};
  const aborted=world.prepareTerrainSteps(0,0,data);
  assert.equal(aborted.next().value,'ground');
  assert.equal(world.terrainMeshes.length,0,'Private preparation must not register a visible ground mesh');
  aborted.return();assert.equal(abortedResources,1,'Abandoning preparation must release its ground geometry');
  world.disposePreparedTerrain=disposePrepared;
  const staged=world.prepareTerrainSteps(0,0,data);let prepared;
  do{prepared=staged.next();assert.equal(world.terrainMeshes.length,0);}while(!prepared.done);
  const group=WorldScene.prototype.terrain.call(world,0,0,data);
  const geometryRows=g=>{const rows=[];g.traverse(o=>{if(o.isMesh)rows.push({type:o.type,count:o.count,position:Array.from(o.geometry.attributes.position.array),index:o.geometry.index?Array.from(o.geometry.index.array):null});});return rows;};
  assert.deepEqual(geometryRows(prepared.value),geometryRows(group),'Staged and synchronous geometry must match');
  world.disposePreparedTerrain(prepared.value);
  assert.equal(group.userData.spatialAuthority,'spatial-wasm');
  assert.equal(world.terrainMeshes[0].geometry.getAttribute('position').count,49*49);
  assert.equal(group.userData.contactInstances.flat().length,data.instances.flat().length);
  const center=world.terrainMeshes[0].geometry.getAttribute('position').getY(24*49+24);
  assert.equal(center,Math.fround(core.surface(0,0)));
  group.traverse(object=>{if(object.isInstancedMesh)object.dispose();if(object.isMesh&&object.geometry!==geometry)object.geometry.dispose();});
  geometry.dispose();material.dispose();world.fluidMaterial.dispose();
});
