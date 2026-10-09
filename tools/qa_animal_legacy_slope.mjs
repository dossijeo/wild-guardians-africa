import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {animalSlopeRecoveryPath} from '../src/simulation/animal-slope-recovery.js';
import {tick} from '../src/simulation/game.js';
const raw=gunzipSync(readFileSync(new URL('../docs/qa/campaign-ci/desierto-suajili-failure-37871996318/desierto-suajili-failure-state.json.gz',import.meta.url))).toString();
const pack=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url),'utf8'));
const setup=()=>{const s=deserialize(raw),nav=new Navigation(s.seed,s.biome,pack.profile);nav.setState(s);return {s,nav,actor:s.raid.animals.find(a=>a.status==='retreating')};};
const stats=values=>{values.sort((a,b)=>a-b);return {samples:values.length,p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],max:values.at(-1)};};
const {nav,actor}=setup();let candidates=0,sweeps=0,slopeSamples=0,tailCalls=0;
const phases={walkMilliseconds:0,sweepMilliseconds:0,tailMilliseconds:0,chunkMilliseconds:0,generatedChunks:0};
const walk=nav.walkable.bind(nav),segment=nav.testSegmentClear,slope=nav.field.slope.bind(nav.field),path=nav.path.bind(nav);
nav.walkable=(...args)=>{candidates++;const start=performance.now();try{return walk(...args);}finally{phases.walkMilliseconds+=performance.now()-start;}};
nav.testSegmentClear=function(...args){sweeps++;const start=performance.now();try{return segment.apply(this,args);}finally{phases.sweepMilliseconds+=performance.now()-start;}};
nav.field.slope=(...args)=>{slopeSamples++;return slope(...args);};
nav.path=(...args)=>{tailCalls++;const start=performance.now();try{return path(...args);}finally{phases.tailMilliseconds+=performance.now()-start;}};
const chunk=nav.chunk.bind(nav);nav.chunk=(cx,cz)=>{const fresh=!nav.chunks.has(`${cx},${cz}`),start=performance.now();try{return chunk(cx,cz);}finally{if(fresh){phases.generatedChunks++;phases.chunkMilliseconds+=performance.now()-start;}}};
const start=performance.now(),route=animalSlopeRecoveryPath(nav,actor,actor.exit,actor.radius),milliseconds=performance.now()-start;
if(!route)throw Error('Recorded marginal recovery failed');
const production=setup(),warmStart=performance.now();
for(const margin of [16,32,64])production.nav.path(production.actor,production.actor.exit,production.actor.radius,null,false,margin);
const precedingNativeRouteMilliseconds=performance.now()-warmStart,readyStart=performance.now();
const productionRoute=animalSlopeRecoveryPath(production.nav,production.actor,production.actor.exit,production.actor.radius);
const afterNativeQueriesMilliseconds=performance.now()-readyStart;
if(!productionRoute)throw Error('Production-order marginal recovery failed');
const replay=[];
for(const dt of [.1,1]){
 const {s,nav,actor}=setup(),frames=[];let simulated=0,maxStep=0;
 for(;s.raid&&simulated<60;simulated+=dt){const before={x:actor.x,z:actor.z},start=performance.now();tick(s,dt,nav);frames.push(performance.now()-start);maxStep=Math.max(maxStep,Math.hypot(actor.x-before.x,actor.z-before.z));}
 if(s.raid)throw Error('Recorded native retreat did not end');
 replay.push({dt,simulated,day:s.day,result:s.result,pauses:s.pauses,maxStep,frameMilliseconds:stats(frames)});
}
console.log(JSON.stringify({node:process.version,platform:process.platform,coldRecovery:{milliseconds,candidates,sweeps,slopeSamples,tailCalls,phases,firstWaypoint:route[0],waypoints:route.length},productionOrder:{precedingNativeRouteMilliseconds,afterNativeQueriesMilliseconds,firstWaypoint:productionRoute[0]},replay,scope:'CPU diagnostic of exact legacy snapshot; no GPU or 100-night acceptance'},null,2));
