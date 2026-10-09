import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createOpeningWorld} from './check_opening.mjs';
import {reachableApproach} from '../src/simulation/raids.js';
import {spellAt} from '../src/simulation/game.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {connectedRaidPacking} from '../src/world/raid-entry-packing.js';
import {withRaidEntryBudget} from '../src/world/raid-entry-budget.js';
import {serialize} from '../src/persistence/snapshots.js';
const output=process.argv[2],limit=Number(process.argv[3]??4);if(!output)throw Error('Specify a new output directory');mkdirSync(output,{recursive:false});
const started=performance.now(),group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const {s,nav}=createOpeningWorld({biome:'desierto',seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);
const original=serialize(s),hash=raw=>createHash('sha256').update(raw).digest('hex');
const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
const report={scope:'Native connected-packing diagnostic; no clock, commands or RNG mutation',group,radii:specs.map(s=>s.radius),center,eye,bounds:nav.activeBounds,stateSHA256:hash(original),observations:[]};
const originalPath=nav.path;
nav.path=function(...args){if(performance.now()-started>4500)throw Error('Diagnostic CPU budget exhausted');return originalPath.apply(this,args);};
const packingStarted=performance.now();try{
 report.entry=withRaidEntryBudget(nav,limit,()=>connectedRaidPacking(s,specs,nav.activeBounds,nav,(point,target,radius)=>reachableApproach({id:'anchor',...point,radius,status:'entering',hitsRemaining:1},target,nav,spellAt(s,'shield',target)),(kind,data)=>report.observations.push({kind,...data})),limit===32?{maxGeometryChecks:100000,maxSearchYields:50000}:{});
 report.status=report.entry?'complete':'failed';
}catch(error){report.status='incomplete';report.error=error.message;}
finally{nav.path=originalPath;}
report.packingMilliseconds=performance.now()-packingStarted;report.queryBudget=nav.lastRaidEntryBudget;report.milliseconds=performance.now()-started;report.finalStateSHA256=hash(serialize(s));report.stateUnchanged=report.stateSHA256===report.finalStateSHA256;
writeFileSync(`${output}/state.json.gz`,gzipSync(original));writeFileSync(`${output}/packing.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,queryBudget:report.queryBudget,milliseconds:report.milliseconds,stateUnchanged:report.stateUnchanged,error:report.error}));
process.exitCode=report.status==='complete'&&report.stateUnchanged?0:2;
