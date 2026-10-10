import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {ownedWallStateCounts} from '../tools/horde-defense-terminal-derivative.mjs';
test('Actually paid fullHP wall is intact, not ruined by centre-only operational predicate',()=>{
 const {s,nav}=createOpeningWorld(),c=s.structures[0];Game.buildWallChain(s,'paid-walls','zarzas',[[c.x+10,c.z+10],[c.x+12,c.z+10]],nav,{smooth:false,snap:false});
 const walls=s.structures.filter(w=>w.kind==='wall');assert.ok(walls.length);assert.ok(s.ledger.entries['paid-walls']);const before=serialize(s),r=ownedWallStateCounts(s,{ids:walls.map(w=>w.id)});
 assert.equal(r.intact,walls.length);assert.equal(r.fullHp,walls.length);assert.equal(r.ruined,0);assert.equal(serialize(s),before);
});
test('Status categories, missing IDs and centre IDs remain separate without mutation',()=>{
 const s={structures:[{id:'a',kind:'wall',status:'intact',hp:60,maxHp:60,gate:true},{id:'b',kind:'wall',status:'ruined',hp:0,maxHp:100},{id:'c',kind:'wall',status:'collapsing',hp:1,maxHp:100},{id:'d',kind:'center',status:'intact',hp:600,maxHp:600}]},before=JSON.stringify(s);
 const r=ownedWallStateCounts(s,{ids:['a','b','c','d','missing']});assert.equal(r.intact,1);assert.equal(r.ruined,1);assert.equal(r.collapsing,1);assert.equal(r.nonWall,1);assert.equal(r.missing,1);assert.equal(r.gates,1);assert.equal(r.fullHp,1);assert.equal(JSON.stringify(s),before);
});
