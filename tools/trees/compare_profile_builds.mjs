import fs from 'node:fs';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

const paths=[process.env.DYNAMIC_BODY_BASE,process.env.DYNAMIC_BODY_CANDIDATE],file=process.env.DYNAMIC_REPLAY_CAPTURE;
if(!file||paths.some(p=>!p))throw Error('Set DYNAMIC_REPLAY_CAPTURE and both WASM paths');
const saved=JSON.parse(fs.readFileSync(file,'utf8')).state,modules=paths.map(p=>new WebAssembly.Module(fs.readFileSync(p))),rows=[];
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
 const sessions=modules.map(module=>{const state=structuredClone(saved);state.biome=biome;state.raid=null;state.mangroveNetwork=biome==='manglares';if(state.mangroveNetwork)state.mangroveSettlementVersion=2;const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48);for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}return {session,state};});
 try{let compared=0,found=0,unknown=0;const village=sessions[0].state.villages[0];for(const options of [{worker:true},{worker:false,species:'warthog'},{worker:false,species:'lion'}])for(let i=0;i<20;i++){
  const start={x:village.x-20+(i%5)*8,z:village.z-20+Math.floor(i/5)*10},end={x:start.x+8,z:start.z+6},routes=sessions.map(({session})=>session.routeActorNative(start,end,options));
  if(JSON.stringify(routes[0])!==JSON.stringify(routes[1]))throw Error(`Mismatch ${biome} ${JSON.stringify(options)} ${i}: ${JSON.stringify(routes)}`);
  compared++;if(routes[0].status==='found')found++;if(routes[0].status==='unknown')unknown++;
 }rows.push({biome,mangroveNetwork:biome==='manglares',compared,found,unknown});console.log(JSON.stringify(rows.at(-1)));}finally{for(const {session} of sessions)session.dispose();}
}
const result={scope:'Differential comparison of 60 native routes per biome in reconstructed 3x3 chunks; synthetic states derived from one save, not complete simulation.',rows};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
