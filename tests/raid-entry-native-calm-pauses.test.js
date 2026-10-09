import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
test('Native QA-010 calm night preserves existing growth and pending water tolerance',()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana'}),c=s.structures[0];assert.equal(Game.plant(s,'banana-clock','platano',c.x+5,c.z+6,nav),true);
 const p=s.plants[0];p.growth=p.water[1].at;p.water[0].status='manual';p.water[1].status='due';p.water[1].wait=13.75;
 s.initialPreparation=false;s.tutorial.step='done';s.time=300;s.dayPlan={done:true};s.nightPlan={at:Infinity,done:true,group:[]};const before=JSON.stringify(p);Game.advanceReal(s,60,nav);assert.equal(s.day,2);assert.equal(JSON.stringify(p),before);
});
test('Native QA-007/014 real advances preserve state until every blocking pause clears',()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana'});s.initialPreparation=false;s.tutorial.step='done';Game.pause(s,'menu');Game.pause(s,'hidden');let before=serialize(s);Game.advanceReal(s,1800,nav);assert.equal(serialize(s),before);
 Game.resume(s,'hidden');before=serialize(s);Game.advanceReal(s,1800,nav);assert.equal(serialize(s),before);Game.resume(s,'menu');Game.advanceReal(s,.02,nav);assert.ok(Math.abs(s.time-.02)<1e-8);
});
