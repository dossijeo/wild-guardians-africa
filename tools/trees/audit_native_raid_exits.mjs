import fs from 'node:fs';
import {spawnRaid} from '../../src/simulation/raids.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const binary=process.env.DYNAMIC_BODY_CANDIDATE,captureFile=process.env.DYNAMIC_REPLAY_CAPTURE;if(!binary||!captureFile)throw Error('Set DYNAMIC_BODY_CANDIDATE and DYNAMIC_REPLAY_CAPTURE');
const capture=JSON.parse(fs.readFileSync(captureFile,'utf8')),module=new WebAssembly.Module(fs.readFileSync(binary)),rows=[];
for(const group of [['warthog','warthog'],['lion','lion'],['warthog','lion'],['warthog','warthog','warthog']]){
 const state=structuredClone(capture.state);state.raid=null;state.postgame=false;if(process.env.REMOVE_WALLS==='1')state.structures=state.structures.filter(s=>s.kind!=='wall');const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48);for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const nav=createSpatialNavigationMovement(session,state),spawned=spawnRaid(state,{group},nav);rows.push({group,spawned:!!spawned,entryFailure:nav.raidEntryFailure??null,animals:state.raid?.animals.map(a=>({id:a.id,species:a.species,spawn:a.spawn,exit:a.exit,radius:a.radius}))??[]});
 }finally{session.dispose();}
}
const result={scope:'Normal spawnRaid formation from one saved savanna state, 5x5 native chunks, selected groups; no movement, timing or GPU.',wallsRemoved:process.env.REMOVE_WALLS==='1',rows};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
