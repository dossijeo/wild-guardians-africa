// Navigation/raid fixture only. Explicit scheduled twelve-body group, not a
// campaign or evidence about naturally planned first-night composition.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createOpeningWorld} from './check_opening.mjs';
import {createNodeRaidEntryWorker} from './node-raid-entry-transport.mjs';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const output=process.argv[2],biome=process.argv[3]??'desierto';if(!output)throw Error('Specify new evidence directory');mkdirSync(output,{recursive:false});
const begun=performance.now(),group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const {s,nav}=createOpeningWorld({biome,seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:[...group],done:false};
const original=serialize(s),hash=raw=>createHash('sha256').update(raw).digest('hex'),frames=[],events=[],seen=new Set();let worker,preparer,timeout;
const report={scope:'Explicit native twelve-body scheduled navigation fixture; no campaign, natural intro distribution or balance acceptance',biome,seed:s.seed,culture:s.culture,group,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),observerSourceSHA256:hash(readFileSync(new URL(import.meta.url))),status:'running',initialSnapshotSHA256:hash(original),checks:{},budgetSeconds:7};
const collect=()=>{for(const event of s.events)if(!seen.has(event.id)){seen.add(event.id);events.push(structuredClone(event));}};
const frame=()=>({elapsed:s.elapsed,day:s.day,time:s.time,result:s.result,centerHp:center.hp,animals:s.raid?.animals.map(a=>({id:a.id,species:a.species,x:a.x,z:a.z,radius:a.radius,status:a.status,hitsRemaining:a.hitsRemaining,reservation:a.reservation,targetId:a.targetId,pathPoints:a.path?.length??null,exit:a.exit}))??[],reservations:structuredClone(s.raid?.reservations??{})});
try{
 preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker=createNodeRaidEntryWorker()});const receive=worker.onmessage;
 const reply=new Promise((resolve,reject)=>{worker.onmessage=event=>{receive(event);if(event.data.error)reject(Error(event.data.error));else resolve(event.data);};const error=worker.onerror;worker.onerror=e=>{error(e);reject(e);};});
 preparer.update(s);const prepared=await Promise.race([reply,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('Worker observation deadline; no restart')),7000))]);clearTimeout(timeout);
 assert.ok(prepared.entry);assert.equal(serialize(s),original);report.checks.preparationStateUnchanged=true;
 // Native clock alone reaches the scheduled spawn; no position/HP/money,
 // task/claim or outcome writes after fixture setup.
 Game.tick(s,400,nav);collect();assert.ok(s.raid);assert.equal(s.raid.animals.length,12);assert.equal(preparer.stats.used,1);frames.push(frame());
 const nativeActors=s.raid.animals,initialHits=new Map(nativeActors.map(a=>[a.id,a.hitsRemaining])),actorIds=nativeActors.map(a=>a.id);report.actorIds=actorIds;report.spawnStateSHA256=hash(serialize(s));
 let intervals=0;
 while(s.raid&&!s.result){
  if(performance.now()-begun>7000)throw Error('Bounded physical observation incomplete; no simulated timeout or outcome');
  const previous=new Map(s.raid.animals.map(a=>[a.id,{x:a.x,z:a.z}]));
  Game.tick(s,.25,nav);collect();intervals++;
  for(const actor of nativeActors){assert.ok(nav.walkable(actor.x,actor.z,actor.radius,null,false),`Native footprint ${actor.id}`);assert.ok(nav.segmentClear(previous.get(actor.id),actor,actor.radius,null,false),`Native sampled movement segment ${actor.id}`);}
  frames.push(frame());
 }
 assert.equal(s.raid,null,'Fixture requires native raid completion, not a live raid labelled defeat');
 report.terminalActors=nativeActors.map(a=>({id:a.id,species:a.species,status:a.status,x:a.x,z:a.z,exit:a.exit,initialHits:initialHits.get(a.id),unusedHits:a.hitsRemaining,exitDistance:Math.hypot(a.x-a.exit.x,a.z-a.exit.z)}));
 for(const actor of report.terminalActors){assert.equal(actor.status,'gone');assert.ok(actor.exitDistance<1e-8,'Gone body must physically reach its native exit');}
 assert.equal(events.filter(e=>e.type==='RaidSpawned').length,1);assert.equal(events.filter(e=>e.type==='RaidEnded').length,1);
 let balance=1500n;for(const debit of Object.values(s.ledger.entries)){assert.equal(debit.d,'1');balance+=BigInt(debit.n);}assert.equal(s.ledger.balance.n,String(balance));assert.equal(s.ledger.balance.d,'1');
 const terminal=serialize(s);assert.equal(serialize(deserialize(terminal)),terminal);
 Object.assign(report,{status:'passed',intervals,simulatedSeconds:s.elapsed,actualHits:events.filter(e=>e.type==='AnimalLogicalHit').length,retirementEvents:events.filter(e=>e.type==='AnimalRetreating').length,structureHits:events.filter(e=>e.type==='StructureHit').map(e=>({animalId:e.animalId,targetId:e.targetId,...e.structureHit})),result:s.result,checks:{...report.checks,raidCleared:true,nativeClock:true,sampledNativeTerrainMovement:true,allTwelvePhysicalExits:true,ledger:true,roundtrip:true}});
}catch(error){report.status='incomplete';report.error={name:error.name,message:error.message};}
finally{clearTimeout(timeout);preparer?.dispose();if(worker)await worker.closed;}
const terminal=serialize(s);report.finalSnapshotSHA256=hash(terminal);report.milliseconds=performance.now()-begun;report.transportFailure=worker?.failure?.message??null;
writeFileSync(`${output}/initial-state.json.gz`,gzipSync(original));writeFileSync(`${output}/final-state.json.gz`,gzipSync(terminal));writeFileSync(`${output}/frames.json.gz`,gzipSync(JSON.stringify(frames)));writeFileSync(`${output}/events.json.gz`,gzipSync(JSON.stringify(events)));writeFileSync(`${output}/physical.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));process.exitCode=report.status==='passed'?0:2;
