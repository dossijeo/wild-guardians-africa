import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {rational} from '../../src/simulation/money.js';
import * as currentGame from '../../src/simulation/game.js';

const [baselinePath,candidatePath,reportPath,baselineRef]=process.argv.slice(2);
if(!baselinePath||!candidatePath||!reportPath||!baselineRef)
  throw Error('Usage: node benchmark-deferred-wall-desert.mjs baseline.wasm candidate.wasm report.json baseline-git-ref');
const source=execFileSync('git',['show',`${baselineRef}:src/simulation/game.js`],
  {encoding:'utf8'});
const temporary=new URL(`../../src/simulation/.desert-wall-baseline-${process.pid}.mjs`,
  import.meta.url);
writeFileSync(temporary,source);
let baselineGame;
try{baselineGame=await import(temporary);}
catch(error){unlinkSync(temporary);throw error;}
const files={baseline:readFileSync(baselinePath),candidate:readFileSync(candidatePath)};
const binaries=Object.fromEntries(Object.entries(files).map(([key,value])=>
  [key,new WebAssembly.Module(value)]));
const wasmSha256=Object.fromEntries(Object.entries(files).map(([key,value])=>
  [key,createHash('sha256').update(value).digest('hex')]));
const games={baseline:baselineGame,candidate:currentGame};
const sourceSha256={baseline:createHash('sha256').update(source).digest('hex'),
  candidate:createHash('sha256').update(readFileSync(new URL(
    '../../src/simulation/game.js',import.meta.url))).digest('hex')};
const snapshot=gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-d15-partial-state.json.gz',import.meta.url)));
const stroke=[[66,-7.18],[66,-18]],options={smooth:false,snap:false};
const percentile=(values,p)=>{
  const ordered=[...values].sort((a,b)=>a-b);
  return ordered[Math.min(ordered.length-1,Math.ceil(ordered.length*p)-1)];
};
function stateForRun(){
  const state=deserialize(snapshot.toString());
  state.structures=state.structures.filter(item=>
    !(item.kind==='wall'&&item.created>=27114));
  state.ledger.balance=rational(10000);
  return state;
}
const stateHash=createHash('sha256').update(serialize(stateForRun())).digest('hex');
async function run(arm){
  const game=games[arm],state=stateForRun(),loaded=new Map();
  const session=createSpatialGameSession(binaries[arm],state,
    {loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-72,-120,168,120]);
    game.quoteWallChain(state,'zarzas',stroke,nav,options);
    const counts={path:0,preview:0,overlay:0,barriers:0,restoreProps:0};
    const operationMs=Object.fromEntries(Object.keys(counts).map(key=>[key,0]));
    const wrap=(owner,name,key)=>{
      const original=owner[name];owner[name]=(...args)=>{
        const start=performance.now();
        try{return original(...args);}
        finally{counts[key]++;operationMs[key]+=performance.now()-start;}
      };
    };
    wrap(nav,'path','path');wrap(session,'withWallPreview','preview');
    wrap(nav,'gateOverlayClear','overlay');
    wrap(session.core,'applyBarrierChanges','barriers');
    wrap(session.core,'restoreRemovedProps','restoreProps');
    const frozen=serialize(state),sectorBefore=session.core.wasm.lazy_sector_updates();
    const times=[];let quote;
    for(let i=0;i<4;i++){
      const start=performance.now();
      quote=game.quoteWallChain(state,'zarzas',stroke,nav,options);
      times.push(performance.now()-start);
      if(serialize(state)!==frozen)throw Error('The quote mutated the saved game');
    }
    const shape={pieces:quote.pieces.length,gates:quote.gates,cost:quote.cost,
      gatePositions:quote.pieces.filter(piece=>piece.gate).map(piece=>
        [piece.x,piece.z,piece.yaw]),blocked:quote.blockedPieces.length};
    const quoteCounts={...counts},quoteOperationMs={...operationMs};
    const quoteSectorUpdates=session.core.wasm.lazy_sector_updates()-sectorBefore;
    for(const key of Object.keys(counts)){counts[key]=0;operationMs[key]=0;}
    const buildBefore=session.core.wasm.lazy_sector_updates(),start=performance.now();
    if(!game.buildWallChain(state,'desert-benchmark-wall','zarzas',stroke,nav,
      {...options,preparedPlan:quote}))throw Error('The paid construction failed');
    const build={ms:performance.now()-start,counts:{...counts},
      sectorUpdates:session.core.wasm.lazy_sector_updates()-buildBefore,
      finalStateHash:createHash('sha256').update(serialize(state)).digest('hex')};
    return {arm,shape,times,medianMs:percentile(times,.5),
      p95Ms:percentile(times,.95),quoteCounts,quoteOperationMs,quoteSectorUpdates,
      build,linearMemoryBytes:session.core.wasm.memory.buffer.byteLength};
  }finally{session.dispose();}
}
const rows=[];
try{
  for(const arm of ['baseline','candidate','candidate','baseline']){
    const row=await run(arm);rows.push(row);
    console.error(`${arm}: ${row.medianMs.toFixed(2)} ms, `+
      `${row.quoteCounts.path} routes, ${row.quoteSectorUpdates} sector updates`);
  }
  if(rows.some(row=>row.shape.pieces!==rows[0].shape.pieces||
    row.shape.cost!==rows[0].shape.cost||row.shape.gates!==rows[0].shape.gates))
    throw Error('The variants differ in wall count, price or gate count');
  if(rows.some(row=>row.build.finalStateHash!==rows[0].build.finalStateHash))
    throw Error('The variants produce different serialized paid builds');
  writeFileSync(reportPath,JSON.stringify({kind:'ABBA',scenario:'Desert/983 day 15; 42 active workers',
    baselineRef,stateHash,sourceSha256,wasmSha256,stroke,rows},null,2)+'\n');
}finally{unlinkSync(temporary);}
