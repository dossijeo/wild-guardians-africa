import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {HordeEntryDriver} from '../tools/horde-entry-driver.mjs';
import {createNodeRaidEntryWorker} from '../tools/node-raid-entry-transport.mjs';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize} from '../src/persistence/snapshots.js';
function fixture(){const {s,nav}=createOpeningWorld(),c=s.structures[0],eye={x:c.x+16,z:c.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,c);s.nightPlan={at:400,group:['warthog'],done:false};return {s,nav,c};}
test('Driver rejects original real worker premature exit0 rather than waiting for generic deadline',async()=>{
 const {s,nav}=fixture(),before=serialize(s),driver=new HordeEntryDriver(nav,{createWorker:()=>createNodeRaidEntryWorker({createThread:()=>new Worker('process.exit(0)',{eval:true})}),maxWaitMilliseconds:7000});
 try{await assert.rejects(driver.waitForEntry(s),/Entry worker failed: Raid entry worker unexpectedly exited with code 0/);assert.equal(serialize(s),before);assert.equal(s.result,null);assert.equal(driver.report().workerFailure,'Raid entry worker unexpectedly exited with code 0');}finally{await driver.dispose();}
});
test('Completed null whole-group entry is incomplete, never synthetic defeat or accepted survival',async()=>{
 const {s,nav,c}=fixture();nav.setActiveBounds([c.x-.01,c.z-.01,c.x+.01,c.z+.01]);const before=serialize(s),driver=new HordeEntryDriver(nav,{maxWaitMilliseconds:7000});
 try{await assert.rejects(driver.waitForEntry(s),/no valid whole-group entry; case incomplete/);assert.equal(serialize(s),before);assert.equal(s.raid,null);assert.equal(s.result,null);assert.equal(driver.waits[0].entryActors,0);}finally{await driver.dispose();}
});
