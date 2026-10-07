import test from 'node:test';
import assert from 'node:assert/strict';
import {TerrainField} from '../src/world/terrain.js';
import {BIOME_IDS} from '../src/world/navigation.js';
import {renderedTerrainSurface} from '../src/rendering/terrain-surface.js';

function original(field,x,z){const x0=Math.floor(x),z0=Math.floor(z),u=x-x0,v=z-z0;
 const a=field.surface(x0,z0),b=field.surface(x0+1,z0),d=field.surface(x0,z0+1),c=field.surface(x0+1,z0+1);
 return u+v<=1?a+(b-a)*u+(d-a)*v:c+(d-c)*(1-u)+(b-c)*(1-v);
}
test('rendered triangle sampling queries only its three actual corners on signed cells and the diagonal',()=>{
 for(const [x,z] of [[.1,.2],[.9,.8],[-.9,-.8],[-.1,-.2],[.5,.5],[0,0],[48,-48],[-48.001,47.999]]){
  const calls=[],field={surface:(px,pz)=>{calls.push([px,pz]);return Math.sin(px)+Math.cos(pz);}};
  const value=renderedTerrainSurface(field,x,z),x0=Math.floor(x),z0=Math.floor(z);
  assert.equal(calls.length,3);
  assert.deepEqual(calls,x-x0+z-z0<=1?[[x0,z0],[x0+1,z0],[x0,z0+1]]:[[x0+1,z0],[x0,z0+1],[x0+1,z0+1]]);
  assert.equal(value,original(field,x,z));
 }
});
for(const biome of Object.values(BIOME_IDS))test(`${biome}: three-corner rendering sample is exactly equal to the original on native terrain`,()=>{
 for(const seed of ['712','1','42']){
  const config={seed,biome,relief:1,density:1,river:true},a=new TerrainField(config),b=new TerrainField(config);
  for(let i=0;i<300;i++){
   const x=(i%37-18)*3.125,z=(i%29-14)*5.375;
   assert.equal(renderedTerrainSurface(a,x,z),original(b,x,z));
  }
 }
});
