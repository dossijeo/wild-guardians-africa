import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Navigation} from '../../src/world/navigation.js';
import {buildNativeChunk} from '../../src/rendering/chunk-data.js';
import {createLazySectorProbeSync} from '../../src/world/wild-engine/lazy-sectors-adapter.js';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-prototype.json';
const biome=['savanna','desert','grand_river','volcanoes','mangrove','canyons'].includes(process.env.WG_QA_BIOME)?
  process.env.WG_QA_BIOME:'savanna';
const profile=JSON.parse(readFileSync(`public/content/biome-${biome}.json`,'utf8')).profile;
const oldModule=new WebAssembly.Module(readFileSync('src/world/wild-engine/lazy-sectors.wasm'));
const newBytes=readFileSync('src/world/wild-engine/spatial-savanna.wasm');
const newModule=new WebAssembly.Module(newBytes);
const timed=fn=>{const start=performance.now(),result=fn();return {ms:performance.now()-start,result};};
const canyonWorker=biome==='canyons';
const routePair=z=>canyonWorker?[{x:-5,z},{x:0,z}]:[{x:7,z},{x:13,z}];
function baseline(){
  const nav=new Navigation('712',{savanna:'sabana',desert:'desierto',grand_river:'gran-rio',volcanoes:'volcanes',mangrove:'manglares',canyons:'gran-canon'}[biome],profile),config=nav.config;
  const geometricCalls={walkable:0,segmentClear:0};
  for(const name of Object.keys(geometricCalls)){
    const original=nav[name].bind(nav);
    nav[name]=(...args)=>{geometricCalls[name]++;return original(...args);};
  }
  const visual=timed(()=>buildNativeChunk(config,profile,0,0));
  const probe=createLazySectorProbeSync(oldModule,nav,{radius:canyonWorker?.28:1.1,worker:canyonWorker});
  const navigation=timed(()=>probe.ensureRect(-24,-24,23,23));
  const queries=timed(()=>{
    const results=[];
    for(let z=-18;z<=18;z+=3)results.push(probe.route(...routePair(z)).status);
    return results;
  });
  return {kind:'current JavaScript generation + JavaScript physical sampling + sparse C++ graph',
    visualMs:visual.ms,navigationMs:navigation.ms,totalMs:visual.ms+navigation.ms,
    routeMs:queries.ms,found:queries.result.filter(x=>x==='found').length,
    terrainBytes:visual.result.terrain.byteLength,waterBytes:visual.result.water.byteLength,
    maskBytes:visual.result.groundMask.byteLength,propCount:visual.result.instances.reduce((n,list)=>n+list.length,0),
    geometricCalls,metrics:probe.metrics()};
}
function candidate(){
  const core=createSpatialSavannaPrototype(newModule);
  const generation=timed(()=>core.generate(712,0,0,biome));
  const visual=timed(()=>({ground:core.geometry(),water:core.waterGeometry()}));
  const objects=timed(()=>core.props());
  const navigation=timed(()=>core.buildNavigation(canyonWorker?.28:1.1,canyonWorker));
  const queries=timed(()=>{
    const results=[];
    for(let z=-18;z<=18;z+=3)results.push(core.route(...routePair(z)).status);
    return results;
  });
  const wall=timed(()=>core.addWall(10,0,.8,24));
  const blocked=core.route(...routePair(18)).status;
  const removal=timed(()=>core.removeWall(wall.result));
  const geometry=visual.result.ground,river=visual.result.water;
  const result={kind:'C++ generation + same-module logical graph; JS Three.js buffer construction',
    generationMs:generation.ms,visualMs:visual.ms,objectDecodeMs:objects.ms,navigationMs:navigation.ms,
    totalMs:generation.ms+visual.ms+objects.ms+navigation.ms,
    routeMs:queries.ms,found:queries.result.filter(x=>x==='found').length,
    terrainBytes:geometry.getAttribute('position').array.byteLength+geometry.getAttribute('normal').array.byteLength+
      geometry.getAttribute('color').array.byteLength+geometry.index.array.byteLength,
    waterBytes:river.getAttribute('position').array.byteLength+
      river.getAttribute('normal').array.byteLength+(river.index?.array.byteLength??0),
    propCount:objects.result.length,wallMs:wall.ms,removeWallMs:removal.ms,blockedAfterWall:blocked,
    geometricCalls:{walkable:0,segmentClear:0},
    metrics:core.metrics()};
  geometry.dispose();river.dispose();return result;
}
const rows=[];
for(const variant of ['baseline','candidate','candidate','baseline'])rows.push(variant==='baseline'?baseline():candidate());
const report={scope:`One ${biome} chunk, seed 712, ABBA. Different procedural worlds and unequal visual features: diagnostic architectural prototype only.`,
  navigationProfile:canyonWorker?'worker':'animal',
  routeEndpoints:canyonWorker?'(-5,z) to (0,z)':'(7,z) to (13,z)',
  wasmBytes:newBytes.byteLength,rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({wasmBytes:report.wasmBytes,rows:rows.map(({kind,visualMs,generationMs,navigationMs,totalMs,wallMs,removeWallMs,found,propCount,geometricCalls,metrics})=>({kind,visualMs,generationMs,navigationMs,totalMs,wallMs,removeWallMs,found,propCount,geometricCalls,metrics}))}));
