import test from 'node:test';
import assert from 'node:assert/strict';
import {farAtmosphere} from '../src/rendering/far-atmosphere.js';
test('far atmosphere retains the existing default and permits a band around the handoff',()=>{
  assert.deepEqual(farAtmosphere(),{fogStart:160,fogEnd:380});
  assert.deepEqual(farAtmosphere({fogStart:30,fogEnd:300}),{fogStart:30,fogEnd:300});
  for(const settings of [{fogStart:-1},{fogStart:NaN},{fogEnd:Infinity},{fogStart:300,fogEnd:300},{fogStart:400}])assert.throws(()=>farAtmosphere(settings),/atmosphere/);
});
