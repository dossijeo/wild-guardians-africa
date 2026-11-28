// Only Three's synchronous texture filters and offscreen clear use this contract.
// It grants no world identity or presentation time and is never replayed.
export function installRemoteTexturePreparation(renderer, remote) {
  const utils = renderer?.backend?.textureUtils;
  if (!utils || typeof remote?.withTexturePreparation !== 'function') throw TypeError('Remote texture preparation requires initialized WebGPU');
  const originals = new Map(), wrappers = new Map();
  for(const method of ['_generateMipmaps','_flipY'])if(typeof utils[method]!=='function')throw TypeError('Unsupported Three texture filter');
  for (const [method, operation] of [['_generateMipmaps', 'mipmaps'], ['_flipY', 'flip-y']]) {
    const original = utils[method];
    if (typeof original !== 'function') throw TypeError('Unsupported Three texture filter');
    originals.set(method, original);
    const wrapper = function(texture, ...args) {
      return remote.withTexturePreparation(texture, operation, () => original.call(this, texture, ...args));
    };
    wrappers.set(method, wrapper); utils[method] = wrapper;
  }
  const backend=renderer.backend,clear=backend.clear;
  const clearWrapper=function(...args){return args[3]!==null&&args[3]!==undefined?remote.withTextureClear(()=>clear.apply(this,args)):clear.apply(this,args);};
  if(typeof clear==='function')backend.clear=clearWrapper;
  return {dispose() {if(backend.clear===clearWrapper)backend.clear=clear;for (const [method, original] of originals) if (utils[method] === wrappers.get(method)) utils[method] = original;}};
}

const REF = '__remoteGpuId';
const debug = new Set(['insertDebugMarker', 'pushDebugGroup', 'popDebugGroup']);
const allowedKinds = new Set(['createTexture', 'view', 'createSampler', 'createBindGroup', 'createBindGroupLayout', 'createPipelineLayout', 'createShaderModule', 'createRenderPipeline', 'createRenderPipelineAsync', 'pipeline-layout', 'bundle']);

export function validRemoteTexturePreparation(buffer, resource) {
  const scope = buffer?.texturePreparation;
  if(scope?.version===1&&scope.operation==='clear'){
    const visited=new Set();
    const view=key=>{if(visited.has(key))return true;visited.add(key);const entry=resource(key);return !!entry&&!entry.currentView&&['view','createTexture'].includes(entry.kind)&&[...entry.dependencies||[]].every(view);};
    return buffer.__remoteCommands?.length===1&&buffer.__remoteCommands.every(command=>{
      const d=command.args?.[0],colors=d?.colorAttachments??[],depth=d?.depthStencilAttachment;
      return command.method==='beginRenderPass'&&command.commands?.length===0&&!d.timestampWrites&&!d.occlusionQuerySet&&(colors.length>0||!!depth)&&colors.every(a=>!a.resolveTarget&&resource(a.view?.[REF])?.kind==='view'&&view(a.view[REF]))&&(!depth||(resource(depth.view?.[REF])?.kind==='view'&&view(depth.view[REF])))&&(colors.some(a=>a.loadOp==='clear')||depth?.depthLoadOp==='clear'||depth?.stencilLoadOp==='clear');
    })===true;
  }
  if (scope?.version !== 1 || !['mipmaps', 'flip-y'].includes(scope.operation)) return false;
  const target = scope.texture?.[REF], temporaries = scope.temporaries;
  if (!target || target === '@canvas' || !Array.isArray(temporaries) || temporaries.length > (scope.operation === 'flip-y' ? 1 : 0)) return false;
  const textures = new Set([target, ...temporaries.map(value => value?.[REF])]);
  for (const key of textures) if (!key || key === '@canvas' || resource(key)?.kind !== 'createTexture') return false;
  const visited = new Set();
  function dependency(key, entry = resource(key)) {
    if (visited.has(key)) return true;
    visited.add(key);
    if (!entry || entry.currentView || !allowedKinds.has(entry.kind) || (entry.kind === 'createTexture' && !textures.has(key))) return false;
    for (const child of entry.dependencies || []) if (!dependency(child, entry.dependencyEntries?.get(child) || resource(child))) return false;
    return true;
  }
  function refs(value) {
    if (!value || typeof value !== 'object') return true;
    if (value[REF]) return dependency(value[REF]);
    return Object.values(value).every(refs);
  }
  function pass(commands, bundles = true) {
    if (!Array.isArray(commands)) return false;
    return commands.every(command => {
      if (debug.has(command.method)) return true;
      if (['setPipeline', 'setBindGroup'].includes(command.method)) return refs(command.args);
      if (command.method === 'draw') return JSON.stringify(command.args) === '[4,1,0,0]';
      if (bundles && command.method === 'executeBundles') return command.args?.[0]?.every(value => {
        const entry = resource(value?.[REF]);
        return entry?.kind === 'bundle' && dependency(value[REF]) && pass(entry.commands, false);
      }) === true;
      return false;
    });
  }
  return Array.isArray(buffer.__remoteCommands) && buffer.__remoteCommands.every(command => {
    if (debug.has(command.method)) return true;
    const descriptor = command.args?.[0], attachments = descriptor?.colorAttachments;
    if (command.method !== 'beginRenderPass' || descriptor.depthStencilAttachment || descriptor.timestampWrites || descriptor.occlusionQuerySet || attachments?.length !== 1) return false;
    const attachment = attachments[0], view = resource(attachment?.view?.[REF]);
    return !attachment.resolveTarget && view?.kind === 'view' && refs(descriptor) && pass(command.commands);
  });
}
