const REF='__remoteGpuId',CURRENT='@canvas';
const draws=new Set(['draw','drawIndexed','drawIndirect','drawIndexedIndirect']);
const populatedDraw=command=>draws.has(command.method)&&(!['draw','drawIndexed'].includes(command.method)||command.args[0]!==0&&command.args[1]!==0);
const renderPipeline=entry=>entry&&['createRenderPipeline','createRenderPipelineAsync'].includes(entry.kind);

// Resource entries are the pinned native generation, not producer IDs alone.
// A setPipeline without a draw does not establish first use.
export function remoteDrawPipelineEntries(operations,snapshot,{strict=true}={}){
 const result=new Set(),visiting=new Set();
 function visit(commands){let pipeline=null;for(const command of commands){
  if(command.method==='setPipeline'){pipeline=snapshot.get(command.args[0]?.[REF]);if(!renderPipeline(pipeline)){if(strict)throw Error('Render draw has no current native pipeline');pipeline=null;}}
  else if(populatedDraw(command)){if(!pipeline){if(strict)throw Error('Render draw has no current native pipeline');continue;}result.add(pipeline);}
  else if(command.method==='executeBundles'){for(const ref of command.args[0]){const entry=snapshot.get(ref[REF]);if(!entry||entry.kind!=='bundle'||visiting.has(entry))throw Error('Invalid prepared render bundle');visiting.add(entry);visit(entry.commands);visiting.delete(entry);}pipeline=null;}
 }}
 for(const op of operations)if(op.method==='submit')for(const buffer of op.args[0])if(!buffer.texturePreparation)for(const command of buffer.__remoteCommands)if(command.method==='beginRenderPass')visit(command.commands);
 return result;
}

// Like compile + a private-target draw (Drei Preload / Three CubeCamera), but
// replay the exact native pipelines/layouts of this already prepared packet.
// Only new pipelines draw; canonical buffers, bind groups and banks are reused.
// The caller owns submission, validation, the existing fence and retirement.
export function prepareRemoteFirstUse({device,packet,canvasConfiguration,resolve}){
 const snapshot=packet.resourceSnapshot,pipelines=new Set([...packet.drawnPipelines].filter(entry=>!entry.firstUseSubmitted&&!entry.firstUseCompletion)),textures=[],buffers=[];
 const waiting=[...new Set([...packet.drawnPipelines].map(entry=>entry.firstUseCompletion).filter(Boolean))];
 const result={pipelines,textures,buffers,waiting,passes:0,draws:0};
 if(!pipelines.size)return result;
 function readOnlyGroup(group){
  const layout=group.dependencyEntries.get(group.descriptor.layout?.[REF]);
  for(const binding of group.descriptor.entries??[]){const declaration=layout?.descriptor?.entries?.find(e=>e.binding===binding.binding),resource=snapshot.get(binding.resource?.[REF]);
   if(binding.resource?.buffer){const buffer=snapshot.get(binding.resource.buffer[REF]);if(buffer?.descriptor.usage&128)if(!declaration?.buffer||!['uniform','read-only-storage'].includes(declaration.buffer.type??'uniform'))throw Error('Prepared first use requires read-only storage buffers');}
   if(declaration?.storageTexture&&declaration.storageTexture.access!=='read-only')throw Error('Prepared first use requires read-only storage textures');
   if(resource?.kind==='view'&&!declaration?.texture&&!declaration?.storageTexture){const texture=[...resource.dependencyEntries.values()].find(e=>e.kind==='createTexture');if(texture?.descriptor.usage&8)throw Error('Prepared first use has an unclassified storage texture');}
  }
 }
 function readOnlyDraws(commands){let pipeline=null;const groups=new Map();for(const command of commands){
  if(command.method==='setPipeline')pipeline=snapshot.get(command.args[0][REF]);
  else if(command.method==='setBindGroup')groups.set(command.args[0],snapshot.get(command.args[1][REF]));
  else if(populatedDraw(command)){const layout=snapshot.get(pipeline?.descriptor?.layout?.[REF]),count=layout?.descriptor?.bindGroupLayouts?.length??Infinity;for(const[index,group]of groups)if(index<count)readOnlyGroup(group);}
 }}
 const privateTextures=new Map();
 function textureSource(ref){
  const key=ref?.[REF],entry=snapshot.get(key);
  if(key===CURRENT||entry?.currentView)return {key:CURRENT,view:entry?.descriptor??{}};
  if(entry?.kind==='createTexture')return {key:entry,entry,view:{}};
  if(entry?.kind==='view'){const texture=[...entry.dependencyEntries.values()].find(e=>e.kind==='createTexture');if(texture)return {key:texture,entry:texture,view:entry.descriptor};}
  throw Error('Prepared first use has no exact texture generation');
 }
 function privateTexture(source){
  if(privateTextures.has(source.key))return privateTextures.get(source.key);
  const descriptor=source.key===CURRENT?{size:[packet.width,packet.height,1],format:canvasConfiguration?.format,usage:23,...(canvasConfiguration?.viewFormats?{viewFormats:canvasConfiguration.viewFormats}:{})}:source.entry.descriptor;
  if(!descriptor?.format)throw Error('Prepared first use lacks the configured canvas format');
  const texture=device.createTexture({...descriptor,label:'prepared-first-use:'+String(descriptor.label??'attachment')});textures.push(texture);privateTextures.set(source.key,texture);return texture;
 }
 function attachment(ref){const source=textureSource(ref);return privateTexture(source).createView(source.view);}

 function filtered(commands){let pipeline=null,drawCount=0;const selected=[];
  for(const command of commands){
   if(command.method==='setPipeline')pipeline=snapshot.get(command.args[0][REF]);
   if(draws.has(command.method)){if(!populatedDraw(command)||!pipelines.has(pipeline))continue;drawCount++;}
   if(command.method==='executeBundles'){
    // Reuse the bundle's native resources, not its unrelated hot draws. Render
    // bundle commands are legal on a render pass; the original bundle is kept.
    for(const ref of command.args[0]){const entry=snapshot.get(ref[REF]),nested=filtered(entry.commands);if(nested.drawCount){selected.push(...nested.commands);drawCount+=nested.drawCount;}}
    pipeline=null;continue;
   }
   if(['beginOcclusionQuery','endOcclusionQuery'].includes(command.method))continue;
   selected.push(command);
  }
  return {commands:selected,drawCount};
 }
 try{
  // CPU uploads have already been isolated by the host's existing COW path.
  // Restore the exact baseline before replaying per-pass uniform writes.
  for(const [id,bytes]of packet.preparedBaselines)device.queue.writeBuffer(snapshot.get(id).value,0,bytes);
  for(const op of packet.operations){
   if(op.method==='writeBuffer'){device.queue.writeBuffer(...resolve(op.args));continue;}
   if(op.method!=='submit')continue;
   for(const buffer of op.args[0]){
    if(buffer.texturePreparation)continue;
    let encoder=null;const encode=()=>encoder??=device.createCommandEncoder(buffer.descriptor??{});
    for(const command of buffer.__remoteCommands){
     if(command.method==='beginRenderPass'){
      const selected=filtered(command.commands);if(!selected.drawCount)continue;readOnlyDraws(selected.commands);
      const source=command.args[0],descriptor={...source,colorAttachments:source.colorAttachments?.map(a=>a?{...a,view:attachment(a.view),...(a.resolveTarget?{resolveTarget:attachment(a.resolveTarget)}:{})}:null)};
      if(source.depthStencilAttachment)descriptor.depthStencilAttachment={...source.depthStencilAttachment,view:attachment(source.depthStencilAttachment.view)};
      delete descriptor.timestampWrites;delete descriptor.occlusionQuerySet;
      const pass=encode().beginRenderPass(descriptor);for(const item of selected.commands)pass[item.method](...resolve(item.args));pass.end();result.passes++;result.draws+=selected.drawCount;
     }
     // Copies, readbacks, queries and compute are not pipeline first-use work.
    }
    if(encoder)buffers.push(encoder.finish());
   }
  }
  return result;
 }catch(error){for(const texture of textures)texture.destroy();throw error;}
}
