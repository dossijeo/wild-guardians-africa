import {readFileSync} from 'node:fs';

const [file,startText,endText]=process.argv.slice(2);
const start=Number(startText),end=Number(endText);
if(!file||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)
  throw Error('Usage: node summarize-frozen-cpu-profile.mjs FILE.cpuprofile START_US END_US');

const profile=JSON.parse(readFileSync(file,'utf8'));
if(!Array.isArray(profile.samples)||profile.samples.length!==profile.timeDeltas?.length)
  throw Error('CPU profile has no matching samples and time deltas');
const nodes=new Map(profile.nodes.map(node=>[node.id,node]));
const parents=new Map(profile.nodes.flatMap(node=>(node.children??[])
  .map(child=>[child,node.id])));
const phases=new Map(),tickFunctions=new Map();
let timestamp=profile.startTime,samples=0;
for(let index=0;index<profile.samples.length;index++){
  timestamp+=profile.timeDeltas[index];
  if(timestamp<start||timestamp>end)continue;
  samples++;
  let id=profile.samples[index],tick=false,nearestSource=null,phase='other';
  while(id){
    const node=nodes.get(id);
    if(!node)break;
    const {functionName,url,lineNumber}=node.callFrame;
    if(functionName==='tick'&&url.endsWith('/src/simulation/game.js'))tick=true;
    if(functionName==='addChunk'&&url.endsWith('/src/world/wild-engine/spatial-world.js'))
      phase='chunk-load';
    if(!nearestSource&&(url.includes('/src/')||url.includes('/tools/')))
      nearestSource=`${functionName||'(anonymous)'} ${url.split('/wild-guardians-africa/').at(-1)}:${lineNumber+1}`;
    id=parents.get(id);
  }
  if(tick)phase='Game.tick';
  const ms=profile.timeDeltas[index]/1000;
  phases.set(phase,(phases.get(phase)??0)+ms);
  if(tick){
    const key=nearestSource??'runtime/unknown';
    tickFunctions.set(key,(tickFunctions.get(key)??0)+ms);
  }
}
const sorted=map=>[...map].sort((a,b)=>b[1]-a[1]);
console.log(JSON.stringify({scope:'CPU sample estimates inside supplied monotonic window; not wall-clock phase timings',
  samples,phases:Object.fromEntries(sorted(phases)),
  tickFunctions:Object.fromEntries(sorted(tickFunctions).slice(0,30))},null,2));
