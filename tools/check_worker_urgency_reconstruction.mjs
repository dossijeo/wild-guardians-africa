import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as Game from '../src/simulation/game.js';
import {rational,transact} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {repairRoute} from '../src/world/work-points.js';
assert.ok(process.argv[2],'Pass frozen reference root');
const Reference=await import(pathToFileURL(resolve(process.argv[2],'src/simulation/game.js')));
const Candidate=process.argv[3]?await import(pathToFileURL(resolve(process.argv[3],'src/simulation/game.js'))):Game;
// Deliberate domain fixture: paid crew, explicit QA funding and pre-existing
// displacement. Straight routes isolate same-pass reassignment, not navigation.
const nav={placement:()=>({valid:true}),setState:()=>{},path:(_a,b)=>[{x:b.x,z:b.z}],walkable:()=>true};
const s=Game.newGame({seed:712,slotId:'urgency-reconstruction'});Game.resume(s,'intro');
transact(s.ledger,'qa-funding',rational(10000));
Game.placeStructure(s,'center-a',{x:8,z:0},nav);Game.placeStructure(s,'center-b',{x:20,z:0},nav);
const [lost,survivor]=s.structures;
for(let i=0;i<96;i++)Game.plant(s,'seed-'+i,'mijo',24+i%12*1.5,-6+Math.floor(i/12)*1.5,nav);
Game.pause(s,'hiring');Game.hire(s,'paid-crew',{olderMale:64});s.time=40;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
for(let i=0;i<s.workers.length;i++){
 const w=s.workers[i];w.centerId=i<32?survivor.id:lost.id;w.status=i<32?'walking':'home';w.taskId=null;w.path=null;
 if(i>=32)w.displacedDay=s.day;
}
lost.hp=0;lost.status='ruined';
Game.requestRepair(s,'rebuild',lost.id);
const repairing=s.workers[1],repair=s.tasks.find(t=>t.kind==='repair');repair.workerId=repairing.id;
Object.assign(repairing,{...repairRoute(repairing,lost,nav).destination,taskId:repair.id});
for(const [wi,ti] of [[0,0],[2,1]]){const w=s.workers[wi],t=s.tasks[ti];t.workerId=w.id;w.taskId=t.id;}
const a=deserialize(serialize(s)),b=deserialize(serialize(s));
for(let i=0;i<20;i++){Reference.tick(a,.1,nav);Candidate.tick(b,.1,nav);assert.equal(serialize(b),serialize(a),'Full state at step '+i);}
assert.equal(b.structures[0].status,'intact');
assert.ok(b.events.filter(e=>e.type==='WorkerReassigned').length>=32);
assert.equal(b.workers[2].runRemaining,s.workers[2].runRemaining,'Later worker sees recovered colleagues instead of stale urgent ratio');
console.log(JSON.stringify({scope:'Contrived paid 64-worker reconstruction fixture with straight route double; not native terrain, rendering or a campaign.',ticks:20,fullStateEqual:true,reassigned:b.events.filter(e=>e.type==='WorkerReassigned').length,laterWorkerRunRemaining:b.workers[2].runRemaining}));
