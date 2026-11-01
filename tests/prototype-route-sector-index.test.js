import test from 'node:test';
import assert from 'node:assert/strict';
import {RouteSectorIndex} from '../tools/trees/prototype_route_sector_index.mjs';

test('shadow index selects nearby routes and replaces their dependencies',()=>{
  const index=new RouteSectorIndex(12,{padding:2});
  index.set('animal',{x:-10,z:0},[{x:10,z:0}],.5);
  index.set('worker',{x:120,z:120},[{x:130,z:120}],.3);
  assert.deepEqual([...index.affected({complete:true,sectors:[{x:-1,z:0}]})],['animal']);
  index.set('animal',{x:50,z:50},[{x:60,z:50}],.5);
  assert.equal(index.affected({complete:true,sectors:[{x:-1,z:0}]}).size,0);
  assert.equal(index.remove('animal'),true);
  assert.equal(index.remove('animal'),false);
});

test('incomplete events and uncertain routes never produce a negative certificate',()=>{
  const index=new RouteSectorIndex(12,{maxSectors:4});
  index.set('large',{x:0,z:0},[{x:1000,z:1000}],1);
  index.set('invalid',{x:0,z:0},[{x:NaN,z:0}],1);
  index.set('changed-path',{x:0,z:0},[{x:1,z:0}],1,{verified:false});
  index.set('ordinary',{x:120,z:120},[{x:121,z:120}],0);
  assert.deepEqual(new Set(index.affected({complete:true,sectors:[{x:0,z:0}]})),new Set(['large','invalid','changed-path']));
  for(const event of [null,{complete:false,sectors:[]},{complete:true,sectors:[{x:0,z:NaN}]}])
    assert.deepEqual(new Set(index.affected(event)),new Set(['large','invalid','changed-path','ordinary']));
  index.remove('large');index.remove('invalid');index.remove('changed-path');
  assert.equal(index.affected({complete:true,sectors:[{x:0,z:0}]}).size,0);
});
