import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';

function setup(){
 const data=new Map(),storage={get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const repo=new SaveRepository(storage),a=Game.newGame({seed:712,slotId:'a'}),b=Game.newGame({seed:913,slotId:'b'});
 repo.save(a);a.day=2;repo.save(a);repo.save(b);return {repo,data,a,b};
}
test('loading a valid snapshot under the wrong slot key recovers only that slot backup',()=>{
 const {repo,data,b}=setup(),other=data.get(repo.key('b'));data.set(repo.key('a'),serialize(b));
 const loaded=repo.load('a');assert.equal(loaded.slotId,'a');assert.equal(loaded.day,1);
 assert.equal(data.get(repo.key('b')),other);assert.deepEqual(repo.list().map(s=>s.slotId).sort(),['a','b']);
});
test('a wrong-slot primary cannot replace the last valid backup during a new save',()=>{
 const {repo,data,a,b}=setup(),backup=data.get(repo.key('a')+':backup');data.set(repo.key('a'),serialize(b));
 a.day=3;repo.save(a);assert.equal(data.get(repo.key('a')+':backup'),backup);
 data.set(repo.key('a'),'corrupt');assert.equal(repo.load('a').slotId,'a');assert.equal(repo.load('a').day,1);
 assert.equal(repo.load('b').slotId,'b');
});
test('wrong-slot primary and backup fail explicitly instead of loading another campaign',()=>{
 const {repo,data,b}=setup();data.set(repo.key('a'),serialize(b));data.set(repo.key('a')+':backup',serialize(b));
 const before=[...data];assert.throws(()=>repo.load('a'));assert.deepEqual([...data],before);
 assert.deepEqual(repo.list().map(s=>s.slotId),['b']);
});
