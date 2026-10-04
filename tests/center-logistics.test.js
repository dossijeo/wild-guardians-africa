import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {centerFootprint,centerServicePoint} from '../src/world/centers.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createPlant} from '../src/simulation/crops.js';
import {translate} from '../public/i18n/catalog.js';

const clear={placement:()=>({valid:true,suppress:[]}),setState:()=>{},path:(_a,b)=>[{x:b.x,z:b.z}]};
function state(){
  const s=Game.newGame({seed:712,slotId:'center-logistics'});Game.resume(s,'intro');
  s.ledger.balance=rational(10000);s.postgame=true;s.day=101;s.completedNights=100;s.initialPreparation=false;s.tutorial.step='done';
  s.villages[0].x=14;s.villages.push({id:'village-2',culture:'suajili',x:30,z:0,buildings:[]});return s;
}
test('A new center chooses a reachable village by complete path distance rather than straight-line proximity',()=>{
  for(const kind of ['detour','blocked']){
    const s=state(),nav={...clear,path:(a,b)=>b.x===14?(kind==='blocked'?null:[{x:10,z:60},{x:b.x,z:b.z}]):clear.path(a,b)};
    Game.placeStructure(s,'center',{x:20,z:0},nav);
    assert.equal(s.structures[0].villageId,'village-2');assert.equal(s.structures[0].culture,'suajili');
    assert.equal(numberOf(s.ledger.balance),9200);
  }
});
test('No valid village route rejects a new center before debit, ID allocation, suppression or events',()=>{
  const s=state(),before=serialize(s);assert.throws(()=>Game.placeStructure(s,'center',{x:20,z:0},{...clear,path:()=>null}),/camino/);
  assert.equal(serialize(s),before);
});
test('Preview checks the selected culture hull and remains identical to committed native geometry',()=>{
  for(const culture of Game.CULTURES){
    const s=state();s.villages[1].culture=culture;
    const nav={...clear,path:(a,b)=>b.x===14?null:clear.path(a,b),placementFootprint:b=>({valid:true,suppress:[`cleared-${b.culture}`]})};
    const before=serialize(s),draft=Game.previewCenter(s,{x:20,z:0,yaw:.73},nav);
    assert.equal(draft.valid,true);assert.equal(draft.culture,culture);assert.equal(draft.villageId,'village-2');assert.equal(serialize(s),before);
    assert.deepEqual(draft.footprint,centerFootprint({kind:'center',x:20,z:0,yaw:.73,culture},s));
    Game.placeStructure(s,'center',{x:20,z:0,yaw:.73},nav);
    assert.equal(s.structures[0].culture,culture);assert.deepEqual(s.suppressed,[`cleared-${culture}`]);
    assert.deepEqual(centerFootprint(s.structures[0],s).footprint,draft.footprint.footprint);
    assert.equal(deserialize(serialize(s)).structures[0].culture,culture);
  }
});
test('Unbuildable culture hull or overlapping crops cannot be selected as a valid destination',()=>{
  const s=state(),nav={...clear,placementFootprint:b=>({valid:b.culture!=='suajili',reason:'La construcción solapa otro edificio'})};
  const draft=Game.previewCenter(s,{x:20,z:0},nav);assert.equal(draft.valid,true);assert.equal(draft.culture,'mapungubwe');
  const before=serialize(s);assert.throws(()=>Game.placeStructure(s,'center',{x:20,z:0},{...nav,placementFootprint:()=>({valid:false,reason:'La construcción solapa otro edificio'})}),/solapa/);assert.equal(serialize(s),before);
  s.plants.push(createPlant('existing-crop','mijo',20,0,null));const cropState=serialize(s);
  assert.equal(Game.previewCenter(s,{x:20,z:0},clear).reason,'Un cultivo ocupa este terreno');
  assert.throws(()=>Game.placeStructure(s,'overlap',{x:20,z:0},clear),/cultivo/);assert.equal(serialize(s),cropState);
});
function flat(){
  const nav=Object.create(Navigation.prototype);nav.field={blocked:()=>false,slope:()=>0};nav.obstacles=[];nav.suppressed=new Set();
  nav.walkCache=new Map();nav.segmentCache=new Map();nav.failedPaths=new Set();nav.closedRegions=new Map();nav.searchedRegions=[];nav.portalGraphs=new Map();
  nav.propsAt=()=>[];return nav;
}
test('Real Navigation validates the proposed building and preserves live collision caches during preview',()=>{
  const s=state();s.villages[1].culture='mapungubwe';const nav=flat();nav.setState(s);
  nav.obstacles.push({id:'barrier',kind:'house',x:15,z:0,footprint:[{x:14.9,z:-40},{x:15.1,z:-40},{x:15.1,z:40},{x:14.9,z:40}],radius:40});
  const before=serialize(s),references=['obstacles','suppressed','walkCache','segmentCache','failedPaths','closedRegions','searchedRegions','portalGraphs'].map(k=>nav[k]);
  const sizes=references.map(v=>v.size??v.length),version=nav.version;
  const draft=Game.previewCenter(s,{x:20,z:0},nav);assert.equal(draft.valid,true);assert.equal(draft.villageId,'village-2');
  ['obstacles','suppressed','walkCache','segmentCache','failedPaths','closedRegions','searchedRegions','portalGraphs'].forEach((k,i)=>assert.equal(nav[k],references[i]));
  assert.deepEqual(references.map(v=>v.size??v.length),sizes);assert.equal(nav.version,version);assert.equal(serialize(s),before);
  const pending=nav.forBuildingPlacement(draft.footprint,draft.suppress),departure=centerServicePoint(draft,s,.8);
  const route=pending.path(s.villages[1],departure,.28,null,true);assert.ok(route);
  let start=s.villages[1];for(const p of route){assert.ok(pending.segmentClear(start,p,.28,null,true));start=p;}
  assert.equal(pending.walkable(20,0,.28,null,true),false,'proposed center is a real navigation obstacle');
});
test('A worker from the selected village reaches, cares for a crop and returns along real collision-safe routes',()=>{
  const s=state();s.villages[1].culture='mapungubwe';
  s.villages[0].buildings.push({key:'barrier',kind:'Edificio',x:15,z:0,footprint:[{x:14.9,z:-40},{x:15.1,z:-40},{x:15.1,z:40},{x:14.9,z:40}],radius:40});
  const nav=flat();nav.setState(s);Game.placeStructure(s,'center',{x:20,z:0},nav);
  assert.equal(s.structures[0].villageId,'village-2');
  Game.plant(s,'crop','mijo',27,6,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  const w=s.workers[0];assert.equal(w.villageId,'village-2');assert.equal(w.x,30);
  for(let i=0;i<500;i++){
    const start={x:w.x,z:w.z};Game.tick(s,.5,nav);
    assert.ok(nav.segmentClear(start,w,.28,null,true));
  }
  assert.equal(s.plants[0].water[0].status,'manual');assert.ok(s.events.some(e=>e.type==='WaterSatisfied'));
  Game.tick(s,40,nav);assert.equal(w.status,'home');assert.equal(w.x,30);assert.equal(w.z,0);
  assert.equal(numberOf(s.ledger.balance),9106);assert.equal(s.crates.length,1);assert.equal(s.crates[0].delivered,true);
});
test('The unreachable-center command explains its failure in English and Spanish',()=>{
  const source='El centro no tiene un camino válido al poblado';
  assert.equal(translate(source,'en'),'The work center has no valid path to a village');assert.equal(translate(source,'es'),source);
});
