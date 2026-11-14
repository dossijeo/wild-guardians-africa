import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

const paths=[process.env.DYNAMIC_BODY_BASE??'.cache/profile-current-base.wasm',process.env.DYNAMIC_BODY_CANDIDATE??'.cache/profile-slope-bound.wasm'],file=process.env.DYNAMIC_REPLAY_CAPTURE;
const saved=file?JSON.parse(fs.readFileSync(file,'utf8')).state:JSON.parse(gunzipSync(fs.readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz'))),modules=paths.map(p=>new WebAssembly.Module(fs.readFileSync(p))),rows=[];
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
 const sessions=modules.map(module=>{const state=structuredClone(saved);state.biome=biome;state.raid=null;state.mangroveNetwork=biome==='manglares';if(state.mangroveNetwork)state.mangroveSettlementVersion=2;const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48);for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}return {session,state,loaded,cx,cz};});
 try{const v=sessions[0].state.villages[0],original=new Map();let barriers=[];
  for(const phase of ['initial','wall-added','wall-removed','chunk-removed','chunk-restored']){
   if(phase==='wall-added'){barriers=sessions.map(({session})=>session.core.addOrientedBarrier(v.x+4,v.z+3,.4,2,0,0));if(barriers.some(id=>id<=0))throw Error('Barrier creation failed');}
   if(phase==='wall-removed')sessions.forEach(({session},i)=>{if(!session.core.removeBarrier(barriers[i]))throw Error('Barrier removal failed');});
   if(phase==='chunk-removed')sessions.forEach(({session,loaded,cx,cz})=>{session.core.selectChunk(cx,cz);if(!session.core.removeChunk(cx+1,cz+1))throw Error('Chunk removal failed');loaded.delete(`${cx+1},${cz+1}`);});
   if(phase==='chunk-restored')sessions.forEach(({session,loaded,cx,cz})=>{if(session.core.addChunk(cx+1,cz+1)<0)throw Error('Chunk restoration failed');session.core.selectChunk(cx+1,cz+1);loaded.set(`${cx+1},${cz+1}`,session.core.chunkPayload());});
   let compared=0,found=0,unknown=0,changed=0;for(const options of [{worker:true},...['warthog','hyena','buffalo','lion','rhino'].map(species=>({worker:false,species}))])for(let i=0;i<30;i++){
    const start=i<20?{x:v.x-20+(i%5)*8,z:v.z-20+Math.floor(i/5)*10}:{x:(sessions[0].cx+1)*48-22+(i-20)%5*3,z:(sessions[0].cz+1)*48-22+Math.floor((i-20)/5)*5},end={x:start.x+8,z:start.z+6},routes=sessions.map(({session})=>session.routeActorNative(start,end,options)),key=JSON.stringify([options,i]),serialized=JSON.stringify(routes[0]);
    if(serialized!==JSON.stringify(routes[1]))throw Error(`Mismatch ${biome} ${phase} ${key}: ${JSON.stringify(routes)}`);
    if(phase==='initial')original.set(key,serialized);else if(original.get(key)!==serialized)changed++;
    compared++;if(routes[0].status==='found')found++;if(routes[0].status==='unknown')unknown++;
   }rows.push({biome,phase,compared,found,unknown,changedFromInitial:changed});console.log(JSON.stringify(rows.at(-1)));
  }
 }finally{for(const {session} of sessions)session.dispose();}
}
const result={scope:'Differential native routing after barrier and residency mutations; six synthetic biome states adapted from an existing capture, 3x3 chunks, worker and all five animal profiles; not a full simulation.',rows};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
