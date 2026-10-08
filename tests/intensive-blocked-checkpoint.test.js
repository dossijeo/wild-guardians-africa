import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {createBlockedCheckpoint,createBlockedCheckpointWriter,readBlockedCheckpoint} from '../tools/intensive-blocked-checkpoint.mjs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize} from '../src/persistence/snapshots.js';

function fixture(){
 const state=Game.newGame({seed:712,slotId:'checkpoint-fixture'});state.day=3;state.time=20;
 state.workers=[{id:'worker-1',x:3,z:4,status:'idle',profile:'olderFemale',contractDay:3,taskId:null}];
 state.tasks=[{id:'task-2',targetId:'crop-3',blocked:true,workerId:null}];
 return {state,nav:{config:{seed:'712'},profile:{density:1},activeBounds:[-32,-32,32,32],raidView:{eye:{x:2,z:3},target:{x:1,z:1}}},live:{tasks:{blocked:128}}};
}
test('checkpoint captures only new backlogs at throttled boundaries and owns no live references',()=>{
 let clock=0;const captures=[],checkpoint=createBlockedCheckpoint({capture:(p,slot)=>{captures.push({p,slot});return slot;},now:()=>clock,intervalMs:30});
 const {state,nav,live}=fixture(),before=serialize(state);
 assert.deepEqual(checkpoint(state,nav,live),{sequence:1,peak:128,receipt:'first'});assert.equal(serialize(state),before);
 const saved=structuredClone(captures[0]);nav.activeBounds[0]=-64;state.workers[0].x=10;
 assert.deepEqual(captures[0],saved);live.tasks.blocked=256;clock=29;assert.equal(checkpoint(state,nav,live),null);
 clock=30;assert.deepEqual(checkpoint(state,nav,live),{sequence:2,peak:256,receipt:'latest'});
 clock=1000;assert.equal(checkpoint(state,nav,live),null);live.tasks.blocked=200;assert.equal(checkpoint(state,nav,live),null);
});
test('checkpoint ignores raid, pause, finished game and unavailable employees',()=>{
 for(const edit of [
  s=>s.raid={},s=>s.pauses=['hiring'],s=>s.result='victory',s=>s.time=300,
  s=>s.workers[0].contractDay=2,s=>s.workers[0].taskId='busy',s=>s.workers[0].status='walking',s=>s.workers[0].incapacitated=true,
 ]){
  const {state,nav,live}=fixture();edit(state);
  const checkpoint=createBlockedCheckpoint({capture:()=>{throw Error('Unavailable work must not be captured');},now:()=>0});
  assert.equal(checkpoint(state,nav,live),null);
 }
});
test('checkpoint invalid options and failed capture do not consume the first capture',()=>{
 for(const options of [{},{capture(){},minBlocked:0},{capture(){},intervalMs:0}])assert.throws(()=>createBlockedCheckpoint(options),/Invalid/);
 let fail=true;const checkpoint=createBlockedCheckpoint({capture:(_p,slot)=>{if(fail)throw Error('Disk full');return slot;},now:()=>0});
 const {state,nav,live}=fixture();assert.throws(()=>checkpoint(state,nav,live),/Disk full/);fail=false;
 assert.equal(checkpoint(state,nav,live).receipt,'first');
});
test('checkpoint writer retains two validated slots and rejects a torn snapshot or unsafe name',()=>{
 const parent=resolve('.cache/checkpoint-tests');mkdirSync(parent,{recursive:true});const dir=mkdtempSync(join(parent,'case-'));
 const {state,nav,live}=fixture(),provenance={sourceHashes:{'src/simulation/game.js':'fixture-only'}};
 let clock=0;const capture=createBlockedCheckpointWriter(dir,'sabana-mapungubwe',provenance),checkpoint=createBlockedCheckpoint({capture,now:()=>clock,intervalMs:1});
 const first=checkpoint(state,nav,live),firstPath=join(dir,first.receipt),firstBytes=readFileSync(firstPath);
 assert.equal(serialize(readBlockedCheckpoint(firstPath).state),serialize(state));
 live.tasks.blocked=256;clock=1;const last=checkpoint(state,nav,live);live.tasks.blocked=300;clock=2;checkpoint(state,nav,live);
 assert.equal(readdirSync(dir).length,4);assert.deepEqual(readFileSync(firstPath),firstBytes);
 const lastPath=join(dir,last.receipt),{receipt}=readBlockedCheckpoint(lastPath);assert.equal(receipt.blocked,300);
 writeFileSync(join(dir,receipt.snapshot),'interrupted');assert.throws(()=>readBlockedCheckpoint(lastPath),/hash mismatch/);
 receipt.snapshot='../foreign.json.gz';writeFileSync(lastPath,JSON.stringify(receipt));assert.throws(()=>readBlockedCheckpoint(lastPath),/snapshot name/);
 assert.throws(()=>createBlockedCheckpointWriter(dir,'../foreign',{}),/key/);
});
test('watering diagnostic CLI restores a native receipt and rejects a different terrain profile',()=>{
 const parent=resolve('.cache/checkpoint-tests');mkdirSync(parent,{recursive:true});const dir=mkdtempSync(join(parent,'native-'));
 const text=readFileSync(new URL('../docs/qa/intensive-canyon-10/state.json',import.meta.url),'utf8'),state=deserialize(text);
 const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url),'utf8')).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 nav.setActiveBounds([-32,-32,32,32]);nav.setRaidView({x:1,z:2},{x:3,z:4});
 const context={navigation:structuredClone({config:nav.config,profile,activeBounds:nav.activeBounds,raidView:nav.raidView})};
 const writer=createBlockedCheckpointWriter(dir,'native-canyon',{scope:'Manual historical checkpoint roundtrip test, not a captured backlog'});
 const name=writer({state:text,context},'first'),receiptPath=join(dir,name),reportPath=join(dir,'replay/report.json');
 const tool=fileURLToPath(new URL('../tools/check_watering_route_diagnostics.mjs',import.meta.url));
 execFileSync(process.execPath,[tool,receiptPath,reportPath,'1'],{stdio:'pipe'});
 const report=JSON.parse(readFileSync(reportPath,'utf8'));assert.equal(report.checkpoint.contextRestored,true);assert.equal(report.ticks,1);
 context.navigation.profile={...profile,qaInvalid:true};writer({state:text,context},'latest');
 assert.throws(()=>execFileSync(process.execPath,[tool,join(dir,'native-canyon-blocked-latest.json'),join(dir,'invalid/report.json'),'1'],{stdio:'pipe'}),/profile differs/);
});
