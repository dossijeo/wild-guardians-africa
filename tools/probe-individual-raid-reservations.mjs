import assert from 'node:assert/strict';
import {mkdirSync,existsSync,readdirSync,writeFileSync,readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fixture} from './probe-raid-reservation-saturation.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {actorSegmentClear,actorBlockers} from '../src/simulation/actor-motion.js';
const out=process.argv[2];if(!out)throw Error('Explicit empty output directory required');
assert(!existsSync(out)||!readdirSync(out).length,'Never overwrite retained QA');mkdirSync(out,{recursive:true});
function run(layout,count){
 const {s,nav}=fixture(layout);assert(spawnRaid(s,{group:Array(count).fill('warthog')},nav));
 const raid=s.raid,budget=raid.animals.reduce((n,a)=>n+a.hitsRemaining,0),initialLiving=s.plants.filter(p=>p.alive).length,rngAtSpawn=s.rng,samples=[],events=new Map();
 let simultaneousTargets=0,simultaneousWallTargets=0,simultaneousCenterTargets=0,simultaneousAttacking=0,invalidSegments=0,overlapPairs=0,minimumMargin=Infinity,steps=0;
 for(;steps<=4000&&s.raid;steps++){
  const origins=new Map(raid.animals.map(a=>[a.id,{x:a.x,z:a.z}])),before=performance.now();
  if(steps)s.elapsed+=.1;updateRaid(s,steps?.1:0,nav);samples.push(performance.now()-before);
  for(const e of s.events)events.set(e.id,e);
  const active=raid.animals.filter(a=>a.targetId&&!['gone','retreating','waiting'].includes(a.status));
  simultaneousTargets=Math.max(simultaneousTargets,active.length);
  simultaneousWallTargets=Math.max(simultaneousWallTargets,active.filter(a=>s.structures.some(t=>t.id===a.targetId&&t.kind==='wall')).length);
  simultaneousCenterTargets=Math.max(simultaneousCenterTargets,active.filter(a=>s.structures.some(t=>t.id===a.targetId&&t.kind==='center')).length);
  simultaneousAttacking=Math.max(simultaneousAttacking,raid.animals.filter(a=>a.status==='attacking').length);
  // Final-pose bodies are a conservative diagnostic for simultaneous movement,
  // not a replacement for native swept collision checks inside walkTo().
  for(const a of raid.animals)if(Math.hypot(a.x-origins.get(a.id).x,a.z-origins.get(a.id).z)>0&&!actorSegmentClear(origins.get(a.id),a,a,actorBlockers(s,a,false)))invalidSegments++;
  for(let i=0;i<raid.animals.length;i++)for(let j=i+1;j<raid.animals.length;j++){
   const a=raid.animals[i],b=raid.animals[j];if(a.status==='gone'||b.status==='gone')continue;
   const gap=Math.hypot(a.x-b.x,a.z-b.z)-a.radius-b.radius;minimumMargin=Math.min(minimumMargin,gap);if(gap< -1e-7)overlapPairs++;
  }
 }
 const all=[...events.values()],sorted=[...samples].sort((a,b)=>a-b),spent=budget-raid.animals.reduce((n,a)=>n+a.hitsRemaining,0);
 return {layout,count,budget,rngAtSpawn,rngAfter:s.rng,spent,remainingBudget:budget-spent,ended:s.raid===null,elapsed:Math.min(steps,4000)*.1,
  destroyed:initialLiving-s.plants.filter(p=>p.alive).length,agriculturalHp:all.filter(e=>e.type==='CropHit').reduce((n,e)=>n+(e.damage??1),0),
  structuralHp:all.filter(e=>e.type==='StructureHit').reduce((n,e)=>n+e.structureHit.previousHp-e.structureHit.hp,0),
  simultaneousTargets,simultaneousWallTargets,simultaneousCenterTargets,simultaneousAttacking,overlapPairs,minimumBodyMargin:Number.isFinite(minimumMargin)?minimumMargin:null,conservativeFinalPoseSegmentFlags:invalidSegments,
  retirements:all.filter(e=>e.type==='AnimalRetreating').map(e=>({reason:e.reason,remainingHits:e.hitsRemaining})),
  cpu:{updates:samples.length,totalMs:samples.reduce((n,x)=>n+x,0),p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],maxMs:sorted.at(-1)}};
}
const rows=[];for(const [layout,count] of [['mono',1],['mono',2],['mono',5],['mono',12],['closed-walls',12],['center-only',12]]){rows.push(run(layout,count));writeFileSync(out+'/rows.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows.at(-1)));}
const files=['src/simulation/raids.js','src/simulation/raid-contention.js','src/simulation/defensive-groups.js','src/simulation/raid-target-reservations.js','src/simulation/actor-motion.js','src/world/navigation.js','tools/probe-raid-reservation-saturation.mjs','tools/probe-individual-raid-reservations.mjs','tools/raid-reservation-baseline-loader.mjs'];
const baseline=process.env.WG_RESERVATION_BASELINE_REF;
const frozen=new Set([...files.slice(0,3),'src/world/navigation.js']);
writeFileSync(out+'/source.json',JSON.stringify({gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineRef:baseline??null,
 sourceHashes:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(baseline&&frozen.has(path)?execFileSync('git',['show',`${baseline}:${path}`]):readFileSync(path)).digest('hex')])),
 scope:'Controlled synthetic fixture, native actor/RNG/hits and wall collision. CPU-only update timings; no GPU/render, campaign economy or acceptance. Baseline loader substitutes immutable core Git blobs only, identical common fixture/metrics. Conservative final-pose flags require diagnosis; actual movement uses native swept checks.'},null,2)+'\n');
