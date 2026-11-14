import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
test('development temporal profile is forwarded unchanged to the actual presentation worker client',async()=>{
 const built=await build({entryPoints:[resolve('src/rendering/webgpu-world-client.js')],bundle:true,write:false,platform:'node',format:'esm',define:{'import.meta.env':JSON.stringify({DEV:true})}}),{createWebGpuWorldClient}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const sent=[],worker={postMessage(message){sent.push(message);},terminate(){}},port=()=>({close(){}}),profile={maxPublications:8,maxBytes:4096,maxHistory:8,maxHistoryBytes:4096,checkpoints:true};
 const client=createWebGpuWorldClient({canvas:{transferControlToOffscreen:()=>({})},session:'s',snapshot:'{}',presentationRecovery:true,presentationWorkRecovery:true,experimentalTimelineRecovery:true,experimentalTemporalPresentation:profile,recoveryPort:port(),initialSequence:1,workerFactory:()=>worker,channelFactory:()=>({port1:port(),port2:port()})});
 try{assert.equal(sent[0].experimentalTimelineRecovery,true);assert.deepEqual(sent[0].experimentalTemporalPresentation,profile);worker.onmessage({data:{kind:'ready',backend:'WebGPU'}});await client.ready;}finally{client.dispose();}
});
