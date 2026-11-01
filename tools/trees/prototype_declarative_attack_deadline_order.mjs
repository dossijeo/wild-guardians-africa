import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const binary=process.env.DECLARATIVE_ATTACK_WASM;if(!binary)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(binary)),game=deserialize(gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString()),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
try{
 for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);const actors=[];
 for(const animal of game.raid.animals.slice(0,2)){
  const id=Number(animal.id.match(/\d+$/)[0]);session.actorSectorRevision({worker:false,species:animal.species});wasm.nav_intent_attack_blockers_ptr(0);wasm.nav_intent_attack_reserved_targets_ptr(0);
  if(wasm.nav_declarative_attack_declare(id,animal.x,animal.z,animal.radius,1,0,0)!==1)throw Error('No crop for actor');
  const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_attack_result_ptr(),13));actors.push({animal,id,target:row[1],x:row[2],z:row[3]});
 }
 for(const actor of actors)if(session.core.addWall(actor.x,actor.z,.35,.35)<=0)throw Error('Wall creation failed');
 if(wasm.nav_intent_reconcile_topology()!==2)throw Error('Expected two invalidated routes');
 for(const a of actors){session.actorSectorRevision({worker:false,species:a.animal.species});if(wasm.nav_declarative_attack_reconcile(a.id,a.animal.x,a.animal.z,1,0,0)!==3||wasm.nav_declarative_attack_begin_wait(a.id,5)!==1)throw Error('Expected scheduled unknown route');}
 actors.sort((a,b)=>a.id-b.id);if(wasm.nav_declarative_attack_next_deadline()!==13||wasm.nav_declarative_attack_next_due(13)!==actors[0].id)throw Error('Deadline ordering failed');
 const second=actors[1];session.actorSectorRevision({worker:false,species:second.animal.species});const before=wasm.nav_intent_actor_planning_calls(second.id);
 if(wasm.nav_declarative_attack_service_wait(second.id,13,second.animal.x,second.animal.z,1,0,0)!==-5||wasm.nav_intent_actor_planning_calls(second.id)!==before)throw Error('Out-of-order service was accepted');
 if(wasm.nav_declarative_attack_cancel(actors[0].id)!==1||wasm.nav_declarative_attack_next_due(13)!==second.id)throw Error('Cancellation did not clear the first deadline');
 const crop=game.plants.find(p=>Number(p.id.match(/\d+$/)[0])===second.target);crop.alive=false;bridge.applyEvents(game,[{type:'target',entity:crop}]);
 if(wasm.nav_declarative_attack_present(second.id)!==1||wasm.nav_declarative_attack_next_deadline()!==Infinity)throw Error('Target event did not preserve the goal and clear its deadline');
 const result={scope:'Two synthetic simultaneous deadlines using saved raid actors and controlled walls; no complete simulation or performance measurement.',actors:actors.map(a=>a.id),firstDue:actors[0].id,secondDueAfterCancel:second.id,outOfOrderRejected:true,targetLossPreservedGoal:true,deadlineCleared:true};
 console.log(JSON.stringify(result,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
}finally{session.dispose();}
