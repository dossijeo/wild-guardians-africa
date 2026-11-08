import {createRemoteWebGpu} from '../../src/rendering/remote-webgpu-client.js';

let remote,buffer;
const now=()=>performance.timeOrigin+performance.now();
self.onmessage=async({data})=>{
 try{
  if(data.kind==='initialize'){
   remote=await createRemoteWebGpu({port:data.port,
    onError:error=>postMessage({kind:'failure',message:String(error.stack??error)})});
   postMessage({kind:'device-ready'});return;
  }
  if(data.kind==='start'){
   const device=remote.device;
   const format=remote.context.getConfiguration().format;
   remote.context.configure({device,format,alphaMode:'opaque'});
   buffer=device.createBuffer({size:16,usage:76});
   device.queue.writeBuffer(buffer,0,new Float32Array([10,10,0,0]));
   const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:1,buffer:{type:'uniform'}}]}),
    group=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer}}]}),
    module=device.createShaderModule({code:`
struct Clock { first:f32, other:f32, padding:vec2f }
@group(0) @binding(0) var<uniform> clock:Clock;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let points=array<vec2f,3>(vec2f(-0.4,-0.4),vec2f(0.4,-0.4),vec2f(0.0,0.4));
 return vec4f(points[i]+vec2f(clock.first-10.0,clock.other-10.0)*0.05,0.0,1.0);
}
@fragment fn fragment()->@location(0) vec4f { return vec4f(0.2,0.8,0.3,1.0); }
`}),pipeline=await device.createRenderPipelineAsync({
      layout:device.createPipelineLayout({bindGroupLayouts:[layout]}),
      vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',
       targets:[{format}]},primitive:{topology:'triangle-list'}});
   for(let i=0;i<data.routes.length;i++)remote.registerClockBinding(buffer,{
    byteOffset:i*4,semantic:'absolute',epoch:0,nativeRoute:data.routes[i]});
   const anchor=now(),clock={version:1,epoch:0,elapsed:10,safeUntil:20,
    anchorAbsoluteMs:anchor,paused:false,segments:[{start:10,end:20,rate:1,realDuration:10}]};
   remote.beginFrame({clock});
   const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({
    colorAttachments:[{view:remote.context.getCurrentTexture().createView(),
     loadOp:'clear',storeOp:'store',clearValue:{r:0.01,g:0.02,b:0.03,a:1}}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();
   device.queue.submit([encoder.finish()]);await remote.endFrame();
   postMessage({kind:'drawing',anchor});return;
  }
  if(data.kind==='block'){
   const start=now();postMessage({kind:'block-start',start});
   const deadline=performance.now()+500;
   while(performance.now()<deadline){} // Deliberate, real preparation CPU stall.
   postMessage({kind:'block-end',start,end:now()});return;
  }
  if(data.kind==='inspect'){
   const readback=remote.device.createBuffer({size:16,usage:9}),encoder=remote.device.createCommandEncoder();
   encoder.copyBufferToBuffer(buffer,0,readback,0,16);
   remote.device.queue.submit([encoder.finish()]);await readback.mapAsync(1);
   const values=Array.from(new Float32Array(readback.getMappedRange()));
   readback.unmap();readback.destroy();
   postMessage({kind:'inspection',values,execution:await remote.inspectAsync()});return;
  }
  if(data.kind==='dispose'){remote?.dispose();postMessage({kind:'disposed'});close();return;}
  throw Error('Unknown native route control audit request');
 }catch(error){postMessage({kind:'failure',message:String(error.stack??error)});}
};
