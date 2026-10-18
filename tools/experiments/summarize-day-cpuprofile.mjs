import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const file=process.argv[2];
if(!file)throw Error('Usage: node summarize-day-cpuprofile.mjs profile.cpuprofile[.gz]');
const bytes=readFileSync(file);
const profile=JSON.parse((file.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
const nodes=new Map(profile.nodes.map(node=>[node.id,node]));
const parent=new Map();
for(const node of profile.nodes)for(const child of node.children??[])
  parent.set(child,node.id);
const totals={sampledMs:0,gameTickMs:0,wasmMs:0,repairAccessMs:0,
  nativeRepairAccessMs:0,legacyRepairPreviewMs:0,routeWorldNativeMs:0,
  applyBarrierChangesMs:0,gcMs:0};
const self=new Map();
for(let i=0;i<profile.samples.length;i++){
  const milliseconds=(profile.timeDeltas?.[i]??1000)/1000;
  totals.sampledMs+=milliseconds;
  let id=profile.samples[i],leaf=true;
  const path=[];
  while(id!==undefined){
    const node=nodes.get(id);if(!node)break;
    const frame=node.callFrame;
    if(leaf){
      const key=`${frame.functionName} | ${frame.url}:${frame.lineNumber+1}`;
      self.set(key,(self.get(key)??0)+milliseconds);
      leaf=false;
    }
    path.push(frame);
    id=parent.get(id);
  }
  const hasName=name=>path.some(frame=>frame.functionName===name);
  const hasLocation=(suffix,line)=>path.some(frame=>
    frame.url.endsWith(suffix)&&frame.lineNumber+1===line);
  if(hasLocation('/src/simulation/game.js',1424))totals.gameTickMs+=milliseconds;
  if(path.some(frame=>frame.functionName.startsWith('wasm-function[')))
    totals.wasmMs+=milliseconds;
  if(hasName('planRepairAccess'))totals.repairAccessMs+=milliseconds;
  if(hasName('nativeRepairAccess'))totals.nativeRepairAccessMs+=milliseconds;
  if(hasLocation('/src/simulation/game.js',1036))
    totals.legacyRepairPreviewMs+=milliseconds;
  if(hasName('routeWorldNative'))totals.routeWorldNativeMs+=milliseconds;
  if(hasName('applySpatialBarrierChanges'))
    totals.applyBarrierChangesMs+=milliseconds;
  if(hasName('(garbage collector)'))totals.gcMs+=milliseconds;
}
console.log(JSON.stringify({profileWallMs:(profile.endTime-profile.startTime)/1000,
  samples:profile.samples.length,totals,
  topSelf:[...self].sort((a,b)=>b[1]-a[1]).slice(0,20)},null,2));
