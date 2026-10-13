// Isolated native snapshot replay. Diagnostic only; no campaign progression.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {nativeCameraPose} from '../../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import * as Game from '../../src/simulation/game.js';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Use snapshot.json.gz output.json');
const s=deserialize(gunzipSync(readFileSync(input)).toString('utf8'));
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`,'utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const center=s.structures.find(x=>x.kind==='center');
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
const phases=new Map();
const calls={approachPath:{count:0,success:0,milliseconds:0},approachReachability:{count:0,milliseconds:0},approachGroupBlocked:{count:0,rejected:0,milliseconds:0}};
const approachCells=new Map();
const segments={short:{count:0,rejected:0,milliseconds:0},medium:{count:0,rejected:0,milliseconds:0},long:{count:0,rejected:0,milliseconds:0}};
const segmentClear=nav.segmentClear.bind(nav);
nav.segmentClear=(start,end,...args)=>{
 const distance=Math.hypot(start.x-end.x,start.z-end.z),metric=segments[distance>10?'long':distance>2?'medium':'short'];
 const began=performance.now(),clear=segmentClear(start,end,...args);
 metric.count++;metric.milliseconds+=performance.now()-began;if(!clear)metric.rejected++;
 return clear;
};
for(const name of Object.keys(calls)){
 const original=nav[name].bind(nav),metric=calls[name];
 nav[name]=(...args)=>{
  const started=performance.now();let result;
  try{result=original(...args);return result;}
  finally{
   metric.count++;metric.milliseconds+=performance.now()-started;
   if(name==='approachPath'){
    const [actor,point,radius]=args,k=JSON.stringify([actor.x,actor.z,Math.round(point.x),Math.round(point.z),radius]);
    approachCells.set(k,(approachCells.get(k)??0)+1);
   }
   if(name==='approachPath'&&result)metric.success++;
   if(name==='approachGroupBlocked'&&result)metric.rejected++;
  }
 };
}
nav.__nativeTickPhaseTrace=row=>{
 const value=phases.get(row.phase)??{calls:0,milliseconds:0,maxMilliseconds:0};
 value.calls++;value.milliseconds+=row.milliseconds??row.groupMilliseconds??0;
 value.approachMilliseconds=(value.approachMilliseconds??0)+(row.approachMilliseconds??0);
 value.groupMilliseconds=(value.groupMilliseconds??0)+(row.groupMilliseconds??0);
 value.approachChecks=(value.approachChecks??0)+(row.approachChecks??0);
 value.groupChecks=(value.groupChecks??0)+(row.groupChecks??0);
 value.maxMilliseconds=Math.max(value.maxMilliseconds,row.milliseconds??row.groupMilliseconds??0);
 phases.set(row.phase,value);
};
const before=serialize(s),started=performance.now();Game.tick(s,5,nav);
const approachCellFrequencies=[...approachCells.values()].sort((a,b)=>b-a);
const result={input,day:s.day,time:s.time,historyBefore:JSON.parse(before).plants.length,livingAfter:s.plants.filter(p=>p.alive).length,tickMilliseconds:performance.now()-started,phases:Object.fromEntries([...phases].sort((a,b)=>b[1].milliseconds-a[1].milliseconds)),calls,segments,approachCellReuse:{unique:approachCells.size,topCounts:approachCellFrequencies.slice(0,20),repeatedCells:approachCellFrequencies.filter(n=>n>1).length,repeatedCalls:approachCellFrequencies.filter(n=>n>1).reduce((a,b)=>a+b,0)},stateChanged:serialize(s)!==before};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
