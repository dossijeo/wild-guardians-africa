import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfirmedPhysicsPoseSamples} from '../src/rendering/confirmed-physics-pose-samples.js';

test('physical sample validation requires ordered steps, stable rigs and the exact published endpoint',()=>{
 const transform=[0,0,0,0,0,0,1,1,1,1],pose={actorId:'a',active:true,root:transform,model:transform,bones:[{name:'Hips',transform}]},frame=(at,step)=>({at,step,poses:[structuredClone(pose)],bounds:[{actorId:'a',minX:-1,maxX:1,minZ:-1,maxZ:1}]}),trace={start:1,end:1.04,physicsActivity:{samplesComplete:true,observed:true},physicsPoseSamples:{version:1,complete:true,samples:[frame(1,4),frame(1.02,5),frame(1.04,6)]}},message={physicsPose:structuredClone(pose)};
 validateConfirmedPhysicsPoseSamples(trace,message);
 const corrupt=(fn)=>{const copy=structuredClone(trace);fn(copy.physicsPoseSamples);assert.throws(()=>validateConfirmedPhysicsPoseSamples(copy,message),/physics/);};
 corrupt(s=>s.samples[1].step++);corrupt(s=>s.samples[1].at=1);corrupt(s=>s.samples[1].poses[0].bones[0].name='Other');corrupt(s=>s.samples[2].poses[0].root[0]=9);corrupt(s=>s.samples.pop());
 trace.physicsPoseSamples={version:1,complete:false,reason:'stateful-physics-pose',samples:[]};validateConfirmedPhysicsPoseSamples(trace,message);trace.physicsPoseSamples.samples.push(frame(1,4));assert.throws(()=>validateConfirmedPhysicsPoseSamples(trace,message),/physics/);
});
