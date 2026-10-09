import test from 'node:test';import assert from 'node:assert/strict';
import {denseWorldInputsUnchanged} from './lib/frontside-dense-world-gpu-runner.mjs';
test('dense timing fairness accepts identical live instance/rig receipt and rejects changed growth or rig pose',()=>{
 const source={instances:[{id:'native-maize',count:1257,matrix:{fnv32:'matrix'},growth:{fnv32:'growth'}}],rigs:[{id:'worker',pose:{fnv32:'pose'},matrixWorld:[1,0,0,0]}]};
 assert.equal(denseWorldInputsUnchanged(source,structuredClone(source)),true);
 for(const change of [s=>s.instances[0].growth.fnv32='changed',s=>s.rigs[0].pose.fnv32='changed',s=>s.instances[0].count--]){const current=structuredClone(source);change(current);assert.equal(denseWorldInputsUnchanged(source,current),false);}
});
