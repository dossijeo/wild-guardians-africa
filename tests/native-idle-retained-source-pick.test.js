import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarmArrivedIdleCycleGraphicsFixture} from './helpers/native-farm-arrived-idle-cycle-graphics.js';

test('Farm23 image remains queryable while its actual21 candidate has no submitted clock',async()=>{
 const f=await nativeFarmArrivedIdleCycleGraphicsFixture({inside:true});let part;try{const actor=f.roster.get(f.actor),body=f.body(1);part=await f.roster.prepareNativeIdleCycleProposal(f.support,{getPickAge(){throw Error('Unsubmitted Idle clock');}});part.activate();assert.throws(()=>actor.preparePick(),/Unsubmitted Idle clock/);assert.equal(typeof part.withSourcePresentation,'function');part.withSourcePresentation(()=>{const restore=actor.preparePick();restore();});assert.throws(()=>actor.preparePick(),/Unsubmitted Idle clock/);part.rollback();assert(part.cancel());f.flush();const restore=actor.preparePick();restore();assert.deepEqual(f.body(1),body);assert.equal(f.acquires,1);assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});
