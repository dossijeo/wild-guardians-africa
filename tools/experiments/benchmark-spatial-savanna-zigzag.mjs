import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/hierarchical-wasm/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-zigzag.json';
const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const path=[];
for(let z=0;z<8;z++)for(let i=0;i<8;i++)path.push([z%2?7-i:i,z]);
path.push(...path.slice(0,-1).reverse());
const key=(x,z)=>`${x},${z}`;
function chunkDigest(core){
  const digest=createHash('sha256');
  for(const data of [core.heights(),core.colors(),core.water(),core.groundMask(),core.waterLevels(),core.waterTriangles()])
    digest.update(Buffer.from(data.buffer,data.byteOffset,data.byteLength));
  digest.update(JSON.stringify(core.props()));
  return digest.digest('hex');
}
function validRoute(core,start,result){
  if(result.status!=='found')throw Error(`Expected a route, got ${result.status}`);
  let previous=start;
  for(const point of result.points){
    if(!core.edge(previous.x,previous.z,point.x,point.z))throw Error('Route contains an invalid physical edge');
    previous=point;
  }
}
function traverse(){
  const core=createSpatialSavannaPrototype(module),resident=new Set([key(0,0)]),digests=new Map(),rows=[];
  core.generate(17,0,0);digests.set(key(0,0),chunkDigest(core));core.buildNavigation(1.1,false);
  let regenerated=0,checkedRoutes=0,edits=0,maxMemory=core.metrics().memoryBytes,maxSlots=0;
  for(const [step,[cx,cz]] of path.entries()){
    const wanted=new Set([key(cx,cz),key(cx+1,cz),key(cx,cz+1),key(cx+1,cz+1)]);
    const started=performance.now();
    for(const id of [...resident])if(!wanted.has(id)){
      const [x,z]=id.split(',').map(Number);
      if(core.removeChunk(x,z)!==1)throw Error(`Could not remove ${id}`);
      resident.delete(id);
    }
    for(const [x,z] of [[cx,cz],[cx+1,cz],[cx,cz+1],[cx+1,cz+1]]){
      const id=key(x,z);if(resident.has(id))continue;
      if(core.addChunk(x,z)<=0)throw Error(`Could not add ${id}`);
      const digest=chunkDigest(core);
      if(digests.has(id)){
        if(digests.get(id)!==digest)throw Error(`Regenerated chunk differs: ${id}`);
        regenerated++;
      }else digests.set(id,digest);
      resident.add(id);
    }
    const streamMs=performance.now()-started,metrics=core.metrics();
    if(resident.size!==4||metrics.loadedChunks!==4||metrics.loadedSectors!==64||metrics.sectorSlots!==64)
      throw Error(`Resident graph grew at step ${step}: ${JSON.stringify(metrics)}`);
    maxMemory=Math.max(maxMemory,metrics.memoryBytes);maxSlots=Math.max(maxSlots,metrics.sectorSlots);
    const seamX=cx*48+23;
    let seam=null;
    for(let offset=0;offset<48;offset++){
      const z=cz*48-24+offset;
      if(core.edge(seamX,z,seamX+1,z)){seam={x:seamX,z};break;}
    }
    if(seam){
      const start={x:seam.x,z:seam.z},end={x:seam.x+1,z:seam.z};
      validRoute(core,start,core.route(start,end));checkedRoutes++;
      if(step%8===0){
        const wall=core.addWall(seam.x+.5,seam.z,.8,.5);
        if(!wall||core.edge(start.x,start.z,end.x,end.z))throw Error(`Wall failed to close local seam at step ${step}`);
        if(core.removeWall(wall)!==1||!core.edge(start.x,start.z,end.x,end.z))
          throw Error(`Removing wall failed to restore local seam at step ${step}`);
        validRoute(core,start,core.route(start,end));edits++;
      }
    }
    rows.push({step,cx,cz,streamMs,memoryBytes:metrics.memoryBytes,sectorSlots:metrics.sectorSlots,routeChecked:!!seam});
  }
  const sorted=rows.map(row=>row.streamMs).sort((a,b)=>a-b);
  return {steps:rows.length,uniqueChunks:digests.size,regenerated,checkedRoutes,wallEdits:edits,
    maxMemoryBytes:maxMemory,maxSectorSlots:maxSlots,streamMedianMs:sorted[Math.floor(sorted.length/2)],
    streamP95Ms:sorted[Math.floor(sorted.length*.95)],rows};
}
const first=traverse(),second=traverse();
for(const field of ['steps','uniqueChunks','regenerated','checkedRoutes','wallEdits','maxMemoryBytes','maxSectorSlots'])
  if(first[field]!==second[field])throw Error(`Non-deterministic traversal field ${field}`);
const report={scope:'QA-only 8x8 serpentine and reverse, four resident Sabana chunks, seed 17, animal radius 1.1.',
  first,second,warning:'Timing includes chunk addition/removal and hashing of visual buffers; world recipe differs from production.'};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({first:{...first,rows:undefined},second:{...second,rows:undefined}}));
