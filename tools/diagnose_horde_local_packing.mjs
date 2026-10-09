import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createOpeningWorld} from './check_opening.mjs';
import {cameraRaidEntry,nearFarmRaidEntry} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize} from '../src/persistence/snapshots.js';
const output=process.argv[2];if(!output)throw Error('Specify a new output directory');mkdirSync(output,{recursive:false});
const started=performance.now(),group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const {s,nav}=createOpeningWorld({biome:'desierto',seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);
const original=serialize(s),hash=raw=>createHash('sha256').update(raw).digest('hex');
const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
const report={scope:'Read-only observation of original local packing; no alternate geometry, clock or RNG',group,radii:specs.map(s=>s.radius),center,eye,bounds:nav.activeBounds,stateSHA256:hash(original),attempts:[],samples:[]};
let phase='camera',attempt;
const diagnostic=(reason,details)=>{
 if(reason==='anchor'){attempt={phase,...details,counts:{},placed:0};report.attempts.push(attempt);return;}
 if(reason==='heading')return;
 attempt.counts[reason]=(attempt.counts[reason]??0)+1;
 if(reason==='accepted')attempt.placed++;
 if(reason==='incomplete')attempt.failedActor={i:details.i,radius:details.radius};
 if(report.samples.length<80&&['accepted','incomplete','target-route'].includes(reason))report.samples.push({phase,reason,...details});
};
const realPath=nav.approachPath.bind(nav);let queries=0;
nav.approachPath=(...args)=>{if(performance.now()-started>4500)throw Error('Read-only diagnostic CPU budget exhausted');queries++;return realPath(...args);};
try{
 report.camera=cameraRaidEntry(s,specs,nav.activeBounds,nav,nav.raidView,2,diagnostic);
 phase='near-farm';report.nearFarm=report.camera?null:nearFarmRaidEntry(s,specs,nav.activeBounds,nav,diagnostic);report.status='completed';
}catch(error){report.status='incomplete';report.error=error.message;}
finally{nav.approachPath=realPath;}
report.routeQueries=queries;report.milliseconds=performance.now()-started;report.finalStateSHA256=hash(serialize(s));report.stateUnchanged=report.stateSHA256===report.finalStateSHA256;
writeFileSync(`${output}/state.json.gz`,gzipSync(original));writeFileSync(`${output}/packing.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,attempts:report.attempts.length,routeQueries:queries,milliseconds:report.milliseconds,stateUnchanged:report.stateUnchanged}));
process.exitCode=report.status==='completed'&&report.stateUnchanged?0:2;
