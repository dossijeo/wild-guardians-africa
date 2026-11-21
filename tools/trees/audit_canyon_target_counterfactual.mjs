import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {targetFor} from '../../src/simulation/raids.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const basePath=process.env.BASELINE_SELECTION,otherPath=process.env.NO_PHASE_SELECTION;if(!basePath||!otherPath)throw Error('Set BASELINE_SELECTION and NO_PHASE_SELECTION');
const read=path=>path.endsWith('.gz')?gunzipSync(fs.readFileSync(path)).toString():fs.readFileSync(path,'utf8');
const base=read(basePath),otherText=read(otherPath),other=deserialize(otherText),module=new WebAssembly.Module(fs.readFileSync('src/world/wild-engine/spatial-savanna.wasm')),ids=['animal-3055','animal-3056','animal-3058'];
function run(mask,useOther=false){
 const state=deserialize(useOther?otherText:base),loaded=new Map();
 if(!useOther)for(let i=0;i<ids.length;i++)if(mask&(1<<i)){const a=state.raid.animals.find(v=>v.id===ids[i]),b=other.raid.animals.find(v=>v.id===ids[i]);a.x=b.x;a.z=b.z;}
 const session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});
 try{
  const animals=state.raid.animals,points=[...animals.flatMap(a=>[a,a.spawn,a.exit]),...state.structures],bounds=[Math.min(...points.map(p=>p.x))-64,Math.min(...points.map(p=>p.z))-64,Math.max(...points.map(p=>p.x))+64,Math.max(...points.map(p=>p.z))+64];
  for(let z=Math.floor((bounds[1]+24)/48);z<=Math.floor((bounds[3]+24)/48);z++)for(let x=Math.floor((bounds[0]+24)/48);x<=Math.floor((bounds[2]+24)/48);x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);const actor=animals.find(a=>a.id==='animal-3060'),selection=targetFor(state,actor,nav);
  return {mask,useOther,target:selection?.target?.id??null,unknown:!!selection?.unknown,approach:selection?.approach?.point??null};
 }finally{session.dispose();}
}
const results=[];for(let mask=0;mask<8;mask++)results.push(run(mask));results.push(run(0,true));
if(results[0].target!=='plant-2898'||results[8].target!=='plant-2509'||results.slice(0,8).some(row=>row.target!==(row.mask&1?'plant-2509':'plant-2898')))throw Error('Selection-time replay or position counterfactual changed');
const output={scope:'Reconstructed selection-time snapshots from one saved canyon raid; counterfactual swaps only the listed actor positions. Navigation caches are reconstructed, so matching the live selections is required before attributing a result.',ids,results};
console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
