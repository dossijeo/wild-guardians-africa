import test from 'node:test';
import assert from 'node:assert/strict';
import {installShaderFailureGuard,SHADER_FAILURE_MESSAGE} from '../src/rendering/shader-failure.js';

test('GPU link failure reaches the loading/runtime error path once with diagnostic details',()=>{
  const renderer={debug:{checkShaderErrors:false}},failure=installShaderFailureGuard(renderer);
  assert.equal(failure.current,null);assert.equal(renderer.debug.checkShaderErrors,true);
  const gl={getProgramInfoLog:()=> 'link failed',getShaderInfoLog:shader=>shader};let first;
  assert.throws(()=>renderer.debug.onShaderError(gl,{},'vertex failed','fragment failed'),error=>{first=error;return error.code==='WORLD_SHADER_FAILURE'&&error.message===SHADER_FAILURE_MESSAGE;});
  assert.equal(failure.current,first);assert.deepEqual(first.details,{program:'link failed',vertex:'vertex failed',fragment:'fragment failed'});
  assert.throws(()=>renderer.debug.onShaderError(gl,{},'later','later'),error=>error===first);
});
