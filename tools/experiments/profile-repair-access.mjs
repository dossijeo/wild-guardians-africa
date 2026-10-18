import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {cast,hire,planRepairAccess,tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {applyBalanceCandidate} from './balance-candidate.mjs';

const stateFile=process.argv[2];
const index=Number(process.argv[3]??0);
if(!stateFile)throw Error('Usage: node profile-repair-access.mjs state.json [ruined-index]');
const candidateIndex=process.argv.indexOf('--candidate');
if(candidateIndex>=0){
  const candidateFile=process.argv[candidateIndex+1];
  if(!candidateFile)throw Error('Missing --candidate file');
  applyBalanceCandidate(JSON.parse(readFileSync(candidateFile,'utf8')));
}
const snapshot=readFileSync(stateFile);
const state=deserialize((stateFile.endsWith('.gz')?gunzipSync(snapshot):snapshot).toString());
const module=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map();
const session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const start=performance.now();
  const desired=new Map();
  const points=[...state.structures.filter(piece=>piece.kind==='wall'||piece.kind==='center'),
    ...state.villages.map(village=>village.entry??village)];
  const chunk=value=>Math.floor((value+24)/48),margin=48;
  for(let z=chunk(Math.min(...points.map(point=>point.z))-margin);
    z<=chunk(Math.max(...points.map(point=>point.z))+margin);z++)
    for(let x=chunk(Math.min(...points.map(point=>point.x))-margin);
      x<=chunk(Math.max(...points.map(point=>point.x))+margin);x++)
      desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  console.log(JSON.stringify({phase:'load',ms:performance.now()-start,chunks:desired.size}));
  if(state.workers.length===0)hire(state,'diagnostic-hire',{olderFemale:24});
  if(process.env.WILD_ENGINE_REPAIR_DISTRIBUTED==='1'){
    const report=JSON.parse(readFileSync(process.env.WILD_ENGINE_REPAIR_REPORT??new URL(
      '../../docs/qa/military-wall-balance-search/v1-pressure-sabana712-30.json',import.meta.url)));
    const positions=report.rows.find(row=>row.day===14).workers;
    for(let i=0;i<state.workers.length;i++){
      const point=positions[i%positions.length];
      state.workers[i].x=point.x;state.workers[i].z=point.z;
    }
  }
  const nav=createSpatialNavigationMovement(session,state);
  // Compare the same frozen world and WASM with the historical full-route
  // fallback, without changing the production navigation implementation.
  const legacyRepair=process.env.WILD_ENGINE_REPAIR_LEGACY==='1';
  if(legacyRepair)nav.wallWorkerReachability=undefined;
  if(process.argv[3]==='growth'){
    let casts=0;
    for(const plant of state.plants.filter(plant=>plant.alive&&!plant.harvestRequested).slice(0,140)){
      if(cast(state,`diagnostic-growth-${casts}`, 'growth',plant.x,plant.z,nav,plant.id))casts++;
    }
    console.log(JSON.stringify({phase:'casts',casts,spells:state.spells.length}));
    for(let second=1;second<=30;second++){
      const t=performance.now();tick(state,1,nav);
      if(second%5===0)console.log(JSON.stringify({phase:'tick',second,ms:performance.now()-t,
        denominatorDigits:state.agriculturalPower.days[15]?.growth?.consumed?.d?.length}));
    }
    process.exit(0);
  }
  const targets=state.structures.filter(piece=>piece.kind==='wall'&&piece.status==='ruined');
  const target=targets[index];
  if(!target)throw Error(`No ruined wall at index ${index}`);
  if(process.env.WILD_ENGINE_REPAIR_OVERLAY==='1'){
    const village=state.villages[0],entry=village.entry??village;
    const endpoints=[...state.structures.filter(piece=>piece.kind==='center'&&piece.status==='intact')
      .map(piece=>centerServicePoint(piece,state,.8)),...state.workers];
    const repaired={...target,status:'intact',hp:target.maxHp};
    const gate={...repaired,gate:true,autoGate:true,maxHp:target.maxHp*.6,hp:target.maxHp*.6};
    for(const [name,proposed] of [['before',[]],['repaired',[repaired]],['gate',[gate]]]){
      const t=performance.now();
      const statuses=nav.wallWorkerReachability(entry,endpoints,proposed,[],true);
      const local=nav.wallLocalOverlay(proposed,[]);
      console.log(JSON.stringify({phase:'overlay',name,ms:performance.now()-t,
        found:statuses?.filter(x=>x==='found').length,
        unknown:statuses?.map((x,i)=>x==='found'?null:i).filter(x=>x!==null),
        occupied:endpoints.map((point,i)=>local?.walkable(point.x,point.z)===false?i:null)
          .filter(i=>i!==null)}));
    }
    process.exit(0);
  }
  let routeCalls=0,routeMs=0,previewCalls=0,previewMs=0;
  const route=nav.workerPhysicalRoute;
  nav.workerPhysicalRoute=(...args)=>{
    const t=performance.now();routeCalls++;
    try{return route(...args);}finally{routeMs+=performance.now()-t;}
  };
  const preview=nav.withWallStatePreview;
  nav.withWallStatePreview=(...args)=>{
    const t=performance.now();previewCalls++;
    try{return preview(...args);}finally{previewMs+=performance.now()-t;}
  };
  const t=performance.now(),result=planRepairAccess(state,target,nav);
  console.log(JSON.stringify({phase:'repair',mode:legacyRepair?'full-route':'access-only',
    target:target.id,workers:state.workers.length,
    structures:state.structures.length,status:result.status,updates:result.updates.map(x=>x.id),
    ms:performance.now()-t,routeCalls,routeMs,previewCalls,previewMs}));
  if(process.env.WILD_ENGINE_REPAIR_VERIFY==='1'&&result.status==='safe'){
    target.status='intact';target.hp=target.maxHp;
    for(const update of result.updates){
      const piece=state.structures.find(item=>item.id===update.id);
      if(piece)Object.assign(piece,update);
    }
    nav.setState(state);
    const villages=new Map(state.villages.map(village=>[village.id,village]));
    const checks=state.workers.map(worker=>({id:worker.id,
      status:nav.workerPhysicalRoute(worker,
        villages.get(worker.villageId).entry??villages.get(worker.villageId)).status}));
    console.log(JSON.stringify({phase:'verify',found:checks.filter(x=>x.status==='found').length,
      unknown:checks.filter(x=>x.status==='unknown').map(x=>x.id),
      blocked:checks.filter(x=>x.status==='blocked').map(x=>x.id)}));
  }
}finally{session.dispose();}
