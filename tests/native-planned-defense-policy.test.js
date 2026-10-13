import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {numberOf,rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {Navigation} from '../src/world/navigation.js';
import {wallStroke,WALL_UNIT} from '../src/world/wall-layout.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {createNativeCampaignPlots} from '../tools/native-campaign-plots.mjs';
import {animalBarrierCoversSlot,createNativePlannedDefensePolicy} from '../tools/native-planned-defense-policy.mjs';
import {parseNativeCampaignArgs} from '../tools/run_native_campaign.mjs';

function fixture(){
 const {s,nav}=createOpeningWorld(),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 let sequence=0;
 return {s,nav,center,options:{command:kind=>`planned-${kind}-${sequence++}`,reserve:160}};
}

test('persistent planned wall buys native pieces, closes with a worker gate, and survives ordinary ticks',()=>{
 const {s,nav,options}=fixture(),before=numberOf(s.ledger.balance);
 const policy=createNativePlannedDefensePolicy({startDay:1});
 let actions=0;
 for(let i=0;i<20&&!policy.report().completed;i++){
  actions+=policy.act(s,nav,options);s.elapsed+=6;
 }
 const report=policy.report(),walls=s.structures.filter(x=>x.kind==='wall');
 assert(report.completed,'native trace should be completed');
 assert.equal(report.planningCount,1);
 assert.equal(actions,report.builds);
 assert.equal(report.spent,before-numberOf(s.ledger.balance));
 assert.equal(report.spent,walls.length*10);
 assert.equal(walls.filter(w=>w.gate).length,1);
 const gate=walls.find(w=>w.gate),portals=gatePortalPoints(gate);
 assert(Math.abs(gate.z)<2,'the native automatic gate should lie on the village corridor');
 assert(nav.segmentClear(portals[0],portals[1],.28,null,true));
 const restored=deserialize(serialize(s));nav.setState(restored);
 assert.equal(restored.structures.filter(w=>w.kind==='wall').length,walls.length);
 assert.equal(restored.ledger.balance.n,s.ledger.balance.n);
});

test('an unfunded plan is retained without additional native wall placements',()=>{
 const {s,nav,options}=fixture(),policy=createNativePlannedDefensePolicy({startDay:1});
 options.reserve=numberOf(s.ledger.balance)-5;
 let placements=0;const original=nav.wallPlacement.bind(nav);
 nav.wallPlacement=(...args)=>{placements++;return original(...args);};
 assert.equal(policy.act(s,nav,options),0);
 const first=policy.report().plan;
 s.elapsed+=6;
 assert.equal(policy.act(s,nav,options),0);
 assert.equal(placements,0);
 assert.deepEqual(policy.report().plan,first);
 options.reserve=160;s.elapsed+=6;
 assert.equal(policy.act(s,nav,options),1);
 assert.equal(policy.report().plan.version,first.version);
});

test('a placement rejection without physical obstruction never becomes a completed perimeter',()=>{
 const {s,nav,options}=fixture(),policy=createNativePlannedDefensePolicy({startDay:1});
 assert.equal(policy.act(s,nav,options),1);
 const before=policy.report();assert(before.plan.paidPieces>0);
 const placement=nav.wallPlacement.bind(nav);
 nav.wallPlacement=wall=>wall.kind==='wall'?{valid:false,reason:'terrain obstacle'}:placement(wall);
 s.elapsed+=6;
 assert.equal(policy.act(s,nav,options),0);
 const after=policy.report();
 assert.equal(after.completed,null);
 assert.equal(after.stalls,1);
 assert(after.history.some(row=>row.kind==='trace-unsealed'&&row.other.length>0));
});

test('native animal clearance accepts full building, rock, river and cliff barriers but rejects a partial gap',()=>{
 const nav=new Navigation(712,'sabana',{}),slot={x:0,z:0,angle:0,scaleX:1};
 nav.field={canyon:false,slope:()=>0,fluidInside:()=>false,surface:()=>0};
 nav.propsAt=()=>[];nav.obstacles=[];
 const changed=()=>{nav.obstacleIndex=null;nav.invalidateGeometryQueries();};
 assert.equal(animalBarrierCoversSlot(nav,slot),false);
 nav.obstacles=[{id:'house',kind:'house',footprint:[{x:-2,z:-1},{x:2,z:-1},{x:2,z:1},{x:-2,z:1}]}];
 changed();
 assert.equal(animalBarrierCoversSlot(nav,slot),true);
 nav.obstacles=[];nav.propsAt=()=>[{id:'rock',slot:18,x:0,z:0,radius:2}];
 changed();
 assert.equal(animalBarrierCoversSlot(nav,slot),true);
 nav.propsAt=()=>[{id:'tree',slot:0,x:0,z:0,radius:2}];
 changed();
 assert.equal(animalBarrierCoversSlot(nav,slot),true);
 nav.propsAt=()=>[];nav.field.fluidInside=()=>true;
 changed();
 assert.equal(animalBarrierCoversSlot(nav,slot),true);
 nav.field={canyon:true,riverLevel:0,waterInfo:()=>({inside:false}),surface:x=>x>0?10:0,slope:()=>0};
 changed();
 assert.equal(animalBarrierCoversSlot(nav,slot),true);
 nav.field={canyon:false,slope:()=>0,fluidInside:x=>x<-.5,surface:()=>0};
 changed();
 assert.equal(animalBarrierCoversSlot(nav,slot),false,'a partial obstacle leaves an animal-sized path');
});

test('crop occupancy redirects only the affected contour side and never consumes or removes the crop',()=>{
 const {s,nav,options}=fixture(),policy=createNativePlannedDefensePolicy({startDay:1});
 policy.act(s,nav,options);const first=policy.report().plan;
 const slots=wallStroke(first.points,s.structures,{smooth:false,snap:false});
 const slot=slots[Math.floor(slots.length/3)];
 const crop={id:'late-crop',species:'mijo',x:slot.x,z:slot.z,alive:true,water:[]};
 s.plants.push(crop);
 for(let i=0;i<20&&!policy.report().history.some(row=>row.kind==='crop-side-detour');i++){s.elapsed+=6;policy.act(s,nav,options);}
 const report=policy.report(),detour=report.history.find(row=>row.kind==='crop-side-detour');
 assert(detour,'the blocked side should be adjusted after the late crop');
 assert(s.plants.includes(crop)&&crop.alive);
 assert(detour.bounds.some((value,i)=>value!==first.bounds[i]));
 for(let i=0;i<30&&!policy.report().completed;i++){s.elapsed+=6;policy.act(s,nav,options);}
 assert(policy.report().completed,'the shifted side should become a complete paid perimeter');
 const gate=s.structures.find(w=>w.gate),portals=gate&&gatePortalPoints(gate);
 assert.equal(portals?.length,2);
 assert(nav.segmentClear(portals[0],portals[1],.28,null,true));
});

test('a paid wall and a solid building form one physical perimeter with an accessible gate, then reopen when the building vanishes',()=>{
 const {s,nav,options}=fixture(),policy=createNativePlannedDefensePolicy({startDay:1});
 s.ledger.balance=rational(20000);options.reserve=19999;
 assert.equal(policy.act(s,nav,options),0);
 const first=policy.report().plan,slots=wallStroke(first.points,[],{smooth:false,snap:false});
 const side=slots.filter(slot=>Math.abs(slot.z-first.bounds[1])<.1),middle=side[Math.floor(side.length/2)];
 assert(middle);
 const building={key:'perimeter-building',kind:'Casa',x:middle.x,z:middle.z,radius:4,footprint:[
  {x:middle.x-3,z:middle.z-1.5},{x:middle.x+3,z:middle.z-1.5},
  {x:middle.x+3,z:middle.z+1.5},{x:middle.x-3,z:middle.z+1.5}]};
 s.villages[0].buildings.push(building);nav.setState(s);options.reserve=160;
 for(let i=0;i<35&&!policy.report().completed;i++){s.elapsed+=6;policy.act(s,nav,options);}
 const report=policy.report(),gate=s.structures.find(w=>w.gate);
 assert(report.completed,'a fully blocked building span can close the wall plan');
 assert(report.history.some(row=>row.kind==='trace-physical-closure'));
 assert(report.completed.barrierSlots.length>0);
 assert(gate&&gatePortalPoints(gate).length===2);
 const portals=gatePortalPoints(gate);
 assert(nav.segmentClear(portals[0],portals[1],.28,null,true));
 assert.equal(nav.segmentClear({x:building.x,z:building.z-5},{x:building.x,z:building.z+5},.85,null,false),false);
 s.villages[0].buildings=[];nav.setState(s);s.elapsed+=6;policy.act(s,nav,options);
 assert(policy.report().history.some(row=>row.kind==='physical-barrier-opened'));
});

test('planning observes new crop events after the rolling event buffer reaches 200 entries',()=>{
 const {s,nav,options}=fixture(),policy=createNativePlannedDefensePolicy({startDay:1});
 for(let i=0;i<20&&!policy.report().completed;i++){policy.act(s,nav,options);s.elapsed+=6;}
 assert(policy.report().completed);
 while(s.events.length<200)Game.emit(s,'Unrelated');
 policy.observe(s);
 const bounds=policy.report().completed.bounds,id='outside-test-crop';
 s.plants.push({id,x:bounds[2]+4,z:0,alive:true});
 Game.emit(s,'CropPlaced',{targetId:id});
 assert.equal(s.events.length,200);
 policy.observe(s);
 assert.equal(policy.report().needsExpansion,true);
});

test('a previously validated plot reuses access only until native geometry changes',()=>{
 const {s,nav}=fixture(),plots=createNativeCampaignPlots(nav,()=>s,{reuseAccess:true});
 const first=plots.choose();assert(first);
 const checked=plots.report().accessChecks;
 const again=plots.choose();assert.deepEqual([again.x,again.z],[first.x,first.z]);
 assert.equal(plots.report().accessChecks,checked);
 assert(plots.report().accessCacheHits>=1);
 nav.invalidateGeometryQueries();
 assert(plots.choose());
 assert(plots.report().accessChecks>checked);
});

test('campaign modes are explicit; old runner remains the persistence reference',()=>{
 const args=['--out','planned-qa','--campaign-mode','balance','--defense-policy','planned','--defense-start-day','6'];
 const planned=parseNativeCampaignArgs(args);
 assert.equal(planned.campaignMode,'balance');assert.equal(planned.defensePolicy,'planned');
 const reference=parseNativeCampaignArgs(['--out','reference-qa']);
 assert.equal(reference.campaignMode,'persistence');
 assert.throws(()=>parseNativeCampaignArgs(['--out','qa','--campaign-mode','unknown']));
});
