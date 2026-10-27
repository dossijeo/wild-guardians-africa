import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {Navigation} from '../../src/world/navigation.js';
import {NativeChunkStream} from '../../src/rendering/chunk-stream.js';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {createSpatialChunkStream} from '../../src/world/wild-engine/spatial-chunk-stream.js';

const bytes=readFileSync('src/world/wild-engine/spatial-savanna.wasm');
const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile;
const config={seed:'712',biome:'savanna',relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:Array(6).fill(true)};
const jobs=new Map([['0,0',{cx:0,cz:0,score:0}],['1,0',{cx:1,cz:0,score:1}]]);
const start={x:17,z:-10},end={x:31,z:-10};
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-chunk-stream-abba.json';
async function run(kind){
  const startTime=performance.now(),loaded=new Map();
  let stream,route,compileMs=0,core=null;
  if(kind==='js'){
    const nav=new Navigation('712','sabana',profile);
    stream=new NativeChunkStream(config,profile,{loaded:()=>loaded,
      onData:data=>loaded.set(`${data.cx},${data.cz}`,data),workerFactory:()=>null});
    stream.plan(jobs);await stream.whenIdle();
    const readyMs=performance.now()-startTime,routeStart=performance.now();
    route=nav.path(start,end,.28,null,true,16);
    stream.dispose();
    return {kind,readyMs,routeMs:performance.now()-routeStart,routeStatus:route?'found':'blocked',
      chunks:loaded.size,props:[...loaded.values()].reduce((n,data)=>n+data.instances.flat().length,0)};
  }
  const compiling=performance.now(),module=new WebAssembly.Module(bytes);compileMs=performance.now()-compiling;
  core=createSpatialWorld(module);core.generate(712,0,0);core.buildNavigation(.28,true);
  stream=createSpatialChunkStream(core,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  stream.plan(jobs);await stream.whenIdle();
  const readyMs=performance.now()-startTime,routeStart=performance.now();
  route=core.routeWorld(start,end);
  stream.dispose();
  return {kind,compileMs,readyMs,routeMs:performance.now()-routeStart,routeStatus:route.status,
    chunks:loaded.size,props:[...loaded.values()].reduce((n,data)=>n+data.instances.flat().length,0),
    memoryBytes:core.metrics().memoryBytes,residentPropRecords:core.metrics().residentPropRecords};
}
const rows=[];
for(const kind of ['js','wasm','wasm','js'])rows.push(await run(kind));
const report={scope:'Two requested Sabana chunks, seed 712, local scheduled stream, cold navigator or WASM compilation plus graph and render payload, then one actor route. Different procedural recipes; no GPU upload, physical actor movement, full-game simulation or worker transfer.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
