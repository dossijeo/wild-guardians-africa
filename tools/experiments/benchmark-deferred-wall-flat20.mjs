import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
import {rational} from '../../src/simulation/money.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import * as currentGame from '../../src/simulation/game.js';

const [baselinePath,candidatePath,reportPath,baselineRef,scenario='flat20']=process.argv.slice(2);
if(!baselinePath||!candidatePath||!reportPath||!baselineRef)
  throw Error('Usage: node benchmark-deferred-wall-flat20.mjs baseline.wasm candidate.wasm report.json baseline-git-ref [flat20|canyon]');
if(!['flat20','canyon'].includes(scenario))throw RangeError('Unknown wall benchmark scenario');
const baselineSource=execFileSync('git',['show',`${baselineRef}:src/simulation/game.js`],
  {encoding:'utf8'});
const temporary=new URL(`../../src/simulation/.flat20-baseline-${process.pid}.mjs`,
  import.meta.url);
writeFileSync(temporary,baselineSource);
let baselineGame;
try{baselineGame=await import(temporary);}catch(error){unlinkSync(temporary);throw error;}
const binaries={baseline:readFileSync(baselinePath),candidate:readFileSync(candidatePath)};
const modules=Object.fromEntries(Object.entries(binaries).map(([key,value])=>
  [key,new WebAssembly.Module(value)]));
const sha=value=>createHash('sha256').update(value).digest('hex');
const wasmSha256=Object.fromEntries(Object.entries(binaries).map(([key,value])=>
  [key,sha(value)]));
const sourceSha256={baseline:sha(baselineSource),candidate:sha(readFileSync(new URL(
  '../../src/simulation/game.js',import.meta.url)))};
let stroke,openingState,openingCenter;
const options={smooth:false,snap:false};
{
  const opening=await createSpatialCampaignOpening({seed:scenario==='canyon'?712:983,
    biome:scenario==='canyon'?'gran-canon':'desierto',
    slotId:`${scenario}-wall-benchmark`});
  try{
    opening.state.ledger.balance=rational(10000);
    openingState=serialize(opening.state);
    openingCenter=opening.start.site.center;
    if(scenario==='flat20'){
      stroke=[[openingCenter.x-30,openingCenter.z-30],
        [openingCenter.x+12,openingCenter.z-30]];
    }else{
    const farm=opening.start.farm;
      stroke=[[openingCenter.x-10,Math.min(...farm.map(point=>point.z))-10],
        [openingCenter.x+22,Math.min(...farm.map(point=>point.z))-10],
        [openingCenter.x+22,openingCenter.z+10],
        [openingCenter.x-10,openingCenter.z+10],
        [openingCenter.x-10,Math.min(...farm.map(point=>point.z))-10]];
    }
  }finally{opening.dispose();}
}
const stateForRun=()=>deserialize(openingState);
const stateHash=sha(serialize(stateForRun()));
const repetitions=Number(process.env.WALL_BENCH_ITERATIONS??8);
if(!Number.isSafeInteger(repetitions)||repetitions<1||repetitions>100)
  throw RangeError('WALL_BENCH_ITERATIONS must be 1–100');
const percentile=(values,p)=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
};
async function run(arm){
  const state=stateForRun(),game=arm==='baseline'?baselineGame:currentGame;
  const binaryArm=arm==='baseline'?'baseline':'candidate';
  const loaded=new Map(),session=createSpatialGameSession(modules[binaryArm],state,
    {loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    const center=openingCenter;
    const cx=Math.floor((center.x+24)/48),cz=Math.floor((center.z+24)/48);
    const radius=2;
    for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.hypot(x-cx,z-cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    const startingCenter=state.structures.find(item=>item.kind==='center'&&item.status!=='ruined');
    const startingVillage=state.villages.find(item=>item.id===startingCenter?.villageId);
    const serviceRouteBefore=startingCenter&&startingVillage?
      Boolean(nav.path(startingVillage.entry??startingVillage,
        centerServicePoint(startingCenter,state,.8),.28,null,true)):null;
    if(arm==='candidateFallback')nav.wallLocalOverlay=()=>null;
    for(let i=0;i<2;i++)game.previewWallChain(state,'zarzas',stroke,nav,options);
    const counts={path:0,preview:0,wallLocalOverlay:0,localProbes:0,barriers:0};
    const wrap=(owner,name,key)=>{
      const original=owner[name];owner[name]=(...args)=>{
        try{return original(...args);}finally{counts[key]++;}
      };
    };
    wrap(nav,'path','path');wrap(session,'withWallPreview','preview');
    wrap(nav,'wallLocalOverlay','wallLocalOverlay');
    wrap(session.core,'overlayLocalClear','localProbes');
    wrap(session.core,'applyBarrierChanges','barriers');
    const frozen=serialize(state),before=session.core.wasm.lazy_sector_updates();
    const times=[];let plan,shape;
    for(let i=0;i<repetitions;i++){
      const started=performance.now();
      plan=game.previewWallChain(state,'zarzas',stroke,nav,options);
      times.push(performance.now()-started);
      const current={pieces:plan.pieces.length,blocked:plan.blockedPieces.length,
        gates:plan.gates,cost:plan.cost,suppressed:plan.suppressed.length,
        modules:plan.pieces.map(piece=>[piece.x,piece.z,piece.yaw,piece.gate])};
      if(shape&&JSON.stringify(shape)!==JSON.stringify(current))
        throw Error('Repeated wall quote changed');
      shape=current;
      if(serialize(state)!==frozen)throw Error('The preview changed confirmed game state');
    }
    if(scenario==='flat20'&&(shape.pieces!==20||shape.blocked!==0||shape.suppressed!==0))
      throw Error('Expected exactly 20 legal walls on cleared flat terrain');
    const quoteCounts={...counts},sectorUpdates=session.core.wasm.lazy_sector_updates()-before;
    if(process.env.WALL_BENCH_DIAG==='1')console.error(JSON.stringify({arm,shape,quoteCounts,sectorUpdates}));
    for(const key of Object.keys(counts))counts[key]=0;
    const buildBefore=session.core.wasm.lazy_sector_updates(),started=performance.now();
    if(!game.buildWallChain(state,'flat20-build','zarzas',stroke,nav,
      {...options,preparedPlan:plan}))throw Error('The paid construction failed');
    const buildMs=performance.now()-started;
    const buildCounts={...counts};
    const buildSectorUpdates=session.core.wasm.lazy_sector_updates()-buildBefore;
    const serviceCenter=state.structures.find(item=>item.kind==='center'&&item.status!=='ruined');
    const village=state.villages.find(item=>item.id===serviceCenter?.villageId);
    const serviceRoute=serviceCenter&&village?Boolean(nav.path(village.entry??village,
      centerServicePoint(serviceCenter,state,.8),.28,null,true)):null;
    const gateAccess=state.structures.filter(item=>item.kind==='wall'&&item.gate)
      .map(gate=>{
        const [a,b]=gatePortalPoints(gate);
        return {id:gate.id,x:gate.x,z:gate.z,
          worker:nav.segmentClear(a,b,.28,null,true),
          animals:Object.fromEntries(Object.entries(ANIMAL_SPATIAL_PROFILES)
            .map(([species,profile])=>[species,
              nav.segmentClear(a,b,profile.radius,null,false)]))};
      });
    return {arm,shape,times,medianMs:percentile(times,.5),
      p95Ms:percentile(times,.95),quoteCounts,sectorUpdates,
      physical:{serviceRouteBefore,serviceRoute,gateAccess},
      build:{ms:buildMs,counts:buildCounts,
        sectorUpdates:buildSectorUpdates,
        finalStateHash:sha(serialize(state))},
      linearMemoryBytes:session.core.wasm.memory.buffer.byteLength};
  }finally{session.dispose();}
}
const rows=[];
try{
  for(const arm of ['baseline','candidate','candidate','baseline']){
    const row=await run(arm);rows.push(row);
    console.error(`${arm}: ${row.medianMs.toFixed(2)} ms, `+
      `${row.quoteCounts.preview} previews, ${row.sectorUpdates} sector updates`);
  }
  const fallback=scenario==='canyon'&&process.env.WALL_BENCH_SKIP_FALLBACK!=='1'?
    await run('candidateFallback'):null;
  const baselineCandidateEquivalent=rows.every(row=>
    JSON.stringify(row.shape)===JSON.stringify(rows[0].shape)&&
    row.build.finalStateHash===rows[0].build.finalStateHash);
  const overlayEquivalent=!fallback||rows.filter(row=>row.arm==='candidate').every(row=>
    JSON.stringify(row.shape)===JSON.stringify(fallback.shape)&&
    row.build.finalStateHash===fallback.build.finalStateHash);
  const description=scenario==='canyon'?'Canyon/712 natural-barrier farm wall ring':
    'Desert/983: 20 legal flat-terrain walls';
  writeFileSync(reportPath,JSON.stringify({kind:'ABBA',scenario:description,
    baselineRef,stateHash,wasmSha256,sourceSha256,stroke,repetitions,rows,
    fallback,baselineCandidateEquivalent,overlayEquivalent},null,2)+'\n');
  if(!overlayEquivalent)throw Error('Read-only and full-preview candidate plans differ');
  if(scenario==='flat20'&&(!baselineCandidateEquivalent||
    rows.some(row=>!row.physical.serviceRouteBefore||!row.physical.serviceRoute)||
    rows.filter(row=>row.arm==='candidate').some(row=>row.quoteCounts.preview!==0)))
    throw Error('Flat 20-wall quote lost its legal route or repeated a preview');
}finally{unlinkSync(temporary);}
