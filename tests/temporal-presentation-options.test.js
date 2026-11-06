import test from 'node:test';
import assert from 'node:assert/strict';
import {temporalPresentationOptions} from '../src/app/temporal-presentation-options.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';
import {build} from 'esbuild';
import {resolve} from 'node:path';
const base={params:new URLSearchParams('qa-webgpu-temporal'),dev:true,hosted:true,early:false,recoveryEnabled:false,hasWebGpu:true};
test('temporal mode is opt-in and fails closed for incomplete configurations',()=>{
 assert.equal(temporalPresentationOptions({...base,dev:false}),null);assert.equal(temporalPresentationOptions({...base,params:new URLSearchParams()}),null);
 for(const override of [{hosted:false},{early:true},{recoveryEnabled:true},{hasWebGpu:false},{params:new URLSearchParams('qa-webgpu-temporal&qa-webgpu-temporal-recovery')}])assert.throws(()=>temporalPresentationOptions({...base,...override}),/not available/);
});
test('coordinated temporal options reach the hosted runtime with distinct ports',async()=>{
 const profile=temporalPresentationOptions(base),messages=[],worker={postMessage(message){messages.push(message);},terminate(){}},receiver={sequence:0,accept(p){this.sequence=p.sequence;return {accepted:true};},acceptUnchanged(){},status(){return {sequence:this.sequence};}},runtime=createWorkerHostedRuntime({confirmedReceiver:receiver,session:'s',clientOptions:{snapshot:'{}',terrainHistory:profile.terrainHistory},runtimeOptions:{presentationTimeline:true},workerFactory:()=>worker}),terrainPort={},presentationPort={};
 try{const ready=runtime.start({terrainPort,presentationPort});assert.equal(messages[0].runtimeOptions.presentationTimeline,true);assert.deepEqual(messages[0].clientOptions.terrainHistory,profile.terrainHistory);worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,events:[]}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await ready;}finally{runtime.dispose();}
});
test('harness-only complete recovery negotiates checkpoints while normal builds reject it',async()=>{
 const built=await build({entryPoints:[resolve('src/app/temporal-presentation-options.js')],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'historical-switch',setup(plugin){plugin.onResolve({filter:/historical-recovery-harness\.js$/},()=>({path:'switch',namespace:'mock'}));plugin.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const historicalRecoveryHarnessEnabled=true',loader:'js'}));}}]}),module=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64')),options={...base,params:new URLSearchParams('qa-webgpu-temporal&qa-webgpu-temporal-recovery'),recoveryEnabled:true,recovery:{work:true,concurrent:false,backpressure:false,compactTicks:false}};
 assert.throws(()=>temporalPresentationOptions(options),/not available/);const profile=module.temporalPresentationOptions(options);assert.equal(profile.recovery,true);assert.equal(profile.presentation.checkpoints,true);assert.throws(()=>module.temporalPresentationOptions({...options,recovery:{...options.recovery,work:false}}),/not available/);
});
