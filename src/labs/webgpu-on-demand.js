import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {createSharedCharacterFallback} from './shared-character-material.js';
import {createSharedPhysicalMaterial,physicalFamilyKey} from './shared-physical-material.js';

const modelNames = [
  'guardian', 'hyena', 'lion', 'rhino', 'buffalo', 'warthog',
  'olderMale', 'olderFemale', 'youngMale', 'youngFemale',
];
const qs = new URLSearchParams(location.search);
const backend = qs.get('backend') === 'webgl' ? 'webgl' : 'webgpu';
const source = qs.get('source') === 'lod' ? 'lod' : 'full';
const queueFence = qs.get('queueFence') === '1';
const compileTarget = qs.get('target') === 'live' ? 'live' : 'separate';
const swapPreparation = ['actor','scope'].includes(qs.get('swapPreparation')) ? qs.get('swapPreparation') : 'clone';
const matchSwapTarget = qs.get('matchSwapTarget') === '1';
const sharedFallback = qs.get('sharedFallback') === '1' && backend === 'webgpu';
const physicalFinal = qs.get('physicalFinal') === '1' && backend === 'webgpu';
const elements = Object.fromEntries([
  'viewport', 'load', 'spawn', 'sequence', 'clear', 'model', 'mode',
  'status', 'metrics', 'events', 'reset', 'copy',
].map(id => [id, document.getElementById(id)]));
document.getElementById(backend + '-link').classList.add('active');
document.getElementById('source-'+source).classList.add('active');
document.getElementById('target-'+compileTarget).classList.add('active');
document.getElementById(sharedFallback?'fallback-shared':'fallback-faithful').classList.add('active');
for(const value of ['webgl','webgpu'])document.getElementById(value+'-link').href=`?backend=${value}&source=${source}&target=${compileTarget}`;
for(const value of ['lod','full'])document.getElementById('source-'+value).href=`?backend=${backend}&source=${value}&target=${compileTarget}`;
for(const value of ['live','separate'])document.getElementById('target-'+value).href=`?backend=${backend}&source=${source}&target=${value}`;
for(const value of ['faithful','shared'])document.getElementById('fallback-'+value).href=`?backend=${backend}&source=${source}&target=${compileTarget}&sharedFallback=${value==='shared'?1:0}`;

const report = {
  backendRequested: backend,
  backendActual: null,
  threeVersion: THREE.REVISION,
  source,
  queueFence,
  compileTarget,
  swapPreparation,
  matchSwapTarget,
  sharedFallback,
  physicalFinal,
  resources: [],
  backendDetails: null,
  environment:{userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio||1,visibility:document.visibilityState,visibilityChanges:[]},
  resourceLoadMs: null,
  frameIntervalsMs: [],
  frames: [],
  longTasks: [],
  appearances: [],
  errors: [],
};
window.wildGuardiansWebGpuLabReport = () => structuredClone(report);
window.wildGuardiansWebGpuLabStatus = () => ({backend:report.backendActual,errors:report.errors.length,resources:report.resources.length,appearances:report.appearances.length,running:sequenceRunning,busy});
const writeStatus = value => { elements.status.textContent = value; };
const log = message => {
  const line = '[' + new Date().toLocaleTimeString() + '] ' + message;
  elements.events.textContent = line + '\n' + elements.events.textContent;
  console.info('[WebGPU on demand]', message);
};
const now = () => performance.now();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let renderer, camera, scene, preparationScene,swapScene;
let busy = false;
let sequenceRunning = false;
let resourcesLoaded = false;
let lastFrame = null;
let lastTelemetry = 0;
let frameNumber = 0;
const assets = new Map();
const actors = [];
const fallbackMaterials = new Map();
const sharedMaterials=new Map();
const physicalMaterials=new Map();
const intervalLimit = 5000;
try { new PerformanceObserver(list => { for (const entry of list.getEntries()) report.longTasks.push({start:entry.startTime,duration:entry.duration}); }).observe({type:'longtask',buffered:true}); } catch {}
document.addEventListener('visibilitychange',()=>report.environment.visibilityChanges.push({at:performance.now(),state:document.visibilityState}));

function sampleStats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
  return {
    samples: sorted.length,
    mean: values.reduce((sum,value)=>sum+value,0)/values.length,
    median: percentile(0.50),
    p95: percentile(0.95),
    p99: percentile(0.99),
    worst: sorted.at(-1),
    above16ms: values.filter(v => v > 16.7).length,
    above33ms: values.filter(v => v > 33.3).length,
    above50ms: values.filter(v => v > 50).length,
  };
}

function setButtons() {
  elements.load.disabled = busy || sequenceRunning || resourcesLoaded || !renderer;
  elements.spawn.disabled = busy || sequenceRunning || !resourcesLoaded;
  elements.sequence.disabled = busy || sequenceRunning || !resourcesLoaded;
  elements.clear.disabled = busy || sequenceRunning || !renderer;
  elements.reset.disabled = !renderer;
  elements.copy.disabled = !renderer;
}

function telemetry() {
  const stats = sampleStats(report.frameIntervalsMs);
  const n = value => value.toFixed(1) + ' ms';
  elements.metrics.textContent = [
    'Backend: ' + (report.backendActual || 'inicializando'),
    'Modelos visibles: ' + actors.length,
    'GLB cargados: ' + assets.size + '/' + modelNames.length,
    'Carga GLB: ' + (report.resourceLoadMs == null ? 'pendiente' : n(report.resourceLoadMs)),
    'Apariciones: ' + report.appearances.length,
    stats ? 'Intervalos: ' + stats.samples : 'Intervalos: 0',
    stats ? 'Mediana: ' + n(stats.median) : '',
    stats ? 'Media: ' + n(stats.mean) : '',
    stats ? 'P95: ' + n(stats.p95) : '',
    stats ? 'P99: ' + n(stats.p99) : '',
    stats ? 'Máximo: ' + n(stats.worst) : '',
    stats ? 'Frames >16,7 ms: ' + stats.above16ms : '',
    stats ? 'Frames >33,3 ms: ' + stats.above33ms : '',
    stats ? 'Frames >50 ms: ' + stats.above50ms : '',
  ].filter(Boolean).join('\n');
}

function addLights(target) {
  const hemi = new THREE.HemisphereLight('#e7f0e7', '#70624e', 2);
  const sun = new THREE.DirectionalLight('#fff0d4', 3);
  sun.position.set(-6, 12, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  target.add(hemi, sun, sun.target);
}

function makeActor(name) {
  const asset = assets.get(name);
  const model = cloneSkeleton(asset.scene);
  model.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = 2.7 / Math.max(size.x, size.y, size.z, 0.0001);
  model.scale.multiplyScalar(scale);
  box.setFromObject(model);
  model.position.x -= (box.min.x + box.max.x) / 2;
  model.position.y -= box.min.y;
  model.position.z -= (box.min.z + box.max.z) / 2;
  const root = new THREE.Group();
  root.add(model);
  const slot = actors.length;
  root.position.set((slot % 5 - 2) * 5, 0, Math.floor(slot / 5) * 5 - 3);
  let mixer = null;
  if (asset.animations?.length) {
    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(asset.animations[0]).play();
  }
  return {root, mixer, name};
}

async function spawn(name = elements.model.value) {
  if (busy || !resourcesLoaded) return;
  busy = true;
  setButtons();
  const strategy = elements.mode.value;
  const begin = now();
  const row = {name, strategy, requestedAt:begin, actorPreparedAt:null, compileRequestedAt:null, compileReturnedAt:null, compileResolvedAt:null, addedAt:null, firstDrawAt:null, fallbackFirstDrawAt:null, upgradeRequestedAt:null, upgradedAt:null, finalFirstDrawAt:null, fallbackDrawsWhilePending:0, fallbackFramesWhilePending:0, drewBeforeReady:false, msUntilAdded:null, msUntilFirstDraw:null, changedMaterials:0, sharedMeshes:0, physicalMeshes:0, totalMeshes:0, success:false};
  try {
    const actor = makeActor(name);
    if(physicalFinal)actor.root.traverse(object=>{if(!object.isMesh||Array.isArray(object.material)||!object.material.isMeshPhysicalMaterial)return;const original=object.material,key=physicalFamilyKey(original);let family=physicalMaterials.get(key);if(!family){const candidate=createSharedPhysicalMaterial(original);if(candidate.supports(object,original)){family=candidate;physicalMaterials.set(key,family);}else candidate.dispose();}if(family?.bind(object,original)){object.material=family.material;row.physicalMeshes++;}});
    row.actorPreparedAt=now();
    const replacing=strategy==='swap'||strategy==='swap-direct',materials=[],changed=new Set();let resolveFallback,preparing=false;
    const fallbackDrawn=new Promise(resolve=>resolveFallback=resolve);
    actor.root.traverse(object=>{if(!object.isMesh)return;row.totalMeshes++;const original=object.material;
      if(replacing){const source=Array.isArray(original)?original:[original];if(sharedFallback&&!Array.isArray(original)&&original.type==='MeshStandardMaterial'){const key=[original.side,original.vertexColors,!!original.map].join(':');let shared=sharedMaterials.get(key);if(!shared){const candidate=createSharedCharacterFallback(original);if(candidate.supports(object,original)){shared=candidate;sharedMaterials.set(key,shared);}else candidate.dispose();}if(shared?.bind(object,original)){object.material=shared.material;row.sharedMeshes++;}}if(object.material===original){const old=source.map(material=>{let fallback=fallbackMaterials.get(material);if(!fallback){fallback=material.clone();fallback.normalMap=null;fallbackMaterials.set(material,fallback);}return fallback;});object.material=Array.isArray(original)?old:old[0];}for(const material of source)if(material.normalMap)changed.add(material);materials.push({object,original,fallback:object.material});}
      const previous=object.onBeforeRender;object.onBeforeRender=function(renderer,drawScene,...rest){previous.call(this,renderer,drawScene,...rest);if(drawScene!==scene||preparing)return;const at=now();if(row.firstDrawAt===null){row.firstDrawAt=at;row.msUntilFirstDraw=at-begin;}if(replacing){if(row.upgradeRequestedAt===null){if(row.fallbackFirstDrawAt===null){row.fallbackFirstDrawAt=at;resolveFallback();}}else if(row.upgradedAt===null){row.fallbackDrawsWhilePending++;if(row.lastPendingFrame!==frameNumber){row.lastPendingFrame=frameNumber;row.fallbackFramesWhilePending++;}const finalMaterials=Array.isArray(original)?original:[original];if(strategy==='swap'&&row.compileResolvedAt===null&&finalMaterials.includes(rest[2]))row.drewBeforeReady=true;}else row.finalFirstDrawAt??=at;}else if(strategy==='async'&&row.compileResolvedAt===null)row.drewBeforeReady=true;};});
    row.changedMaterials=changed.size;
    if(replacing){
      scene.add(actor.root);actors.push(actor);row.addedAt=now();row.msUntilAdded=row.addedAt-begin;
      // The existing look is actually drawn before requesting its replacement.
      await Promise.race([fallbackDrawn,pause(10000).then(()=>{throw Error('El material anterior no llegó a dibujarse');})]);await pause(250);row.upgradeRequestedAt=now();
      if(strategy==='swap'){
        for(const item of materials)item.object.material=item.original;
        let pending,temporary=null;
        try{
          try{if(swapPreparation==='clone'){temporary=cloneSkeleton(actor.root);temporary.traverse(object=>{if(object.isMesh)object.frustumCulled=false;});swapScene.add(temporary);temporary.updateMatrixWorld(true);}const previousTarget=renderer.getRenderTarget(),restore=[];try{if(swapPreparation==='scope'){const selected=new Set();actor.root.traverse(object=>selected.add(object));scene.traverse(object=>{if(!(object.isMesh||object.isLine||object.isPoints))return;if(selected.has(object)){const previous=object.frustumCulled;object.frustumCulled=false;restore.push(()=>object.frustumCulled=previous);}else{const previous=object.visible;object.visible=false;restore.push(()=>object.visible=previous);}});}if(matchSwapTarget){if(backend!=='webgpu'||typeof renderer._getFrameBufferTarget!=='function')throw Error('Target matching requires the experimental WebGPU renderer');const target=renderer._getFrameBufferTarget();if(!target)throw Error('No intermediate framebuffer target');renderer.setRenderTarget(target);}row.compileRequestedAt=now();preparing=true;try{pending=renderer.compileAsync(swapPreparation==='scope'?scene:temporary?swapScene:actor.root,camera,scene);}finally{preparing=false;}row.compileReturnedAt=now();}finally{if(matchSwapTarget)renderer.setRenderTarget(previousTarget);for(const reset of restore)reset();}}finally{for(const item of materials)item.object.material=item.fallback;}
          await pending;row.compileResolvedAt=now();
        }finally{if(temporary){swapScene.remove(temporary);const skeletons=new Set();temporary.traverse(object=>{if(object.isSkinnedMesh)skeletons.add(object.skeleton);});for(const skeleton of skeletons)skeleton.dispose();}}
      }
      for(const item of materials)item.object.material=item.original;
      row.upgradedAt=now();row.success=true;
      log(name+': '+strategy+'; material sustituido tras '+(row.upgradedAt-row.upgradeRequestedAt).toFixed(1)+' ms');
      return;
    }
    if (strategy === 'async') {
      // The model stays in a separate preparation scene until compileAsync resolves.
      // Matching lights minimize program-variant differences after adoption.
      preparationScene.add(actor.root);
      writeStatus('Compilando bajo demanda: ' + name + '\nEl renderizado principal continúa.');
      try {
        row.compileRequestedAt=now();
        const pending=renderer.compileAsync(preparationScene, camera,compileTarget==='live'?scene:null);
        row.compileReturnedAt=now();
        await pending;
        row.compileResolvedAt=now();
      } finally {
        preparationScene.remove(actor.root);
      }
    }
    // In direct mode, the first draw happens without any explicit shader preparation.
    scene.add(actor.root);
    actors.push(actor);
    row.addedAt=now();
    row.msUntilAdded = row.addedAt - begin;
    row.success = true;
    log(name + ': ' + strategy + '; incorporado tras ' + row.msUntilAdded.toFixed(1) + ' ms');
    writeStatus('Backend: ' + report.backendActual + '\nÚltimo modelo: ' + name + ' (' + strategy + ')');
  } catch (error) {
    row.error = String(error?.message || error);
    report.errors.push(row.error);
    log('ERROR al preparar ' + name + ': ' + row.error);
    writeStatus('Error de compatibilidad: ' + row.error);
  } finally {
    report.appearances.push(row);
    busy = false;
    setButtons();
    telemetry();
  }
}

async function loadAssets() {
  if (busy || resourcesLoaded) return;
  busy = true;
  setButtons();
  const loader = new GLTFLoader();
  const start = now();
  writeStatus('Cargando y decodificando 10 GLB; sin compileAsync ni renderizados ocultos.');
  try {
    const manifest=source==='full'?await (await fetch('/tests/fixtures/character-lod-sources.json')).json():null;
    const results = await Promise.all(modelNames.map(async name => {
      const path=source==='full'?'/'+manifest.find(item=>item.id===name).source.replace(/^public\//,''):'/content/character-lod/' + name + '.glb';
      const gltf = await loader.loadAsync(path);
      let meshes=0,skinned=0;gltf.scene.traverse(object=>{if(object.isMesh)meshes++;if(object.isSkinnedMesh)skinned++;});
      report.resources.push({name,path,meshes,skinned,clips:gltf.animations.length});
      return [name, gltf];
    }));
    for (const [name, gltf] of results) assets.set(name, gltf);
    report.resourceLoadMs = now() - start;
    resourcesLoaded = true;
    log('Recursos listos en ' + report.resourceLoadMs.toFixed(1) + ' ms; shaders de personajes aún sin precalentar.');
    writeStatus('Recursos listos. Elige compilar bajo demanda o mostrar directamente.');
  } catch (error) {
    const message = String(error?.message || error);
    report.errors.push(message);
    log('Error al cargar GLB: ' + message);
    writeStatus('No se pudieron cargar todos los GLB: ' + message);
  } finally {
    busy = false;
    setButtons();
    telemetry();
  }
}

function clearActors() {
  if (busy) return;
  for (const actor of actors) {
    actor.mixer?.stopAllAction();
    scene.remove(actor.root);
    const skeletons=new Set();actor.root.traverse(object=>{if(object.isSkinnedMesh)skeletons.add(object.skeleton);for(const shared of sharedMaterials.values())shared.release(object);for(const family of physicalMaterials.values())family.release(object);});
    for(const skeleton of skeletons)skeleton.dispose();
  }
  actors.length = 0;
  // Assets/materials remain cached intentionally: first-use tests need a page reload.
  log('Actores retirados (la caché gráfica persiste).');
  telemetry();
}

async function runSequence() {
  if (busy || sequenceRunning || !resourcesLoaded) return;
  sequenceRunning = true;
  setButtons();
  try {
    for (const name of modelNames) {
      await spawn(name);
      await pause(650);
    }
    log('Secuencia completada. Recarga para un ensayo en frío.');
  } finally {
    sequenceRunning = false;
    setButtons();
  }
}

function resetMeasurement() {
  report.frameIntervalsMs.length = 0;
  report.frames.length = 0;
  report.longTasks.length = 0;
  report.appearances.length = 0;
  lastFrame = null;
  log('Medición reiniciada (la caché GPU NO se borra).');
  telemetry();
}

async function main() {
  if (backend === 'webgpu' && (!navigator.gpu || !window.isSecureContext)) {
    throw new Error('Se requiere navegador con WebGPU y contexto seguro (localhost o HTTPS).');
  }
  const canvas = elements.viewport;
  renderer = backend === 'webgpu'
    ? new WebGPURenderer({canvas, antialias: false, alpha: false})
    : new THREE.WebGLRenderer({canvas, antialias: false, alpha: false});
  renderer.setPixelRatio(1);
  renderer.setSize(960, 540, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (backend === 'webgpu') {
    await renderer.init();
    // Refuse silent WebGL fallback: the user is explicitly testing true WebGPU.
    if (!renderer.backend?.isWebGPUBackend) {
      throw new Error('WebGPURenderer no activó el backend WebGPU real; no se acepta fallback silencioso.');
    }
    report.backendActual = 'WebGPU real';
    const info=renderer.backend.device.adapterInfo;
    report.backendDetails={deviceInfo:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,features:[...renderer.backend.device.features]};
    renderer.backend.device.lost.then(info=>{report.errors.push('WebGPU device lost: '+info.reason+' '+info.message);});
  } else {
    if (!renderer.getContext().getParameter(renderer.getContext().VERSION).includes('WebGL 2')) {
      throw new Error('El modo de referencia requiere WebGL2.');
    }
    report.backendActual = 'WebGL2';
    const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
    report.backendDetails={version:gl.getParameter(gl.VERSION),renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
  }
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#8097a4');
  preparationScene = new THREE.Scene();
  swapScene = new THREE.Scene();
  addLights(scene);
  if(compileTarget==='separate')addLights(preparationScene);
  camera = new THREE.PerspectiveCamera(46, 960/540, 0.1, 200);
  camera.position.set(14, 15, 29);
  camera.lookAt(0, 1.4, 0);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshStandardMaterial({color: '#70816d', roughness: 0.96}),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const marker=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,1.1),ground.material);
  marker.position.set(0,1.4,0);marker.castShadow=true;scene.add(marker);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(t => {
    frameNumber++;
    if (lastFrame != null) {
      const dt = t - lastFrame;
      if (dt > 0) {
        report.frameIntervalsMs.push(dt);
        if (report.frameIntervalsMs.length > intervalLimit) report.frameIntervalsMs.shift();
      }
    }
    lastFrame = t;
    const delta = Math.min(clock.getDelta(), 0.05);
    marker.rotation.y+=delta*.6;
    for (const actor of actors) {
      if (actor.mixer) actor.mixer.update(delta);
      else actor.root.rotation.y += delta * 0.14;
    }
    const renderStart=now();
    try {
      renderer.render(scene, camera);
    } catch (error) {
      report.errors.push(String(error?.message || error));
      writeStatus('Error al renderizar: ' + String(error?.message || error));
      renderer.setAnimationLoop(null);
      throw error;
    }
    if(queueFence&&backend==='webgpu')for(const row of report.appearances){
      if(row.firstDrawAt===null||row.queueFenceRequestedAt!==undefined)continue;
      row.queueFenceRequestedAt=now();
      renderer.backend.device.queue.onSubmittedWorkDone().then(()=>{row.queueFenceCompletedAt=now();},error=>{row.queueFenceError=String(error);});
    }
    report.frames.push({at:t,renderStart,renderCpuMs:now()-renderStart,actors:actors.length});
    if(report.frames.length>intervalLimit)report.frames.shift();
    if (t - lastTelemetry > 250) {
      lastTelemetry = t;
      telemetry();
    }
  });
  log('Renderer iniciado: ' + report.backendActual + '. Solo está compilada la escena base.');
  writeStatus('Renderer: ' + report.backendActual + '\nPulsa «Cargar GLB».');
  setButtons();
  telemetry();
}

for (const [id, handler] of [
  ['load', loadAssets], ['spawn', () => spawn()], ['sequence', runSequence],
  ['clear', clearActors], ['reset', resetMeasurement],
  ['copy', async () => {
    const snapshot = {...report, frameStats: sampleStats(report.frameIntervalsMs)};
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    log('Informe copiado al portapapeles.');
  }],
]) elements[id].addEventListener('click', handler);

main().catch(error => {
  const message = String(error?.message || error);
  report.errors.push(message);
  writeStatus('ERROR de inicialización: ' + message);
  log(message);
  console.error(error);
  renderer = null;
  setButtons();
});
