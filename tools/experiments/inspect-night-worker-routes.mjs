import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

// Read-only native reconstruction of the exact stationary-control fixture.
// Not a substitute for browser movement or a timing benchmark.
const root='docs/qa/global-visual-lab/current-review-20261025/';
const fixturePath=process.env.WG_ROUTE_FIXTURE??'.codex-tmp/current-night-fixtures/sabana.json';
const fixtureBytes=await readFile(fixturePath),fixture=JSON.parse(fixtureBytes.toString('utf8'));
const state=JSON.parse(fixture.timing.navigationContext.state);
const control=JSON.parse(await readFile(root+'sabana-night-stationary-worker-control.json','utf8'));
const module=new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});
session.stream.plan(new Map(control.result.workerResidency.graphicsKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return [key,{cx,cz,score:0}];
})));
await session.stream.whenIdle();
const workers=state.workers.map(worker=>{
  const village=state.villages.find(v=>v.id===worker.villageId),home=village.entry??village;
  const start={x:worker.x,z:worker.z},end={x:home.x,z:home.z};
  const route=session.routeActor(start,end),startRegions=session.actorRegions(start),endRegions=session.actorRegions(end);
  return {id:worker.id,start,end,route,startRegions,endRegions,
    startStandable:session.actorCanStand(start),endStandable:session.actorCanStand(end),
    startProps:session.queryPropsAt(start.x,start.z,1.5),endProps:session.queryPropsAt(end.x,end.z,1.5)};
});
await writeFile(root+(process.env.WG_ROUTE_REPORT??'sabana-night-native-route-diagnosis.json'),JSON.stringify({
  fixturePath,fixtureSha256:createHash('sha256').update(fixtureBytes).digest('hex'),
  scope:'Node synchronous WASM reconstruction of initial fixture and stationary graphical keys; no movement simulation. Not a performance measurement.',
  chunks:[...loaded.keys()],workers,
},null,2)+'\n');
console.log(JSON.stringify(workers.map(({id,route,startStandable,endStandable,startRegions,endRegions})=>({id,status:route.status,reason:route.reason,startStandable,endStandable,startRegions,endRegions})),null,2));
session.dispose();
