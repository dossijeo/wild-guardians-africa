import {groundGLB} from './plane.js';
const report = window.filamentGate = {started: new Date().toISOString(), events: [], errors: [], done: false};
const started = performance.now();
function record(stage, data = {}) {
  report.events.push({stage, ms: performance.now() - started, ...data});
  document.querySelector('#status').textContent = JSON.stringify(report, null, 2);
}
addEventListener('error', event => {report.errors.push(String(event.error ?? event.message)); record('error');});
addEventListener('unhandledrejection', event => {report.errors.push(String(event.reason)); record('rejection');});
try {
  if (!navigator.gpu) throw Error('WebGPU API unavailable');
  const adapter = await navigator.gpu.requestAdapter({powerPreference: 'low-power', forceFallbackAdapter: false});
  if (!adapter) throw Error('No hardware WebGPU adapter');
  const info = adapter.info;
  report.adapter = {vendor: info.vendor, architecture: info.architecture, device: info.device,
    description: info.description, isFallbackAdapter: info.isFallbackAdapter ?? adapter.isFallbackAdapter,
    features: [...adapter.features]};
  if (report.adapter.isFallbackAdapter || /swiftshader|llvmpipe|software/i.test(info.description)) throw Error('Software adapter rejected');
  record('hardware-adapter');
  // Pass precisely the hardware device whose identity was recorded, before WASM instantiation.
  const optionalFeatures = ['immediates','chromium-experimental-immediate-data','rg11b10ufloat-renderable',
    'float32-filterable','float32-blendable','depth-clip-control','depth32float-stencil8',
    'texture-compression-bc','texture-compression-etc2','texture-compression-astc'];
  const requiredFeatures = optionalFeatures.filter(feature=>adapter.features.has(feature));
  const requiredLimits = {};
  for(const key in adapter.limits) requiredLimits[key] = adapter.limits[key];
  const device = await adapter.requestDevice({requiredFeatures,requiredLimits});
  report.deviceFeatures = [...device.features];
  report.submissions = 0;
  const submit = device.queue.submit.bind(device.queue);
  device.queue.submit = buffers => { report.submissions++; return submit(buffers); };
  device.addEventListener('uncapturederror', event => {report.errors.push(event.error.message); record('device-error');});
  Filament.preinitializedWebGPUDevice = device;
  record('device-created');
  await Promise.race([new Promise(resolve => Filament.init([], resolve)),
    new Promise((_, reject) => setTimeout(() => reject(Error('WASM initialization timeout')), 30000))]);
  record('wasm-initialized', {webgpuEnum: Filament.Backend.WEBGPU?.value ?? null,
    initWebGPUAvailable: typeof Filament.initWebGPU === 'function', wasmBytes: Filament.HEAPU8?.byteLength});
  if (!Filament.Backend.WEBGPU) throw Error('Official web distribution does not expose Backend.WEBGPU');
  const engine = Filament.Engine.create(document.querySelector('canvas'), {backend: Filament.Backend.WEBGPU});
  if (!engine || engine.getBackend().value !== Filament.Backend.WEBGPU.value) throw Error('Requested WebGPU backend not active');
  window.filamentEngine = engine;
  const swapChain = engine.createSwapChain();
  record('webgpu-surface-created');
  window.filamentSwapChain = swapChain;
  report.backend = 'WEBGPU';
  const scene = engine.createScene(), view = engine.createView(), renderer = engine.createRenderer();
  const camera = engine.createCamera(Filament.EntityManager.get().create());
  camera.setProjectionFov(45, 960/540, .1, 100, Filament.Camera$Fov.VERTICAL);
  camera.setExposure(16, 1/125, 100);
  view.setScene(scene); view.setCamera(camera); view.setViewport([0,0,960,540]);
  renderer.setClearOptions({clearColor:[.25,.35,.3,1],clear:true,discard:true});
  const sun = Filament.EntityManager.get().create();
  Filament.LightManager.Builder(Filament.LightManager$Type.DIRECTIONAL)
    .color([1,.95,.85]).intensity(100000).direction([-.6,-1,-.8]).castShadows(true).build(engine,sun);
  scene.addEntity(sun);
  const loader = engine.createAssetLoader();
  const ground=loader.createAsset(groundGLB());
  await new Promise(resolve=>ground.loadResources(resolve,null,null,1));
  scene.addEntities(ground.getEntities());
  const descriptor = (await (await fetch('/content/worker-actions.json')).json()).youngMale;
  const bytes = new Uint8Array(await (await fetch(descriptor.url)).arrayBuffer());
  record('glb-downloaded',{url:descriptor.url,bytes:bytes.byteLength});
  const asset = loader.createAsset(bytes);
  if (!asset) throw Error('GLB import failed');
  await new Promise(resolve=>asset.loadResources(resolve,null,null,1));
  scene.addEntities(asset.getEntities());
  const bounds = asset.getBoundingBox(), animator = asset.getInstance().getAnimator();
  report.model = {bounds,entities:asset.getEntities().length,animations:animator.getAnimationCount()};
  const center = bounds.min.map((v,i)=>(v+bounds.max[i])/2);
  const radius = Math.max(...bounds.min.map((v,i)=>bounds.max[i]-v))*1.8;
  record('glb-resources-loaded');
  report.renderedFrames = 0;
  window.filamentScene = {scene,view,renderer,camera,asset,ground,loader,animator};
  for(let frame=0;frame<120;frame++) {
    await new Promise(requestAnimationFrame);
    const t=frame/60;
    camera.lookAt([center[0]+Math.sin(t*.3)*radius,center[1]+radius*.4,center[2]+Math.cos(t*.3)*radius],center,[0,1,0]);
    if(animator.getAnimationCount()) {animator.applyAnimation(0,t);animator.updateBoneMatrices();}
    renderer.render(swapChain,view);
    report.renderedFrames++;
    if(report.errors.length) throw Error('GPU errors during rendering');
  }
  await device.queue.onSubmittedWorkDone();
  record('render-completed');
} catch (error) {
  report.errors.push(String(error.stack ?? error));
  record('gate-failed');
} finally {
  report.done = true;
  record('finished');
}
