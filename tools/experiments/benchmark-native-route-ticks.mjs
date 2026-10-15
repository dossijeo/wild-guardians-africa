// Paired real Game.tick smoke benchmark. This is not a campaign result.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as Game from '../../src/simulation/game.js';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const fixture=process.argv[2]??'tests/fixtures/manglares-123-d10-raid-state.json.gz';
const count=Number(process.argv[3]??30);
if(!Number.isSafeInteger(count)||count<1||count>200)throw Error('Expected 1–200 ticks');
const requestedMode=process.argv[4];
if(requestedMode&&!['A','B','C'].includes(requestedMode))throw Error('Expected A, B or C mode');
const pollingControl=process.argv[5]==='polling';
const legacyHandoff=process.argv[5]==='legacy';
const candidatePollingControl=process.argv[5]==='candidate-polling';
const source=readFileSync(fixture);
const json=fixture.endsWith('.gz')?gunzipSync(source).toString():source.toString();
const binary=readFileSync(process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??'.cache/native-route-prototype.wasm');
const module=new WebAssembly.Module(binary);
const sha=value=>createHash('sha256').update(value).digest('hex');
const rows=[];
let baseline=null;
function firstDifference(a,b,path='state'){
  if(Object.is(a,b))return null;
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')
    return {path,a,b};
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of keys){
    const difference=firstDifference(a[key],b[key],`${path}.${key}`);
    if(difference)return difference;
  }
  return null;
}
for(const mode of requestedMode?[requestedMode]:['A','B','C','C','B','A']){
  const state=deserialize(json),loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),
      cz=Math.floor((village.z+24)/48),radius=4;
    for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const original=mode==='A'?session.routeActor:session.routeActorNative;
    let routeCalls=0,routeMs=0;
    session.routeActor=(start,end,options)=>{
      routeCalls++;
      const began=performance.now();
      const value=original(start,end,{...options,cached:mode==='C'});
      routeMs+=performance.now()-began;
      return value;
    };
    const nav=createSpatialNavigationMovement(session,state);
    nav.forcePlanningPoll=pollingControl;
    nav.forceRouteRebuild=legacyHandoff;
    nav.forceTaskCandidatePoll=candidatePollingControl;
    const planning={taskPasses:0,byKind:{},wakeReasons:{},candidateOutcomes:{},byActor:new Map(),byAction:new Map()};
    nav.planningObserver=event=>{
      planning.byKind[event.kind]=(planning.byKind[event.kind]??0)+1;
      if(event.kind==='taskPass')planning.taskPasses++;
      if(event.kind==='taskWake')for(const reason of event.reasons)
        planning.wakeReasons[reason]=(planning.wakeReasons[reason]??0)+1;
      if(event.kind==='taskCandidateResult')planning.candidateOutcomes[event.outcome]=
        (planning.candidateOutcomes[event.outcome]??0)+1;
      if(event.actorId){
        const actor=planning.byActor.get(event.actorId)??{actorId:event.actorId,counts:{}};
        actor.counts[event.kind]=(actor.counts[event.kind]??0)+1;
        planning.byActor.set(event.actorId,actor);
        const key=`${event.kind}:${event.actorId}:${event.taskId??event.destinationId??'none'}`;
        planning.byAction.set(key,(planning.byAction.get(key)??0)+1);
      }
    };
    nav.setActiveBounds([(cx-radius)*48-24,(cz-radius)*48-24,
      (cx+radius)*48+24,(cz+radius)*48+24]);
    const tickMs=[],beganElapsed=state.elapsed;
    for(let i=0;i<count;i++){
      const began=performance.now();Game.tick(state,1,nav);
      tickMs.push(performance.now()-began);
      if(state.result)break;
    }
    const snapshot=JSON.parse(serialize(state));
    if(process.env.WILD_ENGINE_BENCH_SNAPSHOT)
      writeFileSync(`${process.env.WILD_ENGINE_BENCH_SNAPSHOT}-${mode}.json`,JSON.stringify(snapshot));
    if(!baseline)baseline=snapshot;
    rows.push({mode,ticks:tickMs.length,totalMs:tickMs.reduce((a,b)=>a+b,0),
      routeMs,routeCalls,cacheHits:Number(session.core.wasm.spatial_route_cache_hits()),
      cacheMisses:Number(session.core.wasm.spatial_route_cache_misses()),
      memoryBytes:session.core.wasm.memory.buffer.byteLength,
      planning:{simulatedSeconds:state.elapsed-beganElapsed,byKind:planning.byKind,
        wakeReasons:planning.wakeReasons,candidateOutcomes:planning.candidateOutcomes,
        planningRequestsPerActorMinute:[...planning.byActor.values()].map(actor=>({
          actorId:actor.actorId,
          requests:(actor.counts.taskCandidate??0)+(actor.counts.attackSelection??0)+(actor.counts.routeRefresh??0),
          perMinute:((actor.counts.taskCandidate??0)+(actor.counts.attackSelection??0)+
            (actor.counts.routeRefresh??0))*60/Math.max(1,state.elapsed-beganElapsed)}))
          .sort((a,b)=>b.perMinute-a.perMinute).slice(0,10),
        maxActorCount:Object.fromEntries(Object.keys(planning.byKind).filter(k=>k!=='taskPass').map(kind=>
          [kind,Math.max(0,...[...planning.byActor.values()].map(actor=>actor.counts[kind]??0))])),
        topActors:[...planning.byActor.values()].sort((a,b)=>
          Object.values(b.counts).reduce((x,y)=>x+y,0)-Object.values(a.counts).reduce((x,y)=>x+y,0)).slice(0,10),
        repeatedSameAction:[...planning.byAction].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,10)},
      stateSha256:sha(serialize(state)),firstDifference:firstDifference(baseline,snapshot)});
    console.log(`${mode}: ${rows.at(-1).totalMs.toFixed(1)} ms, ${routeCalls} routes`);
  }finally{session.dispose();}
}
const report={fixture,fixtureSha256:sha(source),wasmSha256:sha(binary),count,rows};
const label=fixture.split(/[\\/]/).at(-1).replace(/\.(json|gz)/g,'')
  .replace(/^spatial-/,'').slice(0,64);
const out=`docs/qa/native-route-planner/ticks-${label}-${requestedMode?.toLowerCase()??'abccba'}${pollingControl?'-polling':legacyHandoff?'-legacy':candidatePollingControl?'-candidate-polling':''}.json`;
writeFileSync(out,JSON.stringify(report,null,2));
console.log(out);
