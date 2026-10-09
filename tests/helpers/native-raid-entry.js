import assert from 'node:assert/strict';
import {createOpeningWorld} from '../../tools/check_opening.mjs';
import {RaidEntryPreparer} from '../../src/world/raid-entry-preparer.js';
import {raidEntryKey} from '../../src/world/raid-entry-data.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import {serialize} from '../../src/persistence/snapshots.js';
export const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
export function nativeRaidClockFixture(group=['warthog']){
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',slotId:'acceptance-clock'}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
 nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.initialPreparation=false;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={at:400,group:[...group],done:false};return {s,nav,eye};
}
export async function prepareNativeRaidEntry(s,nav){
 const before=serialize(s),preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('Explicit worker-disabled native fixture');}});
 try{
  let slices=0;while(!preparer.ready){preparer.update(s);assert.ok(++slices<20000);assert.equal(preparer.cooperativeError,undefined);await new Promise(resolve=>setImmediate(resolve));}
  assert.ok(preparer.ready.entry);assert.equal(preparer.ready.key,raidEntryKey(s,nav,s.nightPlan.group));assert.equal(serialize(s),before);return preparer;
 }catch(error){preparer.dispose();throw error;}
}
