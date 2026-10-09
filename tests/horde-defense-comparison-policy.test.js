import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {simulateIntensiveFarm,auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {simulateHordeDefenseFarm} from '../tools/horde-defense-farm.mjs';
import {requestComparisonCenterRepairs} from '../tools/horde-defense-actions.mjs';
import {createFarmDefensePolicy} from '../tools/farm-defense-policy.mjs';
import {HordeEntryDriver} from '../tools/horde-entry-driver.mjs';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
import {hitStructure} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
const text=name=>readFileSync(new URL('../tools/'+name,import.meta.url),'utf8');
function block(s,start,end){return s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start))).replace(/\r/g,'');}
test('Separate scenario preserves original productive, magic, hiring and finite plot policy source',()=>{
 const old=text('check_intensive_farm.mjs'),fresh=text('horde-defense-farm.mjs');
 for(const [start,end]of [[' const bounds=',' const daily='],[' const choosePlot=',' const act='],[' const hire=',' hire();collect();']])assert.equal(block(fresh,start,end),block(old,start,end));
 assert.ok(fresh.includes("actions+=requestComparisonCenterRepairs(s,{enabled:defenseEnabled,command,labourReserve,reserveMaintenance})"));
 assert.ok(fresh.includes("const defense=defenseEnabled?createFarmDefensePolicy():null"));
});
test('Both arms execute same legal initial seed and paid hiring without a simulation campaign',async()=>{
 const options={days:0,seed:712,biome:'sabana',culture:'mapungubwe',mixed:true},original=simulateIntensiveFarm(options),a=await simulateHordeDefenseFarm({...options,arm:'responsible'}),b=await simulateHordeDefenseFarm({...options,arm:'neglect'});
 assert.equal(serialize(a.state),serialize(original.state));assert.equal(serialize(b.state),serialize(original.state));assert.deepEqual(a.commands,b.commands);assert.equal(a.commands.filter(c=>c.kind==='plant').length,1);assert.equal(a.commands.filter(c=>c.kind==='hire').length,1);assert.ok(Object.values(a.state.ledger.entries).every(e=>e.d==='1'));assert.equal(a.repairSettlements.status,'verified');assert.equal(b.repairSettlements.status,'verified');auditIntensiveFarm(a);auditIntensiveFarm(b);
});
test('Centre-only loop ignores healthy wall, queues damaged centre without charging; neglect omits it',()=>{
 const {s,nav}=createOpeningWorld(),center=s.structures[0];assert.equal(Game.plant(s,'seed-test','mijo',center.x+5,center.z+6,nav),true);Game.openInitialHiring(s);Game.hire(s,'hire-test',{olderFemale:1});s.tutorial.step='done';
 Game.buildWallChain(s,'wall-test','adobe',[[center.x+10,center.z+10],[center.x+12,center.z+10]],nav,{smooth:false,snap:false});const walls=s.structures.filter(t=>t.kind==='wall');assert.ok(walls.length);assert.equal(walls[0].hp,300);
 hitStructure(center,40,s.elapsed);const before=numberOf(s.ledger.balance),actions=[];const opts={enabled:true,command:kind=>{const id=`test-${kind}`;actions.push(id);return id;},labourReserve:()=>30};
 assert.equal(requestComparisonCenterRepairs(s,opts),1);assert.equal(numberOf(s.ledger.balance),before);assert.equal(s.tasks.filter(t=>t.kind==='repair').length,1);assert.equal(s.tasks.find(t=>t.kind==='repair').targetId,center.id);assert.equal(Object.keys(s.ledger.entries).filter(k=>k.startsWith('repair:')).length,0);
 const snapshot=serialize(s);assert.equal(requestComparisonCenterRepairs(s,{...opts,enabled:false}),0);assert.equal(serialize(s),snapshot);
});
test('Wall policy ignores healthy owned walls and queues only actual sub80percent damage without request debit',()=>{
 const {s,nav}=createOpeningWorld(),center=s.structures[0];assert.equal(Game.plant(s,'seed-test','mijo',center.x+5,center.z+6,nav),true);Game.openInitialHiring(s);Game.hire(s,'hire-test',{olderFemale:1});s.tutorial.step='done';
 const defense=createFarmDefensePolicy({startDay:1,savingTarget:0});let seq=0;const opts={reserve:30,command:kind=>`defense-${kind}-${seq++}`};assert.ok(defense.act(s,nav,opts)>0);const owned=defense.report(s).built;assert.ok(owned);const walls=s.structures.filter(w=>owned.ids.includes(w.id));assert.ok(walls.length);assert.equal(s.tasks.filter(t=>t.kind==='repair').length,0);assert.equal(defense.act(s,nav,opts),0);
 hitStructure(walls[0],walls[0].maxHp*.3,s.elapsed);const before=numberOf(s.ledger.balance);assert.equal(defense.act(s,nav,opts),1);assert.equal(numberOf(s.ledger.balance),before);assert.equal(s.tasks.filter(t=>t.kind==='repair').length,1);assert.equal(s.tasks.find(t=>t.kind==='repair').targetId,walls[0].id);assert.equal(Object.keys(s.ledger.entries).filter(k=>k.startsWith('repair:')).length,0);
});
test('Outer driver waits on real worker without changing native clock or state and awaits disposal',async()=>{
 const {s,nav}=createOpeningWorld(),c=s.structures[0],eye={x:c.x+16,z:c.z+20};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,c);s.nightPlan={at:400,group:['warthog'],done:false};const before=serialize(s),driver=new HordeEntryDriver(nav,{maxWaitMilliseconds:7000});
 try{const reply=await driver.waitForEntry(s);assert.equal(reply.entry.entries.length,1);assert.equal(serialize(s),before);assert.equal(driver.report().mode,'real-node-worker-with-production-cooperative-fallback');assert.equal(driver.waits.length,1);assert.ok(driver.waits[0].waitMilliseconds>=0);}finally{await driver.dispose();}assert.equal(driver.preparer.disposed,true);
});
