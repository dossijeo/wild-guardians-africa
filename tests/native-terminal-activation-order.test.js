import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {fixture as createDraw} from './helpers/remote-webgpu-fixture.js';
import {nativeRecoveryHost,untilNativeRecovery} from './helpers/native-recovery-host.js';
import {createTemporalRecoveryReceiver} from '../src/rendering/temporal-recovery-receiver.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';
import {nativeClockResourceEnd} from '../src/rendering/native-clock-resource-end.js';
import {floorFloat32} from '../src/rendering/float32-time.js';

for(const reject of [false,true])test('terminal activation preserves one captured clock step when the replacement fence '+(reject?'rejects':'succeeds'),async()=>{
  const f=await nativeRecoveryHost(),stream=new MessageChannel(),control=new MessageChannel(),resources=new MessageChannel();
  let replacement,receiver,endpoint;
  try{
    await untilNativeRecovery(()=>f.native.records[0]?.committed,()=>f.pump());
    await f.send({kind:'command',id:23,command:{kind:'resume',reason:'menu'}});
    await f.tick();
    await f.send({kind:'command',id:24,command:{kind:'snapshot',visualTerrain:true}});
    await untilNativeRecovery(()=>!f.runtime.status().busy&&f.publications.at(-1)?.terrainCheckpoint);
    const at=f.runtime.status().confirmedElapsed;
    f.native.retireResourceEndpoint();
    f.native.gpu.device.destroy();
    await untilNativeRecovery(()=>f.native.authority.nativeIntentControlStatus().current?.drained);
    f.elapse(50); // The clock has accrued a step, but its scheduled callback has not run.
    await f.send({kind:'markVisualLost',id:30,nativeResumeId:31});
    assert(f.messages.some(m=>m.kind==='visualRecoveryLost'&&m.id===30),JSON.stringify(f.messages.at(-1)));
    assert.equal(f.runtime.status().pendingSteps,1);
    await f.send({kind:'prepareVisualRecovery',id:32,nativeResumeId:33});
    const hold=f.messages.find(m=>m.id===32&&m.kind==='visualRecoveryPrepared')?.terminalHoldId;
    assert.equal(hold,30);
    replacement=await createDraw({capabilities:{width:20,height:10,format:'rgba8unorm',nativeIdleStrollVersion:1}},
      {intentControl:{port:control.port2,session:'production-control',recoveryHold:hold}});
    receiver=createTemporalRecoveryReceiver({port:stream.port2,session:'s',restoreCheckpoint:async()=>true,applyBoundary:async()=>true,onError:e=>{throw e;}});
    const next=f.presentation();
    await f.send({kind:'attachVisualRecovery',id:34,terrainPort:{},presentationPort:next,recoveryPort:stream.port1,intentControlPort:control.port1});
    await untilNativeRecovery(()=>f.messages.some(m=>m.id===34));
    assert.equal(f.messages.find(m=>m.id===34).kind,'visualRecoveryAttached',f.messages.find(m=>m.id===34).message);
    const restored=f.messages.find(m=>m.id===34&&m.kind==='visualRecoveryAttached').recoveredStroll;
    f.hello(next);
    const ref=restored.execution.binding.reference,epoch=ref.worldBoundary.effectiveTime;
    replacement.client.registerClockBinding(replacement.buffer,{byteOffset:0,epoch,semantic:'relative',
      nativeStroll:ref,resourceEnd:nativeClockResourceEnd(epoch,ref.endTime)});
    async function draw(value,withActor=true){
      const metadata={nativeWorldBoundary:ref.worldBoundary,
        clock:{version:1,epoch:1,elapsed:at,safeUntil:at,anchorAbsoluteMs:0,paused:true,segments:[]}};
      let frame;
      if(withActor)frame=replacement.frame(value,metadata);
      else{
        const client=replacement.client;
        client.beginFrame(metadata);
        const encoder=client.device.createCommandEncoder();
        const pass=encoder.beginRenderPass({colorAttachments:[{view:client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
        pass.setPipeline(replacement.pipeline);pass.draw(3);pass.end();client.device.queue.submit([encoder.finish()]);
        frame=client.endFrame();
      }
      await new Promise(resolve=>setImmediate(resolve));await replacement.host.idle();replacement.host.present();await frame;
      const row=replacement.host.inspect().nativeRouteFrame;
      assert.equal(row.clockElapsed,at);
      const bound=row.bindings.find(b=>b.nativeStroll);
      if(withActor)assert.equal(bound.relativeTime,floorFloat32(at-epoch));
      else assert.equal(bound,undefined);
      return row.sequence;
    }
    assert.equal(await draw(77),1);
    endpoint=attachNativeResourcePreparationEndpoint({port:resources.port2,session:'production-resources',isRunning:()=>true,
      prepare:async()=>{throw Error('Unexpected preparation during recovery');}});
    await f.send({kind:'attachNativeResourcePreparation',id:35,port:resources.port1,recoveryHold:hold});
    assert(f.messages.some(m=>m.id===35&&m.kind==='nativeResourcePreparationAttached'),JSON.stringify(f.messages.at(-1)));
    assert.equal(await draw(78,!reject),2);
    await f.send({kind:'finishVisualRecoveryConfirmed',id:36});
    await f.send({kind:'stageRecoveryVisibility',id:37,hidden:false});
    const start=f.commands.length;
    if(!reject)f.holdReleaseAck();
    const activate=f.send({kind:'activateVisualRecovery',id:38});
    await untilNativeRecovery(()=>f.controls.some(c=>c.kind==='resume'&&c.holdId===hold));
    assert.equal(f.runtime.status().confirmedElapsed,at);
    assert.equal(f.runtime.status().pendingSteps,1);
    assert.deepEqual(f.commands.slice(start),[]);
    if(!reject){
      await f.send({kind:'cancelVisualRecovery',id:39});
      assert(f.messages.some(m=>m.id===39&&m.kind==='visualRecoveryFailed'));
      await f.send({kind:'stageRecoveryVisibility',id:40,hidden:true});
      f.releaseAck();
    }
    await activate;
    assert.equal(f.controls.filter(c=>c.kind==='resume'&&c.holdId===hold).length,1);
    if(reject){
      assert(f.messages.some(m=>m.kind==='visualRecoveryFailed'&&m.id===38&&m.message.includes('Missing submitted Idle22')));
      assert.equal(f.runtime.status().pendingSteps,1);
      assert.deepEqual(f.commands.slice(start),[]);
    }else{
      assert(f.messages.some(m=>m.kind==='visualRecoveryActivated'&&m.id===38),JSON.stringify(f.messages.at(-1)));
      assert.deepEqual(f.commands.slice(start).map(c=>c.kind),['advance','pause']);
      assert.equal(f.commands.at(-1).reason,'hidden');
      assert(Math.abs(f.runtime.status().confirmedElapsed-at-.05)<1e-9);
      assert.equal(f.runtime.status().pendingSteps,0);
    }
  }finally{
    f.releaseAck();endpoint?.dispose();receiver?.dispose();replacement?.client.dispose();await replacement?.host.dispose();
    for(const channel of [stream,control,resources]){channel.port1.close();channel.port2.close();}
    await f.dispose();
  }
});
