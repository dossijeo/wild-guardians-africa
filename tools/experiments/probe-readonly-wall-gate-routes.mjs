import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import {wallCollisionBounds} from '../../src/world/wall-collision-frame.js';
import {spatialStructureBarriers} from '../../src/world/hierarchical-wasm/spatial-wall-bridge.js';
import {quoteWallChain} from '../../src/simulation/game.js';

const output=process.argv[2];
if(!output)throw Error('Usage: node probe-readonly-wall-gate-routes.mjs report.json');
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const snapshot=gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-d15-partial-state.json.gz',import.meta.url)));
const state=deserialize(snapshot.toString());
state.structures=state.structures.filter(item=>
  !(item.kind==='wall'&&item.created>=27114));
const loaded=new Map();
const session=createSpatialGameSession(wasm,state,
  {loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
let routes=0,segments=0;
try{
  const jobs=new Map();
  for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++)
    jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([-72,-120,168,120]);
  const quote=quoteWallChain(state,'zarzas',[[66,-7.18],[66,-18]],nav,
    {smooth:false,snap:false});
  if(quote.suppressed.length)throw Error('This probe needs no speculative prop removals');
  const barriers=quote.previewPieces.flatMap(spatialStructureBarriers);
  const overlayClear=(a,b)=>session.core.overlayLocalClear(a,b,[],barriers);
  const route=(a,b)=>{
    routes++;
    try{return nav.path(a,b,.28,null,true);}
    catch(error){if(error.name==='SpatialChunkUnavailable')return null;throw error;}
  };
  const clear=(a,points,b)=>{
    if(!points)return false;
    const full=[a,...points,b];
    for(let i=1;i<full.length;i++){
      const from=full[i-1],to=full[i],count=Math.max(1,
        Math.ceil(distance(from,to)/24));
      for(let j=1;j<=count;j++){
        const start={x:from.x+(to.x-from.x)*(j-1)/count,
          z:from.z+(to.z-from.z)*(j-1)/count};
        const end={x:from.x+(to.x-from.x)*j/count,
          z:from.z+(to.z-from.z)*j/count};
        segments++;
        if(overlayClear(start,end)!==true)return false;
      }
    }
    return true;
  };
  const touches=(a,path,b)=>{
    if(!path)return false;
    const points=[a,...path,b];
    return quote.previewPieces.some(wall=>{
      const [minX,minZ,maxX,maxZ]=wallCollisionBounds(wall,.30);
      return points.slice(1).some((point,i)=>{
        const previous=points[i];
        return Math.max(previous.x,point.x)>=minX&&
          Math.min(previous.x,point.x)<=maxX&&
          Math.max(previous.z,point.z)>=minZ&&
          Math.min(previous.z,point.z)<=maxZ;
      });
    });
  };
  const witnesses=[];
  for(const center of state.structures.filter(item=>
    item.kind==='center'&&item.status!=='ruined')){
    const village=state.villages.find(item=>item.id===center.villageId);
    if(village)witnesses.push({id:center.id,a:village.entry??village,
      b:centerServicePoint(center,state,.8)});
  }
  for(const worker of state.workers.filter(item=>item.status!=='home')){
    const village=state.villages.find(item=>item.id===worker.villageId);
    if(village)witnesses.push({id:worker.id,a:worker,
      b:village.entry??village});
  }
  const gates=quote.previewPieces.filter(item=>item.gate)
    .map(item=>({id:item.id,points:gatePortalPoints(item)}))
    .filter(item=>item.points.length===2);
  const start=performance.now(),rows=[],failures={firstRoute:0,secondRoute:0,
    firstClear:0,gateClear:0,secondClear:0};
  for(const witness of witnesses){
    const old=route(witness.a,witness.b);
    if(!old){rows.push({id:witness.id,status:'unreachable-before'});continue;}
    if(!touches(witness.a,old,witness.b)){
      rows.push({id:witness.id,status:'existing-route-clear'});continue;
    }
    let solved=false;
    for(const gate of gates){
      for(const [entry,exit] of [gate.points,[...gate.points].reverse()]){
        const first=route(witness.a,entry),second=route(exit,witness.b);
        if(!first){failures.firstRoute++;continue;}
        if(!second){failures.secondRoute++;continue;}
        if(!clear(witness.a,first,entry)){failures.firstClear++;continue;}
        if(overlayClear(entry,exit)!==true){failures.gateClear++;continue;}
        if(!clear(exit,second,witness.b)){failures.secondClear++;continue;}
        rows.push({id:witness.id,status:'read-only-gate-route',gateId:gate.id});
        solved=true;break;
      }
      if(solved)break;
    }
    if(!solved)rows.push({id:witness.id,status:'needs-full-preview'});
  }
  const elapsedMs=performance.now()-start;
  const affected=rows.filter(row=>row.status==='read-only-gate-route'||
    row.status==='needs-full-preview');
  const report={scenario:'Desert/983 day 15, five-wall candidate',
    quote:{pieces:quote.previewPieces.length,gates:gates.length,
      suppressed:quote.suppressed.length},
    witnesses:rows.length,affected:affected.length,
    readOnlySolved:affected.filter(row=>row.status==='read-only-gate-route').length,
    routes,segments,elapsedMs,failures,rows};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,rows:undefined}));
}finally{session.dispose();}
