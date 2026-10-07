import test from 'node:test';
import assert from 'node:assert/strict';
import {createIntensiveHeartbeat} from '../tools/intensive-heartbeat.mjs';

const fixture=()=>({day:76,time:315,elapsed:45000,completedNights:75,result:null,pauses:[],plants:[{alive:true},{alive:false}],crates:[{delivered:false},{delivered:true}],workers:[{status:'walking'},{status:'acting'},{status:'walking'}],tasks:[{workerId:'w',blocked:false},{workerId:null,blocked:true}],raid:{animals:[{id:'a',species:'lion',status:'retreating',x:2,z:4,hitsRemaining:0,targetId:null,path:[{x:3,z:4}]}]}});
test('heartbeat emits at wall-time boundaries without polling state between them or catching up in bursts',()=>{
 let clock=0;const read=createIntensiveHeartbeat({intervalMs:30,now:()=>clock}),s=fixture();
 assert.equal(read(s).sequence,1);clock=29;assert.equal(read(new Proxy({}, {get(){throw Error('Unexpected state read');}})),null);
 clock=30;assert.equal(read(s).sequence,2);clock=500;assert.equal(read(s).sequence,3);assert.equal(read(s),null);
});
test('heartbeat preserves the full input and previously emitted snapshots after live gameplay changes',()=>{
 let clock=0;const read=createIntensiveHeartbeat({intervalMs:30,now:()=>clock}),s=fixture(),before=structuredClone(s),first=read(s),saved=structuredClone(first);
 assert.deepEqual(s,before);assert.deepEqual(first.workers,{total:3,statuses:{walking:2,acting:1}});assert.deepEqual(first.tasks,{total:2,pending:1,reserved:1,blocked:1});
 assert.equal(first.livingPlants,1);assert.equal(first.undeliveredCrates,1);assert.equal(first.raid.animals[0].pathPoints,1);
 s.pauses.push('hiring');s.workers[0].status='idle';s.raid.animals[0].x=99;s.raid.animals[0].path.push({x:10,z:20});s.tasks.pop();clock=30;
 const next=read(s);assert.deepEqual(first,saved);assert.equal(next.raid.animals[0].x,99);assert.equal(next.raid.animals[0].pathPoints,2);assert.equal(next.tasks.total,1);
 s.raid=null;clock=60;assert.equal(read(s).raid,null);
});
test('heartbeat bounds animal detail while retaining complete population and status counts',()=>{
 const s=fixture();s.raid.animals=Array.from({length:100},(_,i)=>({id:'a'+i,status:i%2?'gone':'attacking',path:[]}));
 const r=createIntensiveHeartbeat({now:()=>0})(s);assert.equal(r.raid.total,100);assert.equal(r.raid.animals.length,32);assert.equal(r.raid.animalsTruncated,true);assert.deepEqual(r.raid.statuses,{attacking:50,gone:50});
 for(const intervalMs of [0,-1,NaN,Infinity])assert.throws(()=>createIntensiveHeartbeat({intervalMs}),/positive and finite/);
});
