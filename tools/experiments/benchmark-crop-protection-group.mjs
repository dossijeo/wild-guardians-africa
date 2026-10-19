import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const [file,roundsText='8']=process.argv.slice(2);
const rounds=Number(roundsText);
if(!file||!Number.isInteger(rounds)||rounds<1||rounds>100)
  throw Error('Usage: benchmark-crop-protection-group.mjs STATE [ROUNDS]');
const bytes=readFileSync(file);
const state=deserialize((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
const module=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??new URL(
    '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map();
const session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const points=[...state.structures.filter(item=>item.kind==='wall'||item.kind==='center'),
    ...state.plants.filter(item=>item.alive),
    ...state.villages.map(item=>item.entry??item)];
  const chunk=value=>Math.floor((value+24)/48),margin=48;
  const desired=new Map();
  for(let z=chunk(Math.min(...points.map(item=>item.z))-margin);
    z<=chunk(Math.max(...points.map(item=>item.z))+margin);z++)
    for(let x=chunk(Math.min(...points.map(item=>item.x))-margin);
      x<=chunk(Math.max(...points.map(item=>item.x))+margin);x++)
      desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  const bridge=createSpatialIntentBridge(session);
  bridge.resetFromState(state);
  const linearBytesBefore=session.core.wasm.memory.buffer.byteLength;
  const crop=state.plants.find(item=>item.alive);
  if(!crop)throw Error('The state has no living crop');
  const samples=[];
  for(let index=0;index<=rounds;index++){
    if(index)bridge.applyEvents(state,[{type:'target',entity:crop}]);
    const start=performance.now();
    const groups=bridge.getUnprotectedCropGroups({includeProtected:true});
    samples.push({ms:performance.now()-start,groups:groups.length,
      protected:groups.filter(group=>group.protection==='protected').length,
      unprotected:groups.filter(group=>group.protection==='unprotected').length,
      unknown:groups.filter(group=>group.protection==='unknown').length,
      members:groups.reduce((sum,group)=>sum+group.cropIds.length,0)});
  }
  console.log(JSON.stringify({biome:state.biome,day:state.day,rounds,
    crops:state.plants.filter(item=>item.alive).length,chunks:desired.size,
    linearBytesBefore,linearBytesAfter:session.core.wasm.memory.buffer.byteLength,
    samples}));
}finally{session.dispose();}
