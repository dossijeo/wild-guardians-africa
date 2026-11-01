import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {tick,observeGameEvents} from '../../src/simulation/game.js';
import {hitStructure} from '../../src/simulation/rules.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';

// Isolated parity experiment. This owns one simulation and one WASM world.
export async function createSimulation(){
 const [binary,fixture]=await Promise.all([fetch('/src/world/wild-engine/spatial-savanna.wasm'),fetch('/tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')]);
 if(!binary.ok||!fixture.ok)throw Error(`Missing fixture: ${binary.status}/${fixture.status}`);
 const body=fixture.headers.get('content-encoding')?.includes('gzip')?fixture.body:fixture.body.pipeThrough(new DecompressionStream('gzip'));
 const [module,source]=await Promise.all([WebAssembly.compile(await binary.arrayBuffer()),new Response(body).text()]);
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const planner=createEventDrivenTaskPlanner(session),restored=planner.resetFromState(game),nav=createSpatialNavigationMovement(session,game),stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;
 let events=[];const stopEvents=observeGameEvents(game,event=>events.push(event));
 return {
  run(steps,dt,{full=true}={}){
   if(!Number.isInteger(steps)||steps<1||steps>500||!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Invalid simulation request');
   const timings=[];
   for(let i=0;i<steps;i++){const start=performance.now();tick(game,dt,nav);nav.serviceRaidConnectivityDemand?.();timings.push(performance.now()-start);}
   const projectionStart=performance.now();
   const actor=a=>({id:a.id,x:a.x,z:a.z,status:a.status,heading:a.heading??null});
   const projection=JSON.stringify({elapsed:game.elapsed,workers:game.workers.map(actor),animals:(game.raid?.animals??[]).map(actor),structures:game.structures.map(s=>({id:s.id,status:s.status,hp:s.hp})),events});
   const projectionMs=performance.now()-projectionStart;events=[];
   const start=performance.now(),snapshot=full?serialize(game):null,serializationMs=full?performance.now()-start:null;
   return {snapshot,projection,projectionMs,timings,serializationMs,elapsed:game.elapsed,animals:game.raid?.animals.length??0,restored:restored.restoredAnimalRoutes,centerStatus:game.structures.find(s=>s.kind==='center')?.status,ruinedEvents:game.events.filter(e=>e.type==='StructureRuined').length};
  },
  damageCenter(){const center=game.structures.find(s=>s.kind==='center'&&s.status==='intact');if(!center||!hitStructure(center,center.hp,game.elapsed,game))throw Error('No intact center');nav.setState(game);},
  dispose(){stopEvents();stopTasks();stopWorld();session.dispose();}
 };
}
