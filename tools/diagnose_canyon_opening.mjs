import {simulateIntensiveFarm} from './check_intensive_farm.mjs';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const directory=process.argv[2];if(!directory)throw Error('Usage: node tools/diagnose_canyon_opening.mjs OUTPUT_DIRECTORY');mkdirSync(directory,{recursive:true});
const routingSource=readFileSync(new URL('../src/world/navigation.js',import.meta.url));
const routingSha256=createHash('sha256').update(routingSource).digest('hex');
for(const [biome,culture] of [['gran-canon','mapungubwe'],['gran-canon','saheliana'],['sabana','mapungubwe']]){
 const phases={},routeSamples=[],seen=new Set();let firstDelivery=null,last=new Map();
 const r=simulateIntensiveFarm({days:1,seed:712,biome,culture,mixed:true,onTick(s){if(s.time>=300)return;
 if(firstDelivery===null&&s.crates.some(c=>c.delivered))firstDelivery=s.time;
 for(const w of s.workers){const row=phases[w.status]??={ticks:0,metres:0,stationary:0};row.ticks++;const p=last.get(w.id);if(p){const d=Math.hypot(w.x-p.x,w.z-p.z);row.metres+=d;if(d<.001)row.stationary++;}last.set(w.id,{x:w.x,z:w.z});
 const key=`${w.id}/${w.taskId}/${w.destinationId}`;if(w.path?.length&&!seen.has(key)){seen.add(key);let a=w,length=0;for(const b of w.path){length+=Math.hypot(a.x-b.x,a.z-b.z);a=b;}const end=w.path.at(-1),direct=Math.hypot(w.x-end.x,w.z-end.z);routeSamples.push({time:s.time,status:w.status,task:s.tasks.find(t=>t.id===w.taskId)?.kind,length,direct,ratio:direct?length/direct:0,start:{x:w.x,z:w.z},end:{...end}});}
 }
 }});const out={biome,culture,routingSha256,buildingShortcutEnabled:routingSource.toString().includes("import {shortenBuildingRoute}"),firstDelivery,phases,routeSamples,daily:r.daily};writeFileSync(`${directory}/${biome}-${culture}.json`,JSON.stringify(out));console.log(JSON.stringify({biome,culture,firstDelivery,phases,routes:routeSamples.length,meanRatio:routeSamples.reduce((n,x)=>n+x.ratio,0)/routeSamples.length}));
}
