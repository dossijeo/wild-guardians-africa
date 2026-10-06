// CPU-only diagnostic of the production crop uploader. Synthetic geometry and
// plant states isolate update work; this does not measure native scenes or GPU FPS.
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {BALANCE} from '../src/simulation/balance.js';
import {createOpeningWorld} from './check_opening.mjs';
const {createCropBatch}=await import(process.argv[4]?pathToFileURL(resolve(process.argv[4])).href:new URL('../src/rendering/crop-batch.js',import.meta.url).href);

const count=Number(process.argv[2]??600),frames=Number(process.argv[3]??180);
assert.ok(Number.isSafeInteger(count)&&count>0&&count<=10000);
assert.ok(Number.isSafeInteger(frames)&&frames>=30&&frames<=2000);
const scene=new THREE.Scene(),source=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),models=[],pairs=[];
for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){
 const mesh=new THREE.Mesh(geometry,material);mesh.userData={cropIndex:crop,stage,crop:'benchmark',height:stage,foliageRadius:.5};source.add(mesh);
 models.push({vertices:geometry.attributes.position.count,faces:geometry.index.count/3,faceLabels:Array(geometry.index.count/3).fill(0),regions:[{root:[0,0,0],direction:[0,1,0]}]});
 if(stage<5)pairs.push({a:crop*5+stage-1,b:crop*5+stage,a2b:[0],b2a:[0]});
}
const capacity=2**Math.ceil(Math.log2(count)),batch=createCropBatch(scene,{capabilities:{getMaxAnisotropy:()=>1}},{scene:source},{models,pairs},capacity);
const groundMode=process.argv[5]??'synthetic';
assert.ok(['synthetic','terrain','terrain-cached'].includes(groundMode));
const field=groundMode==='synthetic'?null:createOpeningWorld({seed:712,biome:'sabana',culture:'mapungubwe'}).nav.field;
let groundCalls=0;const ground=(x,z)=>{groundCalls++;return field?field.surface(x,z):Math.sin(x*.1)*.02+Math.cos(z*.1)*.02;};
const digest=()=>{
 const hash=createHash('sha256');
 for(const mesh of scene.children){
  hash.update(`${mesh.count}:${mesh.visible};`);
  for(const attribute of [mesh.instanceMatrix,mesh.geometry.attributes.iGrowth??mesh.geometry.attributes.iBridge])hash.update(new Uint8Array(attribute.array.buffer));
 }
 return hash.digest('hex');
};
const versions=()=>scene.children.map(mesh=>[mesh.instanceMatrix.version,(mesh.geometry.attributes.iGrowth??mesh.geometry.attributes.iBridge).version]);
try{
 for(const mode of ['mature','paused-morph','paused-mixed','growing','mixed-growing']){
  const changing=mode==='growing'||mode==='mixed-growing';
  const plants=Array.from({length:count},(_,i)=>{
   const spec=BALANCE.crops[i%8];return {id:`plant-${i+1}`,species:spec.id,x:(i%30)*1.5,z:Math.floor(i/30)*1.5,rotation:i*.037,growth:(mode==='mature'?1:(mode==='mixed-growing'||mode==='paused-mixed')?.1+(i%300)/400:.065+(.27-.065)*.81)*spec.growth_seconds};
  });
  const update=frame=>{if(changing)for(let i=0;i<plants.length;i++)plants[i].growth+=BALANCE.crops[i%8].growth_seconds*.0001;batch.update(plants,frame/60,ground,undefined,groundMode==='terrain-cached'?field:null);};
  for(let frame=0;frame<60;frame++)update(frame);
  const beforeHash=digest(),beforeVersions=versions();groundCalls=0;
  const samples=[];
  for(let frame=0;frame<frames;frame++){const start=performance.now();update(frame+60);samples.push(performance.now()-start);}
  const afterHash=digest(),afterVersions=versions();
  if(!changing){assert.equal(afterHash,beforeHash);assert.deepEqual(afterVersions,beforeVersions);}
  const ordered=samples.toSorted((a,b)=>a-b),percentile=p=>ordered[Math.ceil(ordered.length*p)-1];
  process.stdout.write(JSON.stringify({mode,groundMode,count,capacity,frames,groundCalls,cpuMeanMs:samples.reduce((a,b)=>a+b,0)/frames,cpuP50Ms:percentile(.5),cpuP95Ms:percentile(.95),cpuMaxMs:ordered.at(-1),stableBuffers:!changing,presentationSha256:afterHash})+'\n');
 }
}finally{batch.dispose();geometry.dispose();material.dispose();}
