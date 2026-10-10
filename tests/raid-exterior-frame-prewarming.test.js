import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {createRaidExteriorFramePrewarming} from '../src/world/raid-exterior-frame-prewarming.js';
import {raidExteriorDiagnostics,hasRaidExteriorGeometry,createRaidExteriorQuery} from '../src/world/raid-exterior.js';
import {CANONICAL_RAID_RADII} from '../src/world/raid-exterior-prewarming.js';
import {spawnRaid} from '../src/simulation/raids.js';
const opts={smooth:false,snap:false},points=[[85,6.2],[92,6.2],[92,17],[85,17],[85,6.2]];
function fixture(kind='closed'){
 const canyon=kind==='canyon',{s,nav}=createOpeningWorld({seed:712,biome:canyon?'gran-canon':'sabana',culture:canyon?'mapungubwe':'saheliana'});
 if(canyon){assert.ok(Game.buildWallChain(s,'nativeclosed','zarzas',[[-22,24],[-34,24],[-34,36],[-22,36]],nav,opts));nav.setActiveBounds([-120,-120,120,120]);nav.setRaidView({x:-30,z:26},{x:-30,z:24});}
 else {assert.ok(Game.plant(s,'crop','mijo',88,9,nav));if(kind==='mixed'){assert.ok(Game.buildWallChain(s,'first','zarzas',points.slice(0,4),nav,opts));assert.ok(Game.buildWallChain(s,'close','empalizada',points.slice(3),nav,opts));}else assert.ok(Game.buildWallChain(s,'walls','zarzas',points,nav,opts));nav.setActiveBounds([-24,-120,216,120]);nav.setRaidView({x:88,z:9},{x:88,z:6.5});}
 assert.ok(s.structures.some(p=>p.kind==='wall'&&p.autoGate));return {s,nav};
}
function clone(s,nav){const state=deserialize(serialize(s)),other=new Navigation(s.seed,s.biome,nav.profile);other.setState(state);other.setActiveBounds(nav.activeBounds);other.setRaidView(nav.raidView.eye,nav.raidView.target);return {s:state,nav:other};}
function finish(controller,state){let frames=0;do{controller.frame(state);}while(controller.geometry.status==='working'&&++frames<20000);assert.equal(controller.geometry.status,'prepared',controller.geometry.lastError);return frames+1;}
test('OFF is allocation/hook free; actual WorldScene load/render/dispose connections remain explicit',()=>{
 const {nav}=fixture(),before=nav.preparedRaidEntry;for(const enabled of [undefined,false,1,'true'])assert.equal(createRaidExteriorFramePrewarming(nav,{enabled}),undefined);assert.equal(nav.preparedRaidEntry,before);
 const source=readFileSync(new URL('../src/rendering/scene.js',import.meta.url),'utf8');
 assert.ok(source.includes('raidExteriorPrewarming=false'));assert.ok(source.includes('this.raidExteriorFramePrewarming=createRaidExteriorFramePrewarming(this.nav,{enabled:raidExteriorPrewarming});'));
 assert.ok(source.includes('this.raidExteriorFramePrewarming?.frame(this.state);this.syncChunks();yield;'));assert.ok(source.includes('this.raidExteriorFramePrewarming?.dispose();this.raidEntryPreparer?.dispose();'));
});
for(const kind of ['closed','mixed','canyon'])test(`${kind}: frame-owned continuation adopts whole geometry and native deadline spawn matches cold control`,()=>{
 const {s,nav}=fixture(kind),control=clone(s,nav),before=serialize(s),controller=createRaidExteriorFramePrewarming(nav,{enabled:true});
 const frames=finish(controller,s);assert.equal(serialize(s),before);assert.deepEqual(raidExteriorDiagnostics(nav),{builds:0,adoptions:1});assert.ok(hasRaidExteriorGeometry(s,nav,CANONICAL_RAID_RADII));
 for(const r of CANONICAL_RAID_RADII)assert.deepEqual(createRaidExteriorQuery(s,nav).regionsFor(r),createRaidExteriorQuery(control.s,control.nav).regionsFor(r));
 // Ordinary native allocation at the same deadline; no fake ready reply,
 // no frame-driven clock advance or skipped/deferred plan.
 spawnRaid(s,{group:['warthog']},nav);spawnRaid(control.s,{group:['warthog']},control.nav);assert.ok(s.raid);assert.equal(serialize(s),serialize(control.s));assert.equal(controller.stats.warmGeometryFallbacks,1);assert.equal(controller.stats.coldGeometryFallbacks,0);
 console.log(JSON.stringify({scope:'CPU frame-hook driver, no RAF/GPU/deadline performance acceptance',kind,frames,stats:controller.stats,geometry:controller.geometry.stats,deadline:controller.deadlines[0]}));controller.dispose();
});
test('cold deadline fallback is explicit and preserves spawn/RNG rather than pausing or discarding it',()=>{
 const {s,nav}=fixture(),control=clone(s,nav),controller=createRaidExteriorFramePrewarming(nav,{enabled:true,maxSteps:1});controller.frame(s);assert.equal(controller.geometry.status,'working');assert.equal(raidExteriorDiagnostics(nav).adoptions,0);
 spawnRaid(s,{group:['warthog']},nav);spawnRaid(control.s,{group:['warthog']},control.nav);assert.ok(s.raid);assert.equal(serialize(s),serialize(control.s));assert.equal(controller.stats.coldGeometryFallbacks,1);assert.equal(controller.deadlines[0].fallback,'native-sync-entry-cold-geometry');controller.dispose();
});
test('camera/group edits preserve geometry job; paid wall removal invalidates and dispose cannot restore stale ownership',()=>{
 const {s,nav}=fixture('mixed'),delegate=()=>undefined;nav.preparedRaidEntry=delegate;const controller=createRaidExteriorFramePrewarming(nav,{enabled:true,maxSteps:1});controller.frame(s);const token=controller.geometry.pending.token;
 nav.setRaidView({x:90,z:9},{x:88,z:6.5});s.nightPlan={group:['hyena'],done:false,at:400};controller.frame(s);assert.equal(controller.geometry.pending.token,token);
 const wall=s.structures.find(p=>p.kind==='wall'&&!p.autoGate);assert.ok(Game.removeWall(s,'edit',wall.id,nav));controller.frame(s);assert.notEqual(controller.geometry.pending.token,token);assert.equal(controller.geometry.stats.aborted,1);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);
 controller.maxSteps=128;finish(controller,s);const adopted=raidExteriorDiagnostics(nav).adoptions;controller.dispose();assert.equal(nav.preparedRaidEntry,delegate);controller.frame(s);assert.equal(raidExteriorDiagnostics(nav).adoptions,adopted);
 const second=createRaidExteriorFramePrewarming(nav,{enabled:true});const newOwner=()=>undefined;nav.preparedRaidEntry=newOwner;second.dispose();assert.equal(nav.preparedRaidEntry,newOwner);
});
test('prepared delegate result is returned unchanged; lifecycle cancellation leaves all simulated clocks and state intact',()=>{
 const {s,nav}=fixture(),ready=Object.freeze({entry:'diagnostic delegate only'});nav.preparedRaidEntry=()=>ready;const controller=createRaidExteriorFramePrewarming(nav,{enabled:true,maxSteps:1}),before=serialize(s);controller.frame(s);
 assert.equal(nav.preparedRaidEntry(s,['warthog'],nav.activeBounds),ready);assert.equal(controller.stats.preparedEntries,1);assert.equal(serialize(s),before);
 const state={...s,result:'victory'};controller.frame(state);assert.equal(controller.geometry.pending,null);assert.equal(controller.geometry.status,'cancelled');assert.equal(serialize(s),before);controller.dispose();
});
