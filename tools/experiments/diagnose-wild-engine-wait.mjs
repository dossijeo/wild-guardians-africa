import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {reachableApproach,targetFor} from '../../src/simulation/raids.js';

const input=process.argv[2];
const residentRadius=Number(process.argv[3]??0);
if(!input)throw Error('Pass a captured wait .json.gz file');
const capture=JSON.parse(gunzipSync(readFileSync(input)).toString());
const state=deserialize(capture.snapshot),actor=state.raid?.animals.find(
  candidate=>candidate.id===capture.actorId);
if(!actor)throw Error('Captured actor is absent');
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  for(const key of capture.loadedChunks){
    const [cx,cz]=key.split(',').map(Number);
    if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)
      throw Error(`Could not restore chunk ${key}`);
    loaded.set(key,session.core.chunkPayload());
  }
  if(residentRadius>0){
    const [x0,z0,x1,z1]=capture.activeBounds,
      centerX=Math.floor(((x0+x1)/2+24)/48),
      centerZ=Math.floor(((z0+z1)/2+24)/48);
    for(let cz=centerZ-residentRadius;cz<=centerZ+residentRadius;cz++)
      for(let cx=centerX-residentRadius;cx<=centerX+residentRadius;cx++){
        const key=`${cx},${cz}`;
        if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)
          throw Error(`Could not load diagnostic chunk ${key}`);
        loaded.set(key,session.core.chunkPayload());
      }
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds(capture.activeBounds);
  nav.setRaidView(capture.raidView.eye,capture.raidView.target);
  session.core.enableConnectivityDiagnostics?.();
  const crops=state.plants.filter(plant=>plant.alive),
    counts={possible:0,blocked:0,unknown:0,walkable:0},candidates=[];
  const profile={worker:false,species:actor.species};
  const actorRegions=session.actorRegions(actor,profile);
  const sampledCrop=crops.find(crop=>nav.walkable(crop.x,crop.z,actor.radius,null,false));
  const cropRegions=sampledCrop?session.actorRegions(sampledCrop,profile):null;
  const sampleConnectivity=sampledCrop?session.actorConnectivity(actor,sampledCrop,profile):null;
  const sampleRoute=sampledCrop?session.routeActor(actor,sampledCrop,profile):null;
  for(const crop of crops){
    const walkable=nav.walkable(crop.x,crop.z,actor.radius,null,false);
    if(walkable)counts.walkable++;
    const connected=nav.regionConnected(actor,crop,actor.radius,null,false),
      status=connected===true?'possible':connected===false?'blocked':'unknown';
    counts[status]++;
    if(connected===true&&candidates.length<12){
      const approach=reachableApproach(actor,crop,nav);
      candidates.push({cropId:crop.id,distance:Math.hypot(crop.x-actor.x,crop.z-actor.z),
        walkable,approach:!!approach});
    }
  }
  const selected=targetFor(state,actor,nav);
  const nativeReasons=session.core.connectivityDiagnostics?.()??null;
  process.stdout.write(JSON.stringify({input,phase:capture.phase,seed:capture.seed,
    loadedChunks:loaded.size,residentRadius,
    animal:{id:actor.id,species:actor.species,status:actor.status,
      hitsRemaining:actor.hitsRemaining,x:actor.x,z:actor.z,radius:actor.radius},
    crops:crops.length,counts,candidates,nativeReasons,
    actorRegions,sampledCrop:sampledCrop&&{id:sampledCrop.id,x:sampledCrop.x,z:sampledCrop.z},
    cropRegions,sampleConnectivity,sampleRoute:sampleRoute&&{status:sampleRoute.status,reason:sampleRoute.reason},
    selected:selected&&{unknown:selected.unknown??false,
      targetId:selected.target?.id,kind:selected.target?.kind}},null,2)+'\n');
}finally{session.dispose();}
