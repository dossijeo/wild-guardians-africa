import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from
  '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {syncNativeCampaignRaidView} from '../native-campaign-runner.mjs';
import {chooseRaidEntry} from '../../src/simulation/raids.js';
import {animalSpec,randomInt} from '../../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

const path=process.argv[2];
if(!path)throw TypeError('Pass a frozen native campaign state');
const receiptPath=process.argv[3];
const state=deserialize(gunzipSync(readFileSync(path)).toString());
const wasm=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/hierarchical-wasm/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const nav=createSpatialNavigationMovement(session,state);
  const view=syncNativeCampaignRaidView(state,nav,null),bounds=view.bounds;
  const jobsFor=area=>{
    const jobs=new Map();
    for(let z=Math.floor((area[1]+24)/48);
      z<=Math.floor((area[3]+23.999)/48);z++)
      for(let x=Math.floor((area[0]+24)/48);
        x<=Math.floor((area[2]+23.999)/48);x++)
        jobs.set(`${x},${z}`,{cx:x,cz:z,score:0});
    return jobs;
  };
  const group=state.nightPlan.group;
  const specs=group.map(id=>({spec:animalSpec(id),
    radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  const preferredSide=randomInt({rng:state.rng},0,3);
  const narrow=receiptPath?JSON.parse(readFileSync(receiptPath,'utf8'))
    .arms[0].partial.navigation.bounds:
    [bounds[0]+48,bounds[1]+48,bounds[2]-48,bounds[3]-48];
  session.stream.plan(jobsFor(narrow));await session.stream.whenIdle();
  const narrowResident=loaded.size;
  nav.setActiveBounds(narrow);
  const narrowStarted=performance.now();
  const narrowEntry=chooseRaidEntry(state,specs,narrow,preferredSide,nav);
  const narrowMs=performance.now()-narrowStarted;
  session.stream.plan(jobsFor(bounds));await session.stream.whenIdle();
  nav.setActiveBounds(bounds);
  const started=performance.now();
  const entry=chooseRaidEntry(state,specs,bounds,preferredSide,nav);
  console.log(JSON.stringify({day:state.day,time:state.time,
    groupSize:group.length,hyenas:group.filter(id=>id==='hyena').length,
    wallCount:state.structures.filter(item=>item.kind==='wall'&&item.hp>0).length,
    bounds,narrowBounds:narrow,view:view.eye,narrowResident,
    resident:loaded.size,preferredSide,
    narrowMs,narrowEntryCount:narrowEntry?.entries?.length??0,
    elapsedMs:performance.now()-started,
    entryCount:entry?.entries?.length??0,selectionBounds:entry?.selectionBounds??null,
    raidSelectionStats:nav.raidSelectionStats??null},null,2));
}finally{session.dispose();}
