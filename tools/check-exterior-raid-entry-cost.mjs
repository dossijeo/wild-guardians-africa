// CPU-only diagnostic: no renderer, campaign or frame-rate claim.
import {performance} from 'node:perf_hooks';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {topologyFixture} from './probe-raid-entry-topology.mjs';
import {createOpeningWorld} from './check_opening.mjs';
import {chooseRaidEntry,spawnRaid} from '../src/simulation/raids.js';
import {raidEntryChunks} from '../src/world/raid-entry-residency.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const mixed=['warthog','hyena','buffalo','lion','rhino'];
const source=['src/simulation/raids.js','src/simulation/raid-exterior-entry.js','src/world/raid-entry-residency.js','src/world/raid-entry-preparer.js'];
const rows=[];
for(const kind of ['closed-5','closed-32','closed-72','desierto-5']){
 const {s,nav}=kind.startsWith('closed')?topologyFixture('closed'):createOpeningWorld({seed:712,biome:'desierto'});
 if(kind.startsWith('desierto')){const focus=s.structures[0];nav.setActiveBounds([focus.x-120,focus.z-120,focus.x+120,focus.z+120]);nav.setRaidView({x:focus.x+16,z:focus.z+20},focus);}
 const group=kind.endsWith('-5')?mixed:Array.from({length:Number(kind.split('-')[1])},()=>mixed[0]);
 const specs=group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius})),counts={walkable:0,segmentClear:0,path:0};
 for(const key of Object.keys(counts)){const original=nav[key];nav[key]=function(...args){counts[key]++;return original.apply(this,args);};}
 const start=performance.now(),entry=chooseRaidEntry(s,specs,nav.activeBounds,0,nav),selectionMilliseconds=performance.now()-start;
 if(!entry)throw Error('Whole group unavailable: '+kind);
 nav.raidEntryResident=()=>false;const plan={group};spawnRaid(s,plan,nav);
 const before={...counts},repeat=performance.now();for(let i=0;i<100;i++)spawnRaid(s,plan,nav);const cachedRetryMilliseconds=performance.now()-repeat;
 rows.push({kind,actors:entry.entries.length,selectionMilliseconds,countsBeforeRetries:before,cachedRetryMilliseconds,retryNavigationCalls:Object.fromEntries(Object.keys(counts).map(k=>[k,counts[k]-before[k]])),sparseChunkCount:raidEntryChunks(entry,specs.map(s=>s.radius)).size});
}
const result={schema:1,cpuOnly:true,generatedAt:new Date().toISOString(),sourceHashes:Object.fromEntries(source.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),rows,limitations:['Fresh fixture per case, one process; not an isolated statistical benchmark or GPU/frame-time evidence.','Native terrain memo warming and JIT may change later rows. Worker error still permits synchronous selector fallback.']};
const folder='docs/qa/exterior-raid-entry';mkdirSync(folder,{recursive:true});writeFileSync(folder+'/cpu-cost.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(rows));
