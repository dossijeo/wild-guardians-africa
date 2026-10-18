import test from 'node:test';
import assert from 'node:assert/strict';
import {queryResidentSpatialProps} from '../src/world/wild-engine/spatial-prop-query.js';

test('resident spatial prop queries never treat an unloaded or JS-generated chunk as empty',()=>{
  const prop={id:'spatial:0:1:2',slot:0,x:2,z:3,radius:1};
  const instances=Array.from({length:20},(_,i)=>i===0?[prop]:[]);
  const chunks=new Map([['0,0',{authority:'spatial-wasm',instances}]]);
  const suppressed=new Set();
  assert.deepEqual(queryResidentSpatialProps(chunks,suppressed,0,0,4),
    {status:'ready',props:[prop],missing:[]});
  const edge=queryResidentSpatialProps(chunks,suppressed,23,0,4);
  assert.equal(edge.status,'unknown');
  assert.deepEqual(edge.missing,[{cx:1,cz:0}]);
  suppressed.add(prop.id);
  assert.deepEqual(queryResidentSpatialProps(chunks,suppressed,0,0,4).props,[]);
  chunks.set('0,0',{instances});
  assert.deepEqual(queryResidentSpatialProps(chunks,suppressed,0,0,4).missing,
    [{cx:0,cz:0}]);
  chunks.set('0,0',{userData:{spatialAuthority:'spatial-wasm',propSources:instances}});
  suppressed.clear();
  assert.deepEqual(queryResidentSpatialProps(chunks,suppressed,0,0,4).props,[prop]);
  assert.equal(queryResidentSpatialProps(chunks,suppressed,0,0,4,2).status,'unknown');
  chunks.get('0,0').userData.spatialTerrainRevision=2;
  assert.equal(queryResidentSpatialProps(chunks,suppressed,0,0,4,2).status,'ready');
  assert.equal(queryResidentSpatialProps(chunks,suppressed,0,0,4,key=>
    key==='0,0'?2:0).status,'ready');
});
