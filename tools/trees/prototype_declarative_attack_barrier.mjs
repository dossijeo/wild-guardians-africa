import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const binary=process.env.DECLARATIVE_ATTACK_WASM;if(!binary)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(binary)),source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString();
function run(declarative){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);
  const animal=game.raid.animals[0],id=Number(animal.id.match(/\d+$/)[0]),options={worker:false,species:animal.species};session.actorSectorRevision(options);
  wasm.nav_intent_attack_blockers_ptr(0);wasm.nav_intent_attack_reserved_targets_ptr(0);
  const initial=declarative?wasm.nav_declarative_attack_declare(id,animal.x,animal.z,animal.radius,1,0,0):wasm.nav_intent_plan_attack_crop(id,animal.x,animal.z,animal.radius,1,0,0);
  if(initial!==1)throw Error(`No initial crop: ${initial}`);
  const first=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_attack_result_ptr(),13));
  const wall=session.core.addWall(first[2],first[3],.35,.35);if(wall<=0)throw Error('Barrier creation failed');
  session.actorSectorRevision(options);if(wasm.nav_intent_reconcile_topology()!==1)throw Error('Route was not invalidated');
  const blocked=declarative?wasm.nav_declarative_attack_reconcile(id,animal.x,animal.z,1,0,0):wasm.nav_intent_replan_attack_route(id,animal.x,animal.z,first[2],first[3]),reason=wasm.spatial_world_route_reason();
  if(blocked!==3||reason!==2)throw Error(`Fixture did not produce an unknown end connector: status ${blocked}, reason ${reason}`);
  if(wasm.nav_intent_actor(id)!==1)throw Error('Unknown route lost the underlying attack');
  const waiting=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10));if(waiting[1]!==3||waiting[3]!==first[1])throw Error('Unknown route lost its target');
  if(declarative&&wasm.nav_declarative_attack_reconcile(id,animal.x,animal.z,1,0,0)!==5)throw Error('Unchanged unknown route was polled');
  if(!session.core.removeWall(wall))throw Error('Barrier removal failed');session.actorSectorRevision(options);
  if(wasm.nav_intent_reconcile_topology()!==1)throw Error('Unknown route did not become pending after event');
  const status=declarative?wasm.nav_declarative_attack_reconcile(id,animal.x,animal.z,1,0,0):wasm.nav_intent_replan_attack_route(id,animal.x,animal.z,first[2],first[3]);
  if(status!==1||wasm.nav_intent_actor(id)!==1)throw Error(`Could not restore same-target route: ${status}`);
  const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10)),count=wasm.nav_intent_route_points(row[4],row[5],row[6]);
  if(count<=0)throw Error('Replacement has no route');
  if(declarative&&wasm.nav_declarative_attack_present(id)!==1)throw Error('Attack declaration did not survive');
  return {initialTarget:first[1],initialApproach:first.slice(2,4),blocked,reason,target:row[3],points:Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_intent_route_ptr(row[4],row[5],row[6]),count*2))};
 }finally{session.dispose();}
}
const reference=run(false),candidate=run(true);if(JSON.stringify(reference)!==JSON.stringify(candidate))throw Error('Blocked-access reconsideration differs');
const result={scope:'Native route comparison on one saved raid actor; controlled wall added at an approach and removed, empty transient bodies and leases. Not a complete simulation or performance measurement.',equal:true,...reference};console.log(JSON.stringify(result,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
