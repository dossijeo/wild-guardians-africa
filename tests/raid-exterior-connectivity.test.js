import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {topologyFixture} from '../tools/probe-raid-entry-topology.mjs';
import {exteriorGroupWitness,EXTERIOR_GRAPH_LIMITS} from '../src/simulation/raid-exterior-connectivity.js';
function native(){const {s,nav}=topologyFixture('closed');s.structures=[];s.plants=[];s.villages=[];nav.setState(s);return {s,nav};}
const pair=(birth,exit)=>({entries:[birth],exits:[exit]});
const certify=(entry,specs,nav,witness)=>exteriorGroupWitness(entry,specs,[-20,-20,20,20],nav,witness);
test('an exit root certifies its birth through an actual native segment',()=>{
 const {nav}=native(),entry=pair({x:0,z:0},{x:0,z:5});let sweeps=0;const segment=nav.segmentClear.bind(nav);nav.segmentClear=(...a)=>{sweeps++;return segment(...a);};
 assert(certify(entry,[{radius:1.1}],nav,p=>p.z===5));assert.equal(sweeps,1);
});
test('a multi-radius chain uses existing endpoints and recomputes the exterior root at each radius',()=>{
 const {s,nav}=native();s.structures=[{id:'blocker',kind:'wall',x:2.5,z:2.5,yaw:0,material:'zarzas',hp:100,maxHp:100,status:'intact'}];nav.setState(s);
 const entry={entries:[{x:0,z:0},{x:5,z:0},{x:5,z:5}],exits:[{x:0,z:-3},{x:8,z:0},{x:5,z:8}]},specs=[.9,1.1,.97].map(radius=>({radius})),roots=new Set();
 assert.equal(nav.segmentClear(entry.entries[2],entry.entries[0],.97,null,false),false);
 assert(nav.segmentClear(entry.entries[2],entry.entries[1],.97,null,false));assert(nav.segmentClear(entry.entries[1],entry.entries[0],.97,null,false));
 assert(certify(entry,specs,nav,(p,r)=>{if(p.x===0){roots.add(r);return true;}return false;}));assert.deepEqual([...roots].sort(),[.9,.97,1.1]);
});
test('a small exterior root cannot lend its footprint through a narrow corridor to a larger actor',()=>{
 const {s,nav}=native();s.structures=[-1.25,1.25].map((x,i)=>({id:'side-'+i,kind:'wall',x,z:0,yaw:Math.PI/2,baseScaleX:2,material:'zarzas',hp:100,maxHp:100,status:'intact'}));nav.setState(s);
 const entry={entries:[{x:0,z:0},{x:0,z:5}],exits:[{x:0,z:-4},{x:0,z:8}]};
 assert(nav.walkable(0,0,.97,null,false));assert.equal(nav.walkable(0,0,1.1,null,false),false);
 assert.equal(certify(entry,[{radius:.97},{radius:1.1}],nav,p=>p.z<=0),false);
});
for(const kind of ['fluid','slope','solid'])test(`native ${kind} rejects an apparently shared exterior certificate`,()=>{
 const {s,nav}=native(),entry=pair({x:0,z:0},{x:0,z:5});
 if(kind==='fluid')nav.field.fluidInside=()=>true;
 if(kind==='slope')nav.field.slope=()=>.8;
 if(kind==='solid'){s.structures=[{id:'block',kind:'wall',x:0,z:2.5,yaw:0,baseScaleX:20,material:'zarzas',hp:100,maxHp:100,status:'intact'}];nav.setState(s);}
 assert.equal(certify(entry,[{radius:1.1}],nav,p=>p.z===5),false);
});
test('the endpoint graph adds at most its explicit root and directed edge query bounds',()=>{
 let roots=0,edges=0;const n=90,entry={entries:Array.from({length:n},(_,i)=>({x:i/20,z:0})),exits:Array.from({length:n},(_,i)=>({x:i/20,z:1}))};
 const nav={walkable:()=>true,segmentClear:()=>{edges++;return false;}};
 assert.equal(certify(entry,Array.from({length:n},()=>({radius:1})),nav,()=>{roots++;return roots===1;}),false);
 // Direct certificates first cost two root checks per actor and at most one edge.
 assert(roots<=2*n+EXTERIOR_GRAPH_LIMITS.rootChecks);assert(edges<=n+EXTERIOR_GRAPH_LIMITS.edgeChecks);
});

import {inspectCohort,loadCohort} from '../tools/probe-cohort-connectivity.mjs';
import {spawnRaid} from '../src/simulation/raids.js';
import {nextRandom} from '../src/simulation/rules.js';
for(const kind of ['good','expansive'])test(`exact frozen ${kind} day6 keeps its complete cohort and deterministic spawn`,()=>{
 const proof=inspectCohort(kind),old=JSON.parse(readFileSync(`docs/qa/exterior-cohort-connectivity/${kind}-original-rejection.json`,'utf8'));
 const candidates=[old.base,...old.rows.map(row=>row.entry).filter(Boolean)];assert(candidates.some(c=>JSON.stringify(c.entries)===JSON.stringify(proof.entry?.entries)&&JSON.stringify(c.exits)===JSON.stringify(proof.entry?.exits)),'Selected positions must already exist in the original candidate set');assert(proof.stateUnchanged);assert(proof.wholeGroup);assert.equal(proof.entry.entries.length,proof.group.length);assert(proof.proof.every(p=>p.birthWalkable&&p.exitWalkable));
 const {state,nav}=loadCohort(kind),rng=state.rng;assert(spawnRaid(state,state.nightPlan,nav));assert.deepEqual(state.raid.animals.map(a=>a.species),proof.group);assert.deepEqual(state.raid.animals.map(a=>({x:a.x,z:a.z})),proof.entry.entries);assert.deepEqual(state.raid.animals.map(a=>a.exit),proof.entry.exits);
 const expected={rng};for(let i=0;i<proof.group.length+1;i++)nextRandom(expected);assert.equal(state.rng,expected.rng);
});

test('a new live wall invalidates a previously accepted endpoint connector',()=>{
 const {s,nav}=native(),entry=pair({x:0,z:0},{x:0,z:5}),specs=[{radius:1.1}],witness=p=>p.z===5;
 assert(certify(entry,specs,nav,witness));s.structures=[{id:'new-wall',kind:'wall',x:0,z:2.5,yaw:0,baseScaleX:20,material:'zarzas',hp:100,maxHp:100,status:'intact'}];nav.setState(s);
 assert.equal(certify(entry,specs,nav,witness),false);
});
test('graph bounds reject the whole oversized unresolved candidate rather than thinning it',()=>{
 const count=EXTERIOR_GRAPH_LIMITS.nodes/2+1,entry={entries:Array.from({length:count},(_,i)=>({x:i,z:0})),exits:Array.from({length:count},(_,i)=>({x:i,z:1}))},before=JSON.stringify(entry);
 assert.equal(certify(entry,Array.from({length:count},()=>({radius:1})),{walkable:()=>true,segmentClear:()=>false},()=>false),false);assert.equal(JSON.stringify(entry),before);assert.equal(entry.entries.length,count);
});
