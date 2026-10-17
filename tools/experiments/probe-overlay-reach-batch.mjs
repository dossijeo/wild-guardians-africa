import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import {spatialStructureBarriers} from '../../src/world/hierarchical-wasm/spatial-wall-bridge.js';
import {quoteWallChain} from '../../src/simulation/game.js';

const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const state=deserialize(gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
state.structures=state.structures.filter(item=>
  !(item.kind==='wall'&&item.created>=27114));
const loaded=new Map();
const session=createSpatialGameSession(wasm,state,
  {loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const jobs=new Map();
  for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++)
    jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([-72,-120,168,120]);
  const quote=quoteWallChain(state,'zarzas',[[66,-7.18],[66,-18]],nav,
    {smooth:false,snap:false});
  const barriers=quote.previewPieces.flatMap(spatialStructureBarriers);
  const proposedGates=quote.previewPieces.filter(item=>item.gate)
    .map(item=>({x:item.x,z:item.z,id:item.id}));
  const portals=quote.previewPieces.filter(item=>item.gate)
    .map(gatePortalPoints).filter(points=>points.length===2);
  const village=state.villages[0].entry??state.villages[0];
  const targets=state.structures.filter(item=>
    item.kind==='center'&&item.status!=='ruined'&&item.villageId===state.villages[0].id)
    .map(item=>centerServicePoint(item,state,.8));
  targets.push(...state.workers.filter(item=>
    item.status!=='home'&&item.villageId===state.villages[0].id)
    .map(item=>({x:item.x,z:item.z})));
  session.core.selectNavigation(true);
  const updatesBefore=session.core.wasm.lazy_sector_updates();
  const t0=performance.now();
  const baseline=session.core.overlayReachBatch(village,targets,[],[],{margin:48});
  const result=session.core.overlayReachBatch(village,targets,[],barriers,
    {margin:48,portals});
  const reverse=session.core.overlayReachBatch(village,targets,[],barriers,
    {margin:48,reverse:true,portals});
  const overlayMs=performance.now()-t0;
  const overlaySectorUpdates=session.core.wasm.lazy_sector_updates()-updatesBefore;
  const native=targets.map(target=>Boolean(nav.path(target,village,.28,null,true)));
  const preview=nav.withWallPreview(quote.previewPieces,quote.suppressed,
    draft=>targets.map(target=>Boolean(draft.path(target,village,.28,null,true))),true);
  const report={targets:targets.length,
    village:{x:village.x,z:village.z},
    proposedGates,
    baseline:baseline&&baseline.reduce((a,v)=>(a[v]=(a[v]??0)+1,a),{}),
    result:result&&result.reduce((a,v)=>(a[v]=(a[v]??0)+1,a),{}),
    reverse:reverse&&reverse.reduce((a,v)=>(a[v]=(a[v]??0)+1,a),{}),
    nativeReachable:native.filter(Boolean).length,
    missedNative:native.filter((value,i)=>value&&result?.[i]!=='found').length,
    previewReachable:preview.filter(Boolean).length,
    falsePositive:preview.filter((value,i)=>!value&&result?.[i]==='found').length,
    falseUnknown:preview.filter((value,i)=>value&&result?.[i]!=='found').length,
    overlayMs,
    sectorUpdates:overlaySectorUpdates};
  if(report.falsePositive||report.falseUnknown||report.missedNative||
    report.sectorUpdates||report.baseline?.found!==targets.length)
    throw Error(`Read-only reachability differs from physical navigation: ${JSON.stringify(report)}`);
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{session.dispose();}
