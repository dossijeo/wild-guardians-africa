import {createRemoteWebGpu} from '../../src/rendering/remote-webgpu-client.js';

const now=()=>performance.timeOrigin+performance.now();
let remote,clockBuffer,diagnosticClock,resultBuffer,readback,computeGroup,compute;
self.onmessage=async({data})=>{
 try{
  if(data.kind==='initialize'){
   remote=await createRemoteWebGpu({port:data.port,onError:error=>postMessage({kind:'failure',message:String(error.stack??error)})});
   postMessage({kind:'device-ready'});return;
  }
  if(data.kind==='start'){
   const device=remote.device,format=remote.context.getConfiguration().format;
   remote.context.configure({device,format,alphaMode:'opaque'});
   const rows=new Float32Array(data.rows),count=rows.length/8;
   if(count<2||!Number.isInteger(count))throw Error('Expected native timetable samples');
   for(let i=1;i<count;i++)if(rows[i*8]<=rows[(i-1)*8])throw Error('Native knots are not representable by this diagnostic float clock');
   clockBuffer=device.createBuffer({size:16,usage:76});device.queue.writeBuffer(clockBuffer,0,new Float32Array([data.startTime,0,0,0]));
   const knots=device.createBuffer({size:rows.byteLength,usage:136});device.queue.writeBuffer(knots,0,rows);
   resultBuffer=device.createBuffer({size:32,usage:132});readback=device.createBuffer({size:32,usage:9});
   const layout=device.createBindGroupLayout({entries:[
    {binding:0,visibility:1,buffer:{type:'uniform'}},{binding:1,visibility:1,buffer:{type:'read-only-storage'}},
   ]}),group=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:clockBuffer}},{binding:1,resource:{buffer:knots}}]});
   // One-shot diagnostics cannot write to, or retain a writable view of, the
   // published render packet. Use a private immutable table and a queue-ordered
   // copy of its live clock; keep the production resource guards unchanged.
   diagnosticClock=device.createBuffer({size:16,usage:76});const diagnosticKnots=device.createBuffer({size:rows.byteLength,usage:136});
   device.queue.writeBuffer(diagnosticKnots,0,rows);
   const diagnosticLayout=device.createBindGroupLayout({entries:[
    {binding:0,visibility:4,buffer:{type:'uniform'}},{binding:1,visibility:4,buffer:{type:'read-only-storage'}},
    {binding:2,visibility:4,buffer:{type:'storage'}},
   ]});computeGroup=device.createBindGroup({layout:diagnosticLayout,entries:[
    {binding:0,resource:{buffer:diagnosticClock}},{binding:1,resource:{buffer:diagnosticKnots}},{binding:2,resource:{buffer:resultBuffer}},
   ]});
   // Conversion/replay of the complete native knot table only. It chooses no
   // routes, stopping points or phase/budget rules. One diagnostic compute uses
   // the same sampler as drawing, but is never part of the replayed render packet.
   const code=`
struct Sample { clock:f32, x:f32, z:f32, phase:f32, run:f32, walk:f32, carry:f32, budget:f32 }
struct Clock { at:f32, padding0:f32, padding1:vec2f }
@group(0) @binding(0) var<uniform> clock:Clock;
@group(0) @binding(1) var<storage,read> knots:array<Sample>;
@group(0) @binding(2) var<storage,read_write> result:Sample;
fn sample_route(at:f32)->Sample {
 if(at<=knots[0].clock){ return Sample(at,knots[0].x,knots[0].z,knots[0].phase,knots[0].run,knots[0].walk,knots[0].carry,knots[0].budget); }
 for(var i=1u;i<${count}u;i++){
  if(at<=knots[i].clock){let a=knots[i-1u];let b=knots[i];let f=clamp((at-a.clock)/(b.clock-a.clock),0.0,1.0);
   return Sample(at,mix(a.x,b.x,f),mix(a.z,b.z,f),mix(a.phase,b.phase,f),mix(a.run,b.run,f),mix(a.walk,b.walk,f),mix(a.carry,b.carry,f),mix(a.budget,b.budget,f));}
 }
 let a=knots[${count-1}u];return Sample(at,a.x,a.z,a.phase,a.run,a.walk,a.carry,a.budget);
}
struct Vertex { @builtin(position) position:vec4f, @location(0) phase:f32 }
@vertex fn vertex(@builtin(vertex_index) i:u32)->Vertex {
 let p=sample_route(clock.at);let points=array<vec2f,3>(vec2f(-0.3,-0.3),vec2f(0.3,-0.3),vec2f(0.0,0.3));
 return Vertex(vec4f(points[i]+vec2f(p.x-knots[0].x,p.z-knots[0].z)*0.1,0.0,1.0),p.walk);
}
@fragment fn fragment(v:Vertex)->@location(0) vec4f {return vec4f(0.2,0.6+min(v.phase,0.3),0.3,1.0);}
@compute @workgroup_size(1) fn inspect(){result=sample_route(clock.at);}
`,module=device.createShaderModule({code}),pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]}),render=await device.createRenderPipelineAsync({
    layout:pipelineLayout,vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'},
   });
   const diagnosticModule=device.createShaderModule({code});
   compute=await device.createComputePipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[diagnosticLayout]}),compute:{module:diagnosticModule,entryPoint:'inspect'}});
   remote.registerClockBinding(clockBuffer,{byteOffset:0,semantic:'absolute',epoch:0,nativeRoute:data.route});
   const anchor=now()+50,clock={version:1,epoch:0,elapsed:data.startTime,safeUntil:data.endTime,
    anchorAbsoluteMs:anchor,paused:false,segments:[{start:data.startTime,end:data.endTime,rate:1,realDuration:data.endTime-data.startTime}]};
   remote.beginFrame({clock});const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({
    colorAttachments:[{view:remote.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:.01,g:.02,b:.03,a:1}}],
   });
   pass.setPipeline(render);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);await remote.endFrame();
   postMessage({kind:'drawing',anchor});return;
  }
  if(data.kind==='block'){
   const start=now();postMessage({kind:'block-start',id:data.id,start});const end=performance.now()+500;
   while(performance.now()<end){} // Real synchronous preparation stall.
   postMessage({kind:'block-end',id:data.id,start,end:now()});return;
  }
  if(data.kind==='inspect'){
   const encoder=remote.device.createCommandEncoder();encoder.copyBufferToBuffer(clockBuffer,0,diagnosticClock,0,16);
   const pass=encoder.beginComputePass();pass.setPipeline(compute);pass.setBindGroup(0,computeGroup);pass.dispatchWorkgroups(1);pass.end();
   encoder.copyBufferToBuffer(resultBuffer,0,readback,0,32);remote.device.queue.submit([encoder.finish()]);await readback.mapAsync(1);
   const values=Array.from(new Float32Array(readback.getMappedRange()));readback.unmap();
   postMessage({kind:'inspection',id:data.id,values,execution:await remote.inspectAsync()});return;
  }
  if(data.kind==='status'){postMessage({kind:'status',id:data.id,execution:await remote.inspectAsync()});return;}
  if(data.kind==='lose-device'){remote.device.destroy();return;}
  if(data.kind==='dispose'){remote?.dispose();close();return;}
  throw Error('Unknown native gate hold audit request');
 }catch(error){postMessage({kind:'failure',message:String(error.stack??error)});}
};
