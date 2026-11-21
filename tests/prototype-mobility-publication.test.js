import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicationReceiver} from '../tools/trees/prototype_mobility_publication.mjs';

test('publications reject gaps, duplicates, wrong sessions and backwards time without advancing',()=>{
 const receiver=createPublicationReceiver('world'),message=(version,elapsed,session='world')=>({session,version,projection:{elapsed,events:[]}});
 assert.deepEqual(receiver.accept(message(2,2)),{accepted:false,reason:'gap'});
 assert.deepEqual(receiver.accept(message(1,1,'old')),{accepted:false,reason:'session'});
 assert.deepEqual(receiver.accept(message(1,1)),{accepted:true,version:1});
 assert.deepEqual(receiver.accept(message(1,2)),{accepted:false,reason:'stale'});
 assert.throws(()=>receiver.accept(message(2,0)),/backwards/);
 assert.deepEqual(receiver.accept(message(2,2)),{accepted:true,version:2});
 assert.throws(()=>receiver.accept({session:'world',version:3,projection:{elapsed:3}}),/Invalid/);
 assert.deepEqual(receiver.accept(message(3,3)),{accepted:true,version:3});
});
