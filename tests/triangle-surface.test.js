import test from 'node:test';
import assert from 'node:assert/strict';
import {TerrainField} from '../src/world/terrain.js';
test('height queries read only the three corners of the selected native triangle',()=>{
 for(const [x,z,corners] of [[.2,.3,[[0,0],[1,0],[0,1]]],[.8,.7,[[1,0],[0,1],[1,1]]],[-.2,-.3,[[0,-1],[-1,0],[0,0]]],[.5,.5,[[0,0],[1,0],[0,1]]]]){
  const calls=[],field=Object.create(TerrainField.prototype);field.lattice=(x,z)=>{calls.push([x,z]);return 3+x*x+z*7;};
  const actual=field.surface(x,z);assert.deepEqual(calls,corners);
  const x0=Math.floor(x),z0=Math.floor(z),fx=x-x0,fz=z-z0,h=(a,b)=>3+a*a+b*7,a=h(x0,z0),b=h(x0+1,z0),d=h(x0,z0+1),c=h(x0+1,z0+1);
  assert.equal(actual,fx+fz<=1?a+(b-a)*fx+(d-a)*fz:c+(d-c)*(1-fx)+(b-c)*(1-fz));
 }
});
