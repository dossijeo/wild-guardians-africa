import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize} from '../src/persistence/snapshots.js';
import {workVfxPlans} from '../src/rendering/work-vfx.js';

const referenceCommit='067e91a',path='src/rendering/work-vfx.js';
const original=execFileSync('git',['show',`${referenceCommit}:${path}`],{encoding:'utf8'});
// Resolve the exact historical module's unchanged dependencies to current local
// files. The comparison concerns this planner only, not whole revision gameplay.
const base=new URL('../src/rendering/work-vfx.js',import.meta.url);
const resolved=original.replace(/from '([^']+)'/g,(_,name)=>`from '${new URL(name,base).href}'`);
const {workVfxPlans:previous}=await import('data:text/javascript;base64,'+Buffer.from(resolved).toString('base64'));
const compressed=readFileSync(process.argv[2]??new URL('../.cache/late-farm-render/state.bin',import.meta.url)),raw=gunzipSync(compressed),saved=deserialize(raw.toString());
assert.equal(saved.day,101);assert.equal(saved.result,'victory');
const plant=saved.plants.find(p=>p.alive);assert(plant);
const hash=value=>createHash('sha256').update(value).digest('hex');
const median=values=>{const a=[...values].sort((a,b)=>a-b);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
const output={scope:'Isolated work VFX planner. Historical farm crops preserved; worker modes and tasks controlled for diagnosis. Not a paid simulated continuation, renderer/FPS, audio, mobile or memory benchmark.',referenceCommit,referenceSourceSha256:hash(original),inputSha256:hash(raw),history:saved.plants.length,cases:[],equivalentInputs:0};
const worker={id:'diagnostic-worker',profile:'olderMale',status:'acting',taskId:'diagnostic-task',actionRemaining:2};
for(const mode of ['archived','walking','missing-task','water','repair-dust']){
 const state=structuredClone(saved);state.events=[];
 if(mode!=='archived')state.workers=[{...worker,status:mode==='walking'||mode==='repair-dust'?'walking':'acting'}];
 if(mode==='missing-task')state.tasks=[];
 if(mode==='water')state.tasks=[{id:worker.taskId,kind:'water',targetId:plant.id}];
 if(mode==='repair-dust')state.events=[{id:'qa-repair',type:'RepairApplied',presentation:{elapsed:state.elapsed,x:plant.x,z:plant.z,yaw:0}}];
 const before=JSON.stringify(state),timings={previous:[],current:[]};
 assert.deepEqual(workVfxPlans(state),previous(state));
 for(let round=0;round<15;round++)for(const [name,fn] of round%2?[['current',workVfxPlans],['previous',previous]]:[['previous',previous],['current',workVfxPlans]]){
  const start=performance.now();for(let i=0;i<10;i++)fn(state);const ms=performance.now()-start;if(round>=3)timings[name].push(ms);
 }
 assert.equal(JSON.stringify(state),before);
 output.cases.push({mode,workers:state.workers.length,plans:workVfxPlans(state),callsPerSample:10,timings,medians:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,median(v)]))});
}
// Every existing worker profile, phase, interruption and missing/replaced target
// follows the historical planner exactly. These are controlled presentation inputs.
for(const profile of ['olderMale','youngMale','olderFemale','youngFemale'])for(const kind of ['initial','water','harvest','repair','crate'])for(const status of ['acting','walking','fleeing','carrying'])for(const remaining of [0,.5,2,5,7.2]){
 const state={elapsed:20,workers:[{...worker,profile,status,actionRemaining:remaining}],plants:[{id:'p',x:3,z:7}],structures:[],tasks:[{id:worker.taskId,kind,targetId:'p'}],events:[]};
 assert.deepEqual(workVfxPlans(state),previous(state));output.equivalentInputs++;
}
const directory=new URL('../docs/qa/lazy-work-vfx/',import.meta.url);mkdirSync(directory,{recursive:true});writeFileSync(new URL('benchmark.json',directory),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({equivalentInputs:output.equivalentInputs,cases:output.cases.map(({mode,medians})=>({mode,medians}))}));
