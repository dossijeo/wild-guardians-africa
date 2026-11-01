import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

// The same deterministic sequence is replayed against both modules. This is a
// native-search CPU fixture, not a full simulation, GPU or frame-time test.
const paths=[process.env.DYNAMIC_BODY_BASE,process.env.DYNAMIC_BODY_CANDIDATE];
if(paths.some(p=>!p))throw Error('Set DYNAMIC_BODY_BASE and DYNAMIC_BODY_CANDIDATE');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/spatial-animal-wall-overlap.json','utf8'));
const sessions=paths.map(path=>{const state=structuredClone(fixture),loaded=new Map(),module=new WebAssembly.Module(fs.readFileSync(path)),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}return {session,nav:createSpatialNavigationMovement(session,state),w:session.core.wasm};});
try{
 const origin=fixture.raid.animals[0].exit;let start;for(let z=origin.z-8;z<origin.z+8&&!start;z+=.5)for(let x=origin.x-8;x<origin.x+8;x+=.5)if(sessions.every(({nav})=>nav.segmentClear({x,z},{x:x+4,z},.28,null,true)&&nav.walkable(x+2,z+1.3,.28,null,true))){start={x,z};break;}if(!start)throw Error('No comparable terrain corridor');
 let seed=20261101;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const bodies=Array.from({length:32},(_,i)=>({id:i+2,x:start.x+random()*6-1,z:start.z+random()*6-3,r:.2+random()*.2}));
 const operations=Array.from({length:240},()=>({index:Math.floor(random()*bodies.length),dx:(random()-.5)*.1,dz:(random()-.5)*.1,goalX:start.x+3+random(),goalZ:start.z+(random()-.5)}));
 const run=kind=>{const {w,nav}=sessions[kind],current=bodies.map(x=>({...x}));w.spatial_bodies_reset();w.spatial_body_upsert(1,start.x,start.z,.28,0,1);for(const b of current)w.spatial_body_upsert(b.id,b.x,b.z,b.r,0,1);nav.walkable(start.x,start.z,.28,null,true);const routes=[],t=performance.now();for(const op of operations){const b=current[op.index];b.x+=op.dx;b.z+=op.dz;w.spatial_body_upsert(b.id,b.x,b.z,b.r,0,1);const n=w.spatial_body_detour(1,op.goalX,op.goalZ,1);if(n<0)throw Error('Invalid native query');routes.push(Array.from(new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*2)));}return {ms:performance.now()-t,routes};};
 run(0);run(1);const blocks=[];let reference;
 for(const kind of [0,1,1,0]){const {ms,routes}=run(kind),serialized=JSON.stringify(routes);if(reference===undefined)reference=serialized;else if(serialized!==reference)throw Error('Native paths differ');blocks.push({kind:kind?'candidate':'baseline',ms});}
 const result={scope:'Node WASM deterministic replay of 32 moving bodies and 240 local detours; includes upserts, no GPU or complete simulation.',binarySha256:paths.map(path=>createHash('sha256').update(fs.readFileSync(path)).digest('hex')),operations:operations.length,bodies:bodies.length,routeParity:true,blocks};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{for(const {session} of sessions)session.dispose();}
