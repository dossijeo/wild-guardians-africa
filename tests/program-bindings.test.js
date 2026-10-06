import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeProgramBindings} from '../src/rendering/program-bindings.js';

test('compiled variants initialize their lazy bindings once, preserving program receivers and diagnostics',()=>{
 let firstUse=0;const order=[],program={ready:false,getUniforms(){assert.equal(this,program);order.push('uniforms');if(!this.ready){this.ready=true;firstUse++;}return {};},getAttributes(){assert.equal(this,program);assert.equal(this.ready,true);order.push('attributes');return {};}};
 const renderer={info:{programs:[program,program]}};assert.deepEqual(initializeProgramBindings(renderer),{initialized:1,unsupported:0});assert.deepEqual(order,['uniforms','attributes']);
 initializeProgramBindings(renderer);assert.equal(firstUse,1);assert.equal(renderer.info.programs.length,2);
});

test('a future metadata-only renderer keeps its draw fallback instead of failing or inventing ready bindings',()=>{
 const renderer={info:{programs:[{id:1}]}};assert.deepEqual(initializeProgramBindings(renderer),{initialized:0,unsupported:1});assert.deepEqual(initializeProgramBindings({info:{programs:null}}),{initialized:0,unsupported:0});
});

test('first-use shader failure propagates unchanged, preventing later variants from being treated as ready',()=>{
 const failure=Object.assign(Error('bad shader'),{code:'WORLD_SHADER_FAILURE'});let attributes=0,later=0;
 const bad={getUniforms(){throw failure;},getAttributes(){attributes++;}},next={getUniforms(){later++;},getAttributes(){later++;}};
 assert.throws(()=>initializeProgramBindings({info:{programs:[bad,next]}}),error=>error===failure);assert.equal(attributes,0);assert.equal(later,0);
});
