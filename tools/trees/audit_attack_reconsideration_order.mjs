import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const binary=process.env.DECLARATIVE_ATTACK_WASM;if(!binary)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(binary)),source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString(),eagerControl=process.env.EAGER_CONTROL==='1';
function run(halfSize,otherIndex,immediate){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(game);const first=game.raid.animals[0],other=game.raid.animals[otherIndex],id=a=>Number(a.id.match(/\d+$/)[0]);
  const select=a=>session.actorSectorRevision({worker:false,species:a.species});wasm.nav_intent_attack_blockers_ptr(0);wasm.nav_intent_attack_reserved_targets_ptr(0);
  const read=status=>{if(status!==1)return {status};const row=Array.from(new Float64Array(wasm.memory.buffer,wasm.nav_intent_attack_result_ptr(),13)),count=wasm.nav_intent_route_points(row[4],row[5],row[6]);if(count<=0)throw Error('Missing native route');return {status,target:row[1],approach:row.slice(2,4),points:Array.from(new Float32Array(wasm.memory.buffer,wasm.nav_intent_route_ptr(row[4],row[5],row[6]),count*2))};};
  select(first);const initial=immediate?wasm.nav_declarative_attack_declare(id(first),first.x,first.z,first.radius,1,0,0):wasm.nav_intent_plan_attack_crop(id(first),first.x,first.z,first.radius,1,0,0);if(initial!==1)throw Error('Initial selection failed');
  const initialRoute=read(initial),[x,z]=initialRoute.approach,d=halfSize;
  for(const [wx,wz,hx,hz] of [[x-d,z,.25,d+.25],[x+d,z,.25,d+.25],[x,z-d,d+.25,.25],[x,z+d,d+.25,.25]])if(session.core.addWall(wx,wz,hx,hz)<=0)throw Error('Could not add barrier');
  select(first);if(wasm.nav_intent_reconcile_topology()!==1)throw Error('Initial route not invalidated');
  let firstResult,otherResult;
  if(immediate){const status=wasm.nav_declarative_attack_reconcile(id(first),first.x,first.z,1,0,0);if(eagerControl)firstResult=read(status);else if(status!==8||wasm.nav_declarative_attack_release_blocked(id(first))!==1)throw Error('Could not release deferred approach');}
  else{const status=wasm.nav_intent_replan_attack_route(id(first),first.x,first.z,x,z);if(status!==3||wasm.spatial_world_route_reason()!==0)throw Error('Approach not definitively blocked');if(wasm.nav_intent_attack_cancel(id(first))!==1)throw Error('Could not release first reservation');}
  select(other);otherResult=read(wasm.nav_intent_plan_attack_crop(id(other),other.x,other.z,other.radius,1,0,0));
  if(!immediate||!eagerControl){select(first);firstResult=read(immediate?wasm.nav_declarative_attack_reconcile(id(first),first.x,first.z,1,0,0):wasm.nav_intent_plan_attack_crop(id(first),first.x,first.z,first.radius,1,0,0));}
  return {first:firstResult,other:otherResult};
 }finally{session.dispose();}
}
const rows=[];for(const size of [2.5,5])for(const otherIndex of [1,2,3,4,5,6,7]){const reference=run(size,otherIndex,false),candidate=run(size,otherIndex,true);rows.push({size,otherIndex,equal:JSON.stringify(reference)===JSON.stringify(candidate),reference,candidate});console.log(JSON.stringify({size,otherIndex,equal:rows.at(-1).equal,referenceTargets:[reference.first.target,reference.other.target],candidateTargets:[candidate.first.target,candidate.other.target]}));}
const output={scope:'Controlled sequential native-planner interleaving on saved raid actors, with synthetic wall rings and empty transient body lists. Not a full simulation or performance test.',eagerControl,cases:rows.length,differences:rows.filter(r=>!r.equal).length,rows};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
if(!eagerControl&&output.differences)throw Error(`Deferred reconsideration differed in ${output.differences} cases`);
