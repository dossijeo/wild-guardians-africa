import test from 'node:test';
import assert from 'node:assert/strict';
import {respondToWebGpuPreparation} from '../src/rendering/webgpu-preparation-request.js';

test('resource preparation replies in its own channel without turning a load error into a worker failure',async()=>{
 const messages=[];for(const kind of ['guardian','structure','crop']){
  await respondToWebGpuPreparation({id:1,kind,prepare:async()=>{throw Error('asset unavailable');},send:message=>messages.push(message),isOpen:()=>true});
  await respondToWebGpuPreparation({id:2,kind,prepare:async()=>{},send:message=>messages.push(message),isOpen:()=>true});
  assert.deepEqual(messages.splice(0),[{kind:kind+'PrepareError',id:1,message:'asset unavailable'},{kind:kind+'PrepareResult',id:2}]);
 }
});
test('late preparation replies are discarded after the worker closes',async()=>{
 let finish,open=true;const messages=[],pending=respondToWebGpuPreparation({id:1,kind:'crop',prepare:()=>new Promise(resolve=>{finish=resolve;}),send:message=>messages.push(message),isOpen:()=>open});open=false;finish();await pending;assert.deepEqual(messages,[]);
});
