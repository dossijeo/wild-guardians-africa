import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialTerrainView} from '../../src/world/wild-engine/spatial-terrain-view.js';
import {prepareNaturalWaterBed} from '../../src/rendering/natural-water-edges.js';
import {nativeWaterBuffer} from '../../src/rendering/water-geometry.js';
const handle=await createThreadedSpatialWorld(factory),core=handle.core,p=core.preparation,rows=[];
const wait=async()=>{const deadline=performance.now()+10000;while(p.status()!==3){assert(performance.now()<deadline);await new Promise(r=>setTimeout(r,1));}};
try{
 p.visualOptions(3);
 for(const seed of [712,1907,7,987654,77,2601,4289,6103]){
  core.generate(seed,0,0,'manglares');core.buildNavigationProfile(0,.3,true);core.addSettlement(150,-60,12,9);
  for(const [cx,cz] of [[1,0],[-1,-1],[3,-1],[5,4],[-6,7],[1,2],[3,4],[5,6],[-8,-4],[-10,3],[11,-9],[20,30],[-30,20],[100,-100],[-1000,999],[1000,-999]]){
   const id=p.start(cx,cz);assert(id>0);await wait();assert.equal(p.metric(0),1);
   const bed=p.waterBed(),shore=p.waterShore();assert(p.publish(id,cx,cz)>0);const data=core.chunkPayload();p.release();
   const geometry=nativeWaterBuffer(data.water);
   if(!geometry){assert.equal(bed,null);rows.push({seed,cx,cz,empty:true});continue;}
   assert(bed);assert.equal(shore.length,geometry.attributes.position.count);const world={state:{biome:'manglares'},nav:{field:createSpatialTerrainView(core)}};
   const pos=geometry.attributes.position;
   for(let i=0;i<pos.count;i++){const info=world.nav.field.waterInfo(pos.getX(i)+cx*48,pos.getZ(i)+cz*48);assert.equal(shore[i],Math.fround(info.inside?info.shore:0),`shore ${seed}/${cx}/${cz}/${i}`);}
   const expected=prepareNaturalWaterBed(world,geometry,cx,cz,{yielding:false,directWetland:false}).next().value;
   let different=0,maxDelta=0;for(let i=0;i<bed.bytes.length;i++){const delta=Math.abs(bed.bytes[i]-expected.bytes[i]);if(delta)different++;maxDelta=Math.max(maxDelta,delta);}
   rows.push({seed,cx,cz,bytes:bed.bytes.length,shoreVertices:shore.length,different,maxDelta});console.log(rows.at(-1));
   assert.deepEqual({...bed,bytes:null},{...expected,bytes:null});assert.equal(different,0);geometry.dispose();
  }
 }
 p.visualOptions(1);core.generate(712,0,0,'manglares');p.start(1,0);await wait();assert.equal(p.waterShore(),null);p.release();
 p.visualOptions(0);core.generate(712,0,0,'manglares');let id=p.start(1,0);await wait();assert.equal(p.waterBed(),null);assert.equal(p.waterShore(),null);p.release();
 p.visualOptions(3);id=p.start(2,0);const runningDeadline=performance.now()+10000;while(p.status()===1)assert(performance.now()<runningDeadline);assert.equal(p.status(),2);p.cancel();await wait();assert.equal(p.waterBed(),null);assert.equal(p.waterShore(),null);p.release();
 id=p.start(3,0);core.addSettlement(144,0,10,8);await wait();assert.equal(p.publish(id,3,0),-2);p.release();assert.equal(core.selectChunk(3,0),-1);
 id=p.start(3,0);await wait();assert(p.publish(id,3,0)>0);p.release();
 core.generate(712,0,0,'sabana');id=p.start(1,0);await wait();assert.equal(p.waterBed(),null);assert.equal(p.waterShore(),null);p.release();
}finally{await handle.dispose();await writeFile(process.env.WG_PREPARED_WATER_REPORT??'docs/qa/wild-engine-pthreads/prepared-water-differential.json',JSON.stringify({rows},null,2)+'\n');}
