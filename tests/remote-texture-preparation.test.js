import test from 'node:test';
import assert from 'node:assert/strict';
import {installRemoteTexturePreparation, validRemoteTexturePreparation} from '../src/rendering/remote-texture-preparation.js';
import {createRemoteWebGpuClient} from '../src/rendering/remote-webgpu-client.js';

const ref = key => ({__remoteGpuId:key});
function fixture() {
  const resources = new Map([
    ['texture',{kind:'createTexture'}], ['view',{kind:'view',dependencies:new Set(['texture'])}],
    ['pipeline',{kind:'createRenderPipeline'}], ['group',{kind:'createBindGroup',dependencies:new Set(['view'])}],
  ]);
  const commands = [{method:'setPipeline',args:[ref('pipeline')]},{method:'setBindGroup',args:[0,ref('group')]},{method:'draw',args:[4,1,0,0]}];
  const buffer = {texturePreparation:{version:1,operation:'mipmaps',texture:ref('texture'),temporaries:[]},__remoteCommands:[{method:'beginRenderPass',args:[{colorAttachments:[{view:ref('view'),loadOp:'clear',storeOp:'store'}]}],commands}]};
  return {resources,buffer,valid:()=>validRemoteTexturePreparation(buffer,key=>resources.get(key))};
}
test('texture filters accept only declared textures and direct or bundled full screen draws',()=>{
  const f=fixture();assert.equal(f.valid(),true);
  f.resources.set('bundle',{kind:'bundle',commands:f.buffer.__remoteCommands[0].commands,dependencies:new Set(['pipeline','group'])});
  f.buffer.__remoteCommands[0].commands=[{method:'executeBundles',args:[[ref('bundle')]]}];assert.equal(f.valid(),true);
  f.resources.set('other',{kind:'createTexture'});f.resources.get('group').dependencies.add('other');assert.equal(f.valid(),false);
});
test('texture filters reject canvas, buffers, compute, indexed/indirect draws and queries',()=>{
  const changes=[
    f=>f.resources.get('view').currentView=true,
    f=>f.resources.set('texture',{kind:'createBuffer'}),
    f=>{f.resources.set('buffer',{kind:'createBuffer'});f.resources.get('group').dependencies.add('buffer');},
    f=>f.buffer.__remoteCommands[0].method='beginComputePass',
    f=>f.buffer.__remoteCommands[0].commands.push({method:'drawIndexed',args:[4]}),
    f=>f.buffer.__remoteCommands[0].commands.push({method:'drawIndirect',args:[ref('texture')]}),
    f=>f.buffer.__remoteCommands[0].args[0].timestampWrites={},
    f=>f.buffer.__remoteCommands[0].args[0].depthStencilAttachment={},
    f=>f.buffer.texturePreparation.texture=ref('@canvas'),
    f=>f.buffer.texturePreparation.temporaries.push(ref('texture')),
  ];
  for(const change of changes){const f=fixture();change(f);assert.equal(f.valid(),false);}
});
test('flip-y permits one declared temporary texture but no arbitrary extra texture',()=>{
  const f=fixture();f.buffer.texturePreparation.operation='flip-y';f.resources.set('temp',{kind:'createTexture'});f.buffer.texturePreparation.temporaries=[ref('temp')];f.resources.get('group').dependencies.add('temp');assert.equal(f.valid(),true);
  f.buffer.texturePreparation.temporaries.push(ref('texture'));assert.equal(f.valid(),false);
});
test('resource clear requires offscreen attachments, an actual clear and no drawing',()=>{
 const f=fixture(),pass=f.buffer.__remoteCommands[0];f.buffer.texturePreparation={version:1,operation:'clear'};pass.commands=[];
 assert.equal(f.valid(),true);pass.commands.push({method:'draw',args:[4,1,0,0]});assert.equal(f.valid(),false);pass.commands=[];
 pass.args[0].colorAttachments[0].loadOp='load';assert.equal(f.valid(),false);
 pass.args[0].depthStencilAttachment={view:ref('view'),depthLoadOp:'clear'};assert.equal(f.valid(),true);
 f.resources.get('view').currentView=true;assert.equal(f.valid(),false);
});
test('installer scopes only the two Three texture filters and restores methods on disposal',()=>{
  const seen=[],utils={_generateMipmaps(...args){seen.push(['mips',this,...args]);},_flipY(...args){seen.push(['flip',this,...args]);},other(){}},original={...utils};
  const renderer={backend:{textureUtils:utils}},remote={withTexturePreparation(texture,operation,fn){seen.push([operation,texture]);return fn();}};
  const handle=installRemoteTexturePreparation(renderer,remote);utils._generateMipmaps('texture',2);utils._flipY('texture',3);
  assert.deepEqual(seen.map(x=>x[0]),['mipmaps','mips','flip-y','flip']);assert.equal(seen[1][1],utils);assert.equal(utils.other,original.other);
  handle.dispose();handle.dispose();assert.equal(utils._generateMipmaps,original._generateMipmaps);assert.equal(utils._flipY,original._flipY);
});
test('client captures texture scope at encoding and restores it after exceptions',async()=>{
  const messages=[],port={postMessage:message=>messages.push(structuredClone(message))};
  const client=createRemoteWebGpuClient({port,capabilities:{width:4,height:4,format:'rgba8unorm'},finalizationRegistryFactory:()=>null});
  const texture=client.device.createTexture({size:[4,4],format:'rgba8unorm',usage:20});let buffer;
  assert.doesNotThrow(()=>client.withTextureClear(()=>client.device.createTexture({size:[4,4],format:'depth24plus',usage:16})));
  assert.equal(client.device.createCommandEncoder().finish().texturePreparation,null);
  client.withTexturePreparation(texture,'mipmaps',()=>{buffer=client.device.createCommandEncoder().finish();});
  assert.equal(buffer.texturePreparation.texture.__remoteGpuId,texture.__remoteGpuId);assert.equal(buffer.__remoteReferences.has(texture),true);
  assert.throws(()=>client.withTexturePreparation(texture,'flip-y',()=>{throw Error('filter failed');}),/filter failed/);
  assert.equal(client.device.createCommandEncoder().finish().texturePreparation,null);
  assert.throws(()=>client.withTexturePreparation(texture,'mipmaps',()=>Promise.resolve()),/synchronous/);
  assert.throws(()=>client.withTexturePreparation(client.context.getCurrentTexture(),'mipmaps',()=>{}),/Invalid/);
  client.device.queue.submit([buffer]);for(let i=0;i<40;i++)await Promise.resolve();
  assert.deepEqual(messages.find(m=>m.type==='operation').op.args[0][0].texturePreparation,buffer.texturePreparation);client.dispose();
});
