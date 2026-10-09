import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createOpeningWorld} from './check_opening.mjs';
import {chooseRaidEntry,reachableApproach} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {centerDeliveryPoint} from '../src/world/centers.js';
import {serialize} from '../src/persistence/snapshots.js';

const output=process.argv[2];if(!output)throw Error('Specify a new output directory');mkdirSync(output,{recursive:false});
const start=performance.now(),group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const {s,nav}=createOpeningWorld({biome:'desierto',seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);
const original=serialize(s),digest=raw=>createHash('sha256').update(raw).digest('hex');
const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
const entry=chooseRaidEntry(s,specs,nav.activeBounds,0,nav),report={biome:s.biome,culture:s.culture,seed:s.seed,group,bounds:nav.activeBounds,eye,center,
 scope:'Entry-only native route diagnostic; no clock, commands, RNG mutation or campaign. Original direct-route test remains negative.',
 stateSHA256:digest(original),entry,rows:[],routeQueries:0,completeEntry:entry?.entries.length===12&&entry?.exits.length===12};
const realApproach=nav.approachPath.bind(nav);
nav.approachPath=(...args)=>{if(performance.now()-start>4500)throw Error('Diagnostic CPU budget exhausted; untested routes remain unknown');report.routeQueries++;return realApproach(...args);};
const originalNavState=nav.state;
try{
 if(!report.completeEntry)throw Error('No complete twelve-body entry');
 const animals=specs.map(({radius},i)=>({id:`preview-${i}`,species:group[i],...entry.entries[i],radius,status:'entering',hitsRemaining:1}));
 // Same isolated preview actor state used by production warmRaidApproaches.
 nav.state={...s,raid:{reservations:{},animals}};
 for(const [i,actor] of animals.entries()){
  const directPoint=centerDeliveryPoint(center,actor,s,actor.radius+.5),row={index:i,species:actor.species,radius:actor.radius,entry:entry.entries[i],exit:entry.exits[i],directPoint};report.rows.push(row);
  row.directRoute=!!nav.approachPath(actor,directPoint,actor.radius);
  const approach=reachableApproach(actor,center,nav,null);row.nativeAttackRoute=!!approach;row.attackPoint=approach?.point;row.routePoints=approach?.path.length;
 }
 report.allNativeAttackRoutes=report.rows.length===12&&report.rows.every(row=>row.nativeAttackRoute);report.status=report.allNativeAttackRoutes?'passed':'failed';
}catch(error){report.status='incomplete';report.error=error.message;report.allNativeAttackRoutes=false;}
finally{nav.state=originalNavState;nav.approachPath=realApproach;}
report.finalStateSHA256=digest(serialize(s));report.stateUnchanged=report.stateSHA256===report.finalStateSHA256;report.milliseconds=performance.now()-start;
writeFileSync(`${output}/state.json.gz`,gzipSync(original));writeFileSync(`${output}/arrival.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,stateUnchanged:report.stateUnchanged,rows:report.rows.length,routeQueries:report.routeQueries,milliseconds:report.milliseconds,error:report.error}));
process.exitCode=report.status==='passed'&&report.stateUnchanged?0:2;
