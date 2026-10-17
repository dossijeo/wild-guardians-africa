import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {villageLayout} from '../../src/world/villages.js';
import * as Game from '../../src/simulation/game.js';

const [baselinePath,candidatePath,reportPath,baselineRef]=process.argv.slice(2);
const clusterCount=Number(process.env.PROP_CLUSTER_COUNT??8);
if(!Number.isInteger(clusterCount)||clusterCount<2||clusterCount>64)
  throw Error('PROP_CLUSTER_COUNT must be an integer from 2 to 64');
if(!baselinePath||!candidatePath||!reportPath)throw Error(
  'Usage: node benchmark-deferred-wall-topology.mjs baseline.wasm candidate.wasm report.json [baseline-git-ref]');
const baselineSource=baselineRef?execFileSync('git',['show',
  `${baselineRef}:src/simulation/game.js`],{encoding:'utf8'}):null;
const baselineModuleUrl=new URL(`../../src/simulation/.wall-benchmark-${process.pid}.mjs`,
  import.meta.url);
let baselineGame=Game;
if(baselineSource){
  writeFileSync(baselineModuleUrl,baselineSource);
  try{baselineGame=await import(baselineModuleUrl);}
  catch(error){unlinkSync(baselineModuleUrl);throw error;}
}
const gameModules={baseline:baselineGame,candidate:Game};
const binaries={baseline:readFileSync(baselinePath),candidate:readFileSync(candidatePath)};
const modules=Object.fromEntries(Object.entries(binaries).map(([k,v])=>
  [k,new WebAssembly.Module(v)]));
const hashes=Object.fromEntries(Object.entries(binaries).map(([k,v])=>
  [k,createHash('sha256').update(v).digest('hex')]));
const pack=JSON.parse(readFileSync(new URL('../../public/content/villages.json',
  import.meta.url),'utf8'))[0];
const stroke=[[-14,-14],[-6,-14],[-6,-6],[-14,-6],[-14,-14]];
const options={smooth:false,snap:false};
function stateForRun(){
  const s=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
    slotId:'deferred-wall-topology-abba'});
  s.villages[0].buildings=villageLayout(pack,0,0);
  s.structures.push({id:'center-1',kind:'center',x:0,z:0,
    culture:'mapungubwe',villageId:'village-1',status:'intact',hp:600,maxHp:600});
  return s;
}
const stateHash=createHash('sha256').update(serialize(stateForRun())).digest('hex');
function percentile(values,p){const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];}
async function run(arm){
  const game=gameModules[arm],state=stateForRun(),loaded=new Map();
  const session=createSpatialGameSession(modules[arm],state,
    {loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=-1;cx<=1;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    for(let i=0;i<2;i++)game.previewWallChain(state,'zarzas',stroke,nav,options);
    const counts={path:0,wallPlacement:0,preview:0,restoreProps:0,
      barriers:0},ms={path:0,wallPlacement:0,preview:0,restoreProps:0,
      barriers:0};
    const wrap=(owner,key,label)=>{
      const original=owner[key];owner[key]=(...args)=>{
        const start=performance.now();
        try{return original(...args);}finally{
          counts[label]++;ms[label]+=performance.now()-start;
        }
      };
    };
    wrap(nav,'path','path');wrap(nav,'wallPlacement','wallPlacement');
    wrap(session,'withWallPreview','preview');
    wrap(session.core,'restoreRemovedProps','restoreProps');
    wrap(session.core,'applyBarrierChanges','barriers');
    const times=[],sectorBefore=session.core.wasm.lazy_sector_updates();
    const source=serialize(state);let result=null,lastPlan=null;
    for(let i=0;i<8;i++){
      const start=performance.now();
      const plan=game.previewWallChain(state,'zarzas',stroke,nav,options);
      lastPlan=plan;
      times.push(performance.now()-start);
      const shape={pieces:plan.pieces.length,gates:plan.gates,
        blocked:plan.blockedPieces.length,cost:plan.cost,
        gatePositions:plan.pieces.filter(piece=>piece.gate).map(piece=>
          [piece.x,piece.z,piece.yaw])};
      if(result&&JSON.stringify(result)!==JSON.stringify(shape))
        throw Error('Repeated preview changed its quote');
      result=shape;
      if(serialize(state)!==source)throw Error('Preview mutated confirmed game state');
    }
    const wallCounters={counts:{...counts},ms:{...ms},
      sectorUpdates:session.core.wasm.lazy_sector_updates()-sectorBefore};
    for(const key of Object.keys(counts)){counts[key]=0;ms[key]=0;}
    const prop=[...loaded.values()].flatMap(chunk=>chunk.instances.flat())
      .find(item=>item.id?.startsWith('spatial:')&&
        (item.slot<4||item.slot>=10&&item.slot<=12||item.slot>=18));
    if(!prop)throw Error('No resident prop to suppress');
    const physicalSignature=()=>{
      const offsets=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
      return [true,...Object.keys(ANIMAL_SPATIAL_PROFILES)].map(profile=>
        offsets.map(([dx,dz])=>session.actorCanStand(
          {x:prop.x+dx,z:prop.z+dz},profile===true?
            {worker:true}:{worker:false,species:profile})));
    };
    const physicalBefore=physicalSignature();let physicalSuppressed;
    const propTimes=[],propSectorBefore=session.core.wasm.lazy_sector_updates();
    for(let i=0;i<8;i++){
      const start=performance.now();
      session.withWallPreview([],[prop.id],()=>{
        if(session.core.wasm.spatial_removed_prop_count()!==1)
          throw Error('Preview suppression was not applied');
        if(i===0)physicalSuppressed=physicalSignature();
      });
      propTimes.push(performance.now()-start);
      if(session.core.wasm.spatial_removed_prop_count()!==0)
        throw Error('Preview suppression leaked into confirmed state');
    }
    const propCounters={counts:{...counts},ms:{...ms},
      sectorUpdates:session.core.wasm.lazy_sector_updates()-propSectorBefore};
    const physicalRestored=physicalSignature();
    if(JSON.stringify(physicalRestored)!==JSON.stringify(physicalBefore))
      throw Error('Prop preview did not restore physical occupancy');
    for(const key of Object.keys(counts)){counts[key]=0;ms[key]=0;}
    const eligible=[...loaded.values()].flatMap(chunk=>chunk.instances.flat())
      .filter(item=>/^spatial:[0-5]:/.test(item.id)&&
        (item.slot<4||item.slot>=10&&item.slot<=12||item.slot>=18));
    const cluster=clusterCount===8?
      eligible.filter(item=>Math.hypot(item.x-prop.x,item.z-prop.z)<32).slice(0,8):
      eligible.sort((a,b)=>Math.hypot(a.x-prop.x,a.z-prop.z)-
        Math.hypot(b.x-prop.x,b.z-prop.z)).slice(0,clusterCount);
    if(cluster.length<clusterCount)throw Error('Not enough solid props to benchmark');
    const clusterIds=cluster.map(item=>item.id);
    const clusterPhysical=()=>[true,...Object.keys(ANIMAL_SPATIAL_PROFILES)]
      .map(profile=>cluster.map(item=>session.actorCanStand({x:item.x,z:item.z},
        profile===true?{worker:true}:{worker:false,species:profile})));
    const clusterBefore=clusterPhysical(),clusterTimes=[];
    const clusterSectorBefore=session.core.wasm.lazy_sector_updates();
    let clusterSuppressed;
    for(let i=0;i<8;i++){
      const start=performance.now();
      session.withWallPreview([],clusterIds,()=>{
        if(session.core.wasm.spatial_removed_prop_count()!==cluster.length)
          throw Error('Cluster suppression was not applied');
        if(i===0)clusterSuppressed=clusterPhysical();
      });
      clusterTimes.push(performance.now()-start);
      if(session.core.wasm.spatial_removed_prop_count()!==0)
        throw Error('Cluster suppression leaked into confirmed state');
    }
    const clusterRestored=clusterPhysical();
    if(JSON.stringify(clusterRestored)!==JSON.stringify(clusterBefore))
      throw Error('Cluster preview did not restore physical occupancy');
    const clusterPreview={count:cluster.length,times:clusterTimes,
      medianMs:percentile(clusterTimes,.5),p95Ms:percentile(clusterTimes,.95),
      sectorUpdates:session.core.wasm.lazy_sector_updates()-clusterSectorBefore,
      counts:{...counts},ms:{...ms},clusterBefore,clusterSuppressed,clusterRestored};
    // The intervening hypothetical prop edits advance the native topology
    // revision, so acquire a fresh prepared quote before timing only commit.
    lastPlan=game.previewWallChain(state,'zarzas',stroke,nav,options);
    for(const key of Object.keys(counts)){counts[key]=0;ms[key]=0;}
    const buildSectorBefore=session.core.wasm.lazy_sector_updates();
    const buildStart=performance.now();
    if(!game.buildWallChain(state,'benchmark-wall-chain','zarzas',stroke,nav,
      {...options,preparedPlan:lastPlan}))throw Error('Paid wall transaction failed');
    const build={ms:performance.now()-buildStart,
      counts:{...counts},operationMs:{...ms},
      sectorUpdates:session.core.wasm.lazy_sector_updates()-buildSectorBefore,
      pieces:state.structures.filter(item=>item.kind==='wall').length};
    const finalStateHash=createHash('sha256').update(serialize(state)).digest('hex');
    return {arm,quote:result,medianMs:percentile(times,.5),
      p95Ms:percentile(times,.95),times,build,finalStateHash,
      sectorUpdates:wallCounters.sectorUpdates,wallCounters,
      propPreview:{id:prop.id,times:propTimes,
        medianMs:percentile(propTimes,.5),p95Ms:percentile(propTimes,.95),
        physicalBefore,physicalSuppressed,physicalRestored,...propCounters},
      clusterPreview,
      memoryBytes:session.core.wasm.memory.buffer.byteLength};
  }finally{session.dispose();}
}
const rows=[];
try{
  for(const arm of ['baseline','candidate','candidate','baseline']){
    const row=await run(arm);rows.push(row);
    console.error(`${arm}: ${row.medianMs.toFixed(2)} ms, `+
      `${row.wallCounters.counts.path} paths, `+
      `${row.wallCounters.sectorUpdates} wall updates; `+
      `prop=${row.propPreview.medianMs.toFixed(2)} ms / `+
      `${row.propPreview.sectorUpdates} updates; `+
      `cluster=${row.clusterPreview.medianMs.toFixed(2)} ms / `+
      `${row.clusterPreview.sectorUpdates} updates`);
  }
  if(rows.some(row=>row.quote.pieces!==rows[0].quote.pieces||
    row.quote.gates!==rows[0].quote.gates||row.quote.cost!==rows[0].quote.cost))
    throw Error('Baseline and candidate generated different quote costs or sizes');
  if(rows.some(row=>row.finalStateHash!==rows[0].finalStateHash))
    throw Error('Paid builds produced different serialized game states');
  if(rows.some(row=>JSON.stringify(row.propPreview.physicalSuppressed)!==
    JSON.stringify(rows[0].propPreview.physicalSuppressed)))
    throw Error('Baseline and candidate disagree on suppressed-prop occupancy');
  if(rows.some(row=>JSON.stringify(row.clusterPreview.clusterSuppressed)!==
    JSON.stringify(rows[0].clusterPreview.clusterSuppressed)))
    throw Error('Baseline and candidate disagree on clustered-prop occupancy');
  const report={kind:'ABBA',scenario:'Sabana/712, eight repeated 15-piece gate previews',
    clusterCount,baselineRef:baselineRef??null,stateHash,wasmSha256:hashes,stroke,rows};
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
}finally{if(baselineSource)unlinkSync(baselineModuleUrl);}
