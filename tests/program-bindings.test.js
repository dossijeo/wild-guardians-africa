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
import {initializeProgramBindingsAsync} from '../src/rendering/program-bindings.js';
test('cooperative binding reflection yields between real program operations and matches counters',async()=>{let time=0,yields=0,calls=0;const make=()=>({getUniforms(){time+=3;calls++;},getAttributes(){time+=2;calls++;}}),a=make(),b=make();const stats=await initializeProgramBindingsAsync({info:{programs:[a,a,b,{}]}},{now:()=>time,nextFrame:async()=>{yields++;},budgetMs:4});assert.deepEqual(stats,{initialized:2,unsupported:1});assert.equal(calls,4);assert.equal(yields,2);});
test('cooperative reflection stops before touching programs after cancellation',async()=>{let stop=false,calls=0;const a={getUniforms(){calls++;},getAttributes(){calls++;}};await assert.rejects(initializeProgramBindingsAsync({info:{programs:[a,{...a}]}},{cancelled:()=>stop,budgetMs:0,nextFrame:async()=>{stop=true;}}),/cancelled/);assert.equal(calls,2);});
