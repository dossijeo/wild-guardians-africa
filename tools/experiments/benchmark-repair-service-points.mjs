import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {repairRoute} from '../../src/world/work-points.js';

const saved=JSON.parse(gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-pr42-d7-repair.json.gz',import.meta.url))));
const module=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const state=deserialize(saved),loaded=new Map();
const session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const desired=new Map();
  for(let z=-2;z<=2;z++)for(let x=0;x<=4;x++)
    desired.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state),
    worker=state.workers.find(w=>w.id==='worker-3519'),
    targets=['structure-1586','structure-1869'].map(id=>
      state.structures.find(s=>s.id===id));
  if(!worker||targets.some(t=>!t))throw Error('Frozen repair targets missing');
  const path=nav.path,baselineNav={...nav,walkable:undefined,propsAt:undefined,
    residencyRevision:undefined};
  function run(pruned,repeat){
    let calls=0,unknown=0,found=0;
    const candidateNav=pruned?nav:baselineNav;
    candidateNav.path=(...args)=>{calls++;return path(...args);};
    const began=performance.now();
    for(let n=0;n<repeat;n++)for(const target of targets){
      try{if(repairRoute(worker,target,candidateNav))found++;}
      catch(error){if(error?.name!=='SpatialChunkUnavailable')throw error;unknown++;}
    }
    return {mode:pruned?'standability-pruned':'all-points',repeat,calls,unknown,found,
      elapsedMs:performance.now()-began};
  }
  run(false,3);run(true,3);
  const rows=[];
  for(let pair=0;pair<4;pair++)for(const pruned of pair%2?
    [true,false,false,true]:[false,true,true,false])rows.push(run(pruned,50));
  const report={fixture:'Desierto/983 day 7, two ruined wall targets and worker-3519',
    source:'frozen native state, unchanged physics; A/B/B/A and B/A/A/B after warmup',rows};
  const out=process.argv[2];
  if(out)writeFileSync(out,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{session.dispose();}
