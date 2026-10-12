// Diagnostic replay of an exact saved state. No virtual-player decisions.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';

const [input,output,secondsText='5',mode]=process.argv.slice(2),seconds=Number(secondsText),compact=mode==='compact';
if(!input||!output||!Number.isFinite(seconds)||seconds<=0||seconds>60)throw Error('Use INPUT.gz OUTPUT.json SECONDS (0..60) [compact]');
const s=deserialize(gunzipSync(readFileSync(input)).toString());
const {nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion});nav.setState(s);
const queries=[],ticks=[],phases=[],invalidations=[];const path=nav.path,setState=nav.setState;
nav.setState=function(state){invalidations.push({time:state.time,versionBefore:this.version,stack:new Error().stack?.split('\n').slice(2,5)});return setState.call(this,state);};
if(!compact)nav.path=function(start,end,radius,ignore,worker,margin){
 const begun=performance.now(),result=path.call(this,start,end,radius,ignore,worker,margin);
 const milliseconds=performance.now()-begun;
 queries.push({time:s.time,startId:start?.id??null,endId:end?.id??null,worker:worker!==false,radius,margin:margin??16,milliseconds,found:!!result,...(milliseconds>50?{stack:new Error().stack?.split('\n').slice(2,6)}:{})});
 return result;
};
for(let i=0;i<Math.ceil(seconds/.1)&&!s.result;i++){
 const time=s.time,began=performance.now(),versionBefore=nav.version;if(!compact)nav.__nativeTickPhaseTrace=stage=>phases.push({...stage,startTime:time});
 try{Game.tick(s,.1,nav);}finally{delete nav.__nativeTickPhaseTrace;}
 ticks.push({time,versionBefore,versionAfter:nav.version,milliseconds:performance.now()-began});
}
const finalSnapshot=serialize(s),finalState={
 sha256:createHash('sha256').update(finalSnapshot).digest('hex'),balance:s.ledger.balance,
 events:s.events.map(e=>({id:e.id,type:e.type,targetId:e.targetId??null})),
 crops:s.plants.filter(p=>p.alive).map(p=>p.id),
 structures:s.structures.map(o=>({id:o.id,hp:o.hp,status:o.status})),
 workers:s.workers.map(w=>({id:w.id,x:w.x,z:w.z,status:w.status,taskId:w.taskId??null,pathVersion:w.pathVersion??null,destinationId:w.destinationId??null})),
};
writeFileSync(output,JSON.stringify({scope:'Exact native checkpoint replay without player decisions or preexisting navigation caches; not a whole-campaign or rendering benchmark',input,day:s.day,startTime:ticks[0]?.time,endTime:s.time,ticks,phases,invalidations,queries,workers:s.workers.map(w=>({id:w.id,status:w.status,pathLength:w.path?.length??0,taskId:w.taskId??null})),finalState},null,2)+'\n');
console.log(JSON.stringify({ticks:ticks.length,maxTick:Math.max(...ticks.map(x=>x.milliseconds)),queries:queries.length,maxQuery:Math.max(0,...queries.map(x=>x.milliseconds))}));
