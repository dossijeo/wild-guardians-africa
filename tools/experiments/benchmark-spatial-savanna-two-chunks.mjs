import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Navigation} from '../../src/world/navigation.js';
import {buildNativeChunk} from '../../src/rendering/chunk-data.js';
import {createLazySectorProbeSync} from '../../src/world/wild-engine/lazy-sectors-adapter.js';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-two-chunks.json';
const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile;
const oldModule=new WebAssembly.Module(readFileSync('src/world/wild-engine/lazy-sectors.wasm'));
const newModule=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const timed=fn=>{const at=performance.now(),result=fn();return {ms:performance.now()-at,result};};
const use=geometry=>{const bytes=geometry.getAttribute('position').array.byteLength+geometry.index.array.byteLength;geometry.dispose();return bytes;};

function baseline(){
  const nav=new Navigation('712','sabana',profile),calls={walkable:0,segmentClear:0};
  for(const name of Object.keys(calls)){
    const original=nav[name].bind(nav);
    nav[name]=(...args)=>{calls[name]++;return original(...args);};
  }
  const firstVisual=timed(()=>buildNativeChunk(nav.config,profile,0,0));
  const secondVisual=timed(()=>buildNativeChunk(nav.config,profile,1,0));
  const probe=createLazySectorProbeSync(oldModule,nav,{radius:1.1,worker:false});
  const navigation=timed(()=>probe.ensureRect(-24,-24,71,23));
  const routes=timed(()=>{
    const statuses=[];
    for(let z=-18;z<=18;z+=3)statuses.push(probe.route({x:17,z},{x:31,z}).status);
    return statuses;
  });
  return {kind:'current JS generator + JS physical raster + sparse C++ graph',
    firstVisualMs:firstVisual.ms,secondVisualMs:secondVisual.ms,navigationMs:navigation.ms,
    totalMs:firstVisual.ms+secondVisual.ms+navigation.ms,routeMs:routes.ms,
    found:routes.result.filter(status=>status==='found').length,geometricCalls:calls,
    propCount:firstVisual.result.instances.reduce((n,list)=>n+list.length,0)+
      secondVisual.result.instances.reduce((n,list)=>n+list.length,0),metrics:probe.metrics()};
}
function candidate(){
  const core=createSpatialSavannaPrototype(newModule);
  const firstGeneration=timed(()=>core.generate(712,0,0));
  const firstVisual=timed(()=>({terrain:use(core.geometry()),water:use(core.waterGeometry()),props:core.props().length}));
  const firstNavigation=timed(()=>core.buildNavigation(1.1,false));
  const secondGenerationAndNavigation=timed(()=>core.addChunk(1,0));
  const secondVisual=timed(()=>({terrain:use(core.geometry()),water:use(core.waterGeometry()),props:core.props().length}));
  const routes=timed(()=>{
    const statuses=[];
    for(let z=-18;z<=18;z+=3)statuses.push(core.route({x:17,z},{x:31,z}).status);
    return statuses;
  });
  return {kind:'one C++ spatial source + resident two-chunk graph',
    firstGenerationMs:firstGeneration.ms,firstVisualMs:firstVisual.ms,firstNavigationMs:firstNavigation.ms,
    secondGenerationAndNavigationMs:secondGenerationAndNavigation.ms,secondVisualMs:secondVisual.ms,
    totalMs:firstGeneration.ms+firstVisual.ms+firstNavigation.ms+
      secondGenerationAndNavigation.ms+secondVisual.ms,routeMs:routes.ms,
    found:routes.result.filter(status=>status==='found').length,
    geometricCalls:{walkable:0,segmentClear:0},propCount:firstVisual.result.props+secondVisual.result.props,
    metrics:core.metrics()};
}
const rows=[];
for(const variant of ['baseline','candidate','candidate','baseline'])rows.push(variant==='baseline'?baseline():candidate());
const report={scope:'Two adjacent Sabana chunks, seed 712, ABBA. Different procedural worlds and visual work: diagnostic only.',rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({scope:report.scope,rows:rows.map(({kind,totalMs,navigationMs,firstNavigationMs,
  secondGenerationAndNavigationMs,routeMs,found,geometricCalls,propCount,metrics})=>({kind,totalMs,navigationMs,
  firstNavigationMs,secondGenerationAndNavigationMs,routeMs,found,geometricCalls,propCount,metrics}))}));
