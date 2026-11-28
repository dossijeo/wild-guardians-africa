import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const path=process.env.DECLARATIVE_ATTACK_WASM;if(!path)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(path));
const source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString(),duringStrike=process.env.DECLARATIVE_DURING_STRIKE==='1';
function run(declarative){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);
  const animal=game.raid.animals[0],id=Number(animal.id.match(/\d+$/)[0]),options={worker:false,species:animal.species};session.actorSectorRevision(options);
  wasm.nav_intent_attack_blockers_ptr(0);wasm.nav_intent_attack_reserved_targets_ptr(0);
  const plan=()=>declarative?wasm.nav_declarative_attack_declare(id,animal.x,animal.z,animal.radius,1,0,0):wasm.nav_intent_plan_attack_crop(id,animal.x,animal.z,animal.radius,1,0,0);
  const read=()=>{const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_attack_result_ptr(),13));const count=wasm.nav_intent_route_points(row[4],row[5],row[6]);return {target:row[1],approach:row.slice(2,4),points:count<0?null:Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_intent_route_ptr(row[4],row[5],row[6]),count*2))};};
  const firstStatus=plan();if(firstStatus!==1)throw Error(`Initial native selection did not find a crop: ${firstStatus}`);
  const first=read(),calls=wasm.nav_intent_actor_planning_calls(id);
  if(declarative&&(wasm.nav_declarative_attack_present(id)!==1||wasm.nav_declarative_attack_reconcile(id,animal.x,animal.z,1,0,0)!==5||wasm.nav_intent_actor_planning_calls(id)!==calls))throw Error('Unchanged intent replanned or disappeared');
  if(duringStrike&&wasm.nav_intent_attack_action_active(id)!==1)throw Error('Could not begin committed attack');
  const crop=game.plants.find(p=>Number(p.id.match(/\d+$/)[0])===first.target);if(!crop)throw Error('Selected crop missing from captured state');
  crop.alive=false;bridge.applyEvents(game,[{type:'target',entity:crop}]);
  if(declarative&&wasm.nav_declarative_attack_present(id)!==1)throw Error('Intent did not survive target loss');
  if(duringStrike){if(declarative&&wasm.nav_declarative_attack_reconcile(id,animal.x,animal.z,1,0,0)!==6)throw Error('Committed strike was interrupted');if(wasm.nav_intent_attack_finished(id)!==1)throw Error('Committed strike lost its tactical reconsideration');}
  session.actorSectorRevision(options);
  const secondStatus=declarative?wasm.nav_declarative_attack_reconcile(id,animal.x,animal.z,1,0,0):wasm.nav_intent_plan_attack_crop(id,animal.x,animal.z,animal.radius,1,0,0);
  if(secondStatus!==1)throw Error(`Replacement crop not found: ${secondStatus}`);
  const second=read();if(first.target===second.target)throw Error('Destroyed crop was selected again');
  if(declarative&&wasm.nav_declarative_attack_cancel(id)!==1)throw Error('Intent cancellation failed');
  return {animal:animal.id,first,second};
 }finally{session.dispose();}
}
const reference=run(false),candidate=run(true);
if(JSON.stringify(reference)!==JSON.stringify(candidate))throw Error('Declarative selection or route differs from native reference');
const result={scope:'Experimental native AttackCrop declaration on a saved raid state; target destruction and reselection with empty transient blocker and lease inputs. Not a complete simulation or performance benchmark.',duringStrike,equal:true,animal:reference.animal,initialTarget:reference.first.target,replacementTarget:reference.second.target,firstRoutePoints:reference.first.points.length/2,secondRoutePoints:reference.second.points.length/2};
console.log(JSON.stringify(result,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
