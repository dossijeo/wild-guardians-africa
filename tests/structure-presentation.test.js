import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {hitStructure} from '../src/simulation/rules.js';
import {wallVisualAt} from '../src/simulation/structure-presentation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const wall=()=>({id:'qa-wall',kind:'wall',material:'zarzas',gate:false,x:0,z:0,hp:100,maxHp:100,status:'intact',collapseRemaining:0});
test('successive impacts latch native cubic fade and collapse origin using simulated time without any renderer',()=>{
 const e=wall();hitStructure(e,40,10);assert.equal(wallVisualAt(e,10),1);assert.ok(Math.abs(wallVisualAt(e,10.24)-.65)<1e-12);
 hitStructure(e,40,10.24);assert.equal(e.status,'collapsing');assert.ok(Math.abs(e.wallPresentation.collapseFrom-.65)<1e-12);assert.equal(e.wallPresentation.at,10.24);
 const before=JSON.stringify(e);assert.equal(hitStructure(e,40,11),false);assert.equal(JSON.stringify(e),before);e.collapseRemaining=.7;assert.ok(Math.abs(wallVisualAt(e,10.94)-.325)<1e-12);
});
test('legacy version-1 damage and collapse snapshots retain their original ratio fallback',()=>{
 const s=Game.newGame({seed:712}),e=wall();s.structures.push(e);e.hp=20;e.status='collapsing';e.collapseRemaining=.7;
 const copy=deserialize(serialize(s));assert.equal(wallVisualAt(copy.structures[0],s.elapsed),.1);assert.equal(copy.structures[0].wallPresentation,undefined);
});
test('snapshot rejects malformed or contradictory presentation state without inventing a new save version',()=>{
 for(const change of [e=>e.wallPresentation=null,e=>e.wallPresentation.from=-.01,e=>e.wallPresentation.from=NaN,e=>e.wallPresentation.to=1.01,e=>e.wallPresentation.at=-1,e=>e.wallPresentation.at=11,e=>e.wallPresentation.collapseFrom=.5,e=>e.status='collapsing',e=>e.kind='center']){
  const s=Game.newGame({seed:712});s.elapsed=10;const e=wall();hitStructure(e,40,10);s.structures.push(e);change(e);assert.throws(()=>serialize(s),/Wall presentation invalid/);
 }
 const s=Game.newGame({seed:712});s.elapsed=10;const e=wall();hitStructure(e,80,10);s.structures.push(e);for(const value of [-.01,1.01,NaN,'0.5']){e.wallPresentation.collapseFrom=value;assert.throws(()=>serialize(s),/Wall presentation invalid/);}
});
