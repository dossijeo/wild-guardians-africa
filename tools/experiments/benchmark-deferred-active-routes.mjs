import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {rational} from '../../src/simulation/money.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import * as currentGame from '../../src/simulation/game.js';

const [reportPath,baselineRef]=process.argv.slice(2);
const tickMode=process.env.WALL_BENCH_TICK==='1';
if(!reportPath||!baselineRef)throw Error(
  'Usage: node benchmark-deferred-active-routes.mjs report.json baseline-git-ref');
const source=execFileSync('git',['show',`${baselineRef}:src/simulation/game.js`],
  {encoding:'utf8'});
const temporary=new URL(`../../src/simulation/.active-route-baseline-${process.pid}.mjs`,
  import.meta.url);
writeFileSync(temporary,source);
let baselineGame;
try{baselineGame=await import(temporary);}catch(error){unlinkSync(temporary);throw error;}
const games={baseline:baselineGame,candidate:currentGame};
const sha=value=>createHash('sha256').update(value).digest('hex');
const percentile=(values,p)=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
};
async function run(arm){
  const game=games[arm];
  const {state,nav,session,start}=await createSpatialCampaignOpening({
    biome:'desierto',seed:983,slotId:'deferred-active-routes'});
  try{
    state.ledger.balance=rational(10000);
    const center=start.site.center,village=state.villages[0];
    nav.setActiveBounds([center.x-96,center.z-96,center.x+96,center.z+96]);
    const destination={...(village.entry??village),id:`home-${village.id}`};
    const workCenter=state.structures.find(item=>item.kind==='center');
    const workers=[];
    for(let dz=-18;dz<=18&&workers.length<20;dz+=3)
      for(let dx=-18;dx<=18&&workers.length<20;dx+=3){
        const from={x:center.x+dx,z:center.z+dz};
        if(!nav.walkable(from.x,from.z,.28,null,true))continue;
        let path;
        try{path=nav.path(from,destination,.28,null,true);}
        catch(error){if(error.name==='SpatialChunkUnavailable')continue;throw error;}
        if(!path?.length)continue;
        workers.push({id:`worker-${workers.length}`,personId:`person-${workers.length}`,
          profile:'olderFemale',contractDay:state.day,centerId:workCenter.id,
          villageId:village.id,x:from.x,z:from.z,
          radius:.28,status:'returning',path,destinationId:destination.id,
          pathVersion:nav.version});
      }
    if(workers.length!==20)throw Error(`Only ${workers.length} routes found`);
    state.workers=workers;
    for(const worker of workers)game.walkTo(state,worker,destination,0,nav);
    const stroke=[[center.x-30,center.z-30],[center.x+12,center.z-30]];
    const options={smooth:false,snap:false};
    const quote=game.previewWallChain(state,'zarzas',stroke,nav,options);
    if(quote.pieces.length!==20)throw Error('Expected 20 legal wall modules');
    if(!game.buildWallChain(state,'deferred-route-stroke','zarzas',stroke,nav,
      {...options,preparedPlan:quote}))throw Error('Paid build failed');
    const initialVersion=workers[0].pathVersion;
    if(nav.version===initialVersion)throw Error('The wall build did not advance topology');
    for(const worker of workers){
      let previous=worker;
      for(const point of worker.path){
        if(!nav.segmentClear(previous,point,.28,null,true))
          throw Error(`Wall stroke obstructed prepared route ${worker.id}`);
        previous=point;
      }
    }
    let paths=0,segments=0,refreshes=0;
    const originalPath=nav.workerPath,originalSegment=nav.segmentClear;
    nav.workerPath=(...args)=>{paths++;return originalPath(...args);};
    nav.segmentClear=(...args)=>{segments++;return originalSegment(...args);};
    nav.planningObserver=event=>{if(event.kind==='routeRefresh')refreshes++;};
    const started=performance.now();
    if(tickMode)game.tick(state,.05,nav);
    else for(const worker of workers)game.walkTo(state,worker,destination,.05,nav);
    const ms=performance.now()-started;
    return {arm,ms,paths,segments,refreshes,version:nav.version,
      positions:workers.map(worker=>[worker.x,worker.z]),
      remaining:workers.map(worker=>worker.path?.length??-1),
      wasmBytes:session.core.wasm.memory.buffer.byteLength};
  }finally{session.dispose();}
}
const rows=[];
try{
  for(const arm of ['baseline','candidate','candidate','baseline']){
    const row=await run(arm);rows.push(row);
    console.error(`${arm}: ${row.ms.toFixed(2)} ms; ${row.paths} new routes; `+
      `${row.segments} segment checks`);
  }
  if(rows.some(row=>JSON.stringify(row.positions)!==JSON.stringify(rows[0].positions)))
    throw Error('The actors moved to different positions in equivalent work');
  writeFileSync(reportPath,JSON.stringify({kind:'ABBA',scenario:'Desert/983, 20 valid retained '+
    `worker routes after a legal remote 20-wall transaction (${tickMode?'Game.tick':'walkTo'})`,
    tickMode,baselineRef,
    sourceSha256:{baseline:sha(source),candidate:sha(readFileSync(new URL(
      '../../src/simulation/game.js',import.meta.url)))},
    wasmSha256:sha(readFileSync(new URL('../../src/world/wild-engine/spatial-savanna.wasm',
      import.meta.url))),medianByArm:Object.fromEntries(['baseline','candidate'].map(arm=>
      [arm,percentile(rows.filter(row=>row.arm===arm).map(row=>row.ms),.5)])),rows},null,2)+'\n');
}finally{unlinkSync(temporary);}
