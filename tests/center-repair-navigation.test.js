import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function fixture(){
 const s=Game.newGame({seed:712});Game.resume(s,'intro');s.tutorial.step='done';
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:10,z:0},nav);const center=s.structures.at(-1);center.hp=470;
 Game.plant(s,'crop-a','mijo',30,10,nav);Game.plant(s,'crop-b','mijo',35,10,nav);
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:3});s.dayPlan.done=true;
 Game.requestRepair(s,'repair-center',center.id);
 return {s,nav,center};
}
test('paid physical centre repair keeps unchanged topology and unrelated worker routes',()=>{
 const {s,nav,center}=fixture(),version=nav.version,caches=[nav.walkCache,nav.segmentCache,nav.portalGraphs,nav.obstacles];
 let completed=false;
 for(let i=0;i<6000&&!completed;i++){
  Game.tick(s,.05,nav);completed=s.events.some(e=>e.type==='RepairApplied');
 }
 assert.ok(completed);const event=s.events.find(e=>e.type==='RepairApplied');
 assert.equal(event.repair.paidCoins,174);assert.equal(s.ledger.entries[event.repair.paymentId].n,'-174');assert.equal(center.hp,600);
 assert.equal(nav.version,version);assert.equal(s.navigationVersion,version);
 [nav.walkCache,nav.segmentCache,nav.portalGraphs,nav.obstacles].forEach((cache,i)=>assert.equal(cache,caches[i]));
 assert.ok(s.workers.some(w=>w.taskId&&w.pathVersion===version&&w.path?.length));
 const loaded=deserialize(serialize(s)),fresh=new Navigation(712,'sabana',{});fresh.field=nav.field;fresh.propsAt=()=>[];fresh.setState(loaded);
 assert.equal(fresh.version,version);assert.equal(serialize(loaded),serialize(s));
 const start={x:-20,z:0},end={x:30,z:10};assert.deepEqual(nav.path(start,end,.28,null,true),fresh.path(start,end,.28,null,true));
});
test('reconstruction, changed footprint and replaced save still invalidate navigation',()=>{
 for(const mode of ['ruined','collapsing','moved','loaded']){
  const {s,nav,center}=fixture(),version=nav.version,old=nav.obstacles;
  let state=s,target=center,previousStatus=mode==='ruined'||mode==='collapsing'?mode:'intact';
  if(mode==='moved')target.x+=2;
  if(mode==='loaded'){state=deserialize(serialize(s));target=state.structures.find(e=>e.id===center.id);}
  target.hp=target.maxHp;target.status='intact';nav.syncCenterRepair(state,target,previousStatus);
  assert.equal(nav.version,version+1,mode);assert.notEqual(nav.obstacles,old,mode);assert.equal(nav.state,state);
 }
});
