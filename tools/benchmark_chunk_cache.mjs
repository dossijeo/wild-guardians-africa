import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createOpeningWorld} from './check_opening.mjs';
import {buildNativeChunk,chunkTransferables} from '../src/rendering/chunk-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {serialize} from '../src/persistence/snapshots.js';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {encodeChunkCache,decodeChunkCache} from './experiments/chunk-cache-codec.mjs';

const output=process.argv[2];if(!output)throw Error('Usage: node tools/benchmark_chunk_cache.mjs OUTPUT_DIRECTORY');
mkdirSync(output,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2)),sha=b=>createHash('sha256').update(b).digest('hex');
const sources=Object.fromEntries(Object.entries(provenance.sourceHashes).filter(([p])=>p.startsWith('src/world/')||p.startsWith('src/rendering/')));
const rows=[];
const transfer=data=>{const buffers=chunkTransferables(data),result=structuredClone(data,{transfer:buffers});assert(buffers.every(b=>b.byteLength===0));return result;};
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
 const {s,nav}=createOpeningWorld({biome,culture:'mapungubwe',seed:712}),before=serialize(s),config=nav.config,profile=nav.profile,center=s.structures[0];
 const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
 const region=activeChunkRegion({x:pose.eye[0],z:pose.eye[2]},'media'),coords=[];
 for(let dz=-region.range;dz<=region.range;dz++)for(let dx=-region.range;dx<=region.range;dx++)coords.push([region.cx+dx,region.cz+dz]);
 const key=sha(JSON.stringify({schema:1,config,profile,sources})),directory=output+'/'+biome;mkdirSync(directory,{recursive:true});
 const baseline=coords.map(([cx,cz])=>buildNativeChunk(config,profile,cx,cz));
 let rawBytes=0,compressedBytes=0,persistMs=0;const payloads=[];
 baseline.forEach((data,i)=>{const start=performance.now(),bytes=encodeChunkCache(data,key),compressed=gzipSync(bytes),path=directory+'/'+coords[i].join('_')+'.cache.gz';writeFileSync(path,compressed);persistMs+=performance.now()-start;rawBytes+=bytes.length;compressedBytes+=compressed.length;payloads.push({path,sha256:sha(compressed),bytes:compressed.length});assert.deepEqual(decodeChunkCache(bytes,key),data);});
 const samples=[];
 for(let round=0;round<3;round++)for(const arm of ['generate','restore','restore','generate']){
  const start=performance.now();
  const chunks=arm==='generate'?coords.map(([cx,cz])=>transfer(buildNativeChunk(config,profile,cx,cz))):payloads.map(p=>transfer(decodeChunkCache(gunzipSync(readFileSync(p.path)),key)));
  const elapsed=performance.now()-start;assert.deepEqual(chunks,baseline);assert.equal(serialize(s),before);
  samples.push({round,arm,elapsedMs:elapsed,chunks:chunks.length,sampledMemory:process.memoryUsage()});
 }
 const mean=arm=>{const a=samples.filter(s=>s.arm===arm);return a.reduce((n,s)=>n+s.elapsedMs,0)/a.length;};
 const row={biome,culture:'mapungubwe',seed:712,config,profile,key,region,coords,rawBytes,compressedBytes,persistMs,generationMeanMs:mean('generate'),restorationMeanMs:mean('restore'),samples,payloads,exactChunkParity:true,logicalStateUnchanged:true};
 rows.push(row);writeFileSync(output+'/report.json',JSON.stringify({provenance,sources,rows,scope:'Isolated synchronous native CPU generation versus warm local file read/inflate/experimental decode plus structured transfer. Three ABBA rounds per biome, no GPU uploads, asset loading, IDB, real browser worker messaging, cold disk, peak-memory or total-world-load claim. No production cache, save change or camera centering.'},null,2)+'\n');
 console.log(JSON.stringify({biome,chunks:coords.length,rawBytes,compressedBytes,persistMs,generationMeanMs:row.generationMeanMs,restorationMeanMs:row.restorationMeanMs,exactChunkParity:true}));
}
