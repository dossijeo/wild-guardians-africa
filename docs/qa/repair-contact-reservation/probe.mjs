import * as Game from '../../../src/simulation/game.js';
import {FarmContactAudio} from '../../../src/audio/farm-contact-audio.js';
import {PROFILES} from '../../../src/simulation/workforce.js';
import {serialize} from '../../../src/persistence/snapshots.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
const rows=[];
for(const profile of PROFILES){
 const state=Game.newGame({seed:712,slotId:'repair-sound-context-'+profile.id});Game.resume(state,'intro');state.tutorial.step='done';Game.placeStructure(state,'center',{x:4,z:0},nav);Game.plant(state,'seed','mijo',10,4,nav);Game.openInitialHiring(state);Game.hire(state,'hire',{[profile.id]:1});
 const center=state.structures[0];center.hp=200;Game.requestRepair(state,'repair',center.id);
 const cues=[],frames=[],audio=new FarmContactAudio(id=>{cues.push(id);return {};},()=>{},()=>0);audio.update(state);
 for(let i=0;i<5000&&!state.events.some(e=>e.type==='RepairApplied');i++){
  Game.tick(state,.05,nav);const worker=state.workers[0],task=state.tasks.find(t=>t.id===worker.taskId);
  if(task?.kind==='repair')frames.push({status:worker.status,actionRemaining:worker.actionRemaining??null});
  const saved=serialize(state);audio.update(state);assert.equal(serialize(state),saved);
 }
 const events=state.events.filter(e=>e.type==='RepairApplied');assert.equal(events.length,1);assert.equal(center.hp,center.maxHp);assert.equal(frames.filter(f=>f.status==='acting').length,0);assert.equal(cues.includes('build_tool_hit'),false);audio.dispose();
 rows.push({profile:profile.id,repairFrames:frames.length,actingFrames:0,events:events.length,repairLedger:Object.entries(state.ledger.entries).filter(([id])=>id.startsWith('repair:')),cues});
}
const sources=['src/simulation/game.js','src/rendering/worker-actions.js','src/audio/farm-contact-audio.js'];
const report={scope:'Paid native domain commands and FIFO, presentation observer state identity. Direct-path navigation double; no terrain, browser, listening or GPU acceptance. HP damage is explicit fixture setup.',rows,sourceHashes:Object.fromEntries(sources.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]))};
mkdirSync('docs/qa/repair-contact-reservation',{recursive:true});writeFileSync('docs/qa/repair-contact-reservation/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows));
