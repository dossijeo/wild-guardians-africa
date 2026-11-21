import test from 'node:test';
import assert from 'node:assert/strict';
import {observeLoadingDeviceLoss} from '../src/rendering/worker-loading-device-loss.js';

function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
test('loss of the loading WebGPU device reports failure and intentional disposal does not',async()=>{
 const first=deferred(),errors=[];observeLoadingDeviceLoss({lost:first.promise},{onError:error=>errors.push(error.message)});first.resolve({reason:'unknown',message:'adapter removed'});await Promise.resolve();assert.deepEqual(errors,['WebGPU loading device lost: adapter removed']);
 const second=deferred(),stop=observeLoadingDeviceLoss({lost:second.promise},{onError:error=>errors.push(error.message)});stop();second.resolve({reason:'destroyed'});await Promise.resolve();assert.equal(errors.length,1);
 const third=deferred();let closed=false;observeLoadingDeviceLoss({lost:third.promise},{isClosed:()=>closed,onError:error=>errors.push(error.message)});closed=true;third.resolve({reason:'destroyed'});await Promise.resolve();assert.equal(errors.length,1);
});
