import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const binary=process.env.DECLARATIVE_ATTACK_WASM;if(!binary)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(binary)),source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString(),results=[];
function run(halfSize,declarative){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);const animal=game.raid.animals[0],id=Number(animal.id.match(/\d+$/)[0]),options={worker:false,species:animal.species};
  session.actorSectorRevision(options);wasm.nav_intent_attack_blockers_ptr(0);wasm.nav_intent_attack_reserved_targets_ptr(0);
  const initial=declarative?wasm.nav_declarative_attack_declare(id,animal.x,animal.z,animal.radius,1,0,0):wasm.nav_intent_plan_attack_crop(id,animal.x,animal.z,animal.radius,1,0,0);
  if(initial!==1)throw Error('No initial route');
  const first=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_attack_result_ptr(),13)),x=first[2],z=first[3],d=halfSize;
  for(const [wx,wz,hx,hz] of [[x-d,z,.25,d+.25],[x+d,z,.25,d+.25],[x,z-d,d+.25,.25],[x,z+d,d+.25,.25]])if(session.core.addWall(wx,wz,hx,hz)<=0)throw Error('Could not add ring wall');
  session.actorSectorRevision(options);const invalidated=wasm.nav_intent_reconcile_topology();if(invalidated!==1)throw Error('Ring did not invalidate attack route');
  let next;if(declarative)next=wasm.nav_declarative_attack_reconcile(id,animal.x,animal.z,1,0,0);
  else{const status=wasm.nav_intent_replan_attack_route(id,animal.x,animal.z,x,z),reason=wasm.spatial_world_route_reason();if(status!==3||reason!==0)throw Error(`Approach was not definitively blocked: ${status}/${reason}`);if(wasm.nav_intent_attack_cancel(id)!==1)throw Error('Reference release failed');next=wasm.nav_intent_plan_attack_crop(id,animal.x,animal.z,animal.radius,1,0,0);}
  if(next!==1)throw Error(`No replacement crop or access: ${next}`);
  const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_attack_result_ptr(),13)),count=wasm.nav_intent_route_points(row[4],row[5],row[6]);if(count<=0)throw Error('Replacement has no route');
  if(declarative&&wasm.nav_declarative_attack_present(id)!==1)throw Error('Declaration disappeared');
  return {halfSize,initialTarget:first[1],initialApproach:[x,z],replacement:{status:next,target:row[1],approach:row.slice(2,4),points:Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_intent_route_ptr(row[4],row[5],row[6]),count*2))}};
 }finally{session.dispose();}
}
for(const halfSize of [2.5,3.5,5,7]){const reference=run(halfSize,false),candidate=run(halfSize,true);if(JSON.stringify(reference)!==JSON.stringify(candidate))throw Error('Declarative reconsideration differed from reference');results.push({...reference,equal:true});}
const output={scope:'Controlled synthetic wall rings around an approach from a saved raid, comparing native selector sequences; no full simulation or performance.',results};console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
