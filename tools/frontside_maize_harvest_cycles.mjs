// CPU task lifecycle witness, deliberately separate from GPU/model approval.
// Clear-path navigation isolates physical worker movement and save recovery.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';import {cropSpec} from '../src/simulation/rules.js';import {rational,numberOf} from '../src/simulation/money.js';import {serialize,deserialize} from '../src/persistence/snapshots.js';
const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}],field:{canyon:false},segmentClear:()=>true,obstacles:[],suppressed:new Set(),propsAt:()=>[]};
let state=Game.newGame({seed:712,slotId:'frontside-maize-cycles-copy'});Game.resume(state,'intro');state.day=101;state.completedNights=100;state.postgame=true;state.initialPreparation=false;state.tutorial.step='done';state.ledger.balance=rational(10000);
Game.placeStructure(state,'qa-center',{x:4,z:0},nav);Game.pause(state,'hiring');Game.hire(state,'qa-paid-worker',{olderMale:1});assert.equal(state.workers.length,1);
const cycles=[];let ticks=0;
function advanceUntil(predicate,label,observed){for(let i=0;i<1500&&!predicate();i++){Game.tick(state,.1,nav);ticks++;const w=state.workers[0];observed.push({tick:ticks,status:w.status,x:w.x,z:w.z,taskId:w.taskId,carryingId:w.crateId??null});}assert.ok(predicate(),label+' did not complete within prospective150s budget');}
for(let cycle=0;cycle<3;cycle++){
 const beforePlants=state.plants.length;Game.plant(state,'qa-paid-plant-'+cycle,'maiz',8+cycle*.75,0,nav);assert.equal(state.plants.length,beforePlants+1);const plant=state.plants.at(-1),id=plant.id;
 // Explicit biological checkpoint, not a claim of simulated five-stage growth.
 plant.growth=cropSpec('maiz').growth_seconds-.05;plant.water.forEach(w=>{w.status='manual';w.wait=0;});
 const beforeDelivery=numberOf(state.ledger.balance),observed=[];advanceUntil(()=>state.crates.some(c=>c.sourcePlantId===id), 'physical maize pickup',observed);
 let crate=state.crates.find(c=>c.sourcePlantId===id);assert.equal(state.plants.find(p=>p.id===id).alive,false);assert.equal(crate.delivered,false);assert.equal(numberOf(state.ledger.balance),beforeDelivery);
 const carrying=state.workers[0];assert.equal(carrying.status,'carrying');const sourcePickup={workerId:carrying.id,x:carrying.x,z:carrying.z,crateId:crate.id,plantId:id};
 const saved=serialize(state),sha=value=>crypto.createHash('sha256').update(value).digest('hex');state=deserialize(saved);assert.equal(serialize(state),saved);nav.setState(state);Game.rebuildTasks(state);
 advanceUntil(()=>state.crates.some(c=>c.id===crate.id&&c.delivered),'physical maize delivery after reload',observed);crate=state.crates.find(c=>c.id===crate.id);
 const settled=numberOf(state.ledger.balance);assert.ok(settled>beforeDelivery);assert.equal(state.events.filter(e=>e.type==='CrateDelivered'&&e.targetId===crate.id).length,1);assert.equal(state.events.filter(e=>e.type==='HarvestRequested'&&e.targetId===id&&e.automatic).length,1);
 Game.rebuildTasks(state);Game.tick(state,.1,nav);assert.equal(numberOf(state.ledger.balance),settled);
 cycles.push({cycle,plantId:id,crateId:crate.id,sourcePickup,saveSha256:sha(saved),delivered:true,income:settled-beforeDelivery,deliveredOnce:true,workerPositions:observed});
}
const report={status:'CPU_MAIZE_PICKUP_DELIVERY_REPEATED_CYCLES_NOT_MODEL_APPROVAL',cycles,ticks,sourceFiles:Object.fromEntries(['src/simulation/game.js','src/simulation/crops.js','src/simulation/tasks.js'].map(path=>[path,crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')])),limitations:['Three paid planting/physical pickup/delivery cycles on a clear-path CPU fixture; no native terrain navigation or GPU rig/clip witness.','Each plant begins at an explicit watered near-maturity biological checkpoint; full five-stage gameplay growth is not claimed.','Reload occurs while carrying and settlement is checked once; original persistence files/user saves are untouched.','This simulation witness is independent of model geometry. Actual batch dispatch/live-lane and native visual continuity evidence remain separate.']};
fs.writeFileSync('docs/qa/frontside-model-pilot/maize-world-harvest-cycles.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cycles:cycles.length,ticks,delivered:cycles.every(c=>c.delivered),limitations:report.limitations}));
