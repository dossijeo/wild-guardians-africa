import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {approximateCutModules,identifyNaturalCorridor} from
  '../../src/world/hierarchical-wasm/spatial-topological-enclosure-prototype.js';
import {AGRICULTURAL_PROFILE_LIMITS} from '../../src/simulation/raid-agricultural-impact.js';
import {ANIMAL_SPATIAL_PROFILES} from
  '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {findVillageEntry,villageLayout} from '../../src/world/villages.js';
import * as Game from '../../src/simulation/game.js';

const [baselinePath,candidatePath,outputPath]=process.argv.slice(2);
if(!baselinePath||!candidatePath||!outputPath)
  throw Error('Usage: node benchmark-canyon-corridor.mjs <baseline.wasm> <candidate.wasm> <report.json>');
const modules={baseline:new WebAssembly.Module(readFileSync(baselinePath)),
  candidate:new WebAssembly.Module(readFileSync(candidatePath))};
const hashes=Object.fromEntries(Object.entries({baseline:baselinePath,
  candidate:candidatePath}).map(([name,path])=>[name,
  createHash('sha256').update(readFileSync(path)).digest('hex')]));
const pack=JSON.parse(readFileSync(new URL('../../public/content/villages.json',
  import.meta.url),'utf8'))[0];
const seeds=[[-19,45],[-22,53],[-25,61]];
const bounds=[-48,35,-5,70],species=['warthog','hyena','buffalo','lion','rhino'];
const reach=Math.max(...Object.values(ANIMAL_SPATIAL_PROFILES)
  .map(p=>p.radius))+.65+AGRICULTURAL_PROFILE_LIMITS.attackRadius;
const snapshot=()=>{
  const state=Game.newGame({seed:712,biome:'gran-canon',culture:'mapungubwe',
    slotId:'canyon-corridor-abba'});
  state.villages[0].buildings=villageLayout(pack,0,0);
  state.villages[0].entry={x:0,z:4};
  state.structures.push({id:'center-1',kind:'center',x:0,z:0,
    culture:'mapungubwe',villageId:'village-1',status:'intact',
    hp:600,maxHp:600});
  return state;
};
let stateHash=null;
async function run(name){
  const state=snapshot(),loaded=new Map(),session=createSpatialGameSession(
    modules[name],state,{loaded:()=>loaded,
      onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let z=-1;z<=2;z++)for(let x=-1;x<=1;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.hypot(x,z)});
    const loadStart=performance.now();
    session.stream.plan(jobs);await session.stream.whenIdle();
    const loadMs=performance.now()-loadStart;
    const nav=createSpatialNavigationMovement(session,state),wasm=session.core.wasm;
    const computedEntry=findVillageEntry(nav,state.villages[0].buildings,0,0);
    if(!computedEntry||Math.hypot(computedEntry.x,computedEntry.z-4)>1e-5)
      throw Error('Initial village entry changed');
    for(const [x,z] of seeds)if(!nav.placement(x,z,.4).valid)
      throw Error(`Frozen crop site ${x},${z} is no longer legal`);
    for(const [index,[x,z]] of seeds.entries())
      if(!Game.plant(state,`canyon-corridor-plant-${index}`,'mijo',x,z,nav))
        throw Error(`Could not plant frozen crop ${index}`);
    const plantedHash=createHash('sha256').update(serialize(state)).digest('hex');
    if(stateHash===null)stateHash=plantedHash;
    else if(plantedHash!==stateHash)throw Error('ABBA arms have different planted states');
    const points=[];
    for(let z=32;z<=68;z+=8)for(let x=-60;x<=20;x+=8)
      points.push({x,z});
    for(const kind of species)session.actorRegionsBatch(points,
      {worker:false,species:kind});
    new Int32Array(wasm.memory.buffer,wasm.lazy_cut_seeds_ptr(3),6)
      .set(seeds.flat());
    const cutStart=performance.now();
    const count=wasm.lazy_local_crop_cut_conservative_buildable(...bounds,3,2);
    const cutMs=performance.now()-cutStart;
    const edges=count>=0?Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_ptr(),count*4)):[];
    const boundaryCount=count>=0?wasm.lazy_local_crop_cut_boundary_count():0;
    const boundary=boundaryCount?Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_boundary_ptr(),boundaryCount*4)):[];
    const natural=[];
    for(let i=0;i<boundary.length;i+=4){
      const edge=boundary.slice(i,i+4);
      natural.push({edge,kind:wasm.lazy_cut_face_natural(...edge)});
    }
    let attackMargin=null;
    if(name==='candidate'&&count>=0){
      const ptr=wasm.lazy_cut_attack_points_ptr(seeds.length);
      new Float32Array(wasm.memory.buffer,ptr,seeds.length*2).set(seeds.flat());
      attackMargin=wasm.lazy_cut_attack_margin(seeds.length,reach);
    }
    const convertStart=performance.now();
    const shape=count>=0?approximateCutModules(edges,state.structures,
      'zarzas',10):null;
    const corridor=shape&&identifyNaturalCorridor(shape.strokes,natural);
    const convertMs=performance.now()-convertStart;
    let quote=null,quoteMs=0,validateMs=0,faces=null,workerBefore=null,
      workerAfter=null;
    const entry=state.villages[0].entry,routes=()=>seeds.map(([x,z])=>({
      out:!!nav.path(entry,{x,z},.28,null,true),
      back:!!nav.path({x,z},entry,.28,null,true)}));
    if(shape&&!shape.ambiguous.length){
      workerBefore=routes();
      const quoteStart=performance.now();
      quote=Game.quoteWallChain(state,'zarzas',shape.strokes,nav,
        {smooth:false,snap:false});
      quoteMs=performance.now()-quoteStart;
      const validateStart=performance.now();
      const physical=nav.withWallPreview(quote.previewPieces,
        quote.suppressed,()=>{
          const faceCounts={solid:0,wetland:0,river:0,cliff:0,unproved:0};
          for(let i=0;i<boundary.length;i+=4){
            const code=wasm.lazy_cut_face_natural(...boundary.slice(i,i+4));
            if(code===1)faceCounts.solid++;
            else if(code===2)faceCounts.wetland++;
            else if(code===3)faceCounts.river++;
            else if(code===4)faceCounts.cliff++;
            else faceCounts.unproved++;
          }
          return {faceCounts,routes:routes()};
        },true);
      validateMs=performance.now()-validateStart;
      faces=physical.faceCounts;workerAfter=physical.routes;
    }
    if(createHash('sha256').update(serialize(state)).digest('hex')!==stateHash)
      throw Error('Read-only benchmark modified the game');
    return {arm:name,loadMs,cutMs,convertMs,quoteMs,validateMs,
      count,cells:wasm.lazy_local_crop_cut_cells(),
      strokes:shape?.strokes.length??0,corridor:corridor?.kind??null,
      modules:quote?.pieces.length??null,cost:quote?.cost??null,
      omitted:quote?.blockedPieces.length??null,
      gates:quote?.gates??null,faces,attackMargin,
      workerBefore,workerAfter,memoryBytes:wasm.memory.buffer.byteLength};
  }finally{session.dispose();}
}
const rows=[];
for(const arm of ['baseline','candidate','candidate','baseline']){
  const result=await run(arm);rows.push(result);
  console.error(`${arm}: cut=${result.cutMs.toFixed(2)}ms `+
    `quote=${result.quoteMs.toFixed(2)}ms modules=${result.modules}`);
}
const report={kind:'ABBA',seed:712,biome:'gran-canon',
  cropSites:seeds,bounds,sourceHash:stateHash,wasmSha256:hashes,rows,
  note:'Three legally planted live crops and the computed initial-village entry (0,4). Workers have routes before and after both quotes. Baseline and candidate are not equivalent protected plans.'};
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({outputPath,rows:rows.map(row=>({arm:row.arm,
  cutMs:row.cutMs,quoteMs:row.quoteMs,validateMs:row.validateMs,
  count:row.count,modules:row.modules,omitted:row.omitted,
  corridor:row.corridor,attackMargin:row.attackMargin}))}));
