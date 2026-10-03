import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
test('Fresh navigation restores the saved route epoch without changing the snapshot; genuine mutations invalidate paths',()=>{
 const s=Game.newGame({seed:19,slotId:'epoch'}),n=new Navigation(19,'sabana',{});n.setState(s);n.setState(s);n.setState(s);
 assert.equal(s.navigationVersion,3);const before=serialize(s),loaded=deserialize(before),fresh=new Navigation(19,'sabana',{});fresh.setState(loaded);
 assert.equal(fresh.version,3);assert.equal(serialize(loaded),before);
 fresh.walkCache.set('stale',true);fresh.segmentCache.set('stale',true);fresh.setState(loaded);assert.equal(loaded.navigationVersion,4);assert.equal(fresh.walkCache.size,0);assert.equal(fresh.segmentCache.size,0);
 const replacement=deserialize(serialize(loaded));fresh.setState(replacement);assert.equal(fresh.version,5);assert.equal(replacement.navigationVersion,5);
});
test('Legacy or invalid epochs conservatively invalidate instead of trusting old persisted paths',()=>{
 for(const value of [undefined,-1,0,1.5,NaN,'3']){
  const s=Game.newGame({seed:19,slotId:'legacy'});if(value!==undefined)s.navigationVersion=value;
  const n=new Navigation(19,'sabana',{});n.setState(s);assert.equal(n.version,1);assert.equal(s.navigationVersion,1);
  n.setState(s);assert.equal(n.version,2);
 }
});
