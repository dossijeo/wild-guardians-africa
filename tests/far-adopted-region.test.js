import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {activeChunkRegion} from '../src/world/active-region.js';
function fixture(quality,adoptedQuality,options={},adoptedRadius=null){
 const eye=new Vector3(0,20,0),old=activeChunkRegion(eye,adoptedQuality,adoptedRadius),world=Object.create(WorldScene.prototype);let jobs,requested,contacts;
 Object.assign(world,{camera:{position:eye},quality,...options,nav:{config:{layers:[]},setActiveBounds(bounds){this.activeBounds=bounds;},setRaidView(){}},prototypes:[],pack:{profile:{}},horizon:{update(config,profile,next){requested=next;return old;}},chunks:new Map(),terrainMeshes:[],controls:{target:new Vector3()},chunkStream:{plan(next){jobs=next;},dispatch(){}},contacts:{update(chunks,prototypes,bounds){contacts=bounds;}},syncResidentProps(){}});
 world.syncChunks();return {world,old,jobs,requested,contacts};
}
for(const [quality,previous] of [['media','alta'],['alta','media']])for(const options of [{},{farVisualRange:1,farPreserveTerrain:true}])test('pending horizon retains adopted exact terrain while quality changes '+previous+' → '+quality+' '+JSON.stringify(options),()=>{
 const f=fixture(quality,previous,options);assert.equal(f.jobs.size,(2*f.old.range+1)**2);assert.deepEqual(f.world.nearBounds,f.old.bounds);assert.deepEqual(f.world.nav.activeBounds,f.old.bounds);assert.deepEqual(f.contacts,f.old.bounds);assert.notEqual(f.requested.range,f.old.range);
 for(let z=-f.old.range;z<=f.old.range;z++)for(let x=-f.old.range;x<=f.old.range;x++)assert.ok(f.jobs.has(x+','+z));
});
for(const [quality,oldRadius,residentRange] of [['media',3,null],['alta',1,null],['media',3,1],['alta',1,3]])test('independent visual terrain covers the previously adopted hole '+quality+'/'+oldRadius+'/'+residentRange,()=>{
 const f=fixture(quality,quality,{farVisualRange:1,farPreserveTerrain:false,farResidentRange:residentRange},oldRadius),desired=activeChunkRegion(f.world.camera.position,quality,residentRange),range=Math.max(desired.range,oldRadius);
 assert.equal(f.jobs.size,(2*range+1)**2);assert.deepEqual(f.world.nearBounds,f.old.bounds);assert.deepEqual(f.contacts,f.old.bounds);
 for(let z=-oldRadius;z<=oldRadius;z++)for(let x=-oldRadius;x<=oldRadius;x++)assert.ok(f.jobs.has(x+','+z));
});
test('explicit resident radius also waits for matching adopted horizon before reducing exact chunks',()=>{
 const f=fixture('media','media',{farVisualRange:1,farPreserveTerrain:true,farResidentRange:1},2);assert.equal(f.requested.range,1);assert.equal(f.jobs.size,25);assert.deepEqual(f.world.nearBounds,f.old.bounds);assert.deepEqual(f.world.nav.activeBounds,activeChunkRegion(f.world.camera.position,'media').bounds);
});

for(const [quality,previous] of [['media','alta'],['alta','media']])test('exact radius changes only when new horizon is adopted '+quality,()=>{
 const f=fixture(quality,previous);let adopted;f.world.horizon.update=(config,profile,requested)=>(adopted=requested);f.world.syncChunks();assert.equal(f.world.streamPlanKey,adopted.cx+','+adopted.cz+':'+adopted.range);assert.deepEqual(f.world.nearBounds,adopted.bounds);assert.deepEqual(f.world.nav.activeBounds,adopted.bounds);
});
test('visual compaction releases excess coverage after smaller horizon is adopted',()=>{
 const f=fixture('media','alta',{farVisualRange:1,farPreserveTerrain:false,farResidentRange:1});assert.equal(f.jobs.size,49);f.world.horizon.update=(config,profile,requested)=>requested;f.world.syncChunks();assert.equal(f.world.streamPlanKey,'0,0:1');assert.deepEqual(f.world.nearBounds,[-72,-72,72,72]);assert.deepEqual(f.world.nav.activeBounds,[-120,-120,120,120]);
});
