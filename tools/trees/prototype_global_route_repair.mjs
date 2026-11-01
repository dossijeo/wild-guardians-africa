import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

// Diagnostic only: a shorter valid splice is not necessarily the same route.
// Never replaces the authoritative route. Includes repair and validation cost.
const binary=process.env.DYNAMIC_BODY_CANDIDATE;if(!binary)throw Error('Set DYNAMIC_BODY_CANDIDATE');
const state=JSON.parse(fs.readFileSync('tests/fixtures/spatial-animal-wall-overlap.json','utf8')),loaded=new Map(),module=new WebAssembly.Module(fs.readFileSync(binary)),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
 for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const nav=createSpatialNavigationMovement(session,state),origin=state.raid.animals[0].exit;let start;
 for(let z=origin.z-8;z<origin.z+8&&!start;z+=.5)for(let x=origin.x-8;x<origin.x+8;x+=.5)if(nav.segmentClear({x,z},{x:x+4,z},.28,null,true)){start={x,z};break;}
 if(!start)throw Error('No comparable starting corridor');const rows=[];
 for(let trial=0;trial<24;trial++){
  const end={x:start.x+8+(trial%6)*2,z:start.z+(Math.floor(trial/6)-1.5)*3};
  const before=session.routeActorNative(start,end,{worker:true});if(before.status!=='found'||!before.points.length)continue;
  const first=before.points[0],barrier=session.core.addOrientedBarrier((start.x+first.x)/2,(start.z+first.z)/2,.3,.8,0,0);if(!(barrier>0))throw Error('Barrier not installed');
  try{
   let previous=start,oldAffected=false;for(const point of before.points){if(!nav.segmentClear(previous,point,.28,null,true)){oldAffected=true;break;}previous=point;}
   const referenceStart=performance.now(),reference=session.routeActorNative(start,end,{worker:true}),referenceMs=performance.now()-referenceStart;
   const repairStart=performance.now();let candidate=null;
   for(let i=1;i<before.points.length;i++){
    const join=before.points[i],local=session.routeActorNative(start,join,{worker:true});if(local.status!=='found')continue;
    const points=[...local.points,...before.points.slice(i+1)];let previous=start,valid=true;
    for(const point of points){if(!nav.segmentClear(previous,point,.28,null,true)){valid=false;break;}previous=point;}
    if(valid){candidate=points;break;}
   }
   const repairMs=performance.now()-repairStart,equal=reference.status==='found'&&candidate!==null&&JSON.stringify(reference.points)===JSON.stringify(candidate);
   rows.push({trial,baselineStatus:reference.status,oldAffected,oldPoints:before.points.length,repairFound:!!candidate,equal,referenceMs,repairMs});
  }finally{session.core.removeBarrier(barrier);}
 }
 const result={scope:'Experimental splice of an old route after adding a barrier, on native terrain; worker profile, CPU only, not a gameplay or GPU benchmark.',start,rows,attempts:rows.length,equal:rows.filter(r=>r.equal).length,repairFound:rows.filter(r=>r.repairFound).length};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{session.dispose();}
