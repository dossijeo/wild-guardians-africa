import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {Navigation} from '../src/world/navigation.js';
import {villageLayout,findVillageEntry} from '../src/world/villages.js';
import {footprintsOverlap} from '../src/world/footprints.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';

const catalogue=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'));
const payload=culture=>catalogue.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));
function navigation(s,props=[]){
 const nav=new Navigation(712,'sabana',{});
 // Controlled flat terrain and explicit props isolate full native placement,
 // polygons, entry finding, routing and persistence from random biome sites.
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};
 nav.propsAt=(x,z,r)=>props.filter(p=>!nav.suppressed.has(p.id)&&Math.hypot(p.x-x,p.z-z)<r+8);
 nav.setState(s);return nav;
}
function fixture(culture='mapungubwe',balance=200000000){
 const s=Game.newGame({seed:712,culture,slotId:'qa-expansion-'+culture});Game.resume(s,'intro');
 s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';
 const v=s.villages[0];v.buildings=villageLayout(payload(culture),0,0);
 const nav=navigation(s);v.entry=findVillageEntry(nav,[],0,0); // Existing native layout is already in nav.obstacles.
 assert.ok(v.entry);s.ledger.balance=rational(10000);
 let center;for(let x=23;x<=80&&!center;x+=4){const p=Game.previewCenter(s,{x,z:0},nav);if(p.valid)center={x,z:0};}
 assert.ok(center,'native initial center has a legal connection');Game.placeStructure(s,'qa-base-center',center,nav);
 s.ledger.balance=rational(balance);return {s,nav};
}
function saved(s){const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};const repo=new SaveRepository(storage);repo.save(s);return repo.load(s.slotId);}

for(const culture of Game.CULTURES)test(`QA-142 ${culture}: paid native founding/reload and duplicate confirmation are idempotent`,()=>{
 const {s}=fixture(culture),draft=villageLayout(payload(culture),150,0);
 const props=draft.map((b,i)=>({id:`qa-bush:${culture}:${i}`,slot:5,radius:.1,x:b.footprint.reduce((n,p)=>n+p.x,0)/b.footprint.length,z:b.footprint.reduce((n,p)=>n+p.z,0)/b.footprint.length}));
 const nav=navigation(s,props),before=serialize(s),preview=Game.previewVillage(s,culture,150,0,payload(culture),nav);
 assert.equal(preview.valid,true);assert.equal(serialize(s),before);assert.equal(preview.cost,50000);assert.deepEqual(new Set(preview.suppress),new Set(props.map(p=>p.id)));
 assert.equal(Game.foundVillage(s,'qa-found',culture,150,0,payload(culture),nav),true);
 assert.equal(numberOf(s.ledger.balance),199950000);assert.equal(s.villages.length,2);
 assert.deepEqual(s.villages[1].buildings,preview.buildings);assert.deepEqual(s.villages[1].entry,preview.entry);assert.equal(s.villages[1].culture,culture);
 assert.equal(s.events.filter(e=>e.type==='VillageFounded').length,1);assert.equal(s.commandIds.filter(id=>id==='qa-found').length,1);
 assert.equal(new Set(s.suppressed).size,s.suppressed.length);assert.deepEqual(new Set(s.suppressed),new Set(props.map(p=>p.id)));
 const loaded=saved(s),fresh=navigation(loaded,props);assert.equal(serialize(loaded),serialize(s));assert.equal(fresh.propsAt(150,0,80).length,0);
 for(const [state,n] of [[s,nav],[loaded,fresh]]){
  const paid=serialize(state);assert.equal(Game.foundVillage(state,'qa-found',culture,150,0,payload(culture),n),false);assert.equal(serialize(state),paid);
  assert.equal(Game.previewVillage(state,culture,300,0,payload(culture),n).cost,75000);
 }
});

for(const culture of Game.CULTURES)test(`QA-138/140 ${culture}: one invalid native unit or spent preview funds cannot partially found`,()=>{
 const {s,nav}=fixture(culture,50000),native=payload(culture),layout=villageLayout(native,150,0);
 let badPoint;
 for(const b of layout){for(const point of b.footprint){nav.field.blocked=(x,z)=>Math.hypot(x-point.x,z-point.z)<.01;const bad=layout.filter(unit=>!nav.placementFootprint(unit).valid);if(bad.length===1){badPoint=point;break;}}if(badPoint)break;}
 assert.ok(badPoint,'exactly one unit is unbuildable');const before=serialize(s),preview=Game.previewVillage(s,culture,150,0,native,nav);
 assert.equal(preview.valid,false);assert.equal(preview.buildings.length,layout.length);assert.throws(()=>Game.foundVillage(s,'qa-invalid',culture,150,0,native,nav));assert.equal(serialize(s),before);
 nav.field.blocked=()=>false;assert.equal(Game.previewVillage(s,culture,150,0,native,nav).valid,true);
 Game.placeStructure(s,'qa-other-purchase',{kind:'wall',material:'adobe',x:100,z:100,yaw:0},nav);assert.equal(numberOf(s.ledger.balance),49965);
 const spent=serialize(s);assert.throws(()=>Game.foundVillage(s,'qa-unfunded',culture,150,0,native,nav),e=>e.code==='hiring-reserve');assert.equal(serialize(s),spent);
 assert.ok(!s.commandIds.includes('qa-invalid')&&!s.commandIds.includes('qa-unfunded'));assert.equal(s.villages.length,1);
});

for(const culture of Game.CULTURES)test(`QA-141 ${culture}: contiguous complete native villages are allowed without overlapping hulls`,()=>{
 const {s,nav}=fixture(culture),native=payload(culture),points=villageLayout(native,150,0).flatMap(b=>b.footprint);
 const xs=points.map(p=>p.x),shift=Math.max(...xs)-Math.min(...xs)+.05;
 const radius=Math.max(...points.map(p=>Math.hypot(p.x-150,p.z)));
 assert.ok(shift<2*radius,'aggregate bounding circles overlap: polygons govern validity');
 const first=Game.previewVillage(s,culture,150,0,native,nav);assert.equal(first.valid,true);Game.foundVillage(s,'qa-adjacent-a',culture,150,0,native,nav);
 const second=Game.previewVillage(s,culture,150+shift,0,native,nav);assert.equal(second.valid,true);
 for(const a of first.buildings)for(const b of second.buildings)assert.equal(footprintsOverlap(a.footprint,b.footprint),false);
 Game.foundVillage(s,'qa-adjacent-b',culture,150+shift,0,native,nav);assert.equal(s.villages.length,3);assert.equal(numberOf(s.ledger.balance),199875000);
 assert.equal(serialize(saved(s)),serialize(s));
});

test('QA-137: actually found villages through ordinal 100 with all five native cultures and exact uncapped costs',()=>{
 const {s,nav}=fixture(),milestones=new Map([[2,50000],[3,75000],[4,100000],[10,250000],[20,500000],[50,1250000],[100,2500000]]);let spent=0;
 let routeQueries=0;const path=nav.path.bind(nav);nav.path=(...args)=>{routeQueries++;return path(...args);};
 for(let ordinal=2;ordinal<=100;ordinal++){
  const i=ordinal-2,culture=Game.CULTURES[i%5],x=150+(i%10)*80,z=Math.floor(i/10)*80,native=payload(culture),before=numberOf(s.ledger.balance);
  const preview=Game.previewVillage(s,culture,x,z,native,nav);assert.equal(preview.valid,true,`ordinal ${ordinal}`);
  if(milestones.has(ordinal))assert.equal(preview.cost,milestones.get(ordinal));
  assert.equal(Game.foundVillage(s,'qa-ordinal-'+ordinal,culture,x,z,native,nav),true);spent+=preview.cost;
  assert.equal(s.villages.length,ordinal);assert.equal(before-numberOf(s.ledger.balance),preview.cost);assert.equal(numberOf(s.ledger.balance),200000000-spent);
  assert.equal(s.villages.at(-1).buildings.length,native.units.length);assert.equal(s.villages.at(-1).culture,culture);
  assert.equal(s.structures[0].villageId,'village-1','the reachable nearest home remains selected');
 }
 assert.equal(s.events.filter(e=>e.type==='VillageFounded').length,99);assert.equal(Object.keys(s.ledger.entries).filter(k=>k.startsWith('qa-ordinal-')).length,99);
 const loaded=saved(s);assert.equal(serialize(loaded),serialize(s));const fresh=navigation(loaded);assert.equal(Game.previewVillage(loaded,'mapungubwe',1200,0,payload('mapungubwe'),fresh).cost,2525000);
 assert.ok(routeQueries<=198,'native routing remains active while distant candidates are bounded');
 console.log('QA-137: '+JSON.stringify({villages:s.villages.length,routeQueries,spent,balance:numberOf(s.ledger.balance)}));
});


test('QA-139: switching all native cultures and repositioning previews never pays or suppresses props',()=>{
 const {s}=fixture(),props=[{id:'qa-draft-bush',slot:5,radius:.1,x:150,z:0}],nav=navigation(s,props),before=serialize(s),suppressed=[...nav.suppressed];
 for(const culture of Game.CULTURES)for(const [x,z] of [[150,0],[230,80],[0,0],[150,0]]){
  const preview=Game.previewVillage(s,culture,x,z,payload(culture),nav);
  assert.equal(preview.culture,culture);assert.equal(preview.x,x);assert.equal(preview.z,z);assert.equal(preview.buildings.length,payload(culture).units.length);
  assert.equal(serialize(s),before);assert.deepEqual([...nav.suppressed],suppressed);assert.equal(nav.propsAt(150,0,1).length,1);
 }
 assert.equal(s.villages.length,1);assert.equal(numberOf(s.ledger.balance),200000000);
});
