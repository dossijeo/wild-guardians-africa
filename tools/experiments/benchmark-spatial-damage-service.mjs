import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {repairCost} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
if(!binary)throw Error('Set WILD_ENGINE_SPATIAL_SERVICES_WASM');
const fixture=process.argv[2]??'tests/fixtures/desierto983-pr42-d7-repair.json.gz';
const repetitions=Number(process.argv[3]??5000);
if(!Number.isSafeInteger(repetitions)||repetitions<1)throw Error('Invalid repetitions');
let raw=JSON.parse(gunzipSync(readFileSync(fixture)).toString());
raw=raw.state??raw;
const state=deserialize(typeof raw==='string'?raw:JSON.stringify(raw));
const session=createSpatialGameSession(new WebAssembly.Module(readFileSync(binary)),state,
 {loaded:()=>new Map()});
try{
 const bridge=createSpatialIntentBridge(session),start=performance.now();
 bridge.resetFromState(state);
 const synchronizationMs=performance.now()-start;
 const javascript=()=>state.structures.filter(item=>item.kind==='wall'&&item.hp<item.maxHp)
  .sort((a,b)=>(b.maxHp-b.hp)/b.maxHp-(a.maxHp-a.hp)/a.maxHp||
    Number(/-(\d+)$/.exec(a.id)[1])-Number(/-(\d+)$/.exec(b.id)[1]))
  .map(item=>({id:item.id,hp:item.hp,maxHp:item.maxHp,
    damageRatio:(item.maxHp-item.hp)/item.maxHp,cost:repairCost(item)}));
 const native=()=>bridge.getDamagedWalls().map(item=>({
  id:item.id,hp:item.hp,maxHp:item.maxHp,damageRatio:item.damageRatio,cost:item.cost}));
 const expected=javascript(),actual=native();
 if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('Damage lists differ');
 const runs=[];
 for(const order of ['JS','WASM','WASM','JS']){
  const query=order==='JS'?javascript:native;
  for(let warm=0;warm<100;warm++)query();
  const begun=performance.now();
  for(let i=0;i<repetitions;i++)query();
  runs.push({implementation:order,totalMs:performance.now()-begun,
    queries:repetitions});
 }
 const wall=state.structures.find(item=>item.kind==='wall'&&item.status==='intact');
 const hp=wall.hp;wall.hp=Math.max(0,hp-1);
 const updateStart=performance.now();
 bridge.applyEvents(state,[{type:'structureDamage',entity:wall}]);
 const updateMs=performance.now()-updateStart;
 if(!native().some(item=>item.id===wall.id))throw Error('Damage update not reflected');
 console.log(JSON.stringify({fixture,structures:state.structures.length,
  damagedWalls:expected.length,synchronizationMs,updateMs,runs,
  candidateBytes:readFileSync(binary).byteLength},null,2));
}finally{session.dispose();}
