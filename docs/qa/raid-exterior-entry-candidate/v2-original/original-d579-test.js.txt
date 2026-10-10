import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {cameraRaidEntry,chooseRaidEntry,spawnRaid,reachableApproach} from '../src/simulation/raids.js';
import {raidExteriorRegions,outsideRaidRegions,exteriorRaidEntry} from '../src/world/raid-exterior.js';
import {raidEntryRequest,raidEntryKey} from '../src/world/raid-entry-data.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {animalSpec} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
const options={smooth:false,snap:false},points=[[85,6.2],[92,6.2],[92,17],[85,17],[85,6.2]];
const specs=group=>group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
function fixture(mixed=false){
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'saheliana'});
 assert.equal(Game.plant(s,'crop','mijo',88,9,nav),true);
 if(mixed){assert.equal(Game.buildWallChain(s,'first','zarzas',points.slice(0,4),nav,options),true);assert.equal(Game.buildWallChain(s,'close','empalizada',points.slice(3),nav,options),true);}
 else assert.equal(Game.buildWallChain(s,'walls','zarzas',points,nav,options),true);
 nav.setActiveBounds([-24,-120,216,120]);nav.setRaidView({x:88,z:9},{x:88,z:6.5});return {s,nav};
}
function legal(s,nav,group,entry){
 assert.ok(exteriorRaidEntry(s,nav,specs(group),entry));
 entry.entries.forEach((p,i)=>{const r=specs(group)[i].radius,e=entry.exits[i];assert.ok(nav.walkable(p.x,p.z,r,null,false));assert.ok(nav.walkable(e.x,e.z,r,null,false));assert.ok(nav.segmentClear(p,e,r,null,false));assert.ok(nav.segmentClear(e,p,r,null,false));for(let j=0;j<i;j++)assert.ok(Math.hypot(p.x-entry.entries[j].x,p.z-entry.entries[j].z)>r+specs(group)[j].radius+1);});
}
test('paid17-piece enclosure: direct and prepared select exterior close legal approaches without changing RNG',()=>{
 const {s,nav}=fixture(),group=['warthog'];Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});assert.equal(numberOf(s.ledger.balance),495);
 const before=serialize(s),start=performance.now(),entry=cameraRaidEntry(s,specs(group),nav.activeBounds,nav),ms=performance.now()-start;
 legal(s,nav,group,entry);assert.ok(Math.hypot(entry.entries[0].x-88,entry.entries[0].z-9)<20);
 const actor={species:'warthog',radius:1.1,...entry.entries[0]};assert.ok(s.structures.filter(p=>p.kind==='wall').some(w=>reachableApproach(actor,w,nav)));assert.equal(reachableApproach(actor,s.plants[0],nav),null);
 const request=raidEntryRequest(s,nav,group,raidEntryKey(s,nav,group),1),reply=computeRaidEntry(request);legal(s,nav,group,reply.entry);assert.deepEqual(reply.entry,entry);assert.equal(serialize(s),before);console.log(JSON.stringify({scope:'CPU observation, not frame/GPU acceptance',cameraMilliseconds:ms,entry}));
});
test('mixed paid walls, removal/reclosure and save/reload invalidate protected region ownership',()=>{
 const {s,nav}=fixture(true),radius=1.1,inside={x:88,z:12.1},old=raidExteriorRegions(s,nav,radius);
 assert.equal(outsideRaidRegions(inside,radius,old),false);assert.equal(s.structures.filter(p=>p.autoGate).length,1);
 const wall=s.structures.find(p=>p.kind==='wall'&&!p.gate&&p.baseScaleX>=.99);assert.ok(wall);
 assert.equal(Game.removeWall(s,'remove',wall.id,nav),true);const opened=raidExteriorRegions(s,nav,radius);assert.notEqual(opened,old);assert.equal(outsideRaidRegions(inside,radius,opened),true);
 assert.equal(Game.placeStructure(s,'rebuild',{kind:'wall',material:wall.material,x:wall.x,z:wall.z,yaw:wall.yaw},nav),true);assert.equal(outsideRaidRegions(inside,radius,raidExteriorRegions(s,nav,radius)),false);assert.equal(s.structures.filter(p=>p.autoGate).length,1);
 const loaded=deserialize(serialize(s)),restored=new Navigation(s.seed,s.biome,nav.profile);restored.setState(loaded);restored.setActiveBounds(nav.activeBounds);restored.setRaidView(nav.raidView.eye,nav.raidView.target);
 assert.deepEqual(raidExteriorRegions(loaded,restored,radius),raidExteriorRegions(s,nav,radius));legal(loaded,restored,['warthog'],cameraRaidEntry(loaded,specs(['warthog']),restored.activeBounds,restored));
});
test('interior prepared reply is refused at actual spawn with unchanged allocation/RNG versus native direct spawn',()=>{
 const {s,nav}=fixture(),group=['warthog'],reference=deserialize(serialize(s)),other=new Navigation(s.seed,s.biome,nav.profile);other.setState(reference);other.setActiveBounds(nav.activeBounds);other.setRaidView(nav.raidView.eye,nav.raidView.target);
 nav.preparedRaidEntry=()=>({entry:{entries:[{x:88,z:12.1}],exits:[{x:88,z:15.1}]}});
 spawnRaid(s,{group},nav);spawnRaid(reference,{group},other);assert.ok(s.raid);assert.equal(serialize(s),serialize(reference));assert.ok(exteriorRaidEntry(s,nav,specs(group),{entries:s.raid.animals.map(a=>a.spawn),exits:s.raid.animals.map(a=>a.exit)}));
});
test('twelve full-size bodies keep whole-group separation and reversible exterior escape',()=>{
 const {s,nav}=fixture(),group=['warthog','warthog','warthog','warthog','hyena','hyena','hyena','buffalo','buffalo','lion','lion','rhino'];
 const before=serialize(s),start=performance.now(),entry=chooseRaidEntry(s,specs(group),nav.activeBounds,0,nav);legal(s,nav,group,entry);assert.equal(serialize(s),before);console.log(JSON.stringify({scope:'entry-only CPU observation; no horde gameplay activated',milliseconds:performance.now()-start,entry}));
});
test('native Canyon cliff boundary participates, without manufacturing omitted river edges',()=>{
 const {s,nav}=createOpeningWorld({biome:'gran-canon'}),stroke=[[-25,-8],[-40,-8],[-40,8],[-25,8]];
 assert.equal(Game.buildWallChain(s,'cliff','zarzas',stroke,nav,options),true);assert.equal(s.structures.filter(p=>p.autoGate).length,1);
 const before=serialize(s),regions=raidExteriorRegions(s,nav,1.1);assert.ok(regions.length>0);assert.equal(outsideRaidRegions({x:-34,z:0},1.1,regions),false);assert.equal(serialize(s),before);
});
