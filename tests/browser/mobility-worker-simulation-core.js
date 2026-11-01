import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
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
 return {
  run(steps,dt){
   if(!Number.isInteger(steps)||steps<1||steps>500||!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Invalid simulation request');
   const timings=[];
   for(let i=0;i<steps;i++){const start=performance.now();tick(game,dt,nav);nav.serviceRaidConnectivityDemand?.();timings.push(performance.now()-start);}
   const start=performance.now(),snapshot=serialize(game),serializationMs=performance.now()-start;
   return {snapshot,timings,serializationMs,elapsed:game.elapsed,animals:game.raid?.animals.length??0,restored:restored.restoredAnimalRoutes,centerStatus:game.structures.find(s=>s.kind==='center')?.status,ruinedEvents:game.events.filter(e=>e.type==='StructureRuined').length};
  },
  damageCenter(){const center=game.structures.find(s=>s.kind==='center'&&s.status==='intact');if(!center||!hitStructure(center,center.hp,game.elapsed,game))throw Error('No intact center');nav.setState(game);},
  dispose(){stopTasks();stopWorld();session.dispose();}
 };
}
