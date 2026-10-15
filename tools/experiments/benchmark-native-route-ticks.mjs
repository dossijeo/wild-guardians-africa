// Paired real Game.tick smoke benchmark. This is not a campaign result.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as Game from '../../src/simulation/game.js';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const fixture=process.argv[2]??'tests/fixtures/manglares-123-d10-raid-state.json.gz';
const count=Number(process.argv[3]??30);
if(!Number.isSafeInteger(count)||count<1||count>200)throw Error('Expected 1–200 ticks');
const source=readFileSync(fixture);
const json=fixture.endsWith('.gz')?gunzipSync(source).toString():source.toString();
const binary=readFileSync(process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??'.cache/native-route-prototype.wasm');
const module=new WebAssembly.Module(binary);
const sha=value=>createHash('sha256').update(value).digest('hex');
const rows=[];
let baseline=null;
function firstDifference(a,b,path='state'){
  if(Object.is(a,b))return null;
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')
    return {path,a,b};
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of keys){
    const difference=firstDifference(a[key],b[key],`${path}.${key}`);
    if(difference)return difference;
  }
  return null;
}
for(const mode of ['A','B','C','C','B','A']){
  const state=deserialize(json),loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),
      cz=Math.floor((village.z+24)/48),radius=4;
    for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const original=mode==='A'?session.routeActor:session.routeActorNative;
    let routeCalls=0,routeMs=0;
    session.routeActor=(start,end,options)=>{
      routeCalls++;
      const began=performance.now();
      const value=original(start,end,{...options,cached:mode==='C'});
      routeMs+=performance.now()-began;
      return value;
    };
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([(cx-radius)*48-24,(cz-radius)*48-24,
      (cx+radius)*48+24,(cz+radius)*48+24]);
    const tickMs=[];
    for(let i=0;i<count;i++){
      const began=performance.now();Game.tick(state,1,nav);
      tickMs.push(performance.now()-began);
      if(state.result)break;
    }
    const snapshot=JSON.parse(serialize(state));
    if(!baseline)baseline=snapshot;
    rows.push({mode,ticks:tickMs.length,totalMs:tickMs.reduce((a,b)=>a+b,0),
      routeMs,routeCalls,cacheHits:Number(session.core.wasm.spatial_route_cache_hits()),
      cacheMisses:Number(session.core.wasm.spatial_route_cache_misses()),
      memoryBytes:session.core.wasm.memory.buffer.byteLength,
      stateSha256:sha(serialize(state)),firstDifference:firstDifference(baseline,snapshot)});
    console.log(`${mode}: ${rows.at(-1).totalMs.toFixed(1)} ms, ${routeCalls} routes`);
  }finally{session.dispose();}
}
const report={fixture,fixtureSha256:sha(source),wasmSha256:sha(binary),count,rows};
const label=fixture.split(/[\\/]/).at(-1).replace(/\.(json|gz)/g,'')
  .replace(/^spatial-/,'').slice(0,64);
const out=`docs/qa/native-route-planner/ticks-${label}-abccba.json`;
writeFileSync(out,JSON.stringify(report,null,2));
console.log(out);
