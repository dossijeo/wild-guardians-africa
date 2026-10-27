import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildHorizonData} from '../src/rendering/horizon-data.js';
import {nativeNearRegion} from '../src/rendering/horizon.js';
import {nativeTerrainBuffer} from '../src/rendering/terrain-geometry.js';
import {smoothHorizonNormals} from '../tools/experiments/qa-canyon-horizon-normals-20261022.js';

test('worker buffer normals match visual reference and preserve positions, colours and water',()=>{
 for(const [cx,cz] of [[0,0],[-2,3]]){
  const config={seed:'712',biome:'canyons',relief:1,river:true};
  const profile=JSON.parse(readFileSync('public/content/biome-canyons.json')).profile;
  const region=nativeNearRegion({x:cx*48,z:cz*48},'media');
  const base=buildHorizonData({config,profile,region});
  const actual=buildHorizonData({config,profile,region,smoothNormals:true});
  const reference=nativeTerrainBuffer(base.terrain.slice());smoothHorizonNormals(reference);
  assert.deepEqual(actual.terrain,reference.attributes.position.data.array);
  assert.deepEqual(actual.water,base.water);
  for(let i=0;i<base.terrain.length;i++)if(i%9<3||i%9>5)assert.equal(actual.terrain[i],base.terrain[i]);
  assert.ok(actual.normalBuild.unique>0);reference.dispose();
 }
});
