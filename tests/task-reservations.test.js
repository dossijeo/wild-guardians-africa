import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveTasks} from '../src/simulation/tasks.js';
import {contractExpired} from '../src/simulation/workforce.js';
import {cancelIdle} from '../src/simulation/idle.js';
function reference(state,canExecute){
 for(const task of [...state.tasks].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))){
  if(task.workerId)continue;
  const target=[...state.plants,...state.crates,...state.structures].find(e=>e.id===task.targetId);if(!target)continue;
  const workers=state.workers.filter(w=>w.centerId===task.centerId&&w.status==='idle'&&!w.taskId&&!w.incapacitated&&!contractExpired(w,state));
  const eligible=workers.filter(w=>canExecute(w,task,target));eligible.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)||a.id.localeCompare(b.id));
  const worker=eligible[0];task.blocked=!worker&&workers.length>0;if(worker){cancelIdle(worker);task.workerId=worker.id;worker.taskId=task.id;worker.status='walking';}
 }
}
function state(){return {day:2,plants:[{id:'plot',x:0,z:0}],crates:[],structures:[],tasks:[{id:'task',created:1,targetId:'plot',centerId:'center',workerId:null,blocked:false}],workers:[1,2,3,4].map(i=>({id:'worker-'+i,x:i,z:0,centerId:'center',status:'idle',taskId:null,incapacitated:false,contractDay:2}))};}

test('large historical farm keeps identical FIFO reservations for crops, loose crates and repairs',()=>{
 const s=state();
 s.plants=Array.from({length:14558},(_,i)=>({id:'plot-'+i,x:i%25,z:Math.floor(i/25),alive:i>=14300}));
 s.crates=Array.from({length:14095},(_,i)=>({id:'crate-'+i,x:i%25,z:0,delivered:i<14090}));
 s.structures=[{id:'repair-target',x:3,z:2}];
 s.tasks=Array.from({length:60},(_,i)=>({id:'task-'+i,created:i,centerId:'center',targetId:i===0?'missing':i===1?'repair-target':i%3===0?'crate-'+(14090+i%5):'plot-'+(14300+i),workerId:null,blocked:i===0}));
 s.workers=Array.from({length:40},(_,i)=>({id:'worker-'+i,x:i%10,z:0,centerId:'center',status:'idle',taskId:null,contractDay:2,incapacitated:false}));
 const prior=structuredClone(s),reachable=(w,t)=>!(t.id==='task-2'&&w.x<4);
 reference(prior,reachable);reserveTasks(s,reachable);assert.deepEqual(s,prior);
 // A subsequent reservation must see new entities; no cross-call index survives.
 s.plants.push({id:'new-plot',x:1,z:0});s.tasks.push({id:'new-task',created:61,centerId:'center',targetId:'new-plot',workerId:null,blocked:false});
 s.workers.push({id:'new-worker',x:1,z:0,centerId:'center',status:'idle',taskId:null,contractDay:2});
 const next=structuredClone(s);reference(next,reachable);reserveTasks(s,reachable);assert.deepEqual(s,next);
});
test('reachable nearest employee requires only one route query; blocked nearest candidates fall through in order',()=>{
 const s=state(),queried=[];reserveTasks(s,w=>{queried.push(w.id);return true;});assert.deepEqual(queried,['worker-1']);assert.equal(s.tasks[0].workerId,'worker-1');
 const blocked=state(),attempts=[];reserveTasks(blocked,w=>{attempts.push(w.id);return w.id==='worker-3';});assert.deepEqual(attempts,['worker-1','worker-2','worker-3']);assert.equal(blocked.tasks[0].workerId,'worker-3');
 const none=state();let queries=0;reserveTasks(none,()=>{queries++;return false;});assert.equal(queries,4);assert.equal(none.tasks[0].workerId,null);assert.equal(none.tasks[0].blocked,true);
});

test('no idle eligible employee preserves missing-target and reserved flags without querying routes',()=>{
 const s=state();s.workers.forEach((w,i)=>{w.status=i%2?'acting':'walking';w.taskId='occupied-'+i;});
 s.crates.push({id:'loose',x:2,z:0});s.structures.push({id:'wall',x:4,z:0});
 s.tasks=[...['plot','loose','wall','missing'].map((id,i)=>({id:'task-'+i,created:i,targetId:id,centerId:'center',workerId:null,blocked:true})),{id:'reserved',created:4,targetId:'plot',centerId:'center',workerId:'worker-1',blocked:true}];
 const expected=structuredClone(s);reference(expected,()=>{throw Error('No candidate should query a route');});
 reserveTasks(s,()=>{throw Error('No candidate should query a route');});assert.deepEqual(s,expected);
 assert.equal(s.tasks[3].blocked,true);assert.equal(s.tasks[4].blocked,true);
 for(const w of s.workers){w.status='idle';w.taskId=null;w.contractDay=1;}
 const expired=structuredClone(s);reference(expired,()=>{throw Error('Expired contract');});reserveTasks(s,()=>{throw Error('Expired contract');});assert.deepEqual(s,expired);
});
test('nearest-first reachability preserves full reservation state across varied FIFO, ties, missing targets and employee eligibility',()=>{
 let seed=8192;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 for(let sample=0;sample<500;sample++){
  const s=state();s.plants=Array.from({length:8},(_,i)=>({id:'plot-'+i,x:Math.floor(random()*8),z:Math.floor(random()*8)}));
  s.tasks=Array.from({length:12},(_,i)=>({id:'task-'+i,created:Math.floor(random()*6),targetId:'plot-'+Math.floor(random()*10),centerId:random()<.7?'center':'other',workerId:random()<.1?'already-reserved':null,blocked:random()<.5}));
  s.workers=Array.from({length:10},(_,i)=>({id:'worker-'+i,x:Math.floor(random()*8),z:Math.floor(random()*8),centerId:random()<.7?'center':'other',status:random()<.8?'idle':'home',taskId:random()<.1?'existing':null,contractDay:random()<.1?1:2,incapacitated:random()<.1,idleState:{mode:'rest'},blocked:s.plants.filter(()=>random()<.3).map(p=>p.id)}));
  const prior=structuredClone(s),reachable=(w,t)=>!w.blocked.includes(t.targetId);reference(prior,reachable);reserveTasks(s,reachable);assert.deepEqual(s,prior,'scenario '+sample);
 }
});


test('busy historical farms clear only existing unreserved targets in one collection pass',()=>{
 const s=state();s.workers.forEach(w=>{w.status='acting';w.taskId='occupied';});
 s.plants=Array.from({length:14558},(_,i)=>({id:'plot-'+i,alive:i>=14300}));
 s.crates=Array.from({length:14095},(_,i)=>({id:'crate-'+i,delivered:i<14090}));s.structures=[{id:'wall'}];
 s.tasks=Array.from({length:1200},(_,i)=>({id:'task-'+i,created:i,centerId:'center',targetId:i%4===0?'missing-'+i:i%4===1?'plot-'+(14300+i%258):i%4===2?'crate-'+(14090+i%5):'wall',workerId:i%7===0?'reserved':null,blocked:i%5!==0}));
 const expected=structuredClone(s);reference(expected,()=>{throw Error('Busy worker');});
 let reads=0;for(const group of [s.plants,s.crates,s.structures])for(const entity of group){const id=entity.id;Object.defineProperty(entity,'id',{enumerable:true,get(){reads++;return id;}});}
 reserveTasks(s,()=>{throw Error('No reachability call');});const lookupReads=reads;
 assert.deepEqual(s,expected);assert.ok(lookupReads<=s.plants.length+s.crates.length+s.structures.length);
 s.plants.push({id:'missing-4'});const next=structuredClone(expected);next.plants.push({id:'missing-4'});reference(next,()=>false);reserveTasks(s,()=>false);assert.deepEqual(s,next);
});

test('busy farms with no blocked task avoid all historical entity collections',()=>{
 const s=state();s.workers.forEach(w=>w.status='acting');
 for(const name of ['plants','crates','structures'])Object.defineProperty(s,name,{get(){throw Error('Unused history');}});
 reserveTasks(s,()=>{throw Error('No route');});assert.equal(s.tasks[0].blocked,false);
});

test('exhausted center pools clear remaining blocked flags without rescanning all employees',()=>{
 const s=state();s.plants=Array.from({length:1600},(_,i)=>({id:'p'+i,x:i%40,z:Math.floor(i/40)}));
 s.tasks=s.plants.map((p,i)=>({id:'t'+i,created:i,targetId:p.id,centerId:i%2?'center':'other',workerId:null,blocked:true}));
 s.workers=Array.from({length:140},(_,i)=>({id:'w'+i,x:i%20,z:0,centerId:i%3?'center':'other',status:'idle',taskId:null,contractDay:2,incapacitated:false}));
 const expected=structuredClone(s);reference(expected,()=>true);
 let centerReads=0;for(const w of s.workers){const center=w.centerId;Object.defineProperty(w,'centerId',{enumerable:true,get(){centerReads++;return center;}});}
 reserveTasks(s,()=>true);const reads=centerReads;assert.deepEqual(s,expected);assert.ok(reads<=s.workers.length*3,`${reads} center reads`);
 // A later pass observes a changed center/contract rather than reusing pools.
 const restored=structuredClone(s);restored.workers.push({id:'late',x:0,z:0,centerId:'other',status:'idle',taskId:null,contractDay:2});
 const next=structuredClone(restored);reference(next,()=>true);reserveTasks(restored,()=>true);assert.deepEqual(restored,next);
});
