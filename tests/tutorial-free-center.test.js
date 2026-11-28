import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {FIRST_CENTER_RADIUS} from '../src/tutorial/center-placement.js';
const nav={field:{surface:()=>0},placement:()=>({valid:true,suppress:[]}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function fixture(){const s=Game.newGame({seed:712});Game.resume(s,'intro');s.tutorial.step='center';Object.assign(s.villages[0],{x:0,z:0,entry:{x:0,z:0},center:{x:10,z:0}});return s;}
test('first lesson accepts a legal center away from the suggested marker and advances',()=>{const s=fixture();const p={x:-12,z:8};assert.equal(Game.previewCenter(s,p,nav).valid,true);Game.placeStructure(s,'elsewhere',p,nav);assert.equal(s.tutorial.step,'plant');assert.equal(s.structures[0].x,p.x);assert.equal(s.structures[0].z,p.z);});
test('first lesson rejects distant placement without charge, then later centers are unrestricted by the lesson',()=>{const s=fixture(),p={x:FIRST_CENTER_RADIUS+2,z:0},money=JSON.stringify(s.ledger);assert.equal(Game.previewCenter(s,p,nav).valid,false);assert.throws(()=>Game.placeStructure(s,'far',p,nav),/cerca del poblado/);assert.equal(JSON.stringify(s.ledger),money);s.tutorial.step='done';assert.equal(Game.previewCenter(s,p,nav).valid,true);});
test('nearby tutorial center still needs legal terrain and routes',()=>{const s=fixture();assert.equal(Game.previewCenter(s,{x:12,z:8},{...nav,placement:()=>({valid:false,reason:'blocked'})}).valid,false);assert.equal(Game.previewCenter(s,{x:12,z:8},{...nav,path:()=>null}).valid,false);});

test("large authored plateau allows alternative nearby placements instead of forcing the marker",()=>{const s=fixture();s.villages[0].center={x:45,z:0};assert.equal(Game.previewCenter(s,{x:43,z:7},nav).valid,true);assert.equal(Game.previewCenter(s,{x:60,z:0},nav).valid,false);});
