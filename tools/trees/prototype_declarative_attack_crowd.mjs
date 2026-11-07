import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {actorBlockers} from '../../src/simulation/actor-motion.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const path=process.env.DECLARATIVE_ATTACK_WASM;if(!path)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(path)),source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString();
const numeric=id=>Number(String(id).match(/\d+$/)[0]);
function run(declarative){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm,records=[];
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);
  const transients=actor=>{
   session.actorSectorRevision({worker:false,species:actor.species});const blockers=actorBlockers(game,actor,false);
   for(const other of game.raid.animals)if(other!==actor&&other.approach&&!['gone','retreating','waiting'].includes(other.status))blockers.push({x:other.approach.x,z:other.approach.z,radius:(other.radius??.28)+.1});
   const reserved=game.raid.animals.filter(other=>other!==actor&&other.targetId&&!other.targetId.startsWith('center-')&&!['gone','retreating','waiting'].includes(other.status)).map(other=>numeric(other.targetId));
   const pointer=wasm.nav_intent_attack_blockers_ptr(blockers.length);if(blockers.length)new Float64Array(wasm.memory.buffer,pointer,blockers.length*3).set(blockers.flatMap(b=>[b.x,b.z,b.radius??.28]));
   const reservedPointer=wasm.nav_intent_attack_reserved_targets_ptr(reserved.length);if(reserved.length)new Float64Array(wasm.memory.buffer,reservedPointer,reserved.length).set(reserved);
   return {blockers:blockers.length,reserved:reserved.length};
  };
  const snapshot=(actor,status,t)=>{
   const entry={actor:actor.id,status,...t};if(status!==1)return entry;
   const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_attack_result_ptr(),13)),count=wasm.nav_intent_route_points(row[4],row[5],row[6]);
   if(count<=0)throw Error('Successful plan lacks a route');
   Object.assign(entry,{target:row[1],approach:row.slice(2,4),points:Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_intent_route_ptr(row[4],row[5],row[6]),count*2))});
   actor.targetId=game.plants.find(p=>numeric(p.id)===row[1])?.id;if(!actor.targetId)throw Error('Missing selected crop');actor.approach={x:row[2],z:row[3]};return entry;
  };
  for(const actor of game.raid.animals){const t=transients(actor),id=numeric(actor.id),status=declarative?wasm.nav_declarative_attack_declare(id,actor.x,actor.z,actor.radius,1,t.blockers,t.reserved):wasm.nav_intent_plan_attack_crop(id,actor.x,actor.z,actor.radius,1,t.blockers,t.reserved);records.push(snapshot(actor,status,t));}
  const first=records.find(r=>r.status===1);if(!first)throw Error('No animal obtained an attack route');
  const actor=game.raid.animals.find(a=>a.id===first.actor),crop=game.plants.find(p=>numeric(p.id)===first.target);crop.alive=false;bridge.applyEvents(game,[{type:'target',entity:crop}]);
  const t=transients(actor),status=declarative?wasm.nav_declarative_attack_reconcile(numeric(actor.id),actor.x,actor.z,1,t.blockers,t.reserved):wasm.nav_intent_plan_attack_crop(numeric(actor.id),actor.x,actor.z,actor.radius,1,t.blockers,t.reserved),replacement=snapshot(actor,status,t);
  if(declarative&&wasm.nav_declarative_attack_present(numeric(actor.id))!==1)throw Error('Declaration lost on target removal');
  return {records,replacement};
 }finally{session.dispose();}
}
const reference=run(false),candidate=run(true);if(JSON.stringify(reference)!==JSON.stringify(candidate))throw Error('Declarative and reference decisions differ');
const output={scope:'Eight actors selected sequentially from a saved raid, with current JS body and approach snapshots and existing target leases; one selected crop then removed. Native planner comparison only, not a full simulation or performance measurement.',equal:true,actors:candidate.records.length,found:candidate.records.filter(r=>r.status===1).length,initial:candidate.records.map(({actor,status,target,blockers,reserved})=>({actor,status,target,blockers,reserved})),replacement:{actor:candidate.replacement.actor,status:candidate.replacement.status,target:candidate.replacement.target,blockers:candidate.replacement.blockers,reserved:candidate.replacement.reserved}};
console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
