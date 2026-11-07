// Development-only callers may retain interaction updates without issuing a
// second world draw underneath the active WebGPU canvas. If the Worker fails,
// the next frame returns to the original renderer immediately.
export function exclusiveWebGpuDrawEnabled(params, development){
 return development && params.has('qa-webgpu-world') && !params.has('qa-webgpu-allow-legacy-draw');
}

export function renderWithOptionalWebGpuPresentation(world,dt,skipLegacyDraw=false){
 const status=skipLegacyDraw?world.webGpuWorld?.client?.status():null;
 if(status?.phase==='running'&&status.backend==='WebGPU'&&status.firstFrameRendered===true){
  for(const step of world.renderFrameUpdates(dt,dt,{legacyDraw:false})){};
  return;
 }
 return world.render(dt);
}
