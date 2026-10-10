import {NativeCampaignEntryDriver} from '../tools/native-campaign-entry-driver.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {raidEntryKey} from '../src/world/raid-entry-data.js';
import {topologyFixture} from '../tools/probe-raid-entry-topology.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {WorldScene} from '../src/rendering/scene.js';import {raidEntryChunks,raidResidentDemand} from '../src/world/raid-entry-residency.js';import {Navigation} from '../src/world/navigation.js';
function world(){const nav=new Navigation(712,'sabana',{}),state={raid:null},planned=[];nav.setState({structures:[],villages:[],plants:[],suppressed:[],spells:[]});const w={nav,state,prototypes:[],camera:{position:{x:0,z:0}},quality:'media',pack:{profile:{}},horizon:{update(){}},chunks:new Map(),terrainMeshes:[],scene:{remove(){}},controls:{target:{x:0,z:0}},chunkStream:{plan(jobs){planned.push(new Map(jobs));},dispatch(){}},syncResidentProps(){},contacts:{update(){}}};return {w,nav,state,planned};}
test('residency pins actual sparse birth/exit chunks without generating the expanded rectangle',()=>{const {w,nav,planned}=world();const entry={entries:[{x:0,z:320}],exits:[{x:0,z:323}]};nav.raidEntryDemand={entry,radii:[1.1]};WorldScene.prototype.syncChunks.call(w);const pins=raidEntryChunks(entry,[1.1]),jobs=planned.at(-1);assert.equal(jobs.size,25+pins.size);for(const key of pins)assert(jobs.has(key));assert(nav.activeBounds[3]>=323+1.1);assert(!jobs.has('0,4'),'Intervening rectangle is not filled');});
test('pins are evicted and bounds restored after cancellation, without disrupting normal chunks',()=>{const {w,nav,planned}=world();const entry={entries:[{x:0,z:320}],exits:[{x:0,z:323}]};nav.raidEntryDemand={entry,radii:[1.1]};WorldScene.prototype.syncChunks.call(w);const key=[...raidEntryChunks(entry,[1.1])][0];w.chunks.set(key,{userData:{},traverse(){}});delete nav.raidEntryDemand;WorldScene.prototype.syncChunks.call(w);assert.equal(w.chunks.has(key),false);assert.equal(planned.at(-1).size,25);assert.deepEqual(nav.activeBounds,[-120,-120,120,120]);});
test('active actor next-step corridor remains pinned and all demand disappears after real departure',()=>{const {nav,state}=world();state.raid={animals:[{x:23,z:0,radius:1.1,exit:{x:0,z:0},path:[{x:60,z:0}],status:'walking'}]};const keys=raidResidentDemand(state,nav);assert(keys.has('0,0'));assert(keys.has('1,0'));state.raid.animals[0].status='gone';assert.equal(raidResidentDemand(state,nav).size,0);});

test('bounds refresh retains validated sparse demand while a new full worker key is prepared',()=>{const {s,nav}=topologyFixture('closed');s.nightPlan={at:500,group:['warthog'],done:false};const requests=[],worker={postMessage(r){requests.push(r);},terminate(){}},p=new RaidEntryPreparer(nav,{createWorker:()=>worker});p.update(s);worker.onmessage({data:{key:requests[0].key,token:requests[0].token,entry:{entries:[{x:0,z:320}],exits:[{x:0,z:323}]}}});const demand=nav.pendingRaidEntry;nav.setActiveBounds([-60,-60,60,360]);p.update(s);assert.equal(nav.pendingRaidEntry,demand);assert.equal(p.ready,null);assert.equal(requests.length,2);worker.onmessage({data:{key:requests[1].key,token:requests[1].token,entry:demand.entry}});assert.equal(p.ready.key,raidEntryKey(s,nav,s.nightPlan.group));nav.setRaidView({x:11,z:8},{x:0,z:0});p.update(s);assert.equal(nav.pendingRaidEntry,null);p.dispose();});


test('headless driver waits for the same retained daytime owner instead of the nighttime key',async()=>{
 const {s,nav}=topologyFixture('closed');s.dayPlan={at:200,group:['warthog'],done:false};s.nightPlan={at:300,group:['hyena'],done:false};
 const entry=chooseRaidEntry(s,[{radius:1.1}],nav.activeBounds,0,nav),before=serialize(s);
 const worker={closed:Promise.resolve(),postMessage(r){assert.deepEqual(r.group,['warthog']);queueMicrotask(()=>this.onmessage({data:{key:r.key,token:r.token,entry}}));},terminate(){}};
 const driver=new NativeCampaignEntryDriver(nav,{createWorker:()=>worker,maxWaitMilliseconds:1000});
 const ready=await driver.waitForEntry(s);assert(ready.entry);assert.deepEqual(driver.waits[0].group,['warthog']);
 assert.deepEqual(driver.contexts[0].group,['warthog']);assert.equal(serialize(s),before);await driver.dispose();
});
