// Reproduce the exact resident-world boundary immediately before a raid birth.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {chooseRaidEntry} from '../../src/simulation/raids.js';
import {animalSpec,randomInt} from '../../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {raidWallEnvelope} from '../../src/simulation/raid-exterior-entry.js';
import {prepareExteriorDetour,detourRaidFormation} from '../../src/simulation/raid-exterior-detour.js';
import {exteriorGroupWitness} from '../../src/simulation/raid-exterior-connectivity.js';

const [fixture,out]=process.argv.slice(2);
if(!fixture||!out)throw Error('Usage: probe-frozen-raid-entry-boundary.mjs PRE_ENTRY.json OUTPUT.json');
const input=readFileSync(fixture);
const frozen=JSON.parse((fixture.endsWith('.gz')?gunzipSync(input):input).toString());
const state=deserialize(frozen.state),before=serialize(state);
const module=new WebAssembly.Module(readFileSync(process.env.WILD_PROBE_WASM??
  'src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  for(const key of frozen.navigation.residentChunks){
    const [cx,cz]=key.split(',').map(Number);
    if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)
      throw Error(`Could not restore resident chunk ${key}`);
    loaded.set(key,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(state);planner.nativeWallSelectionEnabled=true;
  nav.setActiveBounds(frozen.navigation.bounds);
  nav.setRaidView(frozen.navigation.view.eye,frozen.navigation.view.target);
  nav.raidSelectionStats={};
  const plan=state.nightPlan,group=plan.group;
  const specs=group.map(id=>({spec:animalSpec(id),
    radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  const preferredSide=randomInt({rng:state.rng},0,3);
  const selectionCalls={};
  for(const name of ['spatialRouteStatus','spatialExteriorEdge',
    'spatialExteriorWitness','walkable','path',
    'spatialRelevantWallApproachSides','spatialWallApproachSides',
    'approachPath','segmentClear']){
    const original=nav[name];if(typeof original!=='function')continue;
    selectionCalls[name]={calls:0,ms:0};
    nav[name]=(...args)=>{
      const start=performance.now();
      try{return original(...args);}finally{
        const elapsed=performance.now()-start;
        selectionCalls[name].calls++;
        selectionCalls[name].ms+=elapsed;
        if(name==='walkable'){
          const byPoint=selectionCalls[name].byPoint??={};
          const key=`${args[0]}:${args[1]}:${args[2]}`;
          byPoint[key]=(byPoint[key]??0)+1;
          const slowest=selectionCalls[name].slowest??=[];
          if(slowest.length<8||elapsed>slowest.at(-1).ms){
            slowest.push({x:args[0],z:args[1],radius:args[2],ms:elapsed});
            slowest.sort((a,b)=>b.ms-a.ms);
            if(slowest.length>8)slowest.pop();
          }
        }
        if(process.env.WILD_PROBE_CALLERS==='1'){
          const caller=new Error().stack?.split('\n')[2]?.trim()??'unknown';
          const byCaller=selectionCalls[name].byCaller??={};
          byCaller[caller]=(byCaller[caller]??0)+1;
        }
      }
    };
  }
  const selectStart=performance.now();
  const entry=chooseRaidEntry(state,specs,nav.activeBounds,preferredSide,nav);
  const selectionMs=performance.now()-selectStart;
  const selectionBreakdown=structuredClone(selectionCalls);
  if(selectionBreakdown.walkable?.byPoint){
    const repeats=Object.values(selectionBreakdown.walkable.byPoint);
    selectionBreakdown.walkable.uniquePoints=repeats.length;
    selectionBreakdown.walkable.repeatedCalls=repeats.reduce((sum,n)=>sum+n-1,0);
    delete selectionBreakdown.walkable.byPoint;
  }
  let repeatedSelection=null;
  if(process.env.WILD_PROBE_REPEAT_SELECTION==='1'){
    const start=performance.now();
    const next=chooseRaidEntry(state,specs,nav.activeBounds,preferredSide,nav);
    repeatedSelection={milliseconds:performance.now()-start,
      sameEntry:JSON.stringify(next)===JSON.stringify(entry)};
  }
  const radius=Math.max(...specs.map(s=>s.radius));
  const cameraRelevant=nav.spatialRelevantWallApproachSides(nav.raidView.eye,radius);
  const allWallSides=nav.spatialWallApproachSides(radius);
  const box=raidWallEnvelope(state,nav);
  const allSideCandidates=allWallSides.map(side=>{
    const relevantAtFace=nav.spatialRelevantWallApproachSides(side,radius)
      .filter(value=>value.wallId===side.wallId);
    const edge=nav.spatialExteriorEdge(side,radius,box);
    const proof=edge?prepareExteriorDetour(side,radius,box,nav,
      (point,r,b)=>!!nav.spatialExteriorEdge(point,r,b),[edge]):null;
    const formation=proof?detourRaidFormation(proof,specs,nav.activeBounds,nav):null;
    const exterior=formation?exteriorGroupWitness(formation,specs,box,nav,
      (point,r,b)=>!!nav.spatialExteriorEdge(point,r,b)):false;
    const routes=formation?.entries.map((birth,index)=>
      nav.spatialRouteStatus(birth,side,specs[index].radius))??[];
    return {wallId:side.wallId,x:side.x,z:side.z,edge,
      proofPoints:proof?.points.length??0,formation:formation?.entries??null,
      exterior,routes,relevantAtFace};
  });
  const sidesByRadius=new Map();
  const wallRoutes=entry?.entries.map((birth,index)=>{
    const radius=specs[index].radius;
    if(!sidesByRadius.has(radius))sidesByRadius.set(radius,
      nav.spatialRelevantWallApproachSides(birth,radius));
    const sides=sidesByRadius.get(radius);
    return {index,species:group[index],birth,
      candidates:sides.length,
      nearest:sides.slice().sort((a,b)=>Math.hypot(a.x-birth.x,a.z-birth.z)-
        Math.hypot(b.x-birth.x,b.z-birth.z)).slice(0,8).map(side=>({
          wallId:side.wallId,x:side.x,z:side.z,
          status:nav.spatialRouteStatus(birth,side,radius)}))};
  })??[];
  if(serialize(state)!==before)throw Error('Raid entry probe changed game state');
  const report={day:state.day,time:state.time,preferredSide,selectionMs,
    repeatedSelection,
    selectionBreakdown,
    residentChunks:loaded.size,bounds:nav.activeBounds,view:nav.raidView,
    entry,cameraRelevant:cameraRelevant.slice(0,12),cameraRelevantCount:cameraRelevant.length,
    allWallSidesCount:allWallSides.length,allSideCandidates,wallRoutes,stats:nav.raidSelectionStats};
  writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({entry:entry?.entries?.length??0,
    wallOpportunity:entry?.wallOpportunity??null,
    foundWallBirths:wallRoutes.filter(row=>row.nearest.some(side=>side.status==='found')).length,
    selectionMs,
    cameraRelevant:cameraRelevant.length,allWallSides:allWallSides.length,
    viableSideCandidates:allSideCandidates.filter(c=>c.exterior&&
      c.routes.length===specs.length&&c.routes.every(r=>r==='found')).length,
    routeQueries:nav.raidSelectionStats.raidEntryWallRouteQueries??0}));
}finally{session.dispose();}
