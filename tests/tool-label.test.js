import test from 'node:test';
import assert from 'node:assert/strict';
import {toolLabel} from '../src/app/tool-label.js';
import {BALANCE as B} from '../src/simulation/balance.js';
test('village placement feedback cannot fall through to an absent spell lookup',()=>{
 assert.equal(toolLabel({kind:'village',culture:'musgum'}),'Fundar poblado');
 assert.equal(toolLabel(null),'');assert.equal(toolLabel({kind:'unknown'}),'');
 for(const spell of B.spells)assert.ok(toolLabel({kind:'spell',spell:spell.id}).includes(spell.name));
 for(const crop of B.crops)assert.ok(toolLabel({kind:'plant',species:crop.id}).includes(String(crop.plant_cost)));
 assert.ok(toolLabel({kind:'wall',material:'adobe'}).includes('muralla'));
 assert.ok(toolLabel({kind:'wall',material:'adobe',gate:true}).includes('puerta'));
 assert.ok(toolLabel({kind:'center'}).includes('centro'));
});

import {resumeLoadedWorld} from '../src/app/resume-loaded-world.js';
test('reloading recovers a disposed-world runtime error while preserving blocking gameplay pauses',()=>{
 const state={pauses:['runtime-error','menu','hidden','context-lost','hiring','tutorial-reading','manual'],balance:200000};
 resumeLoadedWorld(state);assert.deepEqual(state.pauses,['hiring','tutorial-reading','manual']);assert.equal(state.balance,200000);
 resumeLoadedWorld(state);assert.deepEqual(state.pauses,['hiring','tutorial-reading','manual']);
});
