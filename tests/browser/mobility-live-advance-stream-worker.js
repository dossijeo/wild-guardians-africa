import {createSimulation} from './mobility-worker-simulation-core.js';
import {advanceReal,observeGameEvents} from '../../src/simulation/game.js';
import {createProjectionPublisher} from './mobility-delta-prototype.js';
import {createStagedPublication} from './mobility-staged-publication.js';
let simulation,events=[],conditions=[],trace=[],stopEvents,stopConditions,last=0;const session='live-real-stream',publisher=createProjectionPublisher(session,{maxPendingBytes:65536}),stage=createStagedPublication(publisher);
onmessage=async({data})=>{try{
 if(data.kind==='init'){if(simulation)throw Error('Already initialized');const at=performance.now();simulation=await createSimulation({snapshotSource:data.source,chunkKeys:data.chunks});const {game,nav}=simulation.diagnosticWorld();stopEvents=observeGameEvents(game,e=>{events.push(structuredClone(e));if(e.type==='StructureHit')trace.push({kind:'game-event',type:e.type,at:game.elapsed});});stopConditions=nav.intentTaskPlanner.observeStructureCondition(change=>{conditions.push({at:game.elapsed,change:structuredClone(change)});trace.push({kind:'native-condition',type:change.type,at:game.elapsed,status:change.status});});postMessage({kind:'ready',session,initializationMs:performance.now()-at});return;}
 if(!simulation)throw Error('Not initialized');
 if(data.kind==='snapshot'){postMessage({kind:'snapshot',...simulation.state()});return;}
 if(data.kind==='ack'){const result=stage.acknowledge(session,data.ack);postMessage({kind:'ack',result,status:publisher.status()});return;}
 if(data.kind!=='advance'||data.sequence!==last+1)throw Error('Invalid sequence');if(!stage.mayAdvance())throw Error('Unpublished state');
 const ack=stage.acknowledge(session,data.ack);if(ack.kind!=='acknowledged')throw Error('Invalid acknowledgement');
 const {game,nav}=simulation.diagnosticWorld(),at=performance.now();if(data.damageCenter===true)simulation.damageCenter();advanceReal(game,data.seconds,nav);nav.serviceRaidConnectivityDemand?.();const workMs=performance.now()-at,actor=a=>({id:a.id,x:a.x,z:a.z,status:a.status,heading:a.heading??null}),packet=stage.submit({elapsed:game.elapsed,pauses:[...game.pauses],workers:game.workers.map(actor),animals:(game.raid?.animals??[]).map(actor),structures:game.structures.map(s=>({id:s.id,status:s.status,hp:s.hp,collapseRemaining:s.collapseRemaining??null})),events});events=[];if(packet.kind!=='delta')throw Error('Publication not admitted: '+packet.reason);last++;const reportedConditions=conditions,reportedTrace=trace;conditions=[];trace=[];postMessage({kind:'result',sequence:last,workMs,packet,conditions:reportedConditions,trace:reportedTrace,status:publisher.status()});
}catch(error){stopEvents?.();stopConditions?.();postMessage({kind:'error',error:String(error?.stack??error)});}};
