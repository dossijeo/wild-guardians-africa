import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, pair, flush } from './helpers/remote-webgpu-fixture.js';
import { createNativeRouteExecutionFixture } from './helpers/native-route-execution.js';
import { createNativeIntentControlPublication } from '../src/simulation/native-intent-control-publication.js';

for (const kind of ['private', 'staged', 'second-hold', 'published', 'pending', 'staged-draw', 'foreign-view', 'mixed']) {
  test('a committed world mutation revalidates a standalone mipmap submit: ' + kind, async () => {
    const native = createNativeRouteExecutionFixture(), [sourcePort, drawPort] = pair();
    let now = 0, resumeBudget;
    const f = await fixture({}, {absoluteNow: () => now, intentControl: {port: drawPort, session: 'mips'},
      yieldResourceTask: () => new Promise(resolve => {resumeBudget = resolve;})});
    let source;
    try {
      native.worker(1,native.point(-6,0),native.point(6,0));
      native.bridge.beginNativeRouteExecution();
      native.bridge.commitNativeCausalClock();
      source = createNativeIntentControlPublication({port: sourcePort, session: 'mips',
        observe: native.bridge.observeNativeIntentControl, absoluteNow: () => 0});
      await source.ready;
      const device = f.client.device;
      const descriptor = {size:[2048,2048], format:'rgba8unorm', usage:22, mipLevelCount:12};
      const texture = device.createTexture(descriptor);
      const staged = kind === 'staged' || kind === 'staged-draw';
      const displayed = staged ? device.createTexture(descriptor) : texture;
      const readView = displayed.createView({baseMipLevel:0, mipLevelCount:1});
      const group = device.createBindGroup({entries:[{binding:0, resource:readView}]});
      const other = kind === 'foreign-view' ? device.createTexture(descriptor) : texture;
      let pendingFrame;
      const clock = {version:1, epoch:0, elapsed:10, safeUntil:10, anchorAbsoluteMs:0, paused:true, segments:[]};
      if (staged || kind === 'published' || kind === 'pending') {
        f.client.beginFrame({clock});
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({colorAttachments:[{view:f.client.context.getCurrentTexture().createView(), loadOp:'clear', storeOp:'store'}]});
        pass.setPipeline(f.pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();
        device.queue.submit([encoder.finish()]);
        pendingFrame = f.client.endFrame();
        pendingFrame.catch(()=>{});
        await flush();await f.host.idle();
        if (kind !== 'pending') {f.host.present();await pendingFrame;}
        else assert(f.host.inspect().pendingSequence);
      }
      const buffers = [];
      f.client.withTexturePreparation(texture,'mipmaps',()=>{
        const encoder = device.createCommandEncoder();
        for (let level = 1; level < descriptor.mipLevelCount; level++) {
          const src = texture.createView({baseMipLevel:level-1, mipLevelCount:1});
          const view = other.createView({baseMipLevel:level, mipLevelCount:1});
          const mipGroup = device.createBindGroup({entries:[{binding:0,resource:src}]});
          const pass = encoder.beginRenderPass({colorAttachments:[{view,loadOp:'clear',storeOp:'store'}]});
          pass.setPipeline(f.pipeline);pass.setBindGroup(0,mipGroup);pass.draw(4,1,0,0);pass.end();
        }
        buffers.push(encoder.finish());
      });
      if (kind === 'mixed') buffers.push(device.createCommandEncoder().finish());
      await device.queue.onSubmittedWorkDone();
      if (staged) {
        for (const target of [displayed,texture]) device.queue.writeTexture({texture:target},new Uint8Array(4),{},[1,1,1]);
        await new Promise(resolve=>setImmediate(resolve));await f.host.idle();
        assert.equal(f.host.inspect().stagedOperations,2);
      }
      if (kind === 'staged-draw') {
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({colorAttachments:[{view:readView,loadOp:'clear',storeOp:'store'}]});
        const samplerGroup = device.createBindGroup({entries:[{binding:0,resource:texture.createView()}]});
        pass.setPipeline(f.pipeline);pass.setBindGroup(0,samplerGroup);pass.draw(3);pass.end();
        device.queue.submit([encoder.finish()]);
        await new Promise(resolve=>setImmediate(resolve));await f.host.idle();
        assert.equal(f.host.inspect().stagedOperations,3);
      }
      const hold = await source.quiesceGpuForMutation();
      const before = f.gpu.submitted.length;
      device.queue.submit(buffers);
      await flush();
      assert.equal(f.gpu.submitted.length,before);
      assert(f.host.inspect().queuedMessages > 0);
      const worldBoundary = {version:1,
        authorityEpoch:source.status().authorityEpoch, nativeSession:native.bridge.nativeCausalClock().nativeSession,
        ticket:1,effectiveTime:10};
      if (kind === 'second-hold') now = 3;
      source.releaseGpuAfterMutation(hold,{committed:true,worldBoundary});
      if (kind === 'second-hold') {
        await flush();
        assert.equal(typeof resumeBudget,'function');
        const nextHold = await source.quiesceGpuForMutation();
        resumeBudget();
        await flush();
        assert.equal(f.gpu.submitted.length,before);
        source.releaseGpuAfterMutation(nextHold,{committed:false});
      }
      await new Promise(resolve=>setImmediate(resolve));await f.host.idle();
      if (kind === 'private' || kind === 'second-hold') {
        assert.equal(f.host.inspect().failed,false);
        assert.equal(f.gpu.submitted.length,before+1);
        assert.equal(f.gpu.submitted.at(-1).passes.length,11);
      } else if (kind === 'staged') {
        assert.equal(f.host.inspect().failed,false);
        assert.equal(f.gpu.submitted.length,before);
        assert.equal(f.host.inspect().stagedOperations,3);
        const calls = f.gpu.calls.length;
        const draw = f.frame(8,{clock,nativeWorldBoundary:worldBoundary});
        await new Promise(resolve=>setImmediate(resolve));await f.host.idle();f.host.present();await draw;
        const writesAndSubmits = f.gpu.calls.slice(calls).filter(([op])=>['writeTexture','submit'].includes(op));
        assert.deepEqual(writesAndSubmits.map(([op])=>op),['writeTexture','writeTexture','submit','submit']);
        assert.equal(writesAndSubmits[2][1].passes.length,11);
      } else {
        assert.equal(f.host.inspect().failed,true);
        assert.equal(f.gpu.submitted.length,before);
      }
    } finally {
      source?.dispose();f.client.dispose();await f.host.dispose();native.session.dispose();
    }
  });
}
