import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {raidEntryKey,raidEntryRequest} from '../src/world/raid-entry-data.js';
import {serialize} from '../src/persistence/snapshots.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCertificate,loadRejectedEntry,replayRejectedEntry} from '../tools/probe-rejected-exterior-entry.mjs';
import {exteriorRaidEntry} from '../src/simulation/raid-exterior-entry.js';

test('original expansive712 rhino exit shares a native exterior certificate without requiring an independent straight ray',()=>{
 const c=inspectCertificate();assert.deepEqual(c.group,['rhino']);assert(c.entry);
 assert.deepEqual(c.proof,[{radius:1.55,birthWalkable:true,exitWalkable:true,birthExterior:true,exitExteriorDirect:false,exitToBirth:true}]);
});
for(const kind of ['fluid','steep','solid'])test(`a shared certificate never bypasses current native ${kind} rejection`,()=>{
 const c=inspectCertificate(),{state,nav}=loadRejectedEntry(),birth=c.entry.entries[0],exit=c.entry.exits[0];
 if(kind==='fluid')nav.field.fluidInside=()=>true;
 if(kind==='steep')nav.field.slope=()=>.8;
 if(kind==='solid')state.structures.push({id:'new-blocker',kind:'wall',material:'zarzas',status:'intact',hp:100,maxHp:100,x:(birth.x+exit.x)/2,z:(birth.z+exit.z)/2,yaw:0,gate:false});
 nav.setState(state);assert.equal(nav.segmentClear(exit,birth,1.55,null,false),false);
 // Isolate the previously proposed pair: no substitution by another candidate.
 assert.equal(exteriorRaidEntry(state,[{radius:1.55}],nav.activeBounds,0,nav,()=>c.entry,()=>null),null);
});
for(const [dt,reloadAfter] of [[.1,null],[1,null],[.1,5]])test(`exact rejected snapshot resolves through normal Game.tick dt=${dt}, reload=${reloadAfter}`,()=>{
 const r=replayRejectedEntry(dt,{reloadAfter});assert.equal(r.completedBefore,4);assert.equal(r.completedAfter,5);
 assert.equal(r.result,null);assert.equal(r.raidRemaining,null);assert.equal(r.events.filter(e=>e.type==='RaidSpawned').length,1);
 assert(r.events.some(e=>e.type==='StructureHit'));assert(r.footprintChecks>0);assert(r.simulatedSeconds<120);
 if(reloadAfter!==null)assert(r.reloaded);
});


test('the real preparation engine returns the original rhino group without changing its frozen state',()=>{
 const {state,nav}=loadRejectedEntry(),before=serialize(state),group=state.nightPlan.group;
 const reply=computeRaidEntry(raidEntryRequest(state,nav,group,raidEntryKey(state,nav,group),1));
 assert(reply.entry);assert.equal(reply.entry.entries.length,1);assert.equal(reply.entry.exits.length,1);
 assert.equal(serialize(state),before);assert.equal(reply.key,raidEntryKey(state,nav,group));
 for(const p of [...reply.entry.entries,...reply.entry.exits])assert(nav.walkable(p.x,p.z,1.55,null,false));
});
