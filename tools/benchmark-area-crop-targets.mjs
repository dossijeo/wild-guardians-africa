import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {areaCropTargets} from '../src/simulation/area-crop-targets.js';
import {Navigation} from '../src/world/navigation.js';
const nav=new Navigation(712,'sabana');nav.terrainValid=()=>true;nav.propsAt=()=>[];
nav.obstacles=Array.from({length:4},(_,i)=>({id:'w'+i,kind:'wall',x:(i-1.5)*2,z:1,yaw:0,material:'empalizada',gate:false}));
const root={id:'root',alive:true,x:0,z:0},origin={x:0,z:-1};
const rows=[];
for(const deadCount of [0,100000]){
 const neighbours=Array.from({length:1001},(_,i)=>({id:'p'+i,alive:true,x:(i%40-20)*1.5,z:(Math.floor(i/40)-12)*1.5})).filter(p=>p.x!==0||p.z!==0);
 const plants=[...Array.from({length:deadCount},(_,i)=>({id:'dead'+i,alive:false,x:100+i,z:100})),root,...neighbours];
 let queries=0;
 const canHit=p=>{queries++;return nav.segmentClear(origin,p,.01,null,false);};
 const options={radius:5,maxTargets:8,canHit};
 const coldStart=performance.now();const first=areaCropTargets(plants,root,options);const coldMs=performance.now()-coldStart;
 for(let i=0;i<50;i++)areaCropTargets(plants,root,options);
 queries=0;const times=[];
 for(let i=0;i<300;i++){
  const start=performance.now();areaCropTargets(plants,root,options);times.push(performance.now()-start);
 }
 times.sort((a,b)=>a-b);
 rows.push({historyDead:deadCount,living:1001,samples:times.length,coldMs,medianMs:times[150],p95Ms:times[285],maxMs:times.at(-1),meanMs:times.reduce((a,b)=>a+b,0)/times.length,occlusionQueriesPerImpact:queries/300,selected:first.map(p=>p.id)});
}
const report={scope:'Node CPU microbenchmark of experimental selector with native solid geometry; flat terrain/props isolated. Not GPU, full navigation, campaign, or frame-time acceptance.',runtime:process.version,rows};
const output=process.argv.indexOf('--output');if(output>=0)writeFileSync(process.argv[output+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
