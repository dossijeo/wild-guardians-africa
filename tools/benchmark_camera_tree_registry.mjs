// Native source/bounds CPU experiment, without renderer or camera controls.
import * as THREE from 'three';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {BIOME_IDS} from '../src/world/navigation.js';
import {TerrainField,scatterWorld} from '../src/world/terrain.js';
import {chunkBounds} from '../src/rendering/water-source.js';
import {nativeAssetSurface} from '../src/rendering/asset-surface.js';
import {CameraTreeRegistry} from '../src/rendering/camera-tree-registry.js';
import {CameraVolumeIndex} from '../src/rendering/camera-volume-index.js';
import {firstCameraVolumeHit} from '../src/rendering/camera-volume-sweep.js';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
const out=process.argv[2];assert.ok(out,'Usage: OUTPUT_DIRECTORY');mkdirSync(out,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2)),rows=[],sha=s=>createHash('sha256').update(s).digest('hex');
const stats=s=>{const sorted=s.toSorted((a,b)=>a-b);return {p50Ms:sorted[Math.floor(s.length*.5)],p95Ms:sorted[Math.floor(s.length*.95)],maxMs:sorted.at(-1)};};
for(const [biome,id] of Object.entries(BIOME_IDS)){
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-'+id+'.json',import.meta.url),'utf8')),binary=readFileSync(new URL('../public'+pack.binary.url,import.meta.url));
 const config={seed:'712',biome:id,relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:Array(6).fill(true)},field=new TerrainField(config),geometries=pack.assets.map(a=>{const d=a.lods[0].position,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(binary.buffer,binary.byteOffset+d.offset,d.count),3));g.computeBoundingBox();return g;});
 const chunks=new Map(),make=(cx,cz)=>{const group=new THREE.Group(),{instances}=scatterWorld({...config,bounds:chunkBounds(cx,cz)},pack.profile,field);group.position.set(cx*48,0,cz*48);group.userData.lodBatches=pack.assets.map((a,i)=>({group:nativeAssetSurface(pack,a,i).group,instances:instances[i],levels:[{geometry:geometries[i]}],chunkOrigin:[cx*48,cz*48]}));return group;};
 for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++)chunks.set(x+','+z,make(x,z));
 const index=new CameraVolumeIndex(),registry=new CameraTreeRegistry(index),begin=performance.now();registry.sync(chunks,1);const initialIndexMs=performance.now()-begin,volumes=[...index.records.values()],arms=[];
 const unchanged=[];for(let i=0;i<1000;i++){const t=performance.now();registry.sync(chunks,1);unchanged.push(performance.now()-t);}assert.equal(registry.rebuilds,25);
 let expectedHash;
 for(const arm of ['A1','B1','B2','A2']){
  const indexed=arm.startsWith('B'),samples=[],signature=[];let candidates=0;
  for(let i=0;i<700;i++){
   const a=i*.017,x=Math.sin(a)*90,z=Math.cos(a*.7)*90,start=[x,field.surface(x,z)+5,z],end=[x+Math.cos(a)*6,start[1]+.25,z+Math.sin(a)*6],t=performance.now();
   const hit=indexed?index.sweep(start,end,.45):firstCameraVolumeHit(start,end,volumes,.45),elapsed=performance.now()-t;
   if(i>=100){samples.push(elapsed);signature.push(hit?[hit.id,hit.fraction]:null);candidates+=indexed?index.lastCandidates:volumes.length;}
  }
  const resultHash=sha(JSON.stringify(signature));expectedHash??=resultHash;assert.equal(resultHash,expectedHash);
  arms.push({arm,samplesMs:samples,...stats(samples),meanCandidates:candidates/600,resultHash});
 }
 const previousRebuilds=registry.rebuilds;for(let z=-2;z<=2;z++){chunks.delete('-2,'+z);chunks.set('3,'+z,make(3,z));}
 const moved=performance.now();registry.sync(chunks,2);const streamingUpdateMs=performance.now()-moved;assert.equal(registry.rebuilds-previousRebuilds,5);
 rows.push({biome,config,sourceBinarySha256:sha(binary),chunks:25,initialVolumes:volumes.length,initialIndexMs,unchangedSync:{...stats(unchanged),samplesMs:unchanged},streamingUpdateMs,replacedChunks:5,arms});
 registry.clear();assert.equal(index.records.size,0);for(const g of geometries)g.dispose();
 writeFileSync(out+'/report.json',JSON.stringify({provenance,rows,scope:'Six native packed position sources and procedural scatter regions at origin/seed712. CPU index/direct-sweep ABBA with identical result hashes, unchanged sync and five-column-chunk replacement. Excludes generation timings, GPU, actual control motion, mobile, peak memory and visual acceptance. Protection remains off.'},null,2)+'\n');
 console.log(JSON.stringify({biome,volumes:volumes.length,initialIndexMs,unchangedP95:stats(unchanged).p95Ms,streamingUpdateMs,arms:arms.map(({arm,p95Ms,meanCandidates})=>({arm,p95Ms,meanCandidates}))}));
}
