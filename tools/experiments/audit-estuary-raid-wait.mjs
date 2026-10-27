import {readFileSync,writeFileSync} from 'node:fs';
import {deserialize} from '../../src/persistence/snapshots.js';
import * as Game from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
const fixture=JSON.parse(readFileSync('docs/qa/mangrove-magic-20261026/estuary-raid/fixture.json'));
const state=deserialize(fixture.snapshot),loaded=new Map(),module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});
let stopWorld=()=>{},stopTasks=()=>{};
try{
 const wanted=new Map();for(let z=-3;z<=3;z++)for(let x=-2;x<=4;x++)wanted.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
 session.stream.plan(wanted);await session.stream.whenIdle();
 const nav=createSpatialNavigationMovement(session,state),planner=createEventDrivenTaskPlanner(session);planner.resetFromState(state);stopWorld=planner.observeWorld(state);stopTasks=planner.observeTasks(state);nav.intentTaskPlanner=planner;nav.raidSelectionStats={};
 const plans=[],original=planner.planAttackCrop;planner.planAttackCrop=function(s,a){const r=original.call(this,s,a);if(a.species==='rhino')plans.push({elapsed:s.elapsed,status:r.status,diagnostics:r.diagnostics,frontier:r.frontier});return r;};
 Game.resume(state,'menu');Game.resume(state,'intro');const timeline=[];
 for(let i=0;i<400;i++){Game.tick(state,.1,nav);let changed=false;for(const key of nav.raidConnectivityDemand??[])if(!wanted.has(key)){const [cx,cz]=key.split(',').map(Number);wanted.set(key,{cx,cz,score:0});changed=true;}if(changed){session.stream.plan(wanted);await session.stream.whenIdle();}if(i%10===0)timeline.push({elapsed:state.elapsed,actors:state.raid?.animals.map(a=>({species:a.species,x:a.x,z:a.z,status:a.status,wait:a.raidWait?structuredClone(a.raidWait):null,target:a.targetId})),workers:state.workers.map(w=>({id:w.id,x:w.x,z:w.z,task:w.task}))});}
 const report={scope:'Same saved raid, full Game.tick,49 resident chunks, demand serviced; no renderer',plans,stats:nav.raidSelectionStats,timeline};writeFileSync('docs/qa/mangrove-magic-20261026/estuary-raid/native-wait-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({plans,final:timeline.at(-1)},null,2));
}finally{stopTasks();stopWorld();session.dispose();}
