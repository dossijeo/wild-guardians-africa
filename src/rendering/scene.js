import {prepareCropDepthPrograms} from './crop-depth-preparation.js';
import {streamingOptions} from './streaming-options.js';
import {replaceWarmedPrograms} from './retain-warmed-programs.js';
import {createMangroveMaterialCache,mangroveMaterialCacheEnabled} from './mangrove-material-cache.js';
import {mangroveFernEnabled} from './mangrove-fern-option.js';
import {waterOpaqueCoreEnabled,prepareOpaqueCore} from './water-opaque-core.js';
import {naturalWaterEdgesEnabled,prepareNaturalWaterBed,prepareNaturalWater,prepareNaturalAssetWater} from './natural-water-edges.js';
import {regionalWaterEnabled} from './world-atmosphere.js';
import {prepareMangroveBank} from './mangrove-shore.js';
import {continuousGrassEnabled,createContinuousGrass} from './continuous-grass.js';
import {bindMangroveMudEdgesSteps,configureMangroveMudMaterial} from './global-mangrove-mud-edges.js';
import {raidEntryChunks,raidResidentDemand,includeRaidBounds} from '../world/raid-entry-residency.js';
import {PreciseTap} from '../ui/precise-tap.js';
import {startInitialFarRegion} from './initial-far-region.js';
import {LoadingSyncQueue} from './loading-sync-queue.js';
import {initialCropCapacity} from './initial-crop-capacity.js';
import {activeCrops} from '../simulation/active-crops.js';
import {activeCrates} from '../simulation/active-crates.js';
import {observeGameEvents} from '../simulation/game.js';
import {loadingSyncWitness,loadingAwaitWitness} from './loading-sync-witness.js';
import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
import {waitGpuPreparation} from '../../tools/experiments/wait-gpu-preparation.js';
import {initializeLoadingTextures} from './loading-textures.js';
import {compileLoadingPrograms,compileLoadingProgramsBatched} from './loading-programs.js';
import {createRendererWithGlEpoch} from './gl-resource-epoch.js';
import {FluidGpuPreload} from './fluid-preload.js';
import {chunkInPropTransition} from './prop-transition-residency.js';
import {CameraBuildingRegistry} from './camera-building-registry.js';
import {CameraTreeRegistry} from './camera-tree-registry.js';
import {CameraWallRegistry} from './camera-wall-registry.js';
import {CameraExclusionMotion} from './camera-exclusion-motion.js';
import {constrainCameraToTerrain} from './camera-terrain-exclusion.js';
import {installCameraPoseResolver} from './terrain-camera.js';
import {initializeProgramBindings,initializeProgramBindingsAsync} from './program-bindings.js';
import {VfxGpuPreload} from './vfx-preload.js';
import {focusNewTutorialPlacement} from './tutorial-placement-focus.js';
import {WallStrokePreview} from './wall-stroke-preview.js';
import {AnimalPreload,releaseActorRig} from './animal-preload.js';
import {updateSkinEnvelopeSphere} from './skin-envelope.js';
import {renderScreenPreload,renderScreenPreloadBatched,waitForGpuPreload} from './screen-preload.js';
import {farmHomeFocus} from './farm-focus.js';
import {createWateringEmitter} from './watering-emitter.js';
import {MudPatches,residentMudSurface} from './mud-patches.js';
import {installShaderFailureGuard} from './shader-failure.js';
import {BiomeGround} from './biome-ground.js';
import {BlenderGroundDetails,markGroundDetailEvent} from './blender-ground-details.js';
import {refreshResidentProps,sameSuppressions} from './resident-props.js';
import {SpellPreview} from './spell-preview.js';
import {RenderOrigin,withRenderOrigin,renderOriginBounds} from './render-origin.js';
import {centerCulture} from '../world/centers.js';
import * as THREE from 'three';
import {AfricanToon,paintedWaterMaterial} from './african-toon.js';
import {SceneMaterialRegistry} from './material-registry.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {Assets,json} from './assets.js';
import {NativeSky,skyNight} from './sky.js';
import {waterTime} from './world-atmosphere.js';
import {nativeChunkWater,nativeAssetWater,nativeWaterBuffer} from './water-geometry.js';
import {cropSpec} from '../simulation/rules.js';
import {BIOME_IDS} from '../world/biome-ids.js';
import {createCropBatch,createCropBatchAsync} from './crop-batch.js';
import {loadCropBridges} from './crop-library.js';
import {applyWorkerPose,nativeCrate} from './worker-actions.js';
import {applyAnimalPose,prepareAnimalClips,animalGroundSamples,prepareAnimalModel} from './animal-actions.js';
import {NativeHands} from './hands.js';
import {tutorialHandTarget} from './tutorial-hand-target.js';
import {NativeWall} from './walls.js';
import {WallDrawing} from './wall-drawing.js';
import {NativeBuilding,BuildingDestructionPass} from './buildings.js';
import {VfxLibrary} from './vfx.js';
import {WorkVfx} from './work-vfx.js';
import {AttackVfx} from './attack-vfx.js';
import {ShieldVfx} from './shield-vfx.js';
import {AgricultureVfx} from './agriculture-vfx.js';
import {MaterialVfx} from './material-vfx.js';
import {LocomotionVfx} from './locomotion-vfx.js';
import {renderedTerrainSurface} from './terrain-surface.js';
import {nativeGroundGeometry,nativeTerrainBuffer} from './terrain-geometry.js';
import {NativeChunkStream} from './chunk-stream.js';
import {installNativeShadow} from './native-shadow.js';
import {NativeHorizon,nativeNearRegion} from './horizon.js';
import {updateObstructions} from './obstruction.js';
import {createAssetLod,updateAssetLods} from './asset-lod.js';
import {installAssetShadows,disposeAssetShadows} from './asset-shadows.js';
import {NativeAssetGroups} from './asset-groups.js';
import {nativeAssetClipRequired} from './asset-clip.js';
import {configureShadowCamera,updateShadowCamera,resizeShadowMap} from './shadow-camera.js';
import {nativeRenderResolution,nativeGroundMaterial,updateGroundQuality} from './render-quality.js';
import {nativeAssetSurface} from './asset-surface.js';
import {NativeContacts,contactPrototypes} from './contacts.js';
import {RaidCameraDirector} from './raid-camera.js';
import {configureTerrainControls,protectTerrainCamera,updateTerrainCamera,focusTerrainCamera,installTerrainCameraIntent} from './terrain-camera.js';
const cropIds=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'];
const marks=[.065,.27,.53,.78,1];
const profileSources={olderMale:'Ganadero_Mayor',olderFemale:'Amara_Mayor',youngMale:'Kofi_Joven',youngFemale:'Amara_Joven'};
const animalSources={warthog:'Facoquero',hyena:'Hiena',buffalo:'Bufalo',lion:'Leon',rhino:'Rinoceronte'};
export class WorldScene {
  constructor(canvas,onPick) {
    // Noncasting far uploads retain the live lighting/shadow recipe while
    // avoiding another draw of all resident geometry. QA may opt out explicitly.
    this.farIsolatedPreparation=true;
    // Gameplay preparations also need owned readiness polling: quality changes
    // and world exit can dispose their materials before compilation completes.
    this.farOwnedCompilation=new URLSearchParams(globalThis.location?.search??'').get('ownedFarGpu')!=='0';this.farOwnedWaits=this.farOwnedCompilation;
    this.batchChunkEviction=false;
    this.nativeHorizonBed=new URLSearchParams(globalThis.location?.search??'').get('horizonBed')==='native-grid';
    this.stagedHorizonBed=new URLSearchParams(globalThis.location?.search??'').get('horizonBed')==='staged';
    const bedBudget=Number(new URLSearchParams(globalThis.location?.search??'').get('horizonBedBudget')??2);
    this.horizonBedBudget=Number.isFinite(bedBudget)?Math.max(.5,Math.min(8,bedBudget)):2;
    // Approved G recipe: submit-CPU16 pacing and owned initial far preparation.
    this.loadingCpuBudget=true;
    this.loading=new AbortController();this.renderOrigin=new RenderOrigin();this.toon=new AfricanToon();this.contacts=new NativeContacts();this.toon.contactUniforms=this.contacts.uniforms;this.chunkRevision=0;this.canvas=canvas;this.assets=new Assets();const visualLab=new URLSearchParams(globalThis.location?.search??'').get('visualLab');this.visualLabGroundDetails=['grass','ph-grass','layer-grass','layer-grass-sculpted','global-grass','global-grass-beds'].includes(visualLab);this.assets.visualLab=['normal','normal-relief','normal-enhanced','texture-detail','texture-aniso','village-repacked','village-art','village-shared-art','village-finish','village-surface','village-details'].includes(visualLab)?visualLab:null;this.objects=new Map();this.chunks=new Map();this.movementSurfaceAt=(x,z)=>this.nav?.field.canyon&&this.nav.field.waterInfo(x,z).inside?'water':residentMudSurface(this.chunks,x,z);this.mixers=new Map();this.wateringEmitters=new Map();this.waterMouth=new THREE.Vector3();this.waterDirection=new THREE.Vector3();this.scene=new THREE.Scene();this.materialRegistry=new SceneMaterialRegistry(this.scene,this.toon);this.assetGroups=new NativeAssetGroups(this.scene);this.sky=new NativeSky();
    this.camera=new THREE.PerspectiveCamera(42,1,.1,500);this.camera.position.set(40,35,50);
    const guardedRenderer=createRendererWithGlEpoch(canvas,()=>new THREE.WebGLRenderer({canvas,antialias:true,alpha:false}));this.renderer=guardedRenderer.renderer;this.glResourceEpoch=guardedRenderer.guard;this.shaderFailure=installShaderFailureGuard(this.renderer);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.setClearColor('#cbd5be');this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;configureTerrainControls(this.controls);this.releaseCameraIntent=installTerrainCameraIntent(this.camera,this.controls,()=>this.nav?.field);this.controls.enableRotate=true;this.controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    this.sun=new THREE.DirectionalLight('#ffe2a8',3);this.sun.position.set(-30,55,25);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);configureShadowCamera(this.sun);updateShadowCamera(this.sun,this.controls.target);this.sun.shadow.bias=0;this.releaseNativeShadow=installNativeShadow(this.renderer,this.sun,this.toon.shadowUniforms);this.releaseAssetShadows=installAssetShadows(this.renderer,()=>this.assetGroups.enabled?this.assetGroups.shadowChunks:this.chunks,this.scene);
    this.scene.add(this.sun,this.sun.target);this.ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);this.scene.add(this.ambient);
    this.destructionPass=new BuildingDestructionPass(this.renderer,this.sun,this.ambient);this.destructionPass.worldOriginUniform=this.toon.uniforms.uWorldOrigin;this.destructionPass.fineNoiseUniform=this.toon.uniforms.uFineNoise;this.buildingTemplates=new Map();
    this.raycaster=new THREE.Raycaster();this.cursor=new THREE.Vector2();this.terrainMeshes=[];
    this.preview=new THREE.Mesh(new THREE.RingGeometry(.35,.5,40),new THREE.MeshBasicMaterial({color:'#e8c878',side:THREE.DoubleSide,depthWrite:false}));this.preview.rotation.x=-Math.PI/2;this.preview.visible=false;this.scene.add(this.preview);
    this.spellPreview=new SpellPreview(this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.strokePreview=new WallStrokePreview(canvas);
    this.wallDrawing=new WallDrawing(canvas,{screenSpace:true,point:e=>this.pick(e,{terrainOnly:true}).point,stroke:points=>this.onWallStroke?.(points),tap:e=>onPick(this.pick(e)),preview:points=>this.showWallStroke(points),gesture:(old,next)=>this.wallCameraGesture(old,next),activity:phase=>this.onWallGesture?.(phase)});
    this.canvasEvents=new AbortController();const listenerOptions={signal:this.canvasEvents.signal};
    canvas.addEventListener('webglcontextlost',()=>this.releaseRetainedPrograms(),listenerOptions);
    this.controls.addEventListener('start',()=>this.raidCamera?.beginManual());
    this.controls.addEventListener('end',()=>this.raidCamera?.endManual());
    canvas.addEventListener('pointerdown',()=>this.raidCamera?.beginManual(),listenerOptions);
    canvas.addEventListener('pointerup',()=>this.raidCamera?.endManual(),listenerOptions);
    canvas.addEventListener('pointercancel',()=>this.raidCamera?.endManual(),listenerOptions);
    canvas.addEventListener('wheel',()=>this.raidCamera?.cancel(),listenerOptions);
    const tap=new PreciseTap();
    canvas.addEventListener('pointerdown',e=>tap.down(e),listenerOptions);
    canvas.addEventListener('pointermove',e=>tap.move(e),listenerOptions);
    canvas.addEventListener('pointerup',e=>{const gesture=tap.up(e);if(this.controls.enabled&&this.state&&gesture)onPick({...this.pick(e),...gesture});},listenerOptions);
    canvas.addEventListener('pointercancel',e=>tap.up(e,true),listenerOptions);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.quality='media';this.resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onContextLost?.();},listenerOptions);canvas.addEventListener('webglcontextrestored',()=>{this.restoreCachedGraphics();this.onContextRestored?.();},listenerOptions);
  }
  resize() {const r=this.canvas.getBoundingClientRect(),resolution=nativeRenderResolution(r.width,r.height,devicePixelRatio,this.quality,this.pixelRatioLimit),aspect=resolution.width/resolution.height;this.renderResolution=resolution;if(this.canvas.width!==resolution.width||this.canvas.height!==resolution.height)this.renderer.setSize(resolution.width,resolution.height,false);if(this.camera.aspect!==aspect){this.camera.aspect=aspect;this.camera.updateProjectionMatrix();}}
  showWallStroke(points){
    this.strokePreview.showScreen(points);
  }
  wallCameraGesture(old,next){
    this.raidCamera?.cancel();
    const a=this.pick({clientX:old.x,clientY:old.y},{terrainOnly:true}).point,b=this.pick({clientX:next.x,clientY:next.y},{terrainOnly:true}).point;
    if(a&&b){const delta=new THREE.Vector3(a.x-b.x,0,a.z-b.z);this.controls.target.add(delta);this.camera.position.add(delta);}
    const offset=this.camera.position.clone().sub(this.controls.target),distance=offset.length(),ratio=old.distance/Math.max(10,next.distance);
    offset.multiplyScalar(Math.max(this.controls.minDistance,Math.min(this.controls.maxDistance,distance*ratio))/distance);this.camera.position.copy(this.controls.target).add(offset);this.updateCamera();
  }
  showWallPreview(plan){
    this.clearWallPreview();this.wallPreview=new THREE.Group();
    for(const entity of plan.previewPieces??plan.pieces){const wall=new NativeWall(this.wallPrototypes,entity);wall.position.set(entity.x,this.nav.field.surface(entity.x,entity.z)+.025,entity.z);wall.rotation.y=entity.yaw;for(const {mesh} of wall.parts){const previous=mesh.material;mesh.material=new THREE.MeshBasicMaterial({color:'#9cb67b',transparent:true,opacity:.55,depthWrite:false,side:previous.side,polygonOffset:previous.polygonOffset,polygonOffsetFactor:previous.polygonOffsetFactor,polygonOffsetUnits:previous.polygonOffsetUnits,toneMapped:false});previous.dispose();mesh.castShadow=mesh.receiveShadow=false;}this.wallPreview.add(wall);}
    this.scene.add(this.wallPreview);
  }
  showSpellPreview(draft){this.spellPreview.show(draft);}
  clearSpellPreview(){this.spellPreview.clear();}
  clearWallPreview(){if(this.wallPreview){for(const wall of this.wallPreview.children)wall.dispose();this.scene.remove(this.wallPreview);this.wallPreview=null;}}
  qualitySetting(quality) {
    this.releaseRetainedPrograms({preserve:this.transactionalPrograms()});
    this.quality=quality;
    this.farVegetation?.configureQuality?.(quality);
    this.groundDetails?.configureQuality?.(quality);
    this.toon.uniforms.uGroundDetail.value=quality==='muy_baja'?0:1;
    this.destructionPass.quality=['muy_baja','baja'].includes(quality)?0:1;
    this.destructionPass.effectQuality=quality==='alta'?'high':['muy_baja','baja'].includes(quality)?'low':'medium';
    const qualityGround=this.biomeGround?.mangroveSubstrate?[...this.terrainMeshes,...[...this.chunks.values()].flatMap(group=>group.children.filter(mesh=>mesh.userData.globalMudBlend))]:this.terrainMeshes;
    updateGroundQuality(qualityGround,quality,mesh=>{configureMangroveMudMaterial(this,mesh.material);this.materialRegistry?.refresh(mesh);});
    const shadowPreparation=new URLSearchParams(globalThis.location?.search??'').get('stableShadowPrograms');
    const shadowsEnabled=['media','alta'].includes(quality),stableShadows=shadowPreparation==='1'||(shadowPreparation!=='0'&&!!this.frameScheduler);
    const rendererShadows=stableShadows||shadowsEnabled,shadowsChanged=this.renderer.shadowMap.enabled!==rendererShadows;
    if(stableShadows){
      this.sun.userData.nativeShadowQualityIntensity??=this.sun.shadow.intensity;
      this.sun.userData.nativeShadowDisabled=!shadowsEnabled;
      this.sun.shadow.intensity=shadowsEnabled?this.sun.userData.nativeShadowQualityIntensity:0;
    }
    this.renderer.shadowMap.enabled=rendererShadows;
    if(shadowsChanged)this.assetGroups.invalidateMaterials();
    // Shadow defines are compiled into materials; re-enable must invalidate unshadowed programs.
    if(shadowsChanged)this.scene.traverse(object=>{for(const material of (Array.isArray(object.material)?object.material:[object.material]))if(material)material.needsUpdate=true;});
    resizeShadowMap(this.sun,mangroveFernEnabled()&&this.state?.biome==='manglares'&&shadowsEnabled?'alta':quality);this.resize();
    this.refreshStreamingPrograms();
  }
  async loadReady(pending,releaseLate){
    const signal=this.loading?.signal;let value;
    const check=()=>{if(this.disposed||signal?.aborted)throw new Error('Carga de mundo cancelada');};
    // Observe late completion once, even when owner cancellation wins first.
    // Waiting is cancellable; decoder/driver work itself is not interrupted here.
    const observed=Promise.resolve(pending).then(result=>{if(this.disposed||signal?.aborted)releaseLate?.(result);value=result;});
    await waitGpuPreparation(observed,{check,signal,nextFrame:()=>new Promise(()=>{})});check();return value;
  }
  async loadingMilestone(id,{nextFrame,timeout=30000,now=()=>performance.now()}={}) {
    if(!this.loadingProgress)return;
    const started=now(),signal=this.loading.signal;
    const check=()=>{if(this.disposed||signal.aborted)throw Error('World loading cancelled');if(now()-started>timeout)throw Error('World loading milestone timed out');};
    check();this.loadingProgress.update(id);
    await waitGpuFrame({check,nextFrame,signal});check();
  }
  async load(state,nav,villagePayload,
    {farVegetation=false,loadingProgress=null,spatialSession=null}={}) {
    if(spatialSession&&nav.field!==spatialSession.field)
      throw TypeError('Spatial scene and navigation must share one terrain authority');
    this.spatialSession=spatialSession;
    this.loadingProgress=loadingProgress;
    const phase=(label,run)=>loadingAwaitWitness(this.onLoadingSpan,label,run);
    const milestone=id=>phase('load-milestone:'+id,()=>this.loadingMilestone(id));
    await phase('load-sky',()=>this.loadReady(this.sky.load()));this.toon.environment(this.sky.environmentTextures,this.sky.uniforms.uSkyYaw);this.destructionPass.environmentUniforms=this.toon.environmentUniforms;await milestone('sky');this.state=state;this.streamingOptions=streamingOptions(state.biome);this.batchChunkEviction=this.streamingOptions.batchEviction;this.simElapsed=state.elapsed;this.nav=nav;this.destructionPass.surface=(x,z)=>nav.field.surface(x,z);this.pack=await this.loadReady(json('/content/biome-'+BIOME_IDS[state.biome]+'.json',{signal:this.loading.signal}));this.prototypes=await phase('load-biome-models',()=>this.loadReady(this.assets.biome(this.pack)));this.biomeGround=new BiomeGround();await phase('load-biome-ground',()=>this.loadReady(this.biomeGround.load(this.assets,BIOME_IDS[state.biome],this.pack.profile,this.nav.field,{settlementSource:this.spatialSession?.horizonSource})));if(this.biomeGround.tile.mudPatches){this.mudPatches=new MudPatches();await this.loadReady(this.mudPatches.load(this.assets,this.biomeGround.tile.mudPatches));}this.contactPrototypes=contactPrototypes(this.pack,this.prototypes);this.waterPrototypes=this.pack.assets.map(nativeAssetWater);this.naturalWaterEdges=naturalWaterEdgesEnabled();this.waterOpaqueCore=waterOpaqueCoreEnabled(this.state.biome);this.fluidLighting={biome:this.state.biome,regionalWaterBiome:regionalWaterEnabled()?this.state.biome:null,globalWaterSurface:this.toon.globalVisualLighting&&!['volcanes','desierto'].includes(this.state.biome),textures:this.sky.environmentTextures,yaw:this.sky.uniforms.uSkyYaw,uniforms:this.toon.uniforms,shadowUniforms:this.toon.shadowUniforms};this.fluidMaterial=paintedWaterMaterial(this.pack.profile.colors.water,this.state.biome==='volcanes',this.nav.field.seed,null,this.fluidLighting);await milestone('biome');
    this.groundDetails=new BlenderGroundDetails(this.assets,this.scene,BIOME_IDS[state.biome]);this.groundDetails.enabled&&=(this.visualLabGroundDetails||this.groundDetails.bankCover);await phase('load-ground-details',()=>this.loadReady(this.groundDetails.load()));
    if(this.groundDetails.enabled)this.groundDetails.releaseEvents=observeGameEvents(state,event=>markGroundDetailEvent(this.groundDetails,state,event,id=>this.objects.get(id)?.position));
    this.villagePrototypes=await phase('load-village-models',()=>this.loadReady(this.assets.village(villagePayload)));this.villageTemplates=new Map([[state.culture,this.villagePrototypes]]);
    this.buildingCatalogue=(await this.loadReady(json('/content/destruction.json',{signal:this.loading.signal}))).buildings;
    await this.loadReady(Promise.all([...new Set([...state.villages.map(v=>v.culture),...state.structures.filter(s=>s.kind==='center').map(s=>centerCulture(s,state))])].map(culture=>this.ensureBuilding(culture))));await milestone('buildings');
    [this.models,this.workerLibraries,this.wateringPaths]=await this.loadReady(Promise.all([json('/content/models.json',{signal:this.loading.signal}),json('/content/worker-actions.json',{signal:this.loading.signal}),json('/content/watering-emitters.json',{signal:this.loading.signal})]));
    this.warmedAnimals=new Set();
    this.animalPreload=new AnimalPreload(this.assets,id=>this.models.find(m=>m.source.includes(animalSources[id])),{skinEnvelope:this.animalSkinEnvelope===true});
    this.nav.raidEntryResident=(entry,radii)=>[...raidEntryChunks(entry,radii)].every(key=>this.chunks.has(key));
    // The legacy preparer would reconstruct a second JavaScript terrain in
    // its worker. Spatial QA keeps all route decisions in the native session.
    await phase('load-animal-models',()=>this.loadReady(this.warmAnimalModels(Object.keys(animalSources))));await milestone('animals');
    for(const [profile,library] of Object.entries(this.workerLibraries)){const path=this.wateringPaths.profiles[profile];if(path?.sourceSha256!==library.sha256)throw Error('Recorrido de regadera desactualizado: '+profile);this.wateringEmitters.set(profile,createWateringEmitter(path));}
    const cropModel=this.models.find(m=>m.source.includes('Cultivos'));
    const gltf=await phase('load-crop-model',()=>this.loadReady(this.assets.model(cropModel.url)));this.cropGltf=gltf;this.cropModels=Array(40);
    gltf.scene.traverse(o=>{if(o.isMesh){const i=o.userData.cropIndex*5+o.userData.stage-1;const mesh=new THREE.Mesh(o.geometry,o.material.clone());mesh.material.metalness=0;mesh.material.roughness=.91;mesh.material.metalnessMap=null;mesh.material.roughnessMap=null;mesh.castShadow=mesh.receiveShadow=true;this.cropModels[i]=mesh;}});
    this.cropBridgeData=await this.loadReady(json('/content/crop-bridges.json',{signal:this.loading.signal}));this.cropBridgeData=await phase('load-crop-bridges',()=>this.loadReady(loadCropBridges(this.cropBridgeData,url=>this.assets.model(url))));this.cropBatch=loadingProgress?await phase('load-crop-batch',()=>createCropBatchAsync(this.scene,this.renderer,gltf,this.cropBridgeData,initialCropCapacity(state),{signal:this.loading.signal,cancelled:()=>this.disposed,onWork:this.onLoadingSpan,frameSlack:this.loadingFrameSlack})):createCropBatch(this.scene,this.renderer,gltf,this.cropBridgeData);await milestone('crops');
    this.wallPrototypes=await this.loadReady(this.assets.walls(await this.loadReady(json('/content/walls.json',{signal:this.loading.signal}))));await milestone('walls');
    const vfxCatalogue=await this.loadReady(json('/content/vfx.json',{signal:this.loading.signal}));this.vfxLibrary=new VfxLibrary(vfxCatalogue,await this.loadReady(this.assets.texture(vfxCatalogue.atlas)));
    this.workVfx=new WorkVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z),(id,time,effect)=>this.wateringSource(id,time,effect));
    this.attackVfx=new AttackVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.shieldVfx=new ShieldVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.agricultureVfx=new AgricultureVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.materialVfx=new MaterialVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z));
    this.locomotionVfx=new LocomotionVfx(this.vfxLibrary,this.destructionPass,this.scene,(x,z)=>renderedTerrainSurface(this.nav.field,x,z),(x,z)=>this.nav.field.canyon?this.nav.field.waterInfo(x,z):null);await milestone('vfx');
    this.raidCamera=new RaidCameraDirector(this.camera,this.controls,nav.field);this.focusFarm();
    const initialFarRegion=this.loadingCpuBudget&&loadingProgress&&farVegetation?startInitialFarRegion(this,farVegetation===true?{}:farVegetation):null;
    this.chunkStream=spatialSession?.stream??new NativeChunkStream(this.nav.config,this.pack.profile,{loaded:()=>this.chunks,onData:data=>this.installChunk(data),onError:error=>this.onError?.(error),onFallback:error=>console.warn('GeneraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n local de chunks:',error.message??error)});
    this.syncChunks();await phase('load-chunks-horizon-ready',()=>this.loadReady(Promise.all([this.chunkStream.whenReady(),this.horizon.whenReady()])));if(this.disposed)throw new Error('Carga de mundo cancelada');this.syncChunks();await milestone('chunks');
    await this.loadReady(this.prepareSavedAnimalRigs(state));loadingSyncWitness(this.onLoadingSpan,'restore-sync',()=>this.sync(0));
    if(continuousGrassEnabled(state.biome)){
      const coverage=await phase('load-continuous-grass',()=>this.loadReady(createContinuousGrass(this),layer=>layer.dispose()));
      this.groundDetails.dispose();this.groundDetails=coverage;
    }
    this.setCameraExclusion(true,{trees:true});this.updateCamera();
    this.hands=loadingSyncWitness(this.onLoadingSpan,'hands-constructor',()=>new NativeHands(this.scene,(x,z)=>this.nav.field.surface(x,z),{motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,onError:e=>this.onError?.(e)}));
    await phase('load-hands-ready',()=>this.loadReady(this.hands.ready));
    await phase('load-active-animal-actors',()=>this.loadReady(this.loadedAnimalActors()));
    if(this.loadingProgress)await phase('load-worker-actors',()=>this.loadReady(this.loadedWorkerActors()));
    if(this.loadingProgress&&farVegetation){
      // Compile the eventual fog variant, not a temporary fog-free world. The
      // distant adapter uses this same linear-fog recipe at first presentation.
      const {farAtmosphere}=await import('./far-atmosphere.js'),atmosphere=farAtmosphere(farVegetation===true?{}:farVegetation);
      this.scene.fog=new THREE.Fog(atmosphere.fogDayColor,atmosphere.fogStart,atmosphere.fogEnd);
    }
    await phase('load-warm-gpu',()=>this.loadReady(this.warmAnimalGpu()));await milestone('gpu');
    // Callers choose a configured horizon through the same loading/cancellation
    // boundary as every other asset; generic worlds may still omit it.
    if(farVegetation){const {attachBiomeFarVegetation}=await import('./far-vegetation.js');await phase('load-far-assets',()=>this.loadReady(attachBiomeFarVegetation(this,{...(farVegetation===true?{}:farVegetation),parallelAssets:this.loadingCpuBudget===true,initialRegion:initialFarRegion})));}await milestone('far-assets');if(loadingProgress)this.assets.releaseLoadingImageDecoder();
  }
  prepareSavedAnimalRigs(state){
    const group=state.raid?state.raid.animals.filter(a=>a.status!=='gone').map(a=>a.species):state.nightPlan&&!state.nightPlan.done?state.nightPlan.group??[]:[];
    return this.animalPreload.reserveGroup(group);
  }
  async loadedAnimalActors(){
    for(const animal of this.state.raid?.animals??[]){
      if(animal.status==='gone'||this.mixers.has(animal.id))continue;
      await this.loadReady(this.objects.get(animal.id)?.userData.actorReady);
      if(!this.mixers.has(animal.id))throw Error('Animal guardado sin modelo: '+animal.id);
    }
  }
  async loadedWorkerActors(){
    for(const worker of this.state.workers??[]){
      await this.loadReady(this.objects.get(worker.id)?.userData.actorReady);
      if(!this.mixers.has(worker.id))throw Error('Trabajador guardado sin modelo: '+worker.id);
    }
  }
  loadingActorPreparation(){
    if(!this.loadingActorQueue){
      const gl=this.renderer.getContext();
      this.loadingActorQueue=new LoadingSyncQueue({scheduler:this.frameScheduler,signal:this.loading.signal,cancelled:()=>this.disposed||this.renderer.getContext()!==gl||gl.isContextLost(),getEpoch:()=>this.glResourceEpoch?.stats.epoch??0,onDiagnostic:stats=>this.onLoadingActorQueue?.(stats)});
    }
    return this.loadingActorQueue;
  }
  setCameraExclusion(enabled,options={}){
    this.releaseCameraExclusion?.();this.releaseCameraExclusion=null;this.cameraExclusion=null;
    if(!enabled){if(this.controls)this.controls.maxDistance=65;return;}
    const registry=new CameraBuildingRegistry(options),motion=new CameraExclusionMotion(registry.index,options);let last=performance.now();
    const trees=options.trees?new CameraTreeRegistry(registry.index,options.trees===true?{}:options.trees):null;
    const walls=new CameraWallRegistry(registry.index,options.walls);
    this.cameraExclusion={registry,motion,trees,walls};let clearance=20,roofCache=null;
    this.cameraDirtyEntities=new Map();
    const refresh=()=>{
      if(!this.state||!this.cameraVolumesDirty)return;
      if(this.cameraDirtyEntities.size){
        for(const [id,entity] of this.cameraDirtyEntities){
          if(!entity){registry.remove(id);walls.remove(id);}
          else if(entity.kind==='wall')walls.sync(this.objects,[entity],{partial:true});
          else registry.sync(this.objects,[entity],{partial:true});
        }
        this.cameraDirtyEntities.clear();
      }else{registry.sync(this.objects,[...this.state.villages,...this.state.structures.filter(e=>e.kind==='center')]);walls.sync(this.objects,this.state.structures.filter(e=>e.kind==='wall'));}
      this.cameraVolumesDirty=false;
    };
    const resolve=(pose,previous,context)=>{
      const now=performance.now(),seconds=Math.max(0,(now-last)/1000);last=now;
      refresh();
      trees?.sync(this.chunks,this.chunkRevision);
      let eye=motion.resolve(pose.eye,previous?.eye,seconds,{reset:context==='focus'});
      // A focus/first pose must recover from the requested destination, rather
      // than an intermediate nearest-face exit that terrain would undo.
      const terrain=constrainCameraToTerrain(context==='focus'||!previous?pose.eye:eye,motion,this.nav.field,clearance);
      if(terrain.point.some((value,i)=>Math.abs(value-eye[i])>motion.skin))motion.corrected=motion.stats.corrected=true;
      eye=terrain.point;
      motion.stats.unresolved||=!terrain.resolved;motion.stats.terrainRecoveryIterations=terrain.iterations;
      const ground=this.nav.field.surface(eye[0],eye[2]);motion.stats.terrainConflict=eye[1]<ground+2||eye[1]>ground+clearance;motion.stats.maxClearance=clearance;
      return {...pose,eye,altitude:eye[1]-ground};
    };
    resolve.clearance=(target,distance,previous)=>{
      refresh();trees?.sync(this.chunks,this.chunkRevision);
      const field=this.nav.field,r=Math.min(100,distance)+3,ground=field.surface(target[0],target[2]);
      const key=[target[0],target[2],r,registry.index.revision].join('|');
      if(roofCache?.key!==key){let roof=20;for(const box of registry.index.queryXZ(target[0]-r,target[2]-r,target[0]+r,target[2]+r))roof=Math.max(roof,box.worldMax[1]-ground+3);roofCache={key,roof};}
      // Keep the previous safe altitude while leaving a tall roof's neighborhood.
      // Descending remains a player action; crossing its edge cannot slam the
      // camera down onto the roof merely because the ordinary ceiling resumes.
      clearance=Math.max(20,roofCache.roof,previous?.altitude??20);if(this.controls)this.controls.maxDistance=Math.max(65,clearance+4);return clearance;
    };
    resolve.minimumDistance=target=>{
      // Only a large building at the point of interest restricts close zoom.
      // Nearby crops/NPCs retain the ordinary four-metre orbital distance.
      let minimum=4;const ground=this.nav.field.surface(target[0],target[2]);
      for(const box of registry.index.queryXZ(target[0]-3,target[2]-3,target[0]+3,target[2]+3)){
        if(String(box.id).startsWith('camera-tree:')||String(box.id).startsWith('camera-wall:'))continue;
        const cx=(box.min[0]+box.max[0])/2,cz=(box.min[2]+box.max[2])/2,c=Math.cos(box.yaw??0),s=Math.sin(box.yaw??0),dx=target[0]-cx,dz=target[2]-cz;
        const x=c*dx-s*dz+cx,z=s*dx+c*dz+cz;
        const separation=Math.hypot(Math.max(box.min[0]-x,x-box.max[0],0),Math.max(box.min[2]-z,z-box.max[2],0));
        const weight=Math.max(0,1-separation/3);
        const span=Math.max(box.worldMax[0]-box.worldMin[0],box.worldMax[2]-box.worldMin[2]);
        minimum=Math.max(minimum,4+Math.max(0,box.worldMax[1]-ground+span*.45-4)*weight);
      }
      return minimum;
    };
    this.cameraVolumesDirty=true;
    const release=installCameraPoseResolver(this.camera,resolve);
    this.releaseCameraExclusion=()=>{release();trees?.clear();walls.clear();registry.clear();};
  }
  updateCamera(){return updateTerrainCamera(this.camera,this.controls,this.nav?.field);}
  focus(point) {this.raidCamera?.cancel();if(this.nav)focusTerrainCamera(this.camera,this.controls,this.nav.field,point);}
  focusFarm(){this.focus(farmHomeFocus(this.state));}
  focusTutorialPlacement(kind){
    const target=tutorialHandTarget(this.state,this.nav,kind);
    focusNewTutorialPlacement(this,target,true);
    return target;
  }
  *prepareTerrainSteps(cx,cz,payload=null) {
    const group=new THREE.Group();group.position.set(cx*48,0,cz*48);group.userData.nativeChunkOrigin=[cx*48,cz*48];
    let completed=false;
    try{
    if(payload?.authority==='spatial-wasm'){
      group.userData.spatialAuthority='spatial-wasm';
      group.userData.spatialTerrainRevision=payload.terrainRevision;
    }
    yield 'ground';
    const geometry=payload?nativeTerrainBuffer(payload.terrain):nativeGroundGeometry(this.nav.field,this.pack.profile,cx,cz);
    const material=nativeGroundMaterial(this.quality);
    this.biomeGround?.attach(material,cx,cz,payload?.groundMask);material.userData.toonGround=true;material.userData.nativeGroundColor=true;const ground=new THREE.Mesh(geometry,material);ground.position.set(0,0,0);ground.receiveShadow=true;ground.castShadow=this.toon.globalVisualLighting&&this.state.biome==='gran-canon';ground.userData.ground=true;group.add(ground);if(this.mudPatches){yield 'mud-geometry';const mud=this.mudPatches.chunk(this.nav.field,cx,cz);if(mud){group.add(mud);group.userData.mudSurface=mud.geometry.userData;yield 'mud-edges';if(this.biomeGround.mangroveSubstrate)yield* bindMangroveMudEdgesSteps(this,group);}}
    yield 'water-geometry';
    const waterGeometry=payload?nativeWaterBuffer(payload.water):nativeChunkWater(this.nav.field,cx,cz,this.pack.profile);
    if(waterGeometry){const waterMaterial=this.naturalWaterEdges&&this.state.biome!=='desierto'?paintedWaterMaterial(this.pack.profile.colors.water,this.state.biome==='volcanes',this.nav.field.seed,null,this.fluidLighting):this.fluidMaterial;const mesh=new THREE.Mesh(waterGeometry,waterMaterial);mesh.position.set(0,0,0);mesh.receiveShadow=true;mesh.userData.nativeFluid='chunk';group.add(mesh);yield 'bank';prepareMangroveBank(this,waterGeometry,cx,cz,waterMaterial,payload?.waterShore);yield 'water-edges';if(waterMaterial!==this.fluidMaterial)prepareNaturalWater(this,waterGeometry,cx,cz,waterMaterial,payload?.waterBed);yield 'water-core';if(this.waterOpaqueCore)prepareOpaqueCore(mesh);}
    yield 'prop-filter';
    const chunk=payload??this.nav.chunk(cx,cz);group.userData.propSources=chunk.instances;group.userData.contactInstances=chunk.instances.map(list=>list.filter(p=>!this.nav.suppressed.has(p.id)));
    // Measured prop slots are small; group four to avoid a frame per leaf batch.
    for(let i=0;i<20;i+=4){yield 'prop-slots';for(let j=i;j<Math.min(i+4,20);j++)this.buildPropSlot(group,j,group.userData.contactInstances[j]);}
    completed=true;return group;
    }finally{if(!completed)this.disposePreparedTerrain(group);}
  }
  disposePreparedTerrain(group){
    disposeAssetShadows(group);
    group.traverse(o=>{if(o.isInstancedMesh){o.dispose();if(o.geometry.userData.obstruction||o.geometry.userData.nativeChunkClip)o.geometry.dispose();if(o.userData.nativeFluid==='asset'&&o.material!==this.fluidMaterial)o.material.dispose();return;}if(o.isMesh){if(!o.userData.borrowedWaterGeometry)o.geometry.dispose();if(o.material!==this.fluidMaterial)o.material.dispose();}});
  }
  terrain(cx,cz,payload=null){
    const steps=this.prepareTerrainSteps(cx,cz,payload);
    let result;
    do{result=steps.next();}while(!result.done);
    const group=result.value;
    for(const child of group.children)if(child.userData.ground)this.terrainMeshes.push(child);
    return group;
  }
  buildPropSlot(group,i,instances) {
    const [x,z]=group.userData.nativeChunkOrigin,cx=x/48,cz=z/48,x0=x-24,z0=z-24;
      if(!instances.length)return;
      const asset=nativeAssetSurface(this.pack,this.pack.assets[i],i);
      createAssetLod(group,this.prototypes[i],instances,asset,i,nativeAssetClipRequired(i,this.state.biome)?[x0,z0,x0+48,z0+48]:null);
      if(this.waterPrototypes[i]){const water=new THREE.InstancedMesh(this.waterPrototypes[i],paintedWaterMaterial(this.pack.profile.colors.water,this.state.biome==='volcanes',this.nav.field.seed,[x0,z0,x0+48,z0+48],this.fluidLighting),instances.length);const dummy=new THREE.Object3D();instances.forEach((p,j)=>{dummy.position.set(p.x-cx*48,p.y,p.z-cz*48);dummy.rotation.y=p.yaw;dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();water.setMatrixAt(j,dummy.matrix);});water.receiveShadow=true;water.userData.nativeFluid='asset';water.userData.nativePropSlot=i;if(this.naturalWaterEdges)prepareNaturalAssetWater(this,water,cx,cz);group.add(water);}
  }
  syncResidentProps() {
    if(!this.nav||!this.prototypes)return {chunks:0,slots:0};
    // Confirmed commands call explicitly; Engine may mutate its Set in place.
    if(sameSuppressions(this.propsSuppressed,this.nav.suppressed)){this.propSuppressionSource=this.nav.suppressed;return {chunks:0,slots:0};}
    const stats=refreshResidentProps(this.chunks,this.nav.suppressed,(group,slot,instances)=>this.buildPropSlot(group,slot,instances));
    this.propsSuppressed=new Set(this.nav.suppressed);this.propSuppressionSource=this.nav.suppressed;
    if(stats.chunks){this.chunkRevision++;this.handStaticBoxes=null;this.releaseNativeShadow?.cache.invalidate();this.contacts.update(this.chunks,this.contactPrototypes,this.nearBounds,this.chunkRevision,this.nav.config.layers);}
    return stats;
  }
  removeInstalledChunk(key,group,{evict=true,releaseSpatial=true}={}){
    this.groundDetails?.release(key);
    disposeAssetShadows(group);this.scene.remove(group);
    group.traverse(o=>{if(o.isInstancedMesh){o.dispose();if(o.geometry.userData.obstruction||o.geometry.userData.nativeChunkClip)o.geometry.dispose();if(o.userData.nativeFluid==='asset'&&o.material!==this.fluidMaterial)o.material.dispose();return;}if(o.isMesh){if(!o.userData.borrowedWaterGeometry)o.geometry.dispose();if(o.material!==this.fluidMaterial)o.material.dispose();}});
    this.terrainMeshes=this.terrainMeshes.filter(o=>o.parent!==group);
    this.chunks.delete(key);
    if(evict){this.chunkRevision++;this.handStaticBoxes=null;const [cx,cz]=key.split(',').map(Number);if(releaseSpatial)this.chunkStream?.releaseChunk?.(cx,cz);}
  }
  installChunk(data){
    const key=data.cx+','+data.cz,group=data.preparedGroup??this.terrain(data.cx,data.cz,data);
    if(data.preparedGroup){for(const child of group.children)if(child.userData.ground)this.terrainMeshes.push(child);delete data.preparedGroup;}
    const previous=this.chunks.get(key);
    if(previous)this.removeInstalledChunk(key,previous,{evict:false});
    this.chunks.set(key,group);this.scene.add(group);this.groundDetails?.chunk(data.cx,data.cz,this.nav.field,this.state);this.chunkRevision++;this.handStaticBoxes=null;
    this.onChunkProgress?.({loaded:this.chunks.size,desired:this.chunkStream.desired.size,...this.chunkStream.summary()});
  }
  whenChunksReady(){return this.chunkStream?.whenIdle()??Promise.resolve({cancelled:false});}
  syncChunks(force=false) {
    if(!this.nav||!this.prototypes)return;
    const requested=nativeNearRegion(this.camera.position,this.quality,this.farResidentRange??null);
    this.horizon??=new NativeHorizon(this.scene,(bounds,outside)=>paintedWaterMaterial(this.pack.profile.colors.water,false,this.nav.field.seed,bounds,this.fluidLighting,outside),mesh=>this.materialRegistry?.refresh(mesh),(material,cx,cz)=>{this.biomeGround?.attach(material,cx,cz,null,{mapped:false});},{spatial:this.spatialSession?.horizonSource,preparationBudgetMs:this.horizonBedBudget,prepareWaterBed:this.stagedHorizonBed&&this.naturalWaterEdges?(geometry,region)=>prepareNaturalWaterBed(this,geometry,region.cx,region.cz):null,prepareWater:this.naturalWaterEdges?(mesh,region,bed)=>{prepareNaturalWater(this,mesh.geometry,region.cx,region.cz,mesh.material,bed,{nativeGrid:this.nativeHorizonBed});if(this.waterOpaqueCore)prepareOpaqueCore(mesh);}:null});
    // Adopt the horizon and its matching resident rectangle in the same frame.
    // Keeping the preceding rectangle while the worker runs avoids exposing
    // the old horizon's centre hole or overlapping its seam with new chunks.
    const exactTerrain=this.farVisualRange==null||this.farPreserveTerrain;
    const horizonRequested=exactTerrain?requested:nativeNearRegion(this.camera.position,this.quality,Math.min(this.farVisualRange,requested.range));
    const visibleRegion=this.horizon.update(this.nav.config,this.pack.profile,horizonRequested,this.quality,force)??horizonRequested,{cx,cz}=visibleRegion;
    // A pending horizon still owns its preceding hole. Exact terrain follows
    // that adopted radius; visual compaction must at least cover the old hole.
    const range=exactTerrain?visibleRegion.range:Math.max(requested.range,visibleRegion.range);
    const region=exactTerrain?visibleRegion:nativeNearRegion({x:cx*48,z:cz*48},this.quality,range);
    // A smaller visual radius must not move the gameplay raid-entry border.
    const logicalBounds=this.farResidentRange==null?region.bounds:nativeNearRegion({x:cx*48,z:cz*48},this.quality).bounds;
    const raidPins=raidResidentDemand(this.state??{},this.nav);
    this.nearBounds=visibleRegion.bounds;this.nav.setActiveBounds?.(includeRaidBounds(logicalBounds,raidPins));this.nav.setRaidView?.(this.camera.position,this.controls.target);
    const desired=new Set();for(let dz=-range;dz<=range;dz++)for(let dx=-range;dx<=range;dx++)desired.add(`${cx+dx},${cz+dz}`);
    for(const key of raidPins)desired.add(key);
    const spatialEvictions=this.batchChunkEviction&&this.chunkStream?.releaseChunks?[]:null;
    for(const [key,group] of this.chunks)if(force||!desired.has(key)){
      this.removeInstalledChunk(key,group,{releaseSpatial:spatialEvictions===null});
      spatialEvictions?.push(key.split(',').map(Number));
    }
    if(spatialEvictions?.length)this.chunkStream.releaseChunks(spatialEvictions);
    if(this.chunkStream){const key=cx+','+cz+':'+range+(raidPins.size?':'+[...raidPins].sort().join(';'):'');if(force||this.streamPlanKey!==key){const eye=this.camera.position,target=this.controls.target,length=Math.hypot(target.x-eye.x,target.y-eye.y,target.z-eye.z)||1,fx=(target.x-eye.x)/length,fz=(target.z-eye.z)/length;this.streamPlanKey=key;const jobs=new Map([...desired].map(k=>{const [x,z]=k.split(',').map(Number),dx=x*48-eye.x,dz=z*48-eye.z;return [k,{cx:x,cz:z,score:Math.hypot(dx,dz)-.18*(dx*fx+dz*fz)}];}));this.chunkStream.plan(jobs,force);}else this.chunkStream.dispatch();}
    else for(const key of desired)if(!this.chunks.has(key)){const [x,z]=key.split(',').map(Number),group=this.terrain(x,z);this.chunks.set(key,group);this.scene.add(group);this.chunkRevision++;this.handStaticBoxes=null;}
    // Retain the original exact terrain for picking even beyond the visual radius.
    // Three raycasting tests the terrain meshes independently of parent visibility.
    let visibilityChanged=false;
    if(this.farVisualRange!=null||this.farVisibilityOwned){
      for(const group of this.chunks.values()){
        const origin=group.userData.nativeChunkOrigin;
        const visible=Math.abs(origin[0]/48-cx)<=visibleRegion.range&&Math.abs(origin[1]/48-cz)<=visibleRegion.range;
        const propsVisible=this.farVisualRange==null||Math.abs(origin[0]/48-cx)<=this.farVisualRange&&Math.abs(origin[1]/48-cz)<=this.farVisualRange;
        const treesVisible=propsVisible||this.farPropTransitionDistance!=null&&chunkInPropTransition(origin,this.camera.position,this.farPropTransitionDistance);
        const terrainVisible=this.farPreserveTerrain?true:visible;
        if(group.visible!==terrainVisible||group.userData.farPropsVisible!==propsVisible||group.userData.farTreesVisible!==treesVisible||group.userData.farTransitionTreeSlots!==this.farPropTransitionSlots){
          group.visible=terrainVisible;group.userData.farPropsVisible=propsVisible;group.userData.farTreesVisible=treesVisible;group.userData.farTransitionTreeSlots=this.farPropTransitionSlots;visibilityChanged=true;
        }
      }
      this.farVisibilityOwned=this.farVisualRange!=null;
    }
    if(visibilityChanged)this.releaseNativeShadow?.cache.invalidate();
    if(this.propSuppressionSource!==this.nav.suppressed)this.syncResidentProps();
    this.contacts.update(this.chunks,this.contactPrototypes,visibleRegion.bounds,this.chunkRevision,this.nav.config.layers);
  }
  villageMesh(village) {
    const group=new THREE.Group();
    for(const original of this.villageTemplates.get(village.culture)??this.villagePrototypes){const mesh=original.clone(),u=mesh.userData.unit,layout=village.buildings.find(b=>b.key===u.key);if(!layout)continue;mesh.scale.setScalar(16);const yaw=layout.yaw??0,c=Math.cos(yaw),n=Math.sin(yaw),cx=(u.min[0]+u.max[0])*8,cz=(u.min[2]+u.max[2])*8;mesh.rotation.y=yaw;mesh.position.set(layout.x-cx*c-cz*n,this.nav.field.surface(layout.x,layout.z)-u.min[1]*16+.018,layout.z+cx*n-cz*c);group.add(mesh);}
    return group;
  }
  async ensureBuilding(culture){if(!this.buildingTemplates.has(culture)){const descriptor=this.buildingCatalogue.find(b=>b.culture===culture);if(!descriptor)throw new Error('Casa DEST desconocida: '+culture);const template=await this.loadReady(this.assets.building(descriptor),late=>{if(!this.buildingTemplates.has(culture))late.dispose();});this.buildingTemplates.set(culture,template);}}
  async ensureVillage(culture,payload) {await this.loadReady(this.ensureBuilding(culture));if(!this.villageTemplates.has(culture))this.villageTemplates.set(culture,await this.loadReady(this.assets.village(payload)));}
  showVillagePreview(preview) {
    this.clearVillagePreview();this.villagePreview=this.villageMesh(preview);
    this.villagePreview.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.45;o.material.depthWrite=false;o.material.color.set(preview.valid?'#d4f3c2':'#f4a198');}});this.scene.add(this.villagePreview);
  }
  clearVillagePreview() {if(this.villagePreview){this.villagePreview.traverse(o=>{if(o.isMesh)o.material.dispose();});this.scene.remove(this.villagePreview);this.villagePreview=null;}}
  centerMesh(entity) {
    const culture=centerCulture(entity,this.state);
    return new NativeBuilding(this.buildingTemplates.get(culture),entity,this.destructionPass,this.state.elapsed);
  }
  async warmAnimalModels(species){
    await Promise.all(species.filter(id=>id&&!this.warmedAnimals.has(id)).map(async id=>{
      const descriptor=this.models.find(m=>m.source.includes(animalSources[id]));
      if(!descriptor)throw Error('Falta el modelo de '+id);
      await this.loadReady(this.animalPreload.warm(id));this.warmedAnimals.add(id);
    }));
  }
  async warmAnimalGpu(){
    const phase=(label,run)=>loadingAwaitWitness(this.onLoadingSpan,label,run);
    const pacing=this.loadingCpuBudget?{cpuBudget:true,getFrame:()=>this.loadingPresentationEpoch??0,frameBudget:16,batchSize:8}:{};
    const compile=(scene,camera,target,{screen=true}={})=>this.loadingProgress?(screen?compileLoadingProgramsBatched:compileLoadingPrograms)(this.renderer,scene,camera,target,{signal:this.loading.signal,cancelled:()=>this.disposed,screen,frameBudget:6,onSubmit:this.onLoadingSpan,frameSlack:this.loadingFrameSlack,...pacing}):this.renderer.compileAsync(scene,camera,target);
    const rigs=await this.animalPreload.spares();if(this.disposed)return;
    const staging=new THREE.Group();
    const originals=[];
    for(const rig of rigs)staging.add(rig.model);
    // Restored actors stay parented to their world roots. Warm their private
    // bone textures even if the saved raid lies outside the opening camera.
    const active=(this.state.raid?.animals??[]).filter(a=>a.status!=='gone').map(a=>this.mixers.get(a.id)).filter(Boolean);
    for(const rig of [...rigs,...active])rig.model.traverse(mesh=>{if(mesh.isMesh){originals.push([mesh,mesh.frustumCulled]);mesh.frustumCulled=false;}});
    this.scene.add(staging);let vfxPrimer=null,fluidPrimer=null,prepared=false;
    try{
      vfxPrimer=new VfxGpuPreload(this.vfxLibrary,this.destructionPass,this.camera,this.scene,this.controls.target);staging.add(vfxPrimer);
      fluidPrimer=new FluidGpuPreload(this.fluidMaterial,{instanced:this.waterPrototypes.some(Boolean)});staging.add(fluidPrimer);
      await phase('warm-compile-staging',()=>compile(staging,this.camera,this.scene));if(this.disposed)return;
      // The first building hit makes its opening-mask mesh drawable. Compile
      // that retained native recipe even while the intact opening is hidden.
      await phase('warm-compile-destruction',()=>compile(this.destructionPass.scene,this.camera,this.scene));if(this.disposed)return;
      if(this.nav.field.canyon)await compile(this.locomotionVfx.prepareWaterSteps(),this.camera,this.scene);
      if(this.disposed)return;
      // Resident clipped/alpha props can be outside the opening view or on
      // hidden LODs. Prepare their screen variant with the actual shadow state,
      // not only the linear, shadowless variant used by VFX depth capture.
      // Prepare the first fixed512 recipe before world compilation, not on first draw.
      const cachePreparation=new URLSearchParams(globalThis.location?.search??'').get('groundCachePreparation');
      if(cachePreparation==='1'||(cachePreparation!=='0'&&this.frameScheduler))await phase('warm-ground-cache-recipe',()=>this.prepareFrameResources());
      await phase('warm-compile-world',()=>compile(this.scene,this.camera,this.scene));if(this.disposed)return;
      if(this.streamingOptions.warmObstruction){
        this.obstructionWarmup?.dispose();this.obstructionWarmup=this.assetGroups.prepareSmoothWarmup(this.chunks);
        await phase('warm-compile-obstruction',()=>compile(this.obstructionWarmup.group,this.camera,this.scene));if(this.disposed)return;
      }
      await phase('warm-prepare-depth',()=>this.destructionPass.prepareDepth(this.camera,this.scene,{scheduler:this.frameScheduler,compile:(scene,camera,target)=>compile(scene,camera,target,{screen:false}),...(this.loadingProgress?{signal:this.loading.signal,onPrepare:this.onLoadingSpan,frameSlack:this.loadingFrameSlack,...pacing,batchSize:32,cancelled:()=>this.disposed||this.loading.signal.aborted}:{})}));if(this.disposed)return;
      const cropPreparation=new URLSearchParams(globalThis.location?.search??'').get('cropDepthPreparation');
      if(cropPreparation==='1'||(cropPreparation!=='0'&&!!this.frameScheduler)){
        this.cropDepthPreparation=await phase('warm-crop-depth',()=>prepareCropDepthPrograms(this.renderer,this.scene,this.camera,this.destructionPass,{scheduler:this.frameScheduler,signal:this.loading.signal,cancelled:()=>this.disposed,getEpoch:()=>this.glResourceEpoch?.stats.epoch??0,onSubmit:this.onLoadingSpan}));if(this.disposed)return;
      }
      this.programBindings=this.loadingProgress?await phase('warm-program-bindings',()=>initializeProgramBindingsAsync(this.renderer,{cancelled:()=>this.disposed})):initializeProgramBindings(this.renderer);
      // Actual draw uploads vertex buffers, textures and bone textures, and
      // prepares the shadow shader too. Invisible/culled meshes would not.
      if(this.loadingProgress)this.loadingTextureUploads=await phase('warm-upload-textures',()=>initializeLoadingTextures(this.renderer,this.scene,{frameBudget:6,signal:this.loading.signal,cancelled:()=>this.disposed,...pacing}));
      if(this.loadingProgress)await phase('warm-draw-batches',()=>renderScreenPreloadBatched(this.renderer,this.scene,this.camera,{warmShadows:true,frameBudget:6,onSubmit:this.onLoadingSpan,frameSlack:this.loadingFrameSlack,...pacing,cancelled:()=>this.disposed,onBatch:(done,total)=>this.loadingProgress.update('gpu',done*.8,total)}));
      else renderScreenPreload(this.renderer,this.scene,this.camera);
      // The first sprite effect captures world depth with shadows disabled.
      // Warm that actual pass while the loading screen still covers the world,
      // including the staged animal skinning variants. Cached depth materials
      // retain their programs until their source material is disposed.
      loadingSyncWitness(this.onLoadingSpan,'warm-depth-capture',()=>this.destructionPass.captureDepth(this.camera,this.scene));
      await phase('warm-final-fence',()=>waitForGpuPreload(this.renderer,{signal:this.loading.signal,cancelled:()=>this.disposed,getEpoch:()=>this.glResourceEpoch?.stats.epoch??0}));if(this.disposed)return;
      prepared=true;this.animalGpuReady=true;
    }finally{
      fluidPrimer?.dispose();
      vfxPrimer?.dispose({retainPrograms:prepared&&!this.disposed});
      for(const [mesh,culled] of originals)mesh.frustumCulled=culled;
      staging.clear();this.scene.remove(staging);this.releaseNativeShadow?.cache.invalidate();
    }
  }
  restoreCachedGraphics(){
    // Render targets survive as JS objects, but their pixels do not survive loss.
    const cache=this.mangroveMaterialCache;
    if(cache)for(const key of cache.states.keys())cache.invalidate(key);
    this.releaseNativeShadow?.cache.invalidate();
    this.renderer.shadowMap.needsUpdate=true;
    this.refreshStreamingPrograms();
  }
  retainStreamingPrograms({newestFirst=false}={}){
    if(!this.transactionalPrograms()){this.programLease?.dispose();this.programLease=null;}
    if(this.disposed||!this.streamingOptions?.retainPrograms){this.programLease?.dispose();this.programLease=null;return;}
    this.streamingRetentionStarted=true;
    this.programLease=replaceWarmedPrograms(this.renderer,this.programLease,{limit:96,newestFirst});
    this.obstructionWarmup?.dispose();this.obstructionWarmup=null;
  }
  transactionalPrograms(){const query=new URLSearchParams(globalThis.location?.search??'');return query.get('transactionalPrograms')==='1'&&query.get('streamingRecovery')!=='0'&&this.streamingOptions?.retainPrograms&&!this.disposed&&!this.renderer.getContext().isContextLost();}
  releaseRetainedPrograms({preserve=false}={}){this.streamingProgramRefreshAbort?.abort();this.streamingProgramRevision=(this.streamingProgramRevision??0)+1;if(!preserve){this.programLease?.dispose();this.programLease=null;}this.obstructionWarmup?.dispose();this.obstructionWarmup=null;}
  refreshStreamingPrograms(){
    if(new URLSearchParams(globalThis.location?.search??'').get('streamingRecovery')==='0'||!this.streamingRetentionStarted||!this.streamingOptions?.retainPrograms||this.disposed||this.renderer.getContext().isContextLost())return;
    this.streamingProgramRefreshRequested=true;
    if(this.streamingProgramRefresh)return this.streamingProgramRefresh;
    this.streamingProgramRefresh=(async()=>{
      // Coalesce synchronous quality changes before touching the renderer.
      await Promise.resolve();
      while(this.streamingProgramRefreshRequested&&!this.disposed){
        this.streamingProgramRefreshRequested=false;
        const revision=this.streamingProgramRevision,started=performance.now(),owner=new AbortController();let warmup;
        this.streamingProgramRefreshAbort=owner;
        const cancelled=()=>owner.signal.aborted||this.disposed||revision!==this.streamingProgramRevision||this.renderer.getContext().isContextLost();
        const check=()=>{if(cancelled())throw Error('Streaming recovery cancelled');};
        try{
          if(cancelled())continue;
          warmup=this.streamingOptions.warmObstruction?this.assetGroups.prepareSmoothWarmup(this.chunks):null;
          const options={signal:owner.signal,cancelled,screen:true,getEpoch:()=>this.glResourceEpoch?.stats.epoch??0,batchSize:8,frameBudget:6};
          // Ordinary drawing prepares live scene variants. Only owned warmup materials
          // survive across awaits: streaming may dispose resident meshes meanwhile.
          await waitGpuFrame({check,signal:owner.signal});
          if(cancelled())continue;
          if(warmup)await compileLoadingProgramsBatched(this.renderer,warmup.group,this.camera,this.scene,options);
          if(cancelled())continue;
          // Prefer current quality variants when historical material programs exceed the cap.
          this.retainStreamingPrograms({newestFirst:true});
          this.streamingProgramRecovery={revision,ms:performance.now()-started,retained:this.programLease?.stats.retained??0};
        }catch(error){if(!cancelled())console.warn('Streaming program recovery failed; normal shader lifecycle remains available',error);}
        finally{warmup?.dispose();if(this.streamingProgramRefreshAbort===owner)this.streamingProgramRefreshAbort=null;}
      }
    })().finally(()=>{this.streamingProgramRefresh=null;if(this.streamingProgramRefreshRequested&&!this.disposed)return this.refreshStreamingPrograms();});
    return this.streamingProgramRefresh;
  }
  async warmResidentDepth({nextFrame}={}){
    const cancelled=()=>this.disposed||this.loading.signal.aborted;
    const options={signal:this.loading.signal,cancelled,nextFrame,batchSize:32,onPrepare:this.onLoadingSpan};
    await loadingAwaitWitness(this.onLoadingSpan,'warm-resident-depth',()=>this.destructionPass.prepareDepth(this.camera,this.scene,{...options,compile:(scene,camera,target)=>compileLoadingPrograms(this.renderer,scene,camera,target,{signal:this.loading.signal,cancelled,getEpoch:()=>this.glResourceEpoch?.stats.epoch??0,onSubmit:this.onLoadingSpan})}));
    if(cancelled())throw Error('Resident depth preload cancelled');
    await initializeProgramBindingsAsync(this.renderer,{cancelled,nextFrame});
  }
  raidReady(){return (this.state?.raid?.animals??[]).every(a=>a.status==='gone'||this.mixers.has(a.id));}
  actorsReady(){return this.raidReady()&&(this.state?.workers??[]).every(w=>w.status==='home'||this.mixers.has(w.id));}
  requestActor(entity,type,root){
    if(root.userData.actorLoading||performance.now()<(root.userData.actorRetryAt??0))return;
    root.userData.actorLoading=true;
    root.userData.actorReady=this.actor(entity,type);
    root.userData.actorReady.catch(error=>{
      if(this.disposed||this.objects.get(entity.id)!==root)return;
      const failures=(root.userData.actorLoadFailures??0)+1;root.userData.actorLoadFailures=failures;
      root.userData.actorRetryAt=performance.now()+Math.min(30000,3000*failures);
      if(failures===1)this.onError?.(error);
    }).finally(()=>{root.userData.actorLoading=false;});
  }
  async actor(entity,type) {
    const fragment=type==='worker'?profileSources[entity.profile]:animalSources[entity.species];const descriptor=type==='worker'?this.workerLibraries[entity.profile]:this.models.find(m=>m.source.includes(fragment));
    if(!descriptor)throw Error('Falta el modelo de '+(entity.species??entity.profile));
    const root=this.objects.get(entity.id),state=this.state;
    const prepared=type==='animal'&&this.animalPreload?await this.animalPreload.take(entity.species):null;
    const gltf=prepared?null:await this.assets.model(descriptor.url);if(this.disposed||this.state!==state||this.objects.get(entity.id)!==root){releaseActorRig(prepared);return;}
    let rig=null,model=null,preparedReleased=false,adopted=false,rigReleased=false;
    const releasePrepared=()=>{if(prepared&&!preparedReleased){releaseActorRig(prepared);preparedReleased=true;}};
    const cleanup=()=>{if(rig&&!rigReleased){const current=this.mixers.get(entity.id)===rig;if(current){this.mixers.delete(entity.id);root.remove(model);}if(current||!adopted)releaseActorRig(rig);rigReleased=true;if(rig===prepared)preparedReleased=true;}else if(!rig)releasePrepared();};
    const adopt=()=>{
      if(this.disposed||this.state!==state||this.objects.get(entity.id)!==root){releasePrepared();return;}
      return loadingSyncWitness(this.onLoadingSpan,'actor-prepare:'+type+':'+(entity.profile??entity.species),()=>{
        try{
          model=prepared?.model??clone(gltf.scene);
          rig=prepared??{profile:type==='worker'?entity.profile:null,mixer:new THREE.AnimationMixer(model),clips:[],action:null,name:null,model,groundSamples:null};
          model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
          // Geometry/materials are borrowed; only this rig's skeleton and mixer
          // belong to the adoption. Native poses and skin bounds stay unchanged.
          if(type==='animal')prepareAnimalModel(model,entity.species);
          if(!prepared){rig.clips=type==='animal'?prepareAnimalClips(gltf.animations):gltf.animations;rig.groundSamples=type==='animal'?animalGroundSamples(model):null;}
          root.add(model);this.mixers.set(entity.id,rig);adopted=true;
          this.updateActor(entity,0,type);root.updateMatrixWorld(true);
          model.traverse(mesh=>{if(mesh.isSkinnedMesh&&!updateSkinEnvelopeSphere(mesh,prepared?.skinEnvelopes?.get(mesh)))mesh.computeBoundingSphere();});
        }catch(error){cleanup();throw error;}
      });
    };
    try{return this.loadingProgress&&!this.loadingProgress.ready?await this.loadingActorPreparation().run(adopt):adopt();}
    catch(error){cleanup();throw error;}

  }
  wateringSource(id,time,effect){
    const data=this.mixers.get(id),root=this.objects.get(id),sample=this.wateringEmitters.get(data?.profile);
    if(!data||!sample||!root||!effect)return null;
    sample(time/4.3,this.waterMouth,this.waterDirection);root.updateWorldMatrix(true,false);effect.updateWorldMatrix(true,false);
    this.waterMouth.applyMatrix4(root.matrixWorld);effect.worldToLocal(this.waterMouth);
    this.waterDirection.transformDirection(root.matrixWorld);effect.surfaceInverse.copy(effect.matrixWorld).invert();this.waterDirection.transformDirection(effect.surfaceInverse);
    return {position:this.waterMouth.toArray(),direction:this.waterDirection.toArray()};
  }
  async crate(entity){
    const gltf=await this.assets.model(this.workerLibraries[entity.profile??'olderMale'].url);
    if(!this.state||!this.objects.has(entity.id))return;
    const model=nativeCrate(gltf);model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});this.objects.get(entity.id).add(model);
  }
  updateActor(entity,dt,type) {
    const data=this.mixers.get(entity.id);if(!data)return;
    if(type==='worker'){
      const task=this.state.tasks.find(t=>t.id===entity.taskId);
      applyWorkerPose(data,entity,task,this.state.elapsed,this.workerLibraries[entity.profile],this.workerToolCulling!==false);
      if(entity.status==='acting'&&(task?.kind==='initial'||task?.kind==='water'))this.objects.get(entity.id).rotation.y=entity.heading??0;
      if(entity.path?.length){const next=entity.path[0];this.objects.get(entity.id).rotation.y=Math.atan2(next.x-entity.x,next.z-entity.z);}
      return;
    }
    applyAnimalPose(data,entity,this.state.elapsed);
    this.objects.get(entity.id).rotation.y=entity.heading??0;
    if(entity.path?.length){const next=entity.path[0];this.objects.get(entity.id).rotation.y=Math.atan2(next.x-entity.x,next.z-entity.z);}
  }
  prepareUpcomingAnimalRigs(s=this.state,now=performance.now()) {
    if(!s||this.disposed)return;
    const upcoming=s.nightPlan?.group??(!s.postgame&&s.day<=5?[Object.keys(animalSources)[s.day-1]]:[]);
    const warmKey=upcoming.join(',');if(this.animalWarmKey!==warmKey){this.animalWarmKey=warmKey;this.warmAnimalModels(upcoming).catch(error=>this.onError?.(error));}
    // Plans are known before the raid; do not reset remaining reserve counts
    // while actors consume them. A new day also refreshes an identical group.
    const reserveKey=s.day+':'+(s.nightPlan?.done?'done':'pending')+':'+warmKey;
    if(s.raid)this.animalReserveKey=null; // Rebuild demand after an unplanned daytime raid too.
    if(this.animalGpuReady&&!s.raid&&this.animalReserveKey!==reserveKey&&now>=(this.animalReserveRetryAt??0)){
      this.animalReserveKey=reserveKey;
      this.animalReservePreparation=this.animalPreload.reserveGroup(s.nightPlan?.done?[]:upcoming,{prepare:async rig=>{
        if(this.disposed)return;const skeletons=new Set();rig.model.traverse(mesh=>{if(mesh.isSkinnedMesh)skeletons.add(mesh.skeleton);});
        for(const skeleton of skeletons){skeleton.computeBoneTexture();skeleton.update();this.renderer.initTexture(skeleton.boneTexture);}
        await waitForGpuPreload(this.renderer,{signal:this.loading.signal,cancelled:()=>this.disposed,getEpoch:()=>this.glResourceEpoch?.stats.epoch??0});
      }}).catch(error=>{if(!this.disposed&&this.animalReserveKey===reserveKey){this.animalReserveKey=null;this.animalReserveRetryAt=performance.now()+3000;this.onError?.(error);}});
    }
  }
  sync(dt) {
    const s=this.state;if(!s||!this.cropModels)return;
    this.groundDetails?.flush(this.nav.field,s);
    this.prepareUpcomingAnimalRigs(s);
    const desired=new Set();
    for(const v of s.villages){desired.add(v.id);if(!this.objects.has(v.id)){const mesh=this.villageMesh(v);this.objects.set(v.id,mesh);this.scene.add(mesh);this.cameraVolumesDirty=true;this.cameraDirtyEntities?.set(v.id,v);}}
    const visiblePlants=activeCrops(s.plants).filter(p=>Math.hypot(p.x-this.controls.target.x,p.z-this.controls.target.z)<140);
    this.microeventVisiblePlants=visiblePlants;
    if(visiblePlants.length>this.cropBatch.capacity)loadingSyncWitness(this.onLoadingSpan,'sync-crop-resize',()=>{this.cropBatch.dispose();this.cropBatch=createCropBatch(this.scene,this.renderer,this.cropGltf,this.cropBridgeData,2**Math.ceil(Math.log2(visiblePlants.length)));});
    if(this.onLoadingSpan)loadingSyncWitness(this.onLoadingSpan,'sync-crop-update',()=>this.cropBatch.update(visiblePlants,s.elapsed,(x,z)=>this.nav.field.surface(x,z),this.renderOrigin,this.nav.field));
    else this.cropBatch.update(visiblePlants,s.elapsed,(x,z)=>this.nav.field.surface(x,z),this.renderOrigin,this.nav.field);
    this.microeventVisibleWood=[];
    for(const e of [...s.structures,...activeCrates(s.crates),...s.workers.filter(w=>w.status!=='home'),...(s.raid?.animals.filter(a=>a.status!=='gone')??[]),...s.spells]) {
      if(e.kind==='wall'&&e.material==='empalizada'&&e.status==='intact'&&Math.hypot(e.x-this.controls.target.x,e.z-this.controls.target.z)<140)this.microeventVisibleWood.push(e);
      desired.add(e.id);let mesh=this.objects.get(e.id);
      if(!mesh) {
        if(e.kind==='center')mesh=this.centerMesh(e);
        else if(e.kind==='wall')mesh=new NativeWall(this.wallPrototypes,e,s.elapsed);
        else if(e.species&&'growth' in e)mesh=new THREE.Group();
        else if('value' in e){mesh=new THREE.Group();this.objects.set(e.id,mesh);this.crate(e).catch(error=>this.onError?.(error));}
        else if('profile' in e||'hitsRemaining' in e) {mesh=new THREE.Group();}
        else if(e.kind==='shield')mesh=new THREE.Group();
        else mesh=new THREE.Group();
      mesh.userData.entityId=e.id;this.objects.set(e.id,mesh);this.scene.add(mesh);if(e.kind==='center'||e.kind==='wall'){this.cameraVolumesDirty=true;this.cameraDirtyEntities?.set(e.id,e);}
      }
      mesh.position.set(e.x,('profile' in e||'hitsRemaining' in e?this.nav.actorSurface(e.x,e.z):this.nav.field.surface(e.x,e.z))+.025,e.z);
      if(!('value' in e)&&('profile' in e||'hitsRemaining' in e)&&!this.mixers.has(e.id))this.requestActor(e,'profile' in e?'worker':'animal',mesh);
      if('value' in e)mesh.visible=!e.carrierId;
      if(e.kind==='wall'){mesh.rotation.y=e.yaw;mesh.update(e,dt,s.elapsed);}
      else if(e.kind==='center')mesh.update(e,s.elapsed);
      if(e.kind==='wall'||e.kind==='center'){
        const key=[mesh.stageKey,mesh.gateOpen,mesh.visual,mesh.damage,mesh.position.x,mesh.position.y,mesh.position.z,mesh.rotation.y].join('|');
        if(mesh.userData.cameraVolumeKey!==key){mesh.userData.cameraVolumeKey=key;this.cameraVolumesDirty=true;this.cameraDirtyEntities?.set(e.id,e);}
      }
      if(e.species&&'growth' in e) {
        const growth=e.growth/cropSpec(e.species).growth_seconds,stage=growth>=1?4:Math.max(0,marks.findIndex(m=>growth<m)-1),key=`${cropIds.indexOf(e.species)}:${stage}`;
        if(mesh.userData.stageKey!==key){mesh.clear();mesh.add(this.cropModels[cropIds.indexOf(e.species)*5+stage].clone());mesh.userData.stageKey=key;}
        if(growth<.065){const amount=Math.max(.06,growth/.065);mesh.scale.set(.4+.6*amount,amount,.4+.6*amount);}else mesh.scale.set(1,1,1);
      }
      if(!('value' in e)&&('profile' in e||'hitsRemaining' in e))this.updateActor(e,dt,'profile' in e?'worker':'animal');
    }
    for(const [id,mesh] of this.objects)if(!desired.has(id)){this.scene.remove(mesh);if(mesh.userData.nativeWall||mesh.userData.nativeBuilding)mesh.dispose();releaseActorRig(this.mixers.get(id));this.objects.delete(id);this.mixers.delete(id);if(mesh.userData.nativeWall||mesh.userData.nativeBuilding||mesh.userData.units||this.cameraExclusion?.registry.roots.has(id)){this.cameraVolumesDirty=true;this.cameraDirtyEntities?.set(id,null);}}
    const night=s.time>=300,tint=night?'#263747':this.pack.profile.bg;
    this.renderer.setClearColor(tint);this.scene.fog=null;this.destructionPass.night=skyNight(s);this.destructionPass.nightLight=1.12;this.sun.intensity=3-2.6*this.destructionPass.night;this.ambient.intensity=2-.9*this.destructionPass.night;
    updateShadowCamera(this.sun,this.controls.target);
  }
  pick(event,{terrainOnly=false}={}) {
    protectTerrainCamera(this.camera,this.controls,this.nav?.field);
    const rect=this.canvas.getBoundingClientRect();this.cursor.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.cursor,this.camera);
    if(terrainOnly){const ground=this.raycaster.intersectObjects(this.terrainMeshes,false)[0];return {entityId:null,point:ground?{x:ground.point.x,z:ground.point.z}:null};}
    const hits=this.raycaster.intersectObjects([...this.objects.values()],true);
    let entityId=null;for(const hit of hits){let object=hit.object;while(object&&!object.userData.entityId)object=object.parent;if(object){entityId=object.userData.entityId;break;}}
    let closest=hits[0]?.distance??Infinity;const point=new THREE.Vector3(),box=new THREE.Box3();
    for(const plant of activeCrops(this.state.plants)) {
      const y=this.nav.field.surface(plant.x,plant.z),sample=this.cropBatch.sample(plant.species,plant.growth),radius=plant.species==='platano'?.65:.45;
      box.min.set(plant.x-radius,y,plant.z-radius);box.max.set(plant.x+radius,y+Math.max(.16,sample.height),plant.z+radius);
      if(this.raycaster.ray.intersectBox(box,point)){const distance=point.distanceTo(this.raycaster.ray.origin);if(distance<closest){closest=distance;entityId=plant.id;}}
    }
    const ground=this.raycaster.intersectObjects(this.terrainMeshes,false)[0];return {entityId,point:ground?{x:ground.point.x,z:ground.point.z}:null};
  }
  handColliders(config){
    const boxes=[],box=new THREE.Box3(),matrix=new THREE.Matrix4();
    const add=(bounds,id,list=boxes)=>{if(!bounds.isEmpty())list.push({id,min:bounds.min.toArray(),max:bounds.max.toArray()});};
    if(!this.handStaticBoxes){
      this.handStaticBoxes=[];
      for(const [key,group] of this.chunks){group.updateMatrixWorld(true);
        const dummy=new THREE.Object3D();
        for(const batch of group.userData.lodBatches??[])for(const p of batch.instances){
          dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.yaw;dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();
          box.copy(batch.meshes[0].geometry.boundingBox).applyMatrix4(dummy.matrix);add(box,`${key}:prop:${p.id}`,this.handStaticBoxes);
        }
        group.traverse(mesh=>{
        if(!mesh.isInstancedMesh||mesh.userData.nativeFluid||mesh.userData.nativeLodBatch)return;mesh.geometry.computeBoundingBox();
        for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);box.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);add(box,`${key}:prop:${mesh.id}:${i}`,this.handStaticBoxes);}
      });}
    }
    boxes.push(...this.handStaticBoxes);
    const ids=[...this.state.villages,...this.state.structures].map(e=>e.id);
    for(const id of ids){const root=this.objects.get(id);if(!root)continue;root.updateMatrixWorld(true);root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      // Village draw ranges share a buffer containing every building. Its
      // complete geometry box would incorrectly enclose the whole village.
      const unit=mesh.userData.unit;
      if(unit)box.set(new THREE.Vector3(...unit.min),new THREE.Vector3(...unit.max)).applyMatrix4(mesh.matrixWorld);
      else {mesh.geometry.computeBoundingBox();box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);}
      add(box,id+':'+mesh.id);
    });}
    const points=config.route??[config.position],radius=config.minimumScreenHeight?8:3;
    const loX=Math.min(...points.map(p=>p[0]))-radius,hiX=Math.max(...points.map(p=>p[0]))+radius,loZ=Math.min(...points.map(p=>p[2]))-radius,hiZ=Math.max(...points.map(p=>p[2]))+radius;
    return boxes.filter(b=>b.max[0]>=loX&&b.min[0]<=hiX&&b.max[2]>=loZ&&b.min[2]<=hiZ);
  }
  tutorialGuideTarget(){
    const step=this.state.tutorial.step,magicGuide=['magic.growth','magic.multiply'].includes(this.state.tutorial.reading),key=step+':'+this.tutorialToolKind+':'+this.nav.version+(magicGuide?':'+this.state.tutorial.reading+':'+this.tutorialSpellKind+':'+this.state.spells.length+':'+this.state.plants.length+':'+Math.floor(this.state.elapsed*5):'');
    let config=null;
    if(this.tutorialHandsEnabled!==false&&this.state.day===1&&!this.state.result&&(step!=='done'||magicGuide)){
      if(this.handTargetKey!==key){this.handTargetKey=key;this.handTargetCache=tutorialHandTarget(this.state,this.nav,this.tutorialToolKind,this.tutorialSpellKind);}config=this.handTargetCache;
    }
    return config;
  }
  updateHands(dt){
    if(!this.hands)return;
    const config=this.tutorialGuideTarget();focusNewTutorialPlacement(this,config);
    this.hands.show(config,config?this.handColliders(config):[]);this.hands.update(dt,this.camera,this.renderer.domElement.clientHeight);
  }
  *renderFrameUpdates(dt) {
    if(this.shaderFailure.current)throw this.shaderFailure.current;this.resize();if(!this.cinematic){this.updateCamera();this.raidCamera?.update(this.state,dt);}this.strokePreview.render(this.camera,this.nav.field);if(this.renderOrigin.update(this.controls.target))this.releaseNativeShadow.cache.invalidate();this.syncChunks();yield;
    this.lodStats=updateAssetLods(this.chunks,this.camera,this.quality);const simulated=Math.max(0,this.state.elapsed-this.simElapsed);this.simElapsed=this.state.elapsed;const loadingFog=this.loadingProgress&&!this.loadingProgress.ready&&this.farVegetation?.enabled?this.scene.fog:null;this.sync(simulated);if(loadingFog)this.scene.fog=loadingFog;yield;
    this.obstructionStats=updateObstructions(this.chunks,this.camera,this.controls.target,dt,{enabled:this.obstructionEnabled!==false});yield;
    this.farVegetation?.update(dt);yield;
    this.groupStats=this.assetGroups.update(this.chunks,this.camera,this.renderOrigin,this.sun);yield;
    if(!this.cinematic)this.updateHands(dt);this.workVfx?.update(this.state);this.attackVfx?.update(this.state);this.shieldVfx?.update(this.state);this.agricultureVfx?.update(this.state);this.materialVfx?.update(this.state);this.locomotionVfx?.update(this.state,this.objects);yield;
    this.toon.uniforms.uWorldOrigin.value.set(this.renderOrigin.x,this.renderOrigin.z);yield;
    this.prepareFrameResources();yield;
  }
  async renderLoadingFrame({nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),afterRender=()=>{}}={}) {
    const stages=this.renderFrameUpdates(0),check=()=>{if(this.disposed||this.loading.signal.aborted)throw Error('Loading frame cancelled');};
    try{let stage=0;for(;;){check();const next=this.onLoadingSpan?loadingSyncWitness(this.onLoadingSpan,'loading-frame-stage:'+stage++,()=>stages.next()):stages.next();if(next.done)break;afterRender();await nextFrame();}check();return this.onLoadingSpan?loadingSyncWitness(this.onLoadingSpan,'loading-frame-draw',()=>this.drawRenderFrame()):this.drawRenderFrame();}
    finally{stages.return();}
  }
  render(dt) {if(this.onLoadingSpan){const stages=this.renderFrameUpdates(dt);try{let stage=0;while(!loadingSyncWitness(this.onLoadingSpan,'world-frame-stage:'+stage++,()=>stages.next()).done){}return loadingSyncWitness(this.onLoadingSpan,'world-frame-draw',()=>this.drawRenderFrame());}finally{stages.return();}}for(const step of this.renderFrameUpdates(dt)){}return this.drawRenderFrame();}
  prepareFrameResources() {if(!this.mangroveMaterialCache&&this.biomeGround?.mangroveSubstrate&&this.biomeGround?.mangroveShore&&mangroveMaterialCacheEnabled())this.mangroveMaterialCache=createMangroveMaterialCache(this);this.mangroveMaterialCache?.update();}
  drawRenderFrame() {this.beforeMicroeventDraw?.();return this.presentationDraw?this.presentationDraw(()=>this.drawWorldFrame()):this.drawWorldFrame();}
  drawWorldFrame() {return withRenderOrigin({scene:this.scene,camera:this.camera,origin:this.renderOrigin,detached:[this.assetGroups.shadowRoot],minMax:()=>renderOriginBounds(this.scene,this.materialRegistry.enabled?this.materialRegistry.materials.keys():null),minSize:()=>[this.contacts.uniforms.uContactBounds.value,...this.terrainMeshes.map(m=>m.material.userData.biomeGround?.uGroundRect.value).filter(Boolean),...((this.horizon?.group?.children??[]).map(m=>m.material?.userData.biomeGround?.uGroundRect.value).filter(Boolean))]},()=>{this.destructionPass.render(this.camera,this.scene);const workDepth=!!this.workVfx?.prepare(this.camera),attackDepth=!!this.attackVfx?.prepare(this.camera),shieldDepth=!!this.shieldVfx?.prepare(this.camera),agricultureDepth=!!this.agricultureVfx?.prepare(this.camera),materialDepth=!!this.materialVfx?.prepare(this.camera),locomotionDepth=!!this.locomotionVfx?.prepare(this.camera),depth=workDepth||attackDepth||shieldDepth||agricultureDepth||materialDepth||locomotionDepth;this.toon.update(skyNight(this.state),this.sun,this.state.biome);this.materialRegistry.update(waterTime(this.state.elapsed));const autoClear=this.renderer.autoClear;try{this.renderer.autoClear=false;this.renderer.clear();this.sky.render(this.renderer,this.camera,this.state);
// The existing sky draw advances Three geometry updates before shadowless depth capture.
if(depth)this.destructionPass.captureDepth(this.camera,this.scene);this.renderer.render(this.scene,this.camera);}finally{this.renderer.autoClear=autoClear;}this.destructionPass.renderSmoke(this.camera,this.scene,{depthPrepared:depth});});}
  dispose() {if(this.disposed)return;this.disposed=true;this.releaseRetainedPrograms();this.mangroveMaterialCache?.dispose();this.mangroveMaterialCache=null;if(this.nav)delete this.nav.raidEntryResident;this.loading?.abort();this.loadingActorQueue?.dispose();this.canvasEvents?.abort();this.animalPreload?.dispose();for(const rig of this.mixers?.values()??[])releaseActorRig(rig);this.mixers?.clear();this.spellPreview.dispose();this.materialRegistry.dispose();this.farVegetation?.dispose();this.groundDetails?.dispose();this.chunkStream?.dispose();this.releaseAssetShadows?.();this.releaseNativeShadow?.();this.assetGroups.dispose();for(const group of this.chunks.values())disposeAssetShadows(group);this.contacts.dispose();this.horizon?.dispose();this.sky.dispose();this.workVfx?.dispose();this.attackVfx?.dispose();this.shieldVfx?.dispose();this.agricultureVfx?.dispose();this.materialVfx?.dispose();this.locomotionVfx?.dispose();this.vfxLibrary?.dispose();this.wallDrawing.dispose();this.strokePreview.dispose();this.clearWallPreview();this.hands?.dispose();this.destructionPass.dispose();for(const template of this.buildingTemplates.values())template.dispose();this.resizeObserver.disconnect();this.releaseCameraExclusion?.();this.releaseCameraIntent?.();this.controls.dispose();this.cropBatch?.dispose();this.scene.traverse(o=>{if(o.isMesh){if(o.isInstancedMesh)o.dispose();if(!o.userData.borrowedWaterGeometry&&(!o.isInstancedMesh||o.geometry.userData.obstruction||o.geometry.userData.nativeChunkClip))o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if(m!==this.fluidMaterial)m.dispose();});}});this.waterPrototypes?.forEach(g=>g?.dispose());this.fluidMaterial?.dispose();this.sun.shadow.dispose();this.biomeGround?.dispose();this.mudPatches?.dispose();this.assets?.disposeModels();this.renderer.dispose();this.glResourceEpoch?.dispose();this.renderer.forceContextLoss();this.state=null;}

}
