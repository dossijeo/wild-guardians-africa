import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

// Diagnostic only: no candidate is applied to a game or accepted on validity
// alone. Separate sessions prevent a candidate from using the other's caches.
const binary=process.env.DYNAMIC_BODY_CANDIDATE;if(!binary)throw Error('Set DYNAMIC_BODY_CANDIDATE');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/spatial-animal-wall-overlap.json','utf8')),module=new WebAssembly.Module(fs.readFileSync(binary));
function makeSession(){const state=structuredClone(fixture),loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}return {session,nav:createSpatialNavigationMovement(session,state),state};}
const sessions=[makeSession(),makeSession()];
try{
 const origin=fixture.raid.animals[0].exit;let start;for(let z=origin.z-8;z<origin.z+8&&!start;z+=.5)for(let x=origin.x-8;x<origin.x+8;x+=.5)if(sessions.every(({nav})=>nav.segmentClear({x,z},{x:x+4,z},.28,null,true))){start={x,z};break;}if(!start)throw Error('No comparable starting corridor');
 const rows=[];
 for(let trial=0;trial<24;trial++){
  const end={x:start.x+8+(trial%6)*2,z:start.z+(Math.floor(trial/6)-1.5)*3},old=sessions.map(({session})=>session.routeActorNative(start,end,{worker:true}));
  if(JSON.stringify(old[0])!==JSON.stringify(old[1]))throw Error('Original routes differ');if(old[0].status!=='found'||!old[0].points.length)continue;
  const first=old[0].points[0],barriers=sessions.map(({session})=>session.core.addOrientedBarrier((start.x+first.x)/2,(start.z+first.z)/2,.3,.8,0,0));if(barriers.some(id=>!(id>0)))throw Error('Barrier not installed');
  try{
   const affected=sessions.map(({nav},index)=>{let previous=start;for(const point of old[index].points){if(!nav.segmentClear(previous,point,.28,null,true))return true;previous=point;}return false;});if(affected[0]!==affected[1])throw Error('Affected routes differ');
   let reference,candidate=null,referenceMs,repairMs;
   const baseline=()=>{const t=performance.now();reference=sessions[0].session.routeActorNative(start,end,{worker:true});referenceMs=performance.now()-t;};
   const repair=()=>{const {session,nav}=sessions[1],t=performance.now();for(let i=1;i<old[1].points.length;i++){const local=session.routeActorNative(start,old[1].points[i],{worker:true});if(local.status!=='found')continue;const points=[...local.points,...old[1].points.slice(i+1)];let previous=start,valid=true;for(const point of points){if(!nav.segmentClear(previous,point,.28,null,true)){valid=false;break;}previous=point;}if(valid){candidate=points;break;}}repairMs=performance.now()-t;};
   if(trial%2){repair();baseline();}else{baseline();repair();}
   const equal=reference.status==='found'&&candidate!==null&&JSON.stringify(reference.points)===JSON.stringify(candidate);
   rows.push({trial,order:trial%2?'repair-first':'baseline-first',baselineStatus:reference.status,oldAffected:affected[0],oldPoints:old[0].points.length,repairFound:!!candidate,equal,referenceMs,repairMs});
  }finally{sessions.forEach(({session},i)=>session.core.removeBarrier(barriers[i]));}
 }
 const result={scope:'Independent native sessions, alternating operation order; barrier-cut worker routes, CPU only; no GPU or full simulation.',start,rows,attempts:rows.length,equal:rows.filter(r=>r.equal).length,repairFound:rows.filter(r=>r.repairFound).length};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{for(const {session} of sessions)session.dispose();}
