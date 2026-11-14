import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {tick,observeGameEvents,pause,resume} from '../../src/simulation/game.js';
import {hitStructure} from '../../src/simulation/rules.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {observeCoordinateWrites} from './mobility-motion-recorder.js';

// Isolated parity experiment. This owns one simulation and one WASM world.
export async function createSimulation({mangrove=false,snapshotSource=null,chunkKeys=null,motionTrace=false,segmentTrace=false,trustedChunks=false}={}){
 const [binary,fixture]=await Promise.all([fetch('/src/world/wild-engine/spatial-savanna.wasm'),snapshotSource===null?fetch(mangrove?'/tests/fixtures/manglares-123-d10-raid-state.json.gz':'/tests/fixtures/sabana712-d6-native-multi-reservation.json.gz'):null]);
 if(!binary.ok||fixture&&!fixture.ok)throw Error(`Missing fixture: ${binary.status}/${fixture?.status}`);
 const body=fixture?(fixture.headers.get('content-encoding')?.includes('gzip')?fixture.body:fixture.body.pipeThrough(new DecompressionStream('gzip'))):null;
 const [module,source]=await Promise.all([WebAssembly.compile(await binary.arrayBuffer()),body?new Response(body).text():snapshotSource]);
 let game;if(mangrove&&snapshotSource===null){const converted=JSON.parse(source);converted.mangroveNetwork=true;converted.mangroveSettlementVersion=2;game=deserialize(JSON.stringify(converted));}else game=deserialize(source);
 const loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 const v=game.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48),bounds=mangrove?{xmin:cx-1,xmax:cx+1,zmin:cz-1,zmax:cz+1}:{xmin:1,xmax:3,zmin:-1,zmax:2};
 const chunks=chunkKeys??Array.from({length:bounds.zmax-bounds.zmin+1},(_,z)=>Array.from({length:bounds.xmax-bounds.xmin+1},(_,x)=>`${x+bounds.xmin},${z+bounds.zmin}`)).flat();
 if(!Array.isArray(chunks)||chunks.some(key=>typeof key!=='string'||!/^[-]?\d+,[-]?\d+$/.test(key)))throw TypeError('Invalid chunk keys');
 for(const key of chunks){const [x,z]=key.split(',').map(Number);if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);const payload=session.core.chunkPayload();if(trustedChunks)session.stream.onData(payload);else loaded.set(key,{...payload,terrainRevision:0});}
 const planner=createEventDrivenTaskPlanner(session),restored=planner.resetFromState(game),nav=createSpatialNavigationMovement(session,game),stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;
 const recorder=motionTrace?observeCoordinateWrites([...game.workers,...(game.raid?.animals??[])],{stacks:motionTrace==='stacks'}):null;
 let segments=null;if(segmentTrace)nav.movementSegmentObserver=(actor,from,to)=>segments?.push({id:actor.id,from,to});
 let events=[];const stopEvents=observeGameEvents(game,event=>events.push(event));
 return {
  run(steps,dt,{full=true}={}){
   if(!Number.isInteger(steps)||steps<1||steps>500||!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Invalid simulation request');
   const timings=[],motion=[],movementSegments=[];
   for(let i=0;i<steps;i++){recorder?.begin();if(segmentTrace)segments=[];const start=performance.now();tick(game,dt,nav);nav.serviceRaidConnectivityDemand?.();timings.push(performance.now()-start);if(recorder)motion.push(recorder.end());if(segmentTrace)movementSegments.push(segments);}
   const projectionStart=performance.now();
   const actor=a=>({id:a.id,x:a.x,z:a.z,status:a.status,heading:a.heading??null});
   const projection=JSON.stringify({elapsed:game.elapsed,workers:game.workers.map(actor),animals:(game.raid?.animals??[]).map(actor),structures:game.structures.map(s=>({id:s.id,status:s.status,hp:s.hp})),events});
   const projectionMs=performance.now()-projectionStart;events=[];
   const start=performance.now(),snapshot=full?serialize(game):null,serializationMs=full?performance.now()-start:null;
   return {snapshot,projection,projectionMs,timings,...(recorder?{motion}:{}),...(segmentTrace?{movementSegments}:{}),serializationMs,elapsed:game.elapsed,animals:game.raid?.animals.length??0,restored:restored.restoredAnimalRoutes,centerStatus:game.structures.find(s=>s.kind==='center')?.status,ruinedEvents:game.events.filter(e=>e.type==='StructureRuined').length};
  },
  diagnosticWorld(){return {game,nav,session};},
  damageCenter(){const center=game.structures.find(s=>s.kind==='center'&&s.status==='intact');if(!center||!hitStructure(center,center.hp,game.elapsed,game))throw Error('No intact center');nav.setState(game);},
  advanceTick(dt){if(recorder||segmentTrace||!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Invalid direct tick');const start=performance.now();tick(game,dt,nav);nav.serviceRaidConnectivityDemand?.();return performance.now()-start;},
  pause(reason){pause(game,reason);},resume(reason){resume(game,reason);},
  state(){return {elapsed:game.elapsed,pauses:[...game.pauses],snapshot:serialize(game)};},
  dispose(){stopEvents();stopTasks();stopWorld();session.dispose();}
 };
}
