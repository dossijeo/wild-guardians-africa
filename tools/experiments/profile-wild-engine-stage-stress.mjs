import {performance} from 'node:perf_hooks';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as Game from '../../src/simulation/game.js';
import {spawnRaid} from '../../src/simulation/raids.js';
import {rational} from '../../src/simulation/money.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

// Synthetic phase-equivalent engine stress, never a virtual-player campaign or
// an economic-balance result. Every crop and raid uses the real game actions.
const phases=[
  {name:'early',day:6,crops:40,group:['warthog','warthog','warthog','hyena','hyena','hyena']},
  {name:'middle',day:50,crops:150,group:[...Array(5).fill('warthog'),...Array(5).fill('hyena'),...Array(3).fill('buffalo'),'lion']},
  // Sixteen simultaneous attackers match the current wave-residency target;
  // the other animals in a full late raid arrive in subsequent native waves.
  {name:'late',day:100,crops:300,group:[...Array(3).fill('warthog'),...Array(4).fill('hyena'),...Array(4).fill('buffalo'),...Array(3).fill('lion'),...Array(2).fill('rhino')]}
];

const biome=process.argv[2]??'sabana';
const seed=Number(process.argv[3]??712);
const output=process.argv[4];
const tickLimit=Number(process.argv[5]??2400);
const results=[];
const sha=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
const source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  wasmSha256:sha('../../src/world/hierarchical-wasm/spatial-savanna.wasm'),
  raidsSha256:sha('../../src/simulation/raids.js'),
  runnerSha256:sha('./profile-wild-engine-stage-stress.mjs')};

for(const phase of phases){
  const {state,nav,session,start}=await createSpatialCampaignOpening({
    seed,biome,slotId:`engine-stage-${biome}-${seed}-${phase.name}`
  });
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.ledger.balance=rational(1000000);
    const {x:cx,z:cz}=start.site.center;
    let placed=0;
    const preparationStart=performance.now();
    for(let dz=-54;dz<=54&&placed<phase.crops;dz+=2)
      for(let dx=-54;dx<=54&&placed<phase.crops;dx+=2){
        const x=cx+dx,z=cz+dz;
        const [x0,z0,x1,z1]=nav.activeBounds;
        if(x<x0+5||x>x1-5||z<z0+5||z>z1-5)continue;
        if(!nav.placement(x,z,.4).valid)continue;
        try{if(Game.plant(state,`stage-${placed}`,'mijo',x,z,nav))placed++;}
        catch(error){if(error.message!=='Necesitas separar las plantas')throw error;}
      }
    if(placed<phase.crops)throw Error(`Only ${placed}/${phase.crops} crops could be placed`);
    state.day=phase.day;state.completedNights=phase.day-1;
    state.time=310;state.nightPlan={done:true};state.dayPlan={done:true};
    const preparationMs=performance.now()-preparationStart;
    const before=process.memoryUsage();
    const spawned=spawnRaid(state,{at:310,group:phase.group,
      done:false,introductory:false},nav);
    if(spawned===false)throw Error('Raid could not enter physically');
    const actors=[...state.raid.animals];
    const initial=actors.map(actor=>({id:actor.id,x:actor.x,z:actor.z,
      hitsRemaining:actor.hitsRemaining}));
    const tickStart=performance.now();
    const eventCounts={},retreatReasons={},retreatUnusedHits={},retreatDiagnostics=[],exitAbandonments=[];
    let positionAt2000=null;
    let lastEventId=Number(state.events.at(-1)?.id.split('-')[1]??-1);
    let ticks=0;
    for(;ticks<tickLimit&&state.raid&&!state.result;ticks++){
      Game.tick(state,.25,nav);
      if(ticks===1999)positionAt2000=actors.map(actor=>({
        status:actor.status,x:actor.x,z:actor.z}));
      for(const item of state.events){
        const id=Number(item.id.split('-')[1]);
        if(id<=lastEventId)continue;
        eventCounts[item.type]=(eventCounts[item.type]??0)+1;
        if(item.type==='AnimalRetreating'){
          retreatReasons[item.reason]=(retreatReasons[item.reason]??0)+1;
          retreatUnusedHits[item.reason]=(retreatUnusedHits[item.reason]??0)+item.hitsRemaining;
          const actor=actors.find(candidate=>candidate.id===item.targetId);
          retreatDiagnostics.push({species:item.species,reason:item.reason,
            hitsRemaining:item.hitsRemaining,x:actor?.x,z:actor?.z,
            spawnWalkable:actor?nav.walkable(actor.spawn.x,actor.spawn.z,
              actor.radius,null,false):null});
        }
        if(item.type==='AnimalRetreatExitAbandoned')
          exitAbandonments.push({actorId:item.actorId,reason:item.reason,
            x:item.x,z:item.z,seconds:item.seconds});
        lastEventId=id;
      }
      for(const actor of state.raid?.animals??[]){
        if(!Number.isFinite(actor.x)||!Number.isFinite(actor.z))
          throw Error(`Non-finite position for ${actor.id}`);
      }
    }
    const tickMs=performance.now()-tickStart;
    const moved=initial.filter(({x,z},i)=>
      Math.hypot(actors[i].x-x,actors[i].z-z)>1).length;
    const after=process.memoryUsage();
    const row={phase:phase.name,day:phase.day,biome,seed,
      crops:placed,animals:phase.group.length,preparationMs,tickMs,ticks,
      moved,raidActive:!!state.raid,result:state.result,
      raidEnded:eventCounts.RaidEnded??0,
      cropHits:eventCounts.CropHit??0,
      structureHits:eventCounts.StructureHit??0,
      logicalMisses:eventCounts.AnimalLogicalMiss??0,
      attackBudgetUsed:initial.reduce((sum,entry,i)=>
        sum+entry.hitsRemaining-actors[i].hitsRemaining,0),
      retreatReasons:Object.entries(retreatReasons),
      retreatUnusedHits:Object.entries(retreatUnusedHits),
      retreatDiagnostics,
      exitAbandonments,
      heapBefore:before.heapUsed,heapAfter:after.heapUsed,
      native:session.core.metrics()};
    if(positionAt2000)row.positionAt2000=positionAt2000;
    row.issues=[];
    if(moved!==phase.group.length)row.issues.push(`Only ${moved}/${phase.group.length} animals moved`);
    if(state.raid){
      row.issues.push(`Raid did not finish within ${ticks} ticks`);
      row.activeAnimals=actors.filter(actor=>actor.status!=='gone').map(actor=>({
        species:actor.species,status:actor.status,hitsRemaining:actor.hitsRemaining,
        x:actor.x,z:actor.z,exit:actor.exit}));
    }
    if(row.raidEnded!==(state.raid?0:1))row.issues.push(`Raid ended ${row.raidEnded} times`);
    results.push(row);
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }finally{session.dispose();}
}

if(output)writeFileSync(output,JSON.stringify({kind:'synthetic phase-equivalent spatial stress',tickLimit,source,results},null,2));
if(results.some(row=>row.issues.length))process.exitCode=1;
