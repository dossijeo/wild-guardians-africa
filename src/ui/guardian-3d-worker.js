import * as THREE from 'three';

let actor, closed = false, diagnostics = false, prepared = false, pipelineCalls = [], firstDrawAt = null;
self.onmessage = async ({ data }) => {
 try {
  if (data.type === 'init') {
   diagnostics = data.diagnostics === true;
   const resolve = path => path.startsWith('content/guardian/lipsync/') ? new URL(path.slice('content/guardian/lipsync/'.length), data.cueBase).href : path;
   if(data.backend!=='webgpu')throw Error('Guardian Worker requires WebGPU');
    const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL context forbidden in WebGPU experiment');return original.call(this,kind,...args);};
    const {createGuardianWebGPU}=await import('./guardian-3d-webgpu-experiment.js');actor=await createGuardianWebGPU(data.canvas,{viewport:data.viewport,modelUrl:data.modelUrl,resolve});
    if(!actor.renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');
    const device=actor.renderer.backend.device;device.addEventListener('uncapturederror',event=>{if(!closed)self.postMessage({type:'error',message:event.error?.message??'WebGPU error'});});
    device.lost.then(info=>{if(!closed)self.postMessage({type:'error',message:'WebGPU device lost: '+info.message});});
    for(const name of ['createRenderPipeline','createRenderPipelineAsync']){const originalCall=device[name].bind(device);device[name]=(...args)=>{const at=performance.now(),entry={name,at,...(diagnostics?{label:args[0]?.label??'',stack:new Error().stack}: {})};try{return originalCall(...args);}finally{entry.cpuMs=performance.now()-at;pipelineCalls.push(entry);}};}
   await actor.ready;
   if (!closed) self.postMessage({ type: 'ready', backend:'webgpu' });
  } else if (data.type === 'record') {
   actor?.setRecord(data.record);
  } else if (data.type === 'frame') {
   if (!actor || closed) return;
   if (data.viewport) actor.resize(data.viewport);
   actor.manual = data.manual;
   actor.pointTarget = data.pointTarget ? new THREE.Vector3().fromArray(data.pointTarget) : null;
   if(!prepared){const previous=actor.vortex.visible;actor.vortex.visible=true;try{await actor.renderer.compileAsync(actor.scene,actor.camera);}finally{actor.vortex.visible=previous;}if(closed)return;prepared=true;}
   if(firstDrawAt===null)firstDrawAt=performance.now();
   actor.draw(data.frame);
   let detail;
   if (diagnostics) { const weights = {}; for (const mesh of actor.face?.meshes ?? []) for (const [key, index] of Object.entries(mesh.morphTargetDictionary)) if (key.startsWith('viseme_') || key.startsWith('blink_')) weights[key] = Math.max(weights[key] ?? 0, mesh.morphTargetInfluences[index]); detail = { cue: actor.face?.data?.id ?? null, weights }; }
   self.postMessage({ type: 'frame', sequence: data.sequence, metrics: actor.metrics, faceError: actor.face?.error?.message ?? null, ...(diagnostics ? { diagnostics: {...detail,backend:'webgpu',pipelineCalls:pipelineCalls.map(call=>({...call,afterFirstDraw:call.at>=firstDrawAt}))} } : {}) });
  } else if (data.type === 'dispose') {
   closed = true; actor?.dispose(); self.close();
  }
 } catch (error) { self.postMessage({ type: 'error', message: String(error?.stack ?? error) }); }
};
