import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {rational} from '../src/simulation/money.js';
import {stableProspectiveWallPlan as stable} from '../tools/stable-prospective-wall-plan-candidate.mjs';
const options={smooth:false,snap:false},square=[[0,0],[8,0],[8,8],[0,8],[0,0]];
function fixture(canyon=false){
 const s=Game.newGame({seed:712,biome:canyon?'gran-canon':'sabana'}),nav=new Navigation(712,s.biome,{});
 nav.field={canyon,riverLevel:0,surface:()=>0,slope:()=>0,blocked:()=>false,fluidInside:x=>canyon&&x>=9,waterInfo:x=>({inside:canyon&&x>=9,level:0})};nav.propsAt=()=>[];nav.setState(s);
 Game.resume(s,'intro');s.ledger.balance=rational(20000);s.villages[0].entry={x:-4,z:4};
 Game.placeStructure(s,'center',{x:-10,z:-10},nav);Game.plant(s,'crop','mijo',4,4,nav);
 return {s,nav};
}
test('native hires change virtual IDs but actual paid wall IDs, gates and ledger remain exact',()=>{
 const baseline=fixture(),candidate=fixture();candidate.s.slotId=baseline.s.slotId;
 const first=Game.quoteWallChain(candidate.s,'zarzas',square,candidate.nav,options);stable(candidate.s,candidate.nav,first);
 for(const f of [baseline,candidate]){Game.openInitialHiring(f.s);Game.hire(f.s,'hire',{olderFemale:2});}
 const native=Game.quoteWallChain(candidate.s,'zarzas',square,candidate.nav,options),before=serialize(candidate.s);
 assert.notEqual(native.pieces[0].id,first.pieces[0].id);
 assert.deepEqual(stable(candidate.s,candidate.nav,native),first);assert.equal(serialize(candidate.s),before);
 for(const f of [baseline,candidate])assert(Game.buildWallChain(f.s,'paid-chain','zarzas',square,f.nav,options));
 assert.equal(serialize(candidate.s),serialize(baseline.s));
 assert(candidate.s.structures.some(p=>p.id===native.pieces[0].id));
 assert.equal(candidate.s.ledger.entries['paid-chain'].n,String(-native.cost));
 const after=Game.quoteWallChain(candidate.s,'zarzas',square,candidate.nav,options);assert.equal(stable(candidate.s,candidate.nav,after),after);
});
test('native removal and mixed-material reconstruction invalidate old virtual aliases without adding a second gate',()=>{
 const f=fixture();Game.buildWallChain(f.s,'ring','zarzas',square,f.nav,options);
 const gate=f.s.structures.find(p=>p.autoGate),wall=f.s.structures.find(p=>p.kind==='wall'&&!p.gate);assert(gate&&wall);
 const nativeQuote=()=>Game.quoteWallChain(f.s,'piedra',square,f.nav,options);
 stable(f.s,f.nav,nativeQuote());Game.removeWall(f.s,'remove-piece',wall.id,f.nav);
 const afterRemoval=nativeQuote(),before=serialize(f.s);assert.equal(stable(f.s,f.nav,afterRemoval),afterRemoval);assert.equal(serialize(f.s),before);
 assert(afterRemoval.pieces.length>0);assert(Game.buildWallChain(f.s,'mixed-rebuild','piedra',square,f.nav,options));
 assert.equal(f.s.structures.filter(p=>p.autoGate).length,1);assert(f.s.structures.some(p=>p.material==='piedra'));assert(f.s.structures.some(p=>p.material==='zarzas'));
 assert.equal(f.s.ledger.entries['mixed-rebuild'].n,String(-afterRemoval.cost));
 const saved=serialize(f.s),restored=deserialize(saved);assert.equal(serialize(restored),saved);
 f.nav.setState(restored);const reloaded=serialize(restored),quote=Game.quoteWallChain(restored,'piedra',square,f.nav,options);assert.equal(stable(restored,f.nav,quote),quote);
 assert.equal(serialize(restored),reloaded);
});
test('native river closure retains the chosen gate and aliases never become actual purchase identifiers',()=>{
 const f=fixture(true),path=[[10,0],[0,0],[0,8],[10,8]];
 const first=Game.quoteWallChain(f.s,'zarzas',path,f.nav,options);assert.equal(first.gates,1);stable(f.s,f.nav,first);
 Game.openInitialHiring(f.s);Game.hire(f.s,'river-hire',{olderFemale:1});
 const next=Game.quoteWallChain(f.s,'zarzas',path,f.nav,options),aliased=stable(f.s,f.nav,next);assert.deepEqual(aliased,first);
 assert(Game.buildWallChain(f.s,'river-build','zarzas',path,f.nav,options));
 const walls=f.s.structures.filter(p=>p.kind==='wall');assert.equal(walls.filter(p=>p.autoGate).length,1);assert(walls.every(p=>p.x<10));
 assert.deepEqual(walls,next.pieces);assert.equal(f.s.ledger.entries['river-build'].n,String(-next.cost));
 assert(f.nav.path(f.s.villages[0].entry,f.s.plants[0],.28,null,true));
});
