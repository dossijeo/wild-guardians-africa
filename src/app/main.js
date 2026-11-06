import {projectConfirmedHud} from '../simulation/confirmed-hud-projection.js';
import {confirmedNoticeFocus} from '../simulation/confirmed-notice-projection.js';
import {requestWorkerBlessingPreview} from './worker-blessing-preview.js';
import {createConfirmedActorAudio,applyConfirmedActorAudio} from '../simulation/confirmed-actor-audio.js';
import {playGuardianScenePresence} from '../audio/guardian-presence.js';
import {updateGameAudio} from './game-audio-update.js';
import {renderResultAvailability as renderSharedResultAvailability} from './result-availability.js';
import {recoverWorkVfxForQa} from '../rendering/work-vfx-recovery-qa.js';
import {createWebGpuAutoRecovery} from './webgpu-auto-recovery.js';
import {resolvePresentationRecoveryOptions} from '../simulation/presentation-recovery-options.js';
import {webGpuWorldOptions,guardianPlacementForWorld} from './webgpu-world-options.js';
import {workerPresentationProfile,workerTutorialTargetNeeded} from './worker-presentation-profile.js';
import {selectPresentationBackend} from './select-presentation-backend.js';
import {workerPresentationGround} from './worker-presentation-ground.js';
import {createNativeLoadingTrace} from './native-loading-trace.js';
import {globalFrameScheduler,globalFrameSchedulerEnabled} from './global-frame-scheduler.js';
import {createDesktopExit} from './desktop-exit.js';
import {preloadScreenOverlays} from '../ui/screen-overlays.js';
import {GameJuice} from '../ui/game-juice.js';
import {CampaignCinematics} from '../ui/campaign-cinematics.js';
import {dueCinematicAct,finishCinematicAct,initializeCinematicProgress} from './campaign-cinematics.js';
import {installLoadingGameplayGpuQa} from './loading-gameplay-gpu-qa.js';
import {exclusiveWebGpuDrawEnabled,renderWithOptionalWebGpuPresentation} from './webgpu-legacy-draw.js';
import {createWebGpuDiscretePick} from './webgpu-discrete-pick.js';
import {createWebGpuCameraPresentation,webGpuCameraPose} from './webgpu-camera-presentation.js';
import {LibraryViewer} from '../ui/library-viewer.js';
import {EventCards} from '../ui/event-cards.js';
import {LoadingAudio} from '../audio/loading-audio.js';
import {prepareLoadingFrames} from '../ui/loading-frame-preparation.js';
import {LoadingOverlay} from '../ui/loading-overlay.js';
import {clearLoadingFailure,showLoadingFailure} from '../ui/loading-failure.js';
import {LoadingCinematic} from '../rendering/loading-cinematic.js';
import {LoadingProgress} from './loading-progress.js';
import {LoadingTransferOwner} from './loading-transfer-owner.js';
import {installLoadingProgressQa} from './loading-progress-qa.js';
import {installLoadingAudioQa} from './loading-audio-qa.js';
import {LOADING_STAGES} from './loading-recipe.js';
import {SpiritVoice,spiritVoice} from '../audio/spirit-voice.js';
import {guardianCopy} from '../tutorial/guardian-copy.js';
import {tutorialMessageShownToday,recordTutorialMessageToday} from '../tutorial/daily-messages.js';
import {NoticeLifetime,tutorialCoversNotice} from './notices.js';
const noticeLifetime=new NoticeLifetime();
const workerTutorialGuidance=new WeakMap();
const NO_CONFIRMED_EVENTS=Object.freeze([]);
import {syncTutorialActionPause} from '../tutorial/action-pause.js';
import {TutorialHudGuide,tutorialHudHandTarget} from '../ui/tutorial-hud-hand.js';
import {GameScreenWakeLock} from '../ui/screen-wake-lock.js';
import {spellCardsMarkup,refreshSpellCards} from '../ui/spell-cards.js';
import {dispatchPickedSpell,confirmedSpellContact} from './spell-placement.js';
import {provisionalGuardianOrigin,provisionalAwakeningSelection} from './provisional-guardian-origin.js';
import {closeAuthorityFailurePresentation} from './authority-failure-presentation.js';
import {createEarlyGpuAttackGesture} from './early-gpu-attack-gesture.js';
import {plantNearTouch} from './plant-placement.js';
import {UiAudio,guidedPlacementKind} from '../audio/ui-audio.js';
import {ToolSession} from '../ui/tool-session.js';
import {ManualMagicActivity,bindMagicSelectionContact} from '../ui/manual-magic-activity.js';
import {RESERVE_MESSAGE,HIRING_RESERVE,BUDGET_WARNING_THRESHOLD} from '../simulation/budget.js';
import {GameSurfaces} from '../ui/game-surfaces.js';
import {resumeLoadedWorld} from './resume-loaded-world.js';
import '../ui/styles.css';
import {autosaveEventAfter,createConfirmedAutosaveController} from './autosave-events.js';
import {saveGame,saveWorkerGame} from './save-game.js';
import {createWorkerSaveCoordinator} from '../persistence/worker-save.js';
import {dispatchSimulationPause} from './simulation-pause.js';
import {createWorkerNightSpeedBridge} from './worker-night-speed.js';
import {Microevents} from '../microevents/controller.js';
import {createWorkerMicroeventEconomy} from '../microevents/worker-economy.js';
import {createWorkerTutorialGuide} from './worker-tutorial-guide.js';
import {recordMicroeventFrame} from './microevents-frame-qa.js';
import {disableMicroEconomy} from '../microevents/economy.js';
import {agriculturalDawnMessage} from '../ui/agricultural-notice.js';
import {WORLD_RESOLUTIONS,worldResolution,applyWorldResolution} from './world-resolution.js';
import {renderCommandFeedback} from '../ui/command-feedback.js';
import {BALANCE as B} from '../simulation/balance.js';
import {villageCost} from '../simulation/rules.js';
import * as Game from '../simulation/game.js';
import {PROFILES} from '../simulation/workforce.js';
import {formatMoney,formatWholeCoins,numberOf} from '../simulation/money.js';
import {isMature} from '../simulation/crops.js';
import {cropSpec,permission,operational,attraction} from '../simulation/rules.js';
import {BrowserSaveRepository} from '../persistence/browser-saves.js';
import {serialize} from '../persistence/snapshots.js';
import {decodeSnapshotAsync} from '../persistence/snapshot-decoder.js';
import {prepareFreshWorkerBootstrapInWorker,prepareSavedWorkerCheckpointInWorker,prepareSavedWorkerBootstrapInWorker} from '../simulation/fresh-worker-bootstrap-client.js';
import {createSimulationAuthorityClient} from '../simulation/simulation-authority-client.js';
import {createWorkerHostedRuntime} from '../simulation/worker-hosted-runtime.js';
import {createEarlyWorkerAuthority} from './early-worker-authority.js';
import {earlyWorkerOptions,workerDiagnosticParams,selectPreparedAuthorityOptions} from './early-worker-options.js';
import {createWebGpuWorldClient} from '../rendering/webgpu-world-client.js';
import {temporalPresentationOptions} from './temporal-presentation-options.js';
import {captureRaidWaitBindings} from '../simulation/raid-wait-handoff.js';
import {captureStructureTemplate} from '../simulation/worker-structure-geometry.js';
import {captureNativeAuthorityBootstrap} from '../simulation/native-authority-bootstrap.js';
import {savedNativeAuthorityOptions} from '../simulation/native-authority-checkpoint.js';
import {earlyNativeStartupCommand} from '../simulation/early-native-startup.js';
import {createEarlyWorkerWorld} from './early-worker-world.js';
import {loadLegacyWorldScene,loadLegacyLoadingDiorama} from './load-legacy-world-scene.js';
import {freshNativeAuthorityOptions} from '../simulation/fresh-native-authority.js';
import {confirmedCropId} from './confirmed-crop-event.js';
import {createConfirmedPresentationAdapter} from '../simulation/confirmed-presentation-adapter.js';
import {BIOME_IDS} from '../world/biome-ids.js';
import {villageLayout,findVillageEntry} from '../world/villages.js';
import {prepareWildEngineWorld} from './wild-engine-world.js';
import {canRestoreWorkerOnly,createWorkerNavigationProjection} from './worker-navigation-projection.js';
import {createEventDrivenTaskPlanner} from '../world/wild-engine/spatial-intent-bridge.js';
import {farVegetationProfile,farGroundReviewOverrides} from '../rendering/far-vegetation-profile.js';
import {prepareInitialFarWorld} from './far-world-loading.js';
import {frameDelta} from './frame-delta.js';
import {json} from '../rendering/assets.js';
import {assetUrl} from '../rendering/asset-url.js';
import {createFrameImageLoader} from '../ui/frame-image-loader.js';
import {createLoadingFrameLoader} from '../ui/loading-ornament-loader.js';
import {hiringConfirmation} from '../ui/hiring-confirmation.js';
import {AudioSystem} from '../audio/audio.js';
import {ASSETS,hudMarkup,layoutHud as layoutNativeHud,hiringMarkup,NPC_TYPES,framePaint,spellSVG} from '../ui/native-hud.js';
import {AwakeningHud} from '../ui/awakening-hud.js';
import '../ui/awakening-hud.css';
import {NativeGuardian} from '../ui/guardian.js';
import {hudShortcut} from '../ui/hud-shortcuts.js';
import {refreshBuildPermissions} from '../ui/build-permissions.js';
import {TutorialController} from '../tutorial/controller.js';
import {createWorkerTutorialBridge} from '../tutorial/worker-bridge.js';
import {TutorialProfile} from '../tutorial/profile.js';
import '../ui/tutorial.css';

const app=document.querySelector('#app'),saves=new BrowserSaveRepository(localStorage);
const guidanceQa=import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-guidance');
const cropSpellFrameQa=import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-crop-spell-frame');
const skipLegacyDrawQa=exclusiveWebGpuDrawEnabled(new URLSearchParams(location.search),import.meta.env.DEV);
const gameplayGpuQa=import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-loading-gpu-gameplay')?installLoadingGameplayGpuQa(document):null;
const progressQa=import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-loading')?installLoadingProgressQa(document,{throttleReady:!new URLSearchParams(location.search).has('qa-loading-unthrottled'),gpu:new URLSearchParams(location.search).has('qa-loading-gpu')}):null;
// Hints come only from already-validated slot listings. The decoded save remains
// authoritative; hints allow the first loading sky to use its known clock.
const savePreviews=new Map();
async function listedSaves(){const slots=await saves.list();savePreviews.clear();for(const slot of slots)savePreviews.set(slot.slotId,{day:slot.day,time:slot.time??0,biome:slot.biome,culture:slot.culture});return slots;}
for(const item of Object.values(ASSETS))item.src=assetUrl(item.src);
const loadFrameImages=createFrameImageLoader(ASSETS),loadLoadingFrameImages=createLoadingFrameLoader(loadFrameImages);
const screenWakeLock=new GameScreenWakeLock();screenWakeLock.setActive(true);
let juice=null;
let awakeningHud=null;
function layoutHud(stage){const dims=layoutNativeHud(stage);return awakeningHud?.layout(dims)??dims;}
let campaignCinema=null;
let selector,thumbnails,state=null,nav=null,world=null,tool=null,selection=null,screen='menu',lastFrame=0,starting=false,raidLoading=null,lastUI=0,villageCatalog=null,pendingVillage=null,initialHiringPending=null,runtimeErrorWorld=null;
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-visibility'))globalThis.wildGuardiansVisibilityQa=()=>({
  hidden:document.hidden,screen,snapshot:state?JSON.stringify(state):null,
  frameAt:lastFrame,observedAt:performance.now(),
  actors:world?(state?.raid?.animals??[]).map(a=>({id:a.id,ready:world.mixers.has(a.id),lod:world.mixers.get(a.id)?.lod?{pending:!!world.mixers.get(a.id).lod.pendingPreparation,visible:world.mixers.get(a.id).lod.root.visible}:null,position:world.objects.get(a.id)?.position.toArray()??null,visible:world.objects.get(a.id)?.visible??false})):[],
  camera:world?{eye:world.camera.position.toArray(),target:world.controls.target.toArray(),projection:world.camera.projectionMatrix.toArray(),inverse:world.camera.matrixWorldInverse.toArray(),canvas:world.canvas.getBoundingClientRect().toJSON()}:null
});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerQa=()=>({screen,starting,causalInputs:world?.qaPresentationInputSeq??0,...(new URLSearchParams(location.search).has('qa-webgpu-causal-input')?{discretePicks:world?.qaDiscretePicks??[]}:{}),slotId:state?.slotId??null,status:world?.workerRuntime?.status()??null,hostedClock:world?.workerRuntime?.hostedClock??null,backgroundViews:world?.workerRuntime?.backgroundViews??false,elapsed:state?.elapsed??null,time:state?.time??null,night:state?.nightPlan?{at:state.nightPlan.at,done:state.nightPlan.done,count:state.nightPlan.group?.length}:null,pauses:state?.pauses??[],tutorial:state?.tutorial??null,guide:screen==='game'?(world?.qaEarlyTutorial?world.qaTutorialGuide?.config??null:world?.tutorialGuideTarget?.()??null):null,centers:state?.structures?.filter(s=>s.kind==='center').length??0,plants:state?.plants?.filter(p=>p.alive).length??0,workers:state?.workers?.length??0,animals:state?.raid?.animals?.length??0,events:state?.events?.slice(-20).map(e=>e.type)??[]});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-benchmark-barrier'))globalThis.wildGuardiansWorkerStableQa=()=>{if(!world?.workerRuntime||!state?.pauses.includes('qa-stable-start'))throw Error('QA barrier unavailable');return changeSimulationPause(false,'qa-stable-start');};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-world'))globalThis.wildGuardiansWebGpuWorldQa=()=>world?.webGpuWorld?.client.inspect()??Promise.reject(Error('WebGPU world unavailable'));
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-work-checkpoint'))globalThis.wildGuardiansRecoverWorkVfxQa=()=>{const owner=world,game=state,client=owner?.webGpuWorld?.client,runtime=owner?.workerRuntime;return recoverWorkVfxForQa({client,runtime,manager:owner?.workVfx,state:game,isCurrent:()=>world===owner&&state===game&&owner?.webGpuWorld?.client===client&&owner?.workerRuntime===runtime});};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-water-view'))globalThis.wildGuardiansWaterCameraQa=point=>{if(!world?.controls||!world?.camera||![point?.x,point?.y,point?.z].every(Number.isFinite))throw Error('Water camera unavailable');if(world.raidCamera)world.raidCamera.update=()=>{};world.controls.enableDamping=false;world.controls.target.set(point.x,point.y,point.z);world.camera.position.set(point.x+8,point.y+15,point.z+22);world.controls.update();world.webGpuWorld?.sync();return point;};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-world'))globalThis.wildGuardiansWebGpuLoseDeviceQa=()=>world?.webGpuWorld?.client.loseDeviceForQa();
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-picking'))globalThis.wildGuardiansWebGpuPickQa=(clientX,clientY)=>{const owner=world,client=owner?.webGpuWorld?.client;if(!client)return Promise.reject(Error('WebGPU picker unavailable'));const rect=owner.canvas.getBoundingClientRect();return client.pick({x:(clientX-rect.left)/rect.width*2-1,y:1-(clientY-rect.top)/rect.height*2});};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerPickQa=(x,y)=>world?.pick({clientX:x,clientY:y})?.entityId??null;
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-guardian-program-warm'))globalThis.wildGuardiansGuardianPreparationQa=()=>({model:!!guardian?.mesh?.model,pending:!!guardian?.mesh?.pendingProgramPreparation,programs:guardian?.mesh?.renderer.info.programs?.length??0});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-ktx2-atlas'))globalThis.wildGuardiansKtxAuditQa=async()=>{const asset=world?.assets.experimentalKtx?.asset,tree=asset==='tree01',normal=asset==='savanna-normal',url=tree?world?.pack?.assets?.find(a=>a.slot==='tree_01')?.nearTextures?.textures?.baseColor:world?.pack?.textures?.find(t=>t.role===(normal?'normal':'baseColor'))?.base64?.url,texture=await world?.assets.cache.get(url+(!normal));let materials=0,uploaded=!!(texture&&world.renderer.properties.get(texture).__webglTexture),channels=new Set();if(texture)world.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material])){const map=normal?m?.normalMap:m?.map;if(map?.source===texture.source){materials++;channels.add(map.channel);uploaded||=!!world.renderer.properties.get(map).__webglTexture;}}});return texture?{url,compressed:!!texture.isCompressedTexture,uploaded,materials,channels:[...channels],format:texture.format,mips:texture.mipmaps.length,bytes:texture.mipmaps.reduce((n,m)=>n+(m.data?.byteLength??0),0)}:{biome:state?.biome,configured:!!world?.assets.experimentalKtx,url};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-ktx2-hyena-lod'))globalThis.wildGuardiansNativeHyenaQa=async()=>{const asset=await world.assets.model('/content/character-lod/hyena.glb'),textures=[],sources=new Set();asset.scene.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material])for(const name of ['map','normalMap'])if(material[name]){textures.push({name,compressed:!!material[name].isCompressedTexture});sources.add(material[name].source);}});let residentMeshes=0,visibleMeshes=0;world.scene.traverse(o=>{if(!o.isSkinnedMesh||!(Array.isArray(o.material)?o.material:[o.material]).some(m=>sources.has(m.map?.source)))return;residentMeshes++;let visible=true;for(let p=o;p;p=p.parent)visible&&=p.visible;if(visible)visibleMeshes++;});return {textures,residentMeshes,visibleMeshes};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-ktx2-tree-view'))globalThis.wildGuardiansKtxTreeViewQa=distance=>{if(!Number.isFinite(distance)||distance<5||distance>100)throw Error('Invalid tree camera distance');const trees=[];for(const group of world.chunks.values())for(const b of group.userData.lodBatches??[])if(b.slot===0)for(const p of b.instances)trees.push({p,b});const target=world.controls.target;trees.sort((a,b)=>Math.hypot(a.p.x-target.x,a.p.z-target.z)-Math.hypot(b.p.x-target.x,b.p.z-target.z));if(!trees.length)throw Error('No resident tree_01');const {p,b}=trees[0],box=b.levels[0].geometry.boundingBox,height=(box.max.y-box.min.y)*p.sy;if(world.raidCamera)world.raidCamera.update=()=>{};world.controls.enableDamping=false;world.controls.target.set(p.x,p.y+height*.45,p.z);world.camera.position.set(p.x+distance*.55,p.y+height*.75,p.z+distance*.84);world.controls.update();return {x:p.x,z:p.z,height,requestedDistance:distance};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-hold-presentation'))globalThis.wildGuardiansWebGpuPresentationControlQa=action=>{if(!world?.webGpuWorld?.client)throw Error('WebGPU presentation unavailable');return world.webGpuWorld.client.presentationControlForQa(action);};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-recovery'))globalThis.wildGuardiansReattachWebGpuQa=()=>{if(!world?.webGpuRecovery)throw Error('Visual recovery unavailable');return world.webGpuRecovery();};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-world'))globalThis.wildGuardiansRestoreTerrainCheckpointQa=async()=>{if(!world?.workerRuntime||!world.webGpuWorld?.client)throw Error('Worker presentation unavailable');const client=world.webGpuWorld.client,checkpoint=await world.workerRuntime.submit({kind:'snapshot',visualTerrain:true}),deadline=performance.now()+10000;while(performance.now()<deadline){const status=await client.inspect();if(status.lastTerrainCheckpoint?.sequence===checkpoint.sequence)return status.lastTerrainCheckpoint;if(status.lastTerrainCheckpoint?.sequence>checkpoint.sequence)throw Error('Terrain checkpoint skipped');await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Terrain checkpoint not applied');};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansLegacyDrawProbeQa=()=>{if(!world)throw Error('World unavailable');const target=world,draw=target.drawRenderFrame.bind(target),probe={draws:0};target.drawRenderFrame=(...args)=>{probe.draws++;return draw(...args);};return ()=>probe.draws;};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerRenderFailureQa=()=>{if(!world?.workerRuntime)throw Error('Worker game unavailable');world.render=()=>{throw Error('QA render failure');};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerAttackQa=id=>{const animal=state?.raid?.animals.find(a=>a.id===id&&!['gone','retreating'].includes(a.status));if(!animal||tool?.kind!=='spell'||tool.spell!=='attack')throw Error('QA attack target or tool unavailable');const point={x:animal.x,y:nav.actorSurface(animal.x,animal.z),z:animal.z};onPick({entityId:id,point,hitPoint:point});return id;};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerProvisionalImpactQa=id=>({pending:!!world?.provisionalBeastImpact?.byTarget.has(id),applied:!!world?.mixers.get(id)?.impactApplied,lastResolution:world?.provisionalBeastImpact?.lastResolution??null});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-frame-spans'))globalThis.wildGuardiansWorkerFrameSpansQa=()=>{const owner=world,spans=[],previous=owner.onLoadingSpan,restores=[],retain=row=>{if(spans.length<512)spans.push(row);else{let least=0;for(let i=1;i<spans.length;i++)if(spans[i].duration<spans[least].duration)least=i;if(row.duration<=spans[least].duration)return false;spans[least]=row;}return true;},record=(label,start,resources)=>{const duration=performance.now()-start;if(duration>=(String(label).startsWith('gl-draw')?5:String(label).startsWith('gl-')?0.5:5)){const row={label,start,duration,...(resources?{resources}: {})};if(retain(row))return row;}},listener=span=>{previous?.(span);if(span.duration>=5)retain({label:span.label,start:span.start,duration:span.duration});},wrap=(object,key,label)=>{if(typeof object?.[key]!=='function')return;const original=object[key],wrapped=function(...args){const start=performance.now(),before=object===owner.renderer&&key==='render'?{programs:owner.renderer.info.programs?.length??0,textures:owner.renderer.info.memory.textures}:null;try{return original.apply(this,args);}finally{const resources=before?{before,after:{programs:owner.renderer.info.programs?.length??0,textures:owner.renderer.info.memory.textures}}:null;const row=record(typeof label==='function'?label(args):label,start,resources);if(row&&key==='getProgramInfoLog'&&row.duration>50)row.programRef=args[0];}};object[key]=wrapped;restores.push(()=>{if(object[key]===wrapped)object[key]=original;});};owner.onLoadingSpan=listener;wrap(owner.renderer,'render',args=>args[0]===owner.scene?'renderer-world':'renderer-other');wrap(owner.renderer,'clear','renderer-clear');wrap(owner.sky,'render','sky-render');wrap(owner.destructionPass,'render','destruction-render');wrap(owner.destructionPass,'captureDepth','capture-depth');wrap(owner.destructionPass,'renderSmoke','render-smoke');if(new URLSearchParams(location.search).has('qa-worker-gl-calls')){const gl=owner.renderer.getContext(),size=(name,args)=>{const image=args.at(-1),offset=name==='texSubImage2D'?4:3,numeric=name==='texStorage2D'||args.length>=9;return numeric&&Number.isFinite(args[offset])&&Number.isFinite(args[offset+1])?`${args[offset]}x${args[offset+1]}`:image&&Number.isFinite(image.width)&&Number.isFinite(image.height)?`${image.width}x${image.height}`:'unknown';};for(const name of ['texImage2D','texSubImage2D','texStorage2D','compressedTexImage2D'])wrap(gl,name,args=>`gl-${name}:${size(name,args)}`);for(const name of ['compileShader','linkProgram','getProgramParameter','getShaderParameter','getProgramInfoLog','getShaderInfoLog','getActiveUniform','getUniformLocation','drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced'])wrap(gl,name,`gl-${name}`);}return ()=>{if(owner.onLoadingSpan===listener)owner.onLoadingSpan=previous;for(const restore of restores)restore();const slow=spans.filter(row=>row.programRef);if(slow.length)owner.scene.traverse(object=>{for(const material of (Array.isArray(object.material)?object.material:[object.material]).filter(Boolean)){const programs=owner.renderer.properties.get(material).programs;if(!programs)continue;for(const program of programs.values())for(const row of slow)if(program.program===row.programRef){row.materials??=[];if(row.materials.length<20)row.materials.push({name:material.name,type:material.type,object:object.name,ancestry:(()=>{const a=[];for(let node=object;node&&a.length<12;node=node.parent)a.push({name:node.name,id:node.userData.entityId??null});return a;})()});}}});for(const row of slow)delete row.programRef;return spans;};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-path-trace')){globalThis.wildGuardiansWorkerTrackPathQa=async(id,includePeers=false)=>{const owner=world,result=await owner.workerRuntime.submit({kind:'trackPathMotion',actorId:id,includePeers});if(owner===world&&result.value){owner.lastObservedPathMotion=null;owner.lastObservedUnusablePathMotion=null;owner.lastObservedPathInvalidation=null;owner.observedPathInvalidations=[];}return result;};globalThis.wildGuardiansWorkerPathTraceQa=()=>world?.lastObservedPathMotion??null;globalThis.wildGuardiansWorkerRawPathTraceQa=()=>world?.lastObservedUnusablePathMotion??null;globalThis.wildGuardiansWorkerPathInvalidationQa=()=>world?.observedPathInvalidations??[];}
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerVillageQa=async point=>{await villageCulturePanel();if(tool?.kind!=='village')throw Error('Village tool unavailable');onPick({entityId:null,point:{...point,y:nav.field.surface(point.x,point.z)}});return {valid:pendingVillage?.valid,pending:pendingVillage?.pending??false,reason:pendingVillage?.reason};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerVillageStateQa=()=>pendingVillage?{x:pendingVillage.x,z:pendingVillage.z,valid:pendingVillage.valid,pending:pendingVillage.pending??false}:null;
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerCombatQa=()=>({elapsed:state?.elapsed,gestureAt:state?.guardianAttackStartedAt,animals:state?.raid?.animals.map(a=>({id:a.id,species:a.species,status:a.status,health:a.magicHealth,down:a.magicDown?.phase,impactAt:a.magicImpact?.impactAt,stunUntil:a.magicStunUntil}))??[],hits:state?.events.filter(e=>e.type==='GuardianMagicHit').map(e=>e.targetId)??[],summon:world?.guardianSummons?.slots[0]?.event?.kind??null});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerCropSpellQa=()=>{const plant=state?.plants.find(p=>p.alive&&!p.blessing);if(!plant||tool?.kind!=='spell'||!['growth','multiply'].includes(tool.spell))throw Error('QA crop target or tool unavailable');const point={x:plant.x,y:nav.field.surface(plant.x,plant.z),z:plant.z};onPick({entityId:plant.id,point,hitPoint:point});const event=world.guardianSummons?.slots[0]?.event;return {id:plant.id,event:event?{commandId:event.commandId,kind:event.kind,provisional:!!event.provisional}:null};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerSummonQa=()=>{const slot=world?.guardianSummons?.slots[0],event=slot?.event;return {event:event?{commandId:event.commandId,kind:event.kind,targetId:event.targetId,provisional:!!event.provisional}:null,impact:!!slot?.impact.visible,core:!!slot?.core.visible};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerPlantQa=()=>{const plant=state?.plants.find(p=>p.alive);if(!plant||tool?.kind!=='plant')throw Error('QA plant target or tool unavailable');const point={x:plant.x,y:nav.field.surface(plant.x,plant.z),z:plant.z};onPick({entityId:plant.id,point,hitPoint:point});return {count:state.plants.length,point,pending:[...world.provisionalCrops.entries.keys()]};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerPlantStatusQa=()=>{const event=state.events.filter(e=>e.type==='CropPlaced').at(-1),plant=state.plants.find(p=>p.id===event?.targetId);return {count:state.plants.length,pending:world.provisionalCrops.entries.size,events:event?[event]:[],position:plant?{x:plant.x,z:plant.z}:null};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerWallQa=points=>{if(tool?.kind!=='wall')throw Error('QA wall tool unavailable');const count=state.structures.length;safe(()=>buildWallStroke(points));return {count,pending:[...world.provisionalWalls.entries.keys()]};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerWallStatusQa=()=>({count:state.structures.length,pending:world.provisionalWalls.entries.size});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerStructureQa=point=>{if(!['center','wall'].includes(tool?.kind))throw Error('QA structure tool unavailable');const count=state.structures.length;onPick({entityId:null,point:{...point,y:nav.field.surface(point.x,point.z)}});return {count,walls:[...world.provisionalWalls.entries.keys()],buildings:[...world.provisionalBuildings.entries.keys()]};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerStructureStatusQa=()=>({count:state.structures.length,walls:world.provisionalWalls.entries.size,buildings:world.provisionalBuildings.entries.size});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerAwakeningQa=(duplicate=false)=>{const target=state?.plants.find(p=>p.alive&&!p.blessing);if(!target)throw Error('QA awakening target unavailable');toggleAwakening();onPick({entityId:target.id});if(tool?.targetId!==target.id)throw Error('QA awakening selection failed');safe(confirmAwakening);if(duplicate)safe(confirmAwakening);const event=world.guardianSummons?.slots[0]?.event;return {targetId:target.id,blessed:!!target.blessing,progress:state.awakenings?.progress,queued:world.guardianSummons?.pending.length,event:event?{commandId:event.commandId,kind:event.kind,provisional:!!event.provisional}:null};};
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game'))globalThis.wildGuardiansWorkerAwakeningStatusQa=id=>({blessed:!!state?.plants.find(p=>p.id===id)?.blessing,progress:state?.awakenings?.progress,queued:world?.guardianSummons?.pending.length,event:world?.guardianSummons?.slots[0]?.event?{commandId:world.guardianSummons.slots[0].event.commandId,kind:world.guardianSummons.slots[0].event.kind,provisional:!!world.guardianSummons.slots[0].event.provisional}:null});
let preparedLoading=null,loadingPreparationGeneration=0,loadingDiorama=null,loadingProgress=null,loadingCinema=null,loadingMature=null,loadingDiagnostic=null,loadingGeneration=0,loadingAudio=null,loadingOverlay=null,loadingTransfers=null;
async function prepareLoadingScene(){
  preloadScreenOverlays();
 clearLoadingFailure(document);
 if(preparedLoading)return preparedLoading;progressQa?.lifecycle('app-preloading-created');
 const generation=loadingPreparationGeneration,params=new URLSearchParams(location.search),requestedProfile=workerPresentationProfile({backend:import.meta.env.VITE_PRESENTATION_BACKEND??'legacy',params,dev:import.meta.env.DEV});let profile=requestedProfile;if(requestedProfile.worker){const selection=await selectPresentationBackend({requested:'webgpu-worker'});if(generation!==loadingPreparationGeneration)throw Error('Carga de mundo cancelada');if(preparedLoading)return preparedLoading;if(selection.backend==='legacy'){profile=workerPresentationProfile();error(moneyLocale().startsWith('es')?'WebGPU no está disponible; se utilizará WebGL para esta partida.':'WebGPU is unavailable; WebGL will be used for this game.');}}const earlyGpuNoWebgl=profile.earlyGpu&&profile.noWebgl,lightProbe=profile.lightProbe;
 // The graphical Worker route must not load the legacy scene or construct a
 // WebGL context. A cancelled dynamic import cannot create a late world.
 let WorldScene,LoadingDiorama;if(!earlyGpuNoWebgl||!lightProbe){const isCurrent=()=>generation===loadingPreparationGeneration;[WorldScene,LoadingDiorama]=await Promise.all([earlyGpuNoWebgl?null:loadLegacyWorldScene({isCurrent}),lightProbe?null:loadLegacyLoadingDiorama({isCurrent})]);if(preparedLoading)return preparedLoading;}
 let legacyReceiver=null;if(import.meta.env.DEV&&earlyGpuNoWebgl&&['qa-worker-double-decode','qa-worker-path-trace'].some(key=>params.has(key))){let module;try{module=await import('../rendering/confirmed-scene-receiver.js');}catch(error){if(generation!==loadingPreparationGeneration)throw Error('Carga de mundo cancelada');throw error;}if(generation!==loadingPreparationGeneration)throw Error('Carga de mundo cancelada');if(preparedLoading)return preparedLoading;legacyReceiver=module.createConfirmedSceneReceiver;}
 const canvas=document.createElement('canvas');canvas.className='loading-prepared-canvas';canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;opacity:0;pointer-events:none';document.body.append(canvas);
 let owner,diorama;const transfers=new LoadingTransferOwner();
 try{owner=earlyGpuNoWebgl?createEarlyWorkerWorld(canvas,onPick,{legacyReceiver,confirmedCameraTerrain:profile.cameraTerrain,checkpointPolicy:{physics:profile.worker||experimentalWorkerPhysicsSave(),nativeAuthority:true}}):new WorldScene(canvas,onPick,{approvedVisuals:true});owner.guardianScreenExclusions=()=>{const canvasRect=canvas.getBoundingClientRect();if(!canvasRect.width||!canvasRect.height)return [];return [...document.querySelectorAll("#clock,#money,#days,#menuButton,#actions button,#awakeningHud")].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect(),pad=8;return {minX:2*(r.left-pad-canvasRect.left)/canvasRect.width-1,maxX:2*(r.right+pad-canvasRect.left)/canvasRect.width-1,minY:1-2*(r.bottom+pad-canvasRect.top)/canvasRect.height,maxY:1-2*(r.top-pad-canvasRect.top)/canvasRect.height};});};owner.guardianNarration=()=>guardian?.key?{audio:guardian.narrationAudio(),record:guardian.voiceRecord}:null;owner.onGuardianPresence=(id,p,isCurrent=()=>true)=>{playGuardianScenePresence(audio,owner,id,p,()=>owner===world&&isCurrent()).catch(()=>{});};owner.frameScheduler=globalFrameSchedulerEnabled()?globalFrameScheduler:null;if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-loading')&&new URLSearchParams(location.search).has('qa-loading-far-full-scene'))owner.farIsolatedPreparation=false;if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-loading')&&new URLSearchParams(location.search).has('qa-loading-zero-vertices'))owner.farZeroVertexPreparation=true;owner.loadingCpuBudget=!(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-loading-legacy-pacing'));owner.controls.enabled=false;owner.qualitySetting(settings.quality);applyWorldResolution(owner,settings.resolution);if(progressQa)owner.onLoadingSpan=span=>{if(!owner.disposed)progressQa.loadingSpan(span);};
 if(globalThis.__desktopSmokeStarted){
  const trace=createNativeLoadingTrace({enabled:true}),previous=owner.onLoadingSpan;
  owner.onLoadingSpan=span=>{previous?.(span);trace.witness(span);};
  owner.onLoadingSpan.onAwaitStart=trace.witness.onAwaitStart;
  owner.onLoadingSpan.onAwaitEnd=trace.witness.onAwaitEnd;
  globalThis.__wildGuardiansNativeLoadingSnapshot=()=>({phases:trace.snapshot({at:performance.now()}),scheduler:globalFrameScheduler.snapshot()});
 }
 diorama=lightProbe?{prepared:false,plants:{progress:0},show(){},render(){},dispose(){}}:new LoadingDiorama(owner,{batchedUpload:import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-loading')&&new URLSearchParams(location.search).has('qa-loading-diorama-batches')});const preparation={world:owner,diorama,canvas,transfers,startupProfile:profile};preparedLoading=preparation;
 preparation.pending=lightProbe?Promise.resolve():Promise.all([diorama.prepare(),prepareLoadingFrames(loadLoadingFrameImages,{signal:owner.loading.signal})]).then(([,images])=>{preparation.frameImages=images;if(!owner.disposed)progressQa?.lifecycle('app-preloading-ready');});preparation.pending.catch(()=>{});return preparation;
 }catch(failure){transfers.dispose();diorama?.dispose();owner?.dispose();canvas.remove();throw failure;}
}
function releasePreparedLoading(){loadingPreparationGeneration++;const pending=preparedLoading;preparedLoading=null;if(pending){progressQa?.close(null,pending.transfers,{cancelled:true});pending.transfers.dispose();pending.diorama.dispose();pending.world.dispose();pending.canvas.remove();}}
function clearLoadingPresentation(){const qaProgress=loadingProgress,qaTransfers=loadingTransfers;loadingTransfers?.dispose();loadingTransfers=null;loadingOverlay?.dispose();loadingOverlay=null;loadingAudio?.dispose();loadingAudio=null;clearInterval(loadingDiagnostic);loadingDiagnostic=null;if(loadingCinema)progressQa?.cameraPose('cancel-current',world);loadingCinema?.cancel();if(loadingCinema)progressQa?.cameraPose('cancel-restored',world);progressQa?.close(qaProgress,qaTransfers,{cancelled:!!loadingCinema||!qaProgress?.ready});loadingCinema=null;loadingMature?.reject(new Error('Loading cancelled'));loadingMature=null;loadingDiorama?.dispose();loadingDiorama=null;loadingProgress=null;}
function refreshLoadingOverlay(){progressQa?.update(loadingProgress);if(loadingOverlay&&loadingProgress&&loadingDiorama)loadingOverlay.render(loadingProgress.snapshot(),loadingDiorama.plants.progress,{night:loadingDiorama.night??0,accepting:loadingDiorama.interactive,plantingBlocked:loadingDiorama.plantingBlocked??false,pointer:loadingDiorama.pointerType??loadingOverlay.pointer});}
function cancelLoading(failure=null){if(!starting){releasePreparedLoading();return;}loadingGeneration++;starting=false;state=null;clearWorld();releasePreparedLoading();menu();if(failure)error(failure.message,{loadingFailure:true});}
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&screen==='loading'){event.preventDefault();cancelLoading();}});
const fontStyles=document.createElement('link');fontStyles.rel='stylesheet';fontStyles.href=assetUrl('/content/fonts.css');document.head.append(fontStyles);
const settings=(()=>{try{return {...{sfx:.7,music:.4,quality:'media'},...JSON.parse(localStorage.getItem('wild-guardians:settings')??'{}')};}catch{return {sfx:.7,music:.4,quality:'media'};}})();
settings.microevents=['off','low','adaptive','high'].includes(settings.microevents)?settings.microevents:'adaptive';
let microevents=null;
const syncWorkerNightSpeed=createWorkerNightSpeedBridge();
function installMicroevents(){
  if(import.meta.env.VITE_MICROEVENTS==='off'||settings.microevents==='off'){
    const runtime=world?.workerRuntime,migrated=!!runtime;microevents?.dispose();microevents=null;if(migrated){syncWorkerNightSpeed(runtime,false);runtime.submit({kind:'microDisable'}).catch(failure=>error(failure.message));runtime.submit({kind:'microIncome',enabled:false}).catch(failure=>error(failure.message));}else if(state)disableMicroEconomy(state);if(import.meta.env.DEV)delete window.__microevents;return;
  }
  if(!state||screen!=='game'||!world||microevents)return;
  // The Worker path remains a diagnostic until visibility and gesture parity
  // have been validated against an actual rendered scene.
  if(world.workerGpuOnly&&!(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-webgpu-microevents')))return;
  const runtime=world.workerRuntime,workerEconomy=runtime?createWorkerMicroeventEconomy(runtime,{pendingTicket:state.microevents?.ticket??null}):null;if(workerEconomy)workerEconomy.ready.catch(failure=>error(failure.message));if(workerEconomy)runtime.submit({kind:'microIncome',enabled:true}).catch(failure=>error(failure.message));
  const owner=world,ownerState=state;microevents=new Microevents({state,world,stage:document.querySelector('#stage'),save:()=>owner===world&&ownerState===state?save():Promise.resolve(false),settings,workerEconomy,sound:id=>audio.sound(id,{bus:'world',emitter:'microevent',gain:.35}),context:()=>({surface:surfaces.active,tool:tool?.kind,tutorial:!!tutorial?.presentation({record:false}),cinematic:!!campaignCinema?.active,notification:budgetWarningVisible()||!!document.querySelector('.notice-card.urgent')}),debug:import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-microevents')});
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-microevents'))window.__microevents=microevents;
}
settings.resolution=worldResolution(settings.resolution);
const audio=new AudioSystem(settings);
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-main-attack'))import('../../tools/experiments/main-attack-probe.js').then(({installMainAttackProbe})=>installMainAttackProbe(()=>({state,world,audio})));
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-game-audio'))import('../../tools/experiments/game-audio-capture.js').then(({installGameAudioCapture})=>installGameAudioCapture(window,audio,()=>world?({elapsed:state?.elapsed,eye:world.camera.position.toArray(),target:world.controls.target.toArray(),raidFocus:state?.raid?.cameraFocusedAnimalId,raidTravel:world.raidCamera?.travel?{animalId:world.raidCamera.travel.animalId,arrival:world.raidCamera.travel.arrival}:null,animals:state?.raid?.animals.map(a=>({id:a.id,x:a.x,z:a.z,status:a.status,down:a.magicDown?.phase})),structures:state?.structures.map(s=>({id:s.id,hp:s.hp,status:s.status})),cameraCorrection:{...world.cameraExclusion?.motion?.stats}}):null,()=>[dialogVoice,guardian?.voice].filter(Boolean)));
const uiAudio=new UiAudio((id,options)=>audio.sound(id,options));
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-loading'))installLoadingAudioQa(audio);
const dialogVoice=new SpiritVoice({url:assetUrl,volume:()=>settings.sfx});
let commandFeedback='',hudSize='',frameImages=null,guardian=null,eventCards=null,hudHand=null,tutorial=null,tutorialInert=null,tutorialFocus=null;
const surfaces=new GameSurfaces(),toolSession=new ToolSession();
const manualMagicActivity=new ManualMagicActivity();
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-magic-activity'))globalThis.wildGuardiansMagicActivity=()=>manualMagicActivity.report(state);
let libraryViewer=null;
let nativeIntentCleanup=null;
let wildEngineSession=null;
let budgetWarningUntil=0,lastBudgetBalance=Infinity,reserveWarningShown=false;
const tutorialProfile=new TutorialProfile(localStorage);
const moneyLocale=()=>window.WildGuardiansLanguage?.locale()??'en-US';
const localMoney=value=>formatMoney(value,moneyLocale());
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commandId=()=>crypto.randomUUID();
const button=(id,text,cls='primary')=>`<button id="${id}" class="${cls}">${text}</button>`;
const CONTEXT_LOST_MESSAGE='Se ha perdido el contexto gráfico. La partida está pausada.';
function error(message,{silent=false,loadingFailure=false}={}){if(String(message)===RESERVE_MESSAGE){if(reserveWarningShown)return;reserveWarningShown=true;budgetWarningUntil=performance.now()+18000;}if(!silent)uiAudio.error();if(loadingFailure){showLoadingFailure(message,{document,locale:moneyLocale()});return;}if(state&&screen==='game'){commandFeedback=String(message);refreshCommandFeedback();return;}document.querySelector('.error-banner')?.remove();const el=document.createElement('div');el.className='error-banner';el.role='alert';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),6000);}
function safe(action){if(leaving)return;commandFeedback='';try{const result=action();if(result?.catch)result.catch(e=>error(e.message));}catch(e){error(e.message);}updateUI(true);}
function changeSimulationPause(paused,reason,{sound=false}={}){
  const owner=world,ownerState=state,before=state.pauses.slice();if(owner?.earlyNativeRuntime&&reason==='hidden')owner.earlyNativeRuntime.desiredHidden=paused;const result=dispatchSimulationPause(state,owner?.workerRuntime??null,paused,reason);
  const confirmed=()=>{if(owner!==world||ownerState!==state)return;if(sound)uiAudio.pause(before,state.pauses);};
  if(result?.then)result.then(confirmed,failure=>{if(owner===world&&ownerState===state)error(failure.message);});else confirmed();
  return result;
}
const workerSaveCoordinators=new WeakMap();
const experimentalWorkerPhysicsSave=()=>import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game')&&new URLSearchParams(location.search).has('qa-worker-physics-save');
function workerSaveCoordinator(owner,ownerState){
  const runtime=owner.workerRuntime;if(!runtime||!ownerState)throw Error('Worker save integration is unavailable');
  const slotId=owner.workerGpuOnly?owner.confirmedHud?.slotId??ownerState.slotId:ownerState.slotId;let entry=workerSaveCoordinators.get(runtime);if(!entry){entry={slotId,coordinator:createWorkerSaveCoordinator({runtime,repository:saves,slotId,workerPersistence:owner.metadataOnlySpatial===true&&!!saves.database,checkpointPolicy:{physics:owner.workerCheckpointPolicy?.physics===true||experimentalWorkerPhysicsSave(),nativeAuthority:owner.workerCheckpointPolicy?.nativeAuthority===true||owner.workerNativeAuthorityCheckpoints===true||import.meta.env.DEV&&['qa-worker-native-save','qa-worker-early-new'].some(key=>new URLSearchParams(location.search).has(key))}})};workerSaveCoordinators.set(runtime,entry);}
  if(entry.slotId!==slotId)throw Error('Worker save slot changed');
  return entry.coordinator;
}
function ensureWorkerSave(owner,ownerState){const coordinator=workerSaveCoordinator(owner,ownerState);owner.workerSave=({confirm=false}={})=>saveWorkerGame(coordinator,{confirm,onError:error,onConfirm:()=>juice?.savedSuccessfully()});return owner.workerSave;}
function save({confirm=false}={}){const owner=juice;if(state&&world?.workerRuntime)return ensureWorkerSave(world,state)({confirm});return saveGame(state,saves,{confirm,onError:error,onConfirm:()=>owner?.savedSuccessfully()});}
function ensureWorkerTutorial(){
  if(!world?.workerRuntime||tutorial?.worker)return;
  const owner=world,ownerState=state,bridge=createWorkerTutorialBridge({runtime:owner.workerRuntime,profile:tutorialProfile,narrating:()=>guardian?.voice?.active?guardian.key?.split(':')[0]??null:null,onError:failure=>{if(owner===world&&ownerState===state)error(failure.message);},onChange:details=>{if(owner===world&&ownerState===state){if(details?.dismissed)save();updateUI(true);}}});
  tutorial=bridge;bridge.start().catch(failure=>{if(owner===world&&ownerState===state)error(failure.message);});
}
function workerRecoveryQaOptions(params){
 if(!import.meta.env.DEV||!params.has('qa-webgpu-recovery'))return {};
 const concurrent=params.has('qa-webgpu-recovery-concurrent'),work=params.has('qa-webgpu-work-recovery');
 return {qaVisualRecovery:true,qaVisualRecoveryCompact:!params.has('qa-webgpu-recovery-uncompacted'),qaVisualRecoveryConcurrent:concurrent,qaVisualWorkRecovery:work,qaVisualBackpressureRecovery:concurrent&&work&&params.has('qa-webgpu-work-auto-recovery')};
}
async function installWorkerGame(owner,ownerState,navigation,{visualRecovery=null,presentationCapabilities=null}={}){
  const early=owner.earlyNativeRuntime??null;
  if(early)owner.workerNativeAuthorityCheckpoints=true;
  const authoredCenterTemplates=!!early||import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-authored-centers'),templates={};for(const culture of authoredCenterTemplates?[]:owner.buildingTemplates.keys()){
    const sample=owner.centerMesh({id:'worker-template',kind:'center',culture,yaw:0});
    try{templates[culture]=captureStructureTemplate(sample);}finally{sample.dispose();}
  }
  const navigationView={bounds:[...navigation.activeBounds],eye:{...navigation.raidView.eye},target:{...navigation.raidView.target}};
  const params=workerDiagnosticParams(new URLSearchParams(location.search),import.meta.env.DEV),hosted=!params.has('qa-worker-main-clock'),legacyPublications=params.has('qa-worker-legacy-publications');
  const diagnostics=params.has('qa-worker-diagnostics'),compactViewAcks=params.has('qa-worker-view-ack')||hosted&&!legacyPublications;
  const trackVisualHeadings=import.meta.env.DEV&&skipLegacyDrawQa&&hosted&&params.has('qa-webgpu-world')&&params.has('qa-worker-visual-headings');
  const presentationWorkerHeadingSeed=trackVisualHeadings?ownerState.workers.filter(worker=>worker.status!=='home'&&owner.mixers.has(worker.id)&&owner.objects.has(worker.id)).map(worker=>({id:worker.id,yaw:owner.objects.get(worker.id).rotation.y})):null;
  if(presentationWorkerHeadingSeed){owner.confirmedWorkerVisualHeadings=new Map(presentationWorkerHeadingSeed.map(item=>[item.id,item.yaw]));owner.confirmedWorkerVisualIdentities=new Map(presentationWorkerHeadingSeed.map(item=>[item.id,{rig:owner.mixers.get(item.id),root:owner.objects.get(item.id),revoked:false}]));}
  const nativeCapture=!early&&import.meta.env.DEV&&params.has('qa-worker-native-bootstrap')?captureNativeAuthorityBootstrap(ownerState,navigation,wildEngineSession):null;
  const session=early?.session??crypto.randomUUID(),clientOptions=selectPreparedAuthorityOptions(early,()=>({snapshot:nativeCapture?.snapshot??serialize(ownerState),chunkKeys:nativeCapture?.chunkKeys??[...owner.chunks.keys()],raidWaitBindings:nativeCapture?.raidWaitBindings??captureRaidWaitBindings(ownerState,navigation),navigationView:nativeCapture?.navigationView??navigationView,...(nativeCapture?{nativeBootstrap:{version:nativeCapture.version,chunkKeys:nativeCapture.chunkKeys,spatialState:nativeCapture.spatialState}}:{}),dynamicPhysics:true,qaAttackDelayMs:import.meta.env.DEV&&params.has('qa-worker-delay-attack')?5000:0,shareSpeciesClips:params.has('qa-worker-shared-clips'),shareSpeciesRigs:import.meta.env.DEV&&params.has('qa-worker-shared-rigs'),shareAdmissionSource:import.meta.env.DEV&&params.has('qa-worker-shared-glb'),...(presentationWorkerHeadingSeed?{presentationWorkerHeadingSeed}:{}),compactPhysicsPoses:import.meta.env.DEV&&params.has('qa-worker-active-poses'),structureTemplates:authoredCenterTemplates?null:templates,authoredCenterTemplates,nativeAuthorityCheckpoints:!!early||owner.workerCheckpointPolicy?.nativeAuthority===true,diagnostics,compactViewAcks,compactPausedAcks:hosted&&!legacyPublications||import.meta.env.DEV&&params.has('qa-worker-compact-paused')}));
  if(early){early.onEvents=(events,settlements)=>onConfirmedEvents(events,settlements);early.onState=(sequence,hud)=>onConfirmedState(sequence,hud);early.adapter.attach(owner.createConfirmedReceiver(session));await early.ready;}
  const maxBatchSteps=Number(params.get('qa-worker-batch')??(hosted?16:1)),batchWindowSteps=Number(params.get('qa-worker-window')??(hosted&&maxBatchSteps>1?2:1));
  const onError=failure=>{if(owner===world&&ownerState===state){if(owner.workerRuntime?.status().fault)closeAuthorityFailurePresentation(owner);error(failure.message);}};
  const onConfirmedEvents=(events,settlements=[])=>{if(owner!==world||ownerState!==state||screen!=='game'){owner.confirmedEventsSeeded=false;return;}try{owner.confirmedAutosave??=createConfirmedAutosaveController({request:()=>workerSaveCoordinator(owner,ownerState).request(),isCurrent:()=>owner===world&&ownerState===state&&!owner.disposed,onError:failure=>error('No se pudo guardar la partida: '+failure.message)});owner.confirmedAutosave.observe(owner.workerRuntime.status().saveAvailable);owner.confirmedAutosave.events(events);}catch(failure){onError(failure);}if(campaignCinema?.active){owner.confirmedEventsSeeded=false;return;}try{juice?.process(owner.actorAudio??ownerState,events,settlements);}catch(failure){owner.confirmedEventsSeeded=false;onError(failure);}try{audio.process(events,{state:owner.actorAudio??ownerState,listener:owner.controls.target});}catch(failure){owner.confirmedEventsSeeded=false;onError(failure);}};let gpuClient=null,gpuCanvas=null,autoRecovery=null,pendingVisualBackpressure=false;const historicalRecovery=presentationCapabilities!==null&&import.meta.env.VITE_HISTORICAL_PRESENTATION_RECOVERY==='true',recoveryQa=visualRecovery===null?(early?.recoveryOptions??(historicalRecovery?{visualRecovery:{enabled:true,work:true}}:workerRecoveryQaOptions(params))):{visualRecovery},recoveryProfile=resolvePresentationRecoveryOptions(recoveryQa,{allowQa:import.meta.env.DEV}),backpressureRecoveryQa=recoveryProfile.backpressure;if(early?.recoveryOptions&&JSON.stringify(resolvePresentationRecoveryOptions(early.recoveryOptions,{allowQa:import.meta.env.DEV}))!==JSON.stringify(recoveryProfile))throw Error('Prepared authority recovery configuration changed');const onVisualBackpressure=()=>{if(!autoRecovery){pendingVisualBackpressure=true;return;}if(!autoRecovery.triggerDetached())onError(Error('Visual backpressure recovery unavailable'));};if(early)early.onVisualBackpressure=onVisualBackpressure;const onTerrainRecoveryRequired=failure=>{if(!autoRecovery?.trigger(failure))onError(failure);};if(early)early.onTerrainRecoveryRequired=onTerrainRecoveryRequired;
  const handleGpuError=(client,canvas,failure)=>{if(owner.webGpuWorld&&owner.webGpuWorld.client!==client){canvas?.remove();return;}if(owner.webGpuWorld?.client===client){owner.webGpuWorld.dispose();owner.webGpuWorld=null;}else canvas?.remove();if(!autoRecovery?.trigger(failure))onError(failure);};
  const onGpuResourceError=({resource,message})=>{if(owner===world&&ownerState===state&&!owner.disposed)error(`${resource}: ${message}`);};
  owner.confirmedHud=owner.workerGpuOnly?projectConfirmedHud(ownerState,0):null;if(owner.confirmedHud)owner.actorAudio=createConfirmedActorAudio(owner.confirmedHud.audio);const onConfirmedState=(sequence,hud)=>{if(owner.workerGpuOnly){owner.confirmedHud=hud??projectConfirmedHud(ownerState,sequence);if(owner.actorAudio)applyConfirmedActorAudio(owner.actorAudio,owner.confirmedHud.audio);else owner.actorAudio=createConfirmedActorAudio(owner.confirmedHud.audio);}owner.webGpuWorld?.client.confirmCameraTerrain(sequence);if(owner.workerRuntime&&owner.confirmedAutosave)owner.confirmedAutosave.observe(owner.workerRuntime.status().saveAvailable);};
  const camera=()=>webGpuCameraPose(owner.camera,owner.controls);
  const temporalOptions=temporalPresentationOptions({params,dev:import.meta.env.DEV,hosted,early:!!early,earlyPrepared:early?.temporalOptions??null,recoveryEnabled:recoveryProfile.enabled,recovery:recoveryProfile,hasWebGpu:presentationCapabilities!==null||import.meta.env.DEV&&params.has('qa-webgpu-world'),historicalRecovery});
  const worldOptions=webGpuWorldOptions({params,state:ownerState,field:owner.nav.field??{canyon:ownerState.biome==='gran-canon'},recovery:recoveryQa,capabilities:presentationCapabilities??{},temporal:temporalOptions,dev:import.meta.env.DEV});
  if(temporalOptions){clientOptions.terrainHistory=temporalOptions.terrainHistory;if(historicalRecovery&&!early)clientOptions.observeWorldMotion=true;}
  if(early&&!!early.presentationInputs!==worldOptions.presentationInputs)throw Error('Prepared authority input capabilities changed');
  owner.authoritativeGuardianPlacement=guardianPlacementForWorld({early,hosted,presentationConfigured:presentationCapabilities!==null,options:worldOptions});
  if(!early&&owner.authoritativeGuardianPlacement)clientOptions.guardianPlacement=true;
  function bindWebGpuWorld(client,canvas){
    client.setPresentationVisibility?.(document.hidden);
    if(owner.workerRuntime)client.confirmCameraTerrain(owner.workerRuntime.status().confirmedSequence);return createWebGpuCameraPresentation({camera:owner.camera,controls:owner.controls,canvas,viewport:owner.canvas,client,isCurrent:binding=>owner===world&&ownerState===state&&!owner.disposed&&owner.webGpuWorld===binding});
  }
  if(presentationCapabilities!==null||import.meta.env.DEV&&params.has('qa-webgpu-world')){
    if(!hosted)throw Error('WebGPU world requires hosted simulation');gpuCanvas=document.createElement('canvas');gpuCanvas.className='qa-webgpu-world';gpuCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';owner.canvas.parentElement.append(gpuCanvas);
    const onGpuError=failure=>handleGpuError(gpuClient,gpuCanvas,failure);
    gpuClient=createWebGpuWorldClient({canvas:gpuCanvas,session,snapshot:clientOptions.snapshot,presentationWorkerHeadingSeed,camera:camera(),width:owner.canvas.width,height:owner.canvas.height,...worldOptions,onResourceError:onGpuResourceError,onGuardianPresence:(id,origin)=>{if(owner===world&&ownerState===state&&owner.workerGpuOnly&&!owner.disposed&&owner.webGpuWorld?.client===gpuClient)owner.onGuardianPresence?.(id,origin,()=>!owner.disposed&&owner.webGpuWorld?.client===gpuClient);},onError:onGpuError});
    try{await gpuClient.ready;if(gpuClient.status().backend!=='WebGPU')throw Error('El backend WebGPU no está disponible.');}catch(failure){gpuClient.dispose();gpuCanvas.remove();throw failure;}owner.webGpuWorld=bindWebGpuWorld(gpuClient,gpuCanvas);
    if(worldOptions.presentationCapabilities.picking)owner.onDiscretePick=createWebGpuDiscretePick({allowTerrainTools:worldOptions.presentationCapabilities.provisionalStructures||worldOptions.presentationCapabilities.provisionalCrops,allowStableCameraPick:worldOptions.presentationInputs,allowGuardianContext:owner.authoritativeGuardianPlacement,...(params.has('qa-webgpu-causal-input')?{onTrace:entry=>{owner.qaDiscretePicks??=[];owner.qaDiscretePicks.push(entry);if(owner.qaDiscretePicks.length>64)owner.qaDiscretePicks.shift();}}:{}),context:()=>{const view=owner.webGpuWorld;if(owner!==world||ownerState!==state||screen!=='game'||view?.client.status().phase!=='running')return null;return {owner,state,tool,client:view.client,canvas:owner.canvas,sync:()=>view.sync()};},deliver:onPick,fallback:owner.metadataOnlySpatial||import.meta.env.DEV&&params.has('qa-worker-early-gpu-view')?()=>error('La escena todavía no está preparada; vuelve a seleccionar el objetivo.'):(binding,event,gesture)=>onPick({...binding.owner.pick(event),...gesture}),onError:failure=>error(failure.message)});
  }
  if(!early&&gpuClient&&import.meta.env.DEV&&params.has('qa-webgpu-world-motion'))clientOptions.observeWorldMotion=true;
  const runtime=early?.runtime??(hosted?createWorkerHostedRuntime({world:owner,session,clientOptions,...(gpuClient?{terrainPort:gpuClient.terrainPort,presentationPort:gpuClient.presentationPort}:{}),onConfirmedEvents,onConfirmedState,...(backpressureRecoveryQa?{onVisualBackpressure}:{}),...(temporalOptions?.recovery?{onTerrainRecoveryRequired}:{}),runtimeOptions:{maxBatchSteps,batchWindowSteps,...(temporalOptions?{presentationTimeline:true,...(temporalOptions.recovery?(historicalRecovery?{historicalRecovery:true}:{testHistoricalRecovery:true}):{})}:{}),qaPresentationInputs:import.meta.env.DEV&&params.has('qa-webgpu-causal-input'),presentationInputs:worldOptions.presentationInputs,diagnostics,...recoveryQa,coalescePublications:params.has('qa-worker-coalesce')||!legacyPublications,foldViews:compactViewAcks&&(params.has('qa-worker-fold-view')||!legacyPublications),backgroundViews:compactViewAcks&&!legacyPublications&&!params.has('qa-worker-ordered-views')},onError,onViewError:failure=>{owner.workerNavigationViewKey=null;onError(failure);}}):owner.createWorkerRuntime({client:createSimulationAuthorityClient({...clientOptions,session}),session,maxBatchSteps,batchWindowSteps,diagnostics,onError,onConfirmedEvents,onConfirmedState}));
  try{if(early)early.startupCommand=earlyNativeStartupCommand(early.snapshot,ownerState);await runtime.start(early?{...(gpuClient?{terrainPort:gpuClient.terrainPort,presentationPort:gpuClient.presentationPort}:{}),...(early.startupCommand?{startupCommand:early.startupCommand}:{})}:{});if(owner.disposed)throw Error('World closed during worker startup');if(early){while(ownerState.pauses.includes('hidden')!==early.desiredHidden){const hidden=early.desiredHidden;await runtime.submit({kind:hidden?'pause':'resume',reason:'hidden'});if(owner.disposed)throw Error('World closed during worker startup');}owner.workerRuntime=runtime;owner.earlyNativeRuntime=null;await runtime.activateClock();if(owner.disposed)throw Error('World closed during worker startup');}if(early&&import.meta.env.DEV&&gpuClient&&params.has('qa-webgpu-world-motion'))await runtime.submit({kind:'trackPathMotion',actorId:null,world:true});else if(import.meta.env.DEV&&gpuClient&&!params.has('qa-webgpu-world-motion')&&params.has('qa-webgpu-motion')){const actor=ownerState.raid?.animals.find(item=>item.status!=='gone');if(!actor)throw Error('WebGPU motion audit requires an active animal');await runtime.submit({kind:'trackPathMotion',actorId:actor.id,includePeers:true});}runtime.hostedClock=hosted;owner.workerRuntime=runtime;owner.earlyNativeRuntime=null;
    if(gpuClient&&recoveryProfile.enabled)owner.webGpuRecovery=async()=>{
      let prepared;try{prepared=await runtime.prepareVisualRecovery();}catch(failure){runtime.cancelVisualRecovery().catch(()=>{});throw failure;}const checkpoint=prepared.checkpoint;if(!checkpoint?.terrainCheckpoint||owner.confirmedWorkerVisualHeadings instanceof Map&&!Array.isArray(checkpoint.terrainCheckpoint.workerHeadings)||owner!==world||ownerState!==state||owner.disposed){runtime.cancelVisualRecovery().catch(()=>{});throw Error('Invalid or stale visual recovery checkpoint');}
      owner.webGpuWorld?.dispose();owner.webGpuWorld=null;
      const canvas=document.createElement('canvas');canvas.className='qa-webgpu-world';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';owner.canvas.parentElement.append(canvas);
      const channel=new MessageChannel();
      let client;client=createWebGpuWorldClient({canvas,session,snapshot:checkpoint.snapshot,presentationWorkerHeadingSeed:checkpoint.terrainCheckpoint.workerHeadings??null,initialSequence:checkpoint.sequence,recoveryPort:channel.port1,...(temporalOptions?.recovery?{experimentalTimelineRecovery:true}:{}),camera:camera(),width:owner.canvas.width,height:owner.canvas.height,...worldOptions,onResourceError:onGpuResourceError,onGuardianPresence:(id,origin)=>{if(owner===world&&ownerState===state&&owner.workerGpuOnly&&!owner.disposed&&owner.webGpuWorld?.client===client)owner.onGuardianPresence?.(id,origin,()=>!owner.disposed&&owner.webGpuWorld?.client===client);},onError:failure=>handleGpuError(client,canvas,failure)});
      let attachStarted=false;try{await client.ready;if(owner!==world||ownerState!==state||owner.disposed)throw Error('World changed during visual recovery');attachStarted=true;const attached=await runtime.attachVisualRecovery({terrainPort:client.terrainPort,presentationPort:client.presentationPort,recoveryPort:channel.port2});if(owner!==world||ownerState!==state||owner.disposed)throw Error('World changed during visual recovery');owner.webGpuWorld=bindWebGpuWorld(client,canvas);client.finishRecovery();runtime.finishVisualRecovery();return {base:checkpoint.sequence,sequence:attached.sequence};}catch(error){if(!attachStarted)runtime.cancelVisualRecovery().catch(()=>{});client.dispose();canvas.remove();throw error;}
    };if(owner.webGpuRecovery&&(historicalRecovery||visualRecovery!==null||import.meta.env.DEV&&params.has('qa-webgpu-work-recovery')&&params.has('qa-webgpu-work-auto-recovery')))owner.autoGpuRecovery=autoRecovery=createWebGpuAutoRecovery({isCurrent:()=>owner===world&&ownerState===state&&!owner.disposed&&owner.workerRuntime===runtime,markLost:()=>runtime.markVisualLost(),recover:()=>owner.webGpuRecovery(),onError,historicalRecovery});if(pendingVisualBackpressure){pendingVisualBackpressure=false;if(!autoRecovery?.triggerDetached())onError(Error('Visual backpressure recovery unavailable'));}return runtime;}catch(failure){runtime.dispose();owner.webGpuWorld?.dispose();owner.webGpuWorld=null;throw failure;}
}
const exitDesktop=createDesktopExit({host:window,save,hasGame:()=>!!state,onError:failure=>error(moneyLocale().startsWith('es')?'No se pudo cerrar la aplicación: '+failure.message:'Could not close the application: '+failure.message)});
function bind(id,fn){document.getElementById(id)?.addEventListener('click',()=>safe(fn));}

function clearWorld(){if(import.meta.env.DEV){delete globalThis.wildGuardiansEarlyGpuQa;delete globalThis.wildGuardiansGuardianOriginQa;delete globalThis.wildGuardiansEarlyGpuSaveTutorialQa;}runtimeErrorWorld=null;awakeningHud?.dispose();awakeningHud=null;microevents?.dispose();microevents=null;if(import.meta.env.DEV)delete window.__microevents;nativeIntentCleanup?.();nativeIntentCleanup=null;if(import.meta.env.DEV)delete globalThis.wildGuardiansSpatialQa;campaignCinema?.dispose();campaignCinema=null;juice?.dispose();juice=null;gameplayGpuQa?.close();clearLoadingPresentation();libraryViewer?.dispose();libraryViewer=null;dialogVoice.stop();raidLoading?.remove();raidLoading=null;noticeLifetime.reset();eventCards=null;surfaces.reset();uiAudio.reset();toolSession.clear();manualMagicActivity.reset();budgetWarningUntil=0;lastBudgetBalance=Infinity;reserveWarningShown=false;pendingVillage=null;commandFeedback='';setTutorialInteraction(false);tutorial?.dispose?.();tutorial=null;hudHand?.dispose();hudHand=null;guardian?.dispose();guardian=null;world?.workerTutorialGuide?.dispose();world?.confirmedAutosave?.dispose();world?.autoGpuRecovery?.dispose();world?.webGpuWorld?.dispose();if(world){world.webGpuRecovery=null;world.autoGpuRecovery=null;}world?.workerRuntime?.dispose();world?.earlyNativeRuntime?.runtime.dispose();world?.dispose();world=null;wildEngineSession?.dispose();wildEngineSession=null;nav=null;audio.stop();tool=null;selection=null;document.querySelector('#native-hud-style')?.remove();}
let leaving=false;
async function menu() {
  if(leaving)return;leaving=true;
  try {
  if(state){if(!await save())return;state=null;}clearWorld();releasePreparedLoading();screen='menu';
  app.innerHTML=`<iframe id="native-menu" title="Santuario · Menú principal de Wild Guardians Africa" src="${assetUrl('/menu/index.html')}" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`;
  }finally{leaving=false;}
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==document.querySelector('#native-menu')?.contentWindow||event.data?.type!=='wild-guardians:menu')return;
  safe(async()=>{
   const data=event.data,respond=detail=>event.source.postMessage({type:'wild-guardians:menu-data',...detail},location.origin);
   if(data.action==='exit')return exitDesktop();
   if(data.action==='prepare-loading'){progressQa?.lifecycle('app-menu-preparation-received');try{await prepareLoadingScene();}catch(failure){if(failure.name!=='AbortError')error(failure.message,{loadingFailure:true});}return;}
   if(data.action==='cancel-loading'){cancelLoading();return;}
   if(data.action==='request-saves')respond({slots:(await listedSaves()).map(slot=>({...slot,cultureName:selector.cultures.find(c=>c.id===slot.culture)?.name??slot.culture,biomeName:selector.biomes.find(b=>b.id===slot.biome)?.name??slot.biome,money:localMoney(slot.money)}))});
   if(data.action==='delete-slot'){await saves.delete(data.slotId);respond({slots:(await listedSaves()).map(slot=>({...slot,cultureName:selector.cultures.find(c=>c.id===slot.culture)?.name??slot.culture,biomeName:selector.biomes.find(b=>b.id===slot.biome)?.name??slot.biome,money:localMoney(slot.money)}))});return;}
   if(data.action==='load-slot')return startGame(null,{slotId:data.slotId,preview:savePreviews.get(data.slotId)});
   if(data.action==='start'&&Game.BIOMES.includes(data.biome)&&Game.CULTURES.includes(data.culture)){selectedBiome=data.biome;selectedCulture=data.culture;return startGame();}
   if(data.action==='request-settings')respond({settings});
   if(data.action==='settings-change'&&['muy_baja','baja','media','alta'].includes(data.settings?.quality)&&[data.settings.sfx,data.settings.music].every(value=>Number.isFinite(value)&&value>=0&&value<=1)){Object.assign(settings,data.settings);settings.resolution=worldResolution(settings.resolution);localStorage.setItem('wild-guardians:settings',JSON.stringify(settings));audio.volume();}
  });
});
let selectedBiome='sabana',selectedCulture='mapungubwe';
function newGameScreen() {
  screen='new';app.innerHTML=`<iframe id="native-selector" title="Nueva partida · Bioma y cultura" src="${assetUrl('/selector/index.html')}" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`;
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==document.querySelector('#native-selector')?.contentWindow||event.data?.type!=='wild-guardians:selector')return;
 if(event.data.action==='back'){menu();return;}
 if(event.data.action==='start'&&Game.BIOMES.includes(event.data.biome)&&Game.CULTURES.includes(event.data.culture)){selectedBiome=event.data.biome;selectedCulture=event.data.culture;safe(()=>startGame());}
});
async function loadScreen() {
  screen='load';const slots=await listedSaves();if(screen!=='load')return;app.innerHTML=`<main class="screen"><header class="topbar"><div class="brand">Tus poblados</div>${button('back','← Volver','ghost')}</header><h2>Retoma tu historia</h2><p class="muted">Cada partida conserva su propio mundo.</p><div class="slots">${slots.length?slots.map(s=>`<div class="slot"><div><h3>${esc(selector.cultures.find(c=>c.id===s.culture)?.name??s.culture)}</h3><p class="muted">Día ${s.day} · ${esc(selector.biomes.find(b=>b.id===s.biome)?.name??s.biome)} · ${localMoney(s.money)} monedas</p></div><button data-slot="${s.slotId}">Continuar →</button><button class="ghost" data-delete-slot="${s.slotId}">Eliminar partida</button></div>`).join(''):'<p class="muted">Todavía no hay partidas guardadas.</p>'}</div></main>`;bind('back',menu);
  document.querySelectorAll('[data-slot]').forEach(el=>el.onclick=()=>safe(()=>startGame(null,{slotId:el.dataset.slot,preview:savePreviews.get(el.dataset.slot)})));
  document.querySelectorAll('[data-delete-slot]').forEach(el=>el.onclick=()=>safe(async()=>{await saves.delete(el.dataset.deleteSlot);await loadScreen();}));
}
async function startGame(loaded=null,{slotId,preview}={}) {
  if(starting)return;progressQa?.lifecycle('app-start-game-received');starting=true;screen='loading';clearWorld();screenWakeLock.setActive(true);
  let prepared;const loadingToken=++loadingGeneration,assertLoading=()=>{if(loadingToken!==loadingGeneration||prepared?.world.disposed)throw new DOMException('Loading cancelled','AbortError');};
  // Retain the complete menu frame until the diorama has actually warmed.
  if(!document.querySelector('#native-menu'))app.innerHTML='<div class="loading" role="status">Preparing your land…</div>';
  try {
    const audioUnlocked=audio.unlock().then(()=>true,()=>false);
    prepared=await prepareLoadingScene();assertLoading();
    const qaSeed=import.meta.env.DEV?
      new URLSearchParams(location.search).get('qa-seed')??
      new URLSearchParams(location.search).get('qa-spatial-seed'):null;
    const startupProfile=prepared.startupProfile,workerSaveSource=slotId!==undefined&&startupProfile.earlyNative&&startupProfile.earlyGpu&&startupProfile.noWebgl&&startupProfile.cameraTerrain,workerFresh=!loaded&&slotId===undefined&&startupProfile.earlyNew&&startupProfile.earlyNative&&startupProfile.earlyGpu&&startupProfile.noWebgl&&startupProfile.cameraTerrain,freshOptions={biome:selectedBiome,culture:selectedCulture,...(qaSeed!==null&&Number.isSafeInteger(Number(qaSeed))?{seed:Number(qaSeed)}:{})};let savedSource=null;
    let next=loaded??(slotId!==undefined?(preview??{day:1,time:0,biome:selectedBiome,culture:selectedCulture}):workerFresh?{day:1,time:0,biome:selectedBiome,culture:selectedCulture}:Game.newGame(freshOptions));
    await prepared.pending;assertLoading();preparedLoading=null;loadingTransfers=prepared.transfers;world=prepared.world;world.onContextLost=()=>{if(screen==='loading')cancelLoading(new Error(moneyLocale().startsWith('es')?'Se ha perdido el contexto gráfico durante la carga.':'Graphics context lost during loading.'));};loadingDiorama=prepared.diorama;loadingDiorama.show(next);
    const decodeBootstrap=async text=>{const decoded=await world.loadReady(decodeSnapshotAsync(text,{signal:world.loading.signal,requireWorker:true,onDiagnostic:diagnostic=>progressQa?.snapshotDecode(diagnostic)}));assertLoading();return decoded;};
    const audioOwner=new LoadingAudio(audio,next);loadingAudio=audioOwner;loadingDiorama.onPlant=()=>audioOwner.plant();audioUnlocked.then(unlocked=>{if(unlocked&&loadingAudio===audioOwner&&screen==='loading')audioOwner.start();}).catch(()=>{});
    const overlay=new LoadingOverlay({frameImages:prepared.frameImages,locale:moneyLocale(),pointer:matchMedia('(pointer:coarse)').matches?'touch':'mouse',onCancel:()=>cancelLoading()});loadingOverlay=overlay;
    loadingProgress=new LoadingProgress(LOADING_STAGES,{downloads:loadingTransfers.downloads,onChange:snapshot=>overlay.render(snapshot,loadingDiorama?.plants.progress??0,{night:loadingDiorama?.night??0,accepting:loadingDiorama?.interactive??false,plantingBlocked:loadingDiorama?.plantingBlocked??false,pointer:loadingDiorama?.pointerType??overlay.pointer})});
    prepared.canvas.style.cssText='width:100%;height:100%;touch-action:none';prepared.canvas.id='world';
    app.replaceChildren(prepared.canvas);
    app.append(overlay.element);overlay.paintFrames();loadingDiorama.render(0,0);refreshLoadingOverlay();lastFrame=performance.now();progressQa?.begin(lastFrame,world.renderer);gameplayGpuQa?.reset();
    loadingDiagnostic=setInterval(refreshLoadingOverlay,1000);
    // Show the fully prepared diorama before parsing a Continue snapshot. Worker
    // validation is unchanged; cancelled/late results cannot adopt into this game.
    if(slotId!==undefined){
      const saved=await world.loadReady(saves.loadPrepared(slotId,{signal:world.loading.signal,withSource:workerSaveSource,...(workerSaveSource?{decode:(text,options)=>decodeSnapshotAsync(text,{...options,requireWorker:true})}:{}),onDiagnostic:diagnostic=>{progressQa?.snapshotDecode(diagnostic);if(diagnostic.mode==='synchronous-fallback')console.warn('Snapshot compatibility fallback: '+diagnostic.reason);}}));assertLoading();next=workerSaveSource?saved.state:saved;savedSource=workerSaveSource?saved.source:null;loaded=next;
      loadingDiorama.show(next);audioOwner.setState(next);audioOwner.start();loadingDiorama.render(0,loadingProgress.value);refreshLoadingOverlay();
    }
    if(next.workerPhysicsCheckpoint&&world.workerCheckpointPolicy?.physics!==true&&!experimentalWorkerPhysicsSave())throw Error('Esta partida experimental necesita el modo Worker con restauración de física.');
    const villages=await json('/content/villages.json');assertLoading();
    villageCatalog=villages;
    const payload=villages.find(v=>v.id===(next.culture==='saheliana'?'saheliano':next.culture));
    const workerOnly=canRestoreWorkerOnly(next,{loaded:!!loaded,earlyNative:startupProfile.earlyNative,earlyGpu:startupProfile.earlyGpu,noWebgl:startupProfile.noWebgl,cameraTerrain:startupProfile.cameraTerrain,allowFootprintRepair:true,allowEntryRepair:true,allowMissingCheckpoint:true});if(startupProfile.worker&&loaded&&!workerOnly)throw Error('Esta partida no admite todavía la restauración WebGPU Worker.');
    const savedBootstrap=workerOnly&&!next.workerNativeAuthorityCheckpoint?await prepareSavedWorkerBootstrapInWorker(savedSource??serialize(next),villages,{quality:settings.quality,signal:world.loading.signal,normalizeForStart:true}):null;if(savedBootstrap){assertLoading();savedSource=savedBootstrap.initial.snapshot;next=await decodeBootstrap(savedSource);}
    const checkpointBootstrap=workerOnly&&!savedBootstrap?await prepareSavedWorkerCheckpointInWorker(savedSource??serialize(next),villages,{signal:world.loading.signal,normalizeForStart:true}):null;if(checkpointBootstrap){assertLoading();savedSource=checkpointBootstrap.initial.snapshot;if(checkpointBootstrap.repaired)next=await decodeBootstrap(savedSource);}
    const freshBootstrap=workerFresh?await prepareFreshWorkerBootstrapInWorker(freshOptions,payload,{quality:settings.quality,signal:world.loading.signal}):null;if(freshBootstrap){assertLoading();next=await decodeBootstrap(freshBootstrap.initial.snapshot);}
    const workerRestore=savedBootstrap?.initial??checkpointBootstrap?.initial??null,projection=freshBootstrap?.initial??workerRestore;if(startupProfile.worker&&!projection)throw Error('No se ha podido preparar la autoridad Worker para esta partida.');
    const spatial=projection?{session:null,navigation:createWorkerNavigationProjection(projection.navigationView)}:await prepareWildEngineWorld(world,next,payload,{signal:world.loading.signal,loaded:!!loaded});
    assertLoading();nav=spatial.navigation;
    const spatialSession=spatial.session;
    wildEngineSession=spatialSession;if(projection){world.configureVisualBiome(next.biome);world.state=next;world.nav=nav;if(freshBootstrap||savedBootstrap){const pose=(freshBootstrap??savedBootstrap).pose;world.camera.position.fromArray(pose.eye);world.controls.target.fromArray(pose.target);}else{world.camera.position.x=projection.navigationView.eye.x;world.camera.position.z=projection.navigationView.eye.z;world.controls.target.x=projection.navigationView.target.x;world.controls.target.z=projection.navigationView.target.z;}}
    // Earlier saves predate native collision footprints. Preserve their units
    // and positions while restoring the geometric metadata from the catalog.
    if(!projection)for(const village of next.villages){
      const source=villages.find(v=>v.id===(village.culture==='saheliana'?'saheliano':village.culture));
      const shapes=new Map(villageLayout(source,village.x,village.z).map(b=>[b.key,b.footprint]));
      for(const building of village.buildings??[])building.footprint??=shapes.get(building.key);
    }
    nav.setState(next);
    for(const village of next.villages)if(!village.entry){if(projection)throw Error('Worker bootstrap did not prepare a village entry');village.entry=findVillageEntry(nav,[],village.x,village.z);}
    state=next;initializeCinematicProgress(state);audio.remember(state.events);loadingProgress.update('configuration');
    resumeLoadedWorld(state,{hidden:document.hidden});
    const freshEarly=!loaded&&startupProfile.earlyNew;
    if(startupProfile.earlyNative&&(loaded&&(state.workerNativeAuthorityCheckpoint||workerRestore)||freshEarly)){
      const params=workerDiagnosticParams(new URLSearchParams(location.search),import.meta.env.DEV);if(!startupProfile.worker&&(!params.has('qa-worker-game')||params.has('qa-worker-main-clock')||params.has('qa-worker-visual-headings')))throw Error('Incompatible early native authority options');
      const owner=world,ownerState=state,session=crypto.randomUUID();if(freshEarly){owner.state=ownerState;owner.nav=nav;owner.qualitySetting(settings.quality);owner.focusFarm();}const initial=freshEarly?(freshBootstrap?freshBootstrap.initial:freshNativeAuthorityOptions(ownerState,nav,spatialSession,{eye:owner.camera.position,target:owner.controls.target,quality:settings.quality})):workerRestore?workerRestore:savedNativeAuthorityOptions(serialize(ownerState)),snapshot=initial.snapshot,adapter=createConfirmedPresentationAdapter(ownerState,session);
      const historicalRecovery=startupProfile.worker&&import.meta.env.VITE_HISTORICAL_PRESENTATION_RECOVERY==='true',recoveryOptions=historicalRecovery?{visualRecovery:{enabled:true,work:true}}:workerRecoveryQaOptions(params),presentationInputs=startupProfile.presentationInputs,earlyRecovery=resolvePresentationRecoveryOptions(recoveryOptions,{allowQa:import.meta.env.DEV}),earlyTemporal=temporalPresentationOptions({params,dev:import.meta.env.DEV,hosted:true,early:false,recoveryEnabled:earlyRecovery.enabled,recovery:earlyRecovery,hasWebGpu:startupProfile.worker||params.has('qa-webgpu-world'),historicalRecovery});
      const {clientOptions,runtimeOptions}=earlyWorkerOptions({initial,metadataOnlySpatial:owner.metadataOnlySpatial===true,guardianPlacement:startupProfile.guardianPlacement,presentationInputs,recoveryOptions,temporal:earlyTemporal,diagnostics:{legacyPublications:params.has('qa-worker-legacy-publications'),viewAck:params.has('qa-worker-view-ack'),pathTrace:params.has('qa-worker-path-trace'),doubleDecode:params.has('qa-worker-double-decode'),guardianOrigin:params.has('qa-guardian-origin'),plantDelay:params.has('qa-worker-delay-plant'),structureDelay:params.has('qa-worker-delay-structure'),sharedClips:params.has('qa-worker-shared-clips'),sharedRigs:params.has('qa-worker-shared-rigs'),sharedGlb:params.has('qa-worker-shared-glb'),activePoses:params.has('qa-worker-active-poses'),enabled:params.has('qa-worker-diagnostics'),compactPaused:params.has('qa-worker-compact-paused'),batchSteps:Number(params.get('qa-worker-batch')??16),...(params.has('qa-worker-window')?{batchWindow:Number(params.get('qa-worker-window'))}:{}),causalInput:params.has('qa-webgpu-causal-input'),coalesce:params.has('qa-worker-coalesce'),foldView:params.has('qa-worker-fold-view'),orderedViews:params.has('qa-worker-ordered-views')}});
      const early=createEarlyWorkerAuthority({session,initial,adapter,clientOptions,runtimeOptions,recoveryOptions,temporalOptions:earlyTemporal,hidden:ownerState.pauses.includes('hidden'),onError:failure=>{if(owner===world&&ownerState===state){closeAuthorityFailurePresentation(owner);error(failure.message);}}});owner.earlyNativeRuntime=early;early.ready=early.runtime.prepare();early.ready.catch(()=>{});
    }
    if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-early-probe')){
      const early=world.earlyNativeRuntime;if(!early)throw Error('Early native probe requires a saved checkpoint');await early.ready;assertLoading();
      const startupCommand=earlyNativeStartupCommand(early.snapshot,state),first=await early.runtime.start(startupCommand?{startupCommand}:{});assertLoading();
      if(first.elapsed!==JSON.parse(early.snapshot).elapsed||first.events.length)throw Error('Early native probe advanced before activation');
      const saveProbe=createWorkerSaveCoordinator({runtime:early.runtime,repository:saves,slotId:state.slotId,experimentalNativeAuthority:true}),written=await saveProbe.request();if(!written.saved)throw Error('Early native probe could not save');const saved=await saves.load(state.slotId);assertLoading();
      const logical=value=>{const clone=structuredClone(value);delete clone.savedAt;delete clone.workerNativeAuthorityCheckpoint;delete clone.workerRaidWaitBindings;delete clone.workerPhysicsCheckpoint;return JSON.stringify(clone);};
      if(logical(saved)!==logical(JSON.parse(first.snapshot)))throw Error('Early native probe saved a different state');
      globalThis.wildGuardiansEarlyNativeProbe={slotId:saved.slotId,firstElapsed:first.elapsed,savedElapsed:saved.elapsed,sequence:written.sequence,chunks:saved.workerNativeAuthorityCheckpoint.chunkKeys.length,events:first.events.length,clockActivated:false,worldLoaded:false};
      const probeOwner=world,probeRuntime=early.runtime;cancelLoading();globalThis.wildGuardiansEarlyNativeProbe.cancelled=probeOwner.disposed;globalThis.wildGuardiansEarlyNativeProbe.runtimeClosed=probeRuntime.status().closed;return;
    }
    if(document.hidden)audio.suspend();
    const nativeStyle=document.createElement('link');nativeStyle.id='native-hud-style';nativeStyle.rel='stylesheet';nativeStyle.href=assetUrl('/content/hud.css');document.head.append(nativeStyle);
    app.innerHTML=`<main class="game world-loading" id="stage" aria-busy="true"><div id="world-loading" class="loading interactive-loading-indicator" role="status"><div class="eyebrow">Wild Guardians / Africa</div><h2>La tierra despierta</h2><p>Preparando terreno, poblado y cultivos originales…</p><p id="loading-progress"></p></div><canvas id="world" aria-label="Mundo de Wild Guardians Africa"></canvas>${hudMarkup}<nav id="toolbar" hidden></nav><aside id="panel"></aside><aside id="context"></aside><div id="narrator"></div><div class="notices" id="notices"></div><div id="events" hidden></div><div id="placementBanner" hidden></div><div id="modal"></div><small class="world-stats" id="stats"></small></main>`;
    document.querySelector('#world').replaceWith(prepared.canvas);document.querySelector('#world-loading').replaceWith(overlay.element);loadingDiorama.render(0,loadingProgress.value);refreshLoadingOverlay();
    awakeningHud=new AwakeningHud(document.querySelector('#stage'),()=>safe(toggleAwakening));
    document.querySelectorAll('[data-sprite]').forEach(img=>img.src=ASSETS[img.dataset.sprite].src);layoutHud(document.querySelector('#stage'));
    // Prepare only presentation resources; no narrator/tutorial/voice action.
    if(new URLSearchParams(location.search).get('guardianWorker')==='1'&&new URLSearchParams(location.search).get('guardianWarm')==='1')ensureGuardianView();
    bind('menuButton',pauseDialog);
    document.querySelector('[data-menu="home"]').onclick=()=>world.focusFarm();
    document.querySelector('[data-menu="grow"]').onclick=()=>safe(()=>guidedHudAction('grow',()=>toolPanel('plant')));
    document.querySelector('[data-menu="magic"]').onclick=()=>safe(()=>toolPanel('spell'));
    document.querySelector('[data-menu="build"]').onclick=()=>safe(()=>guidedHudAction('build',buildPanel));
    world.onError=e=>{if(starting&&world===prepared.world){loadingProgress?.fail(e);cancelLoading(e);}else error(e.message);};world.onChunkProgress=progress=>{if(starting&&loadingProgress&&world===prepared.world)loadingProgress.update('chunks',progress.loaded,Math.max(1,progress.desired));};world.onWallStroke=points=>safe(()=>buildWallStroke(points));world.onWallGesture=phase=>uiAudio.wallGesture(phase);world.qualitySetting(settings.quality);applyWorldResolution(world,settings.resolution);world.onContextLost=()=>{if(screen==='loading'){cancelLoading(new Error(moneyLocale().startsWith('es')?'Se ha perdido el contexto gráfico durante la carga.':'Graphics context lost during loading.'));return;}changeSimulationPause(true,'context-lost');error(CONTEXT_LOST_MESSAGE);};world.onContextRestored=()=>{changeSimulationPause(false,'context-lost');if(commandFeedback===CONTEXT_LOST_MESSAGE){commandFeedback='';refreshCommandFeedback();}};
    world.destructionPass.onDestructionCue=(counts,entity)=>audio.destructionCue(counts,entity,{state,listener:world.controls.target});
    if(progressQa){progressQa.preparationPolicy(world.farIsolatedPreparation,world.farZeroVertexPreparation);world.onLoadingSpan=span=>progressQa.loadingSpan(span);world.onLoadingActorQueue=stats=>progressQa.actorQueue(stats);world.onLoadingGpuDraw=run=>progressQa.gpuInvocation('preparation-far-upload-draw',run);}
    if(startupProfile.earlyGpu){
      const params=new URLSearchParams(location.search),view=world.earlyNativeRuntime?.navigationView??state.workerNativeAuthorityCheckpoint?.navigationView;if(!world.earlyNativeRuntime||!startupProfile.picking||!view||!startupProfile.worker&&!params.has('qa-webgpu-world'))throw Error('Early GPU view requires native checkpoint, WebGPU and picking');
      world.state=state;world.nav=nav;nav.setActiveBounds(view.bounds);nav.setRaidView(view.eye,view.target);world.focusFarm();world.workerGpuOnly=true;world.qaEarlyTutorial=startupProfile.earlyTutorial;world.earlyGpuAttackGesture=createEarlyGpuAttackGesture({state});
      await installWorkerGame(world,state,nav,{presentationCapabilities:startupProfile.capabilities});assertLoading();
      const strokeOwner=world;strokeOwner.wallDrawing.tap=event=>strokeOwner.onDiscretePick?.(event,{});strokeOwner.wallDrawing.strokeContext=()=>{const rect=strokeOwner.canvas.getBoundingClientRect();return JSON.stringify([webGpuCameraPose(strokeOwner.camera,strokeOwner.controls),rect.left,rect.top,rect.width,rect.height,strokeOwner.canvas.width,strokeOwner.canvas.height]);};strokeOwner.wallDrawing.resolveStroke=samples=>{if(strokeOwner!==world||!strokeOwner.webGpuWorld)throw Error('World changed during wall stroke');const rect=strokeOwner.canvas.getBoundingClientRect();if(!rect.width||!rect.height)throw Error('Wall canvas unavailable');const coordinates=samples.map(([x,y])=>[2*(x-rect.left)/rect.width-1,1-2*(y-rect.top)/rect.height]);strokeOwner.webGpuWorld.sync();return strokeOwner.webGpuWorld.client.pickTerrainStroke(coordinates,{minSequence:strokeOwner.workerRuntime.status().confirmedSequence}).then(result=>result.points);};strokeOwner.wallDrawing.onResolveError=failure=>{if(strokeOwner===world)error(failure.message==='Stale WebGPU pick'?'La cámara o el terreno cambiaron; vuelve a trazar la muralla.':failure.message);};
      world.controls.enabled=true;loadingOverlay?.dispose();loadingOverlay=null;loadingDiorama?.dispose();loadingDiorama=null;loadingAudio?.dispose();loadingAudio=null;clearInterval(loadingDiagnostic);loadingDiagnostic=null;loadingTransfers?.dispose();loadingTransfers=null;document.querySelector('#stage').classList.remove('world-loading');document.querySelector('#stage').setAttribute('aria-busy','false');
      for(const button of document.querySelectorAll('#actions button'))if(button.dataset.menu!=='grow'&&button.dataset.menu!=='home'&&button.dataset.menu!=='build'&&!(button.dataset.menu==='magic'&&world.authoritativeGuardianPlacement))button.disabled=true;
      const grow=document.querySelector('[data-menu="grow"]');grow.onclick=()=>{const owner=world,version=++cropSelectionGeneration;grow.disabled=true;owner.webGpuWorld.client.prepareCrops().then(()=>{if(owner===world&&grow.isConnected){grow.disabled=false;if(version===cropSelectionGeneration)toolPanel('plant');}},failure=>{if(owner===world&&grow.isConnected){grow.disabled=false;if(version===cropSelectionGeneration)error(failure.message);}});};if(world.authoritativeGuardianPlacement){const magic=document.querySelector('[data-menu="magic"]');magic.onclick=()=>{const owner=world,version=++cropSelectionGeneration;magic.disabled=true;owner.webGpuWorld.client.prepareGuardian().then(()=>{if(owner===world&&magic.isConnected){magic.disabled=false;if(version===cropSelectionGeneration)toolPanel('spell');}},failure=>{if(owner===world&&magic.isConnected){magic.disabled=false;if(version===cropSelectionGeneration)error(failure.message);}});};}
      screen='game';{const owner=world;juice=new GameJuice(document.querySelector('#stage'),owner.actorAudio??state,owner,{allowResult:()=>surfaces.active==='result'&&!guardian?.voice?.active&&!state?.tutorial?.reading,priority:()=>!!surfaces.active||!!guardian?.voice?.active||!!tutorial?.presentation({record:false})||!!document.hidden,surface:(x,z)=>workerPresentationGround(owner,x,z)});}screenWakeLock.setActive(true);bind('pause',pauseDialog);lastFrame=performance.now();if(world.qaEarlyTutorial){ensureWorkerTutorial();if(import.meta.env.DEV)globalThis.wildGuardiansEarlyGpuSaveTutorialQa=()=>save();}if(state.microevents?.ticket){const owner=world;createWorkerMicroeventEconomy(owner.workerRuntime,{pendingTicket:state.microevents.ticket}).ready.catch(failure=>{if(owner===world)error(failure.message);});}installMicroevents();void save();if(import.meta.env.DEV)globalThis.wildGuardiansGuardianOriginQa=async targetId=>{const owner=world,ownerState=state,view=owner?.webGpuWorld,runtime=owner?.workerRuntime;if(!owner?.workerGpuOnly||!view||!runtime||typeof targetId!=='string')throw Error('Guardian origin QA unavailable');view.sync();const pose=JSON.stringify(webGpuCameraPose(owner.camera,owner.controls)),context=await view.client.guardianContextForQa();if(!context||owner!==world||ownerState!==state||pose!==JSON.stringify(webGpuCameraPose(owner.camera,owner.controls)))throw Error('Guardian view incomplete or changed');const result=await runtime.submit({kind:'qaGuardianOrigin',targetId,...context,exclusions:owner.guardianScreenExclusions?.()??[]});if(owner!==world||ownerState!==state||pose!==JSON.stringify(webGpuCameraPose(owner.camera,owner.controls)))throw Error('Guardian view changed');if(result.rejection)throw Error(result.rejection);return result.value;};if(import.meta.env.DEV)globalThis.wildGuardiansEarlyGpuQa=async()=>({backend:world?.webGpuWorld?.client.status().backend??null,renderer:await world.webGpuWorld.client.inspect(),plants:state.plants.length,workers:state.workers.length,pauses:[...state.pauses],centers:state.structures.filter(s=>s.kind==='center').length,walls:state.structures.filter(s=>s.kind==='wall').length,elapsed:state.elapsed,events:state.events.slice(-5),tool:tool?.kind??null,pending:world.provisionalCrops.entries.size});updateUI(true);if(!campaignCinema?.active)audio.gameplay(state.day).catch(()=>{});return;
    }
    await world.load(state,nav,payload,{spatialSession,farVegetation:(spatialSession&&new URLSearchParams(world.visualSearch).get('spatialFar')!=='1')||settings.farVegetation===false?false:farVegetationProfile({quality:settings.quality,biome:nav.config.biome},farGroundReviewOverrides(nav.config.biome,world.visualSearch)),loadingProgress});assertLoading();
    const planner=createEventDrivenTaskPlanner(spatialSession);
    planner.resetFromState(state);
    const stopTasks=planner.observeTasks(state),stopWorld=planner.observeWorld(state);
    nav.intentTaskPlanner=planner;
    nativeIntentCleanup=()=>{stopTasks();stopWorld();delete nav.intentTaskPlanner;};
    if(import.meta.env.DEV&&spatialSession)globalThis.wildGuardiansSpatialQa=()=>({
      fieldShared:world.nav.field===spatialSession.field,
      streamShared:world.chunkStream===spatialSession.stream,
      nativeChunks:[...world.chunks.values()].filter(group=>group.userData.spatialAuthority==='spatial-wasm').length,
      totalChunks:world.chunks.size,
      loadedChunks:spatialSession.core.metrics().loadedChunks,
      nativeIntent:nav.intentTaskPlanner?.metrics(state.elapsed)??null,
      ...(cropSpellFrameQa?{state,world,gpu:gameplayGpuQa}: {})});
    for(const village of state.villages.slice(1)){const data=villages.find(v=>v.id===(village.culture==='saheliana'?'saheliano':village.culture));await world.ensureVillage(village.culture,data);assertLoading();world.objects.delete(village.id);}
    await world.loadReady(prepareInitialFarWorld(world,{afterRender:()=>{assertLoading();loadingDiorama.render(0,loadingProgress.value);}}));assertLoading();
    await loadingDiorama.freezeForCinematic();assertLoading();
    progressQa?.cameraPose('before-cinematic',world);
    loadingCinema=new LoadingCinematic(world,loadingDiorama,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,autoStart:false,onSky:()=>{loadingOverlay?.dispose();loadingOverlay=null;},onHandoff:()=>loadingAudio?.dispose()});
    await loadingCinema.prepare({afterRender:()=>{assertLoading();loadingDiorama.render(0,loadingProgress.value);}});assertLoading();
    loadingProgress.update('visible-ready');loadingDiorama.loadingReady=true;loadingDiorama.stopPlanting();loadingDiorama.render(0,1,{ready:true});
    if(!loadingDiorama.plants.mature)await new Promise((resolve,reject)=>{loadingMature={resolve,reject};});assertLoading();loadingProgress.confirmReady();
    loadingCinema.start();await loadingCinema.finished;assertLoading();progressQa?.cameraPose('cinematic-completed',world);loadingCinema=null;loadingDiorama.dispose();loadingDiorama=null;loadingAudio?.dispose();loadingAudio=null;world.loadingActorQueue?.dispose();progressQa?.lifecycle('app-cinematic-restored-before-controls');progressQa?.close(loadingProgress,loadingTransfers);loadingTransfers.dispose();loadingTransfers=null;world.onLoadingSpan=null;world.onLoadingActorQueue=null;world.onLoadingGpuDraw=null;world.controls.enabled=true;clearInterval(loadingDiagnostic);loadingDiagnostic=null;

    world.render(0);world.retainStreamingPrograms();loadingOverlay?.dispose();loadingOverlay=null;document.querySelector('#stage').classList.remove('world-loading');document.querySelector('#stage').setAttribute('aria-busy','false');tutorial=new TutorialController(state,tutorialProfile,{onError:e=>error('No se ha podido guardar la memoria del tutorial: '+e.message),isNarrating:id=>guardian?.voice?.active&&guardian?.key?.startsWith(id+':')});if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game')){await installWorkerGame(world,state,nav);assertLoading();}screen='game';juice=new GameJuice(document.querySelector('#stage'),state,world,{allowResult:()=>surfaces.active==='result'&&!guardian?.voice?.active&&!state?.tutorial?.reading,priority:()=>!!surfaces.active||!!guardian?.voice?.active||!!tutorial?.presentation({record:false})||!!document.hidden});screenWakeLock.setActive(true);bind('pause',pauseDialog);lastFrame=performance.now();ensureWorkerTutorial();updateUI(true);save();if(!campaignCinema?.active)audio.gameplay(state.day).catch(()=>{});installMicroevents();
  } catch(e){if(loadingToken===loadingGeneration){loadingProgress?.fail(e);state=null;clearWorld();releasePreparedLoading();menu();error(e.message,{loadingFailure:true});}}finally{if(loadingToken===loadingGeneration){starting=false;const stats=document.querySelector('#stats');if(stats)stats.textContent='';}}
}
function guidedHudAction(action,open){
  const guided=!!hudHand&&hudHand.visible&&hudHand.selector===`[data-menu="${action}"]`;
  open();
  if(surfaces.active==='panel')uiAudio.guidedTouch(action,{guided});
}
function onPick({entityId,point,hitPoint,guardianContext=null,gestureSeconds=null}) {
  if(!state||screen!=='game')return;
  safe(()=>{
    if(state.pauses.includes('hiring')){if(surfaces.active!=='hiring')hiringDialog();return;}
    if(tool?.kind==='awakening'){
      const owner=world,ownerState=state,selectedTool=tool,contact=hitPoint&&[hitPoint.x,hitPoint.y,hitPoint.z].every(Number.isFinite)?{x:hitPoint.x,y:hitPoint.y,z:hitPoint.z}:null;
      const apply=draft=>{if(owner!==world||ownerState!==state||tool!==selectedTool)return;if(!draft?.valid)throw Error(draft?.reason??'Selecciona una planta o muralla.');selectedTool.targetId=entityId;selectedTool.hitPoint=contact;selectedTool.confirmedDraft=draft;commandFeedback=awakeningSelectionCopy(draft.kind);updateUI(true);};
      if(owner?.workerGpuOnly&&owner.workerRuntime){if(typeof entityId!=='string'||!entityId)throw Error('Selecciona una planta o muralla.');selectedTool.targetId=null;selectedTool.hitPoint=null;selectedTool.confirmedDraft=null;return requestWorkerBlessingPreview({runtime:owner.workerRuntime,tool:selectedTool,targetId:entityId,isCurrent:()=>owner===world&&ownerState===state&&tool===selectedTool,onAccepted:apply});}
      return apply(Game.previewBlessing(state,entityId));
    }
    const pickedPlant=state.plants.find(p=>p.id===entityId&&p.alive);
    if(tool?.kind==='spell'){
      const applicationStarted=performance.now(),owner=world,ownerState=state,ownerTool=tool,spell=tool.spell,runtime=owner.workerRuntime??null;
      if(runtime)ensureWorkerSave(owner,ownerState);
      const contact=owner.workerGpuOnly&&spell==='shield'?confirmedSpellContact(hitPoint,point,(x,z)=>workerPresentationGround(owner,x,z)):hitPoint,atomicGuardian=spell==='attack'&&owner.authoritativeGuardianPlacement===true,provisionalOrigin=atomicGuardian?provisionalGuardianOrigin(guardianContext?.camera?.position,contact):owner.workerGpuOnly?provisionalGuardianOrigin(owner.camera.position.toArray(),contact):null;if(atomicGuardian&&(!guardianContext||!provisionalOrigin))throw Error('Guardian view incomplete');
      const presentation=runtime&&(['growth','multiply','attack'].includes(spell)||owner.workerGpuOnly&&spell==='shield')?{begin:command=>{owner.earlyGpuAttackGesture?.begin(command);owner.guardianSummons?.beginProvisional(command);owner.provisionalBeastImpact?.begin(command,ownerState,(x,z)=>owner.nav.actorSurface(x,z));if(command.kind==='castAttack')owner.webGpuWorld?.client.beginGuardianAttack(command);else if(command.kind==='castAgricultural')owner.webGpuWorld?.client.beginGuardianAgriculture(command);else if(command.kind==='castShield')owner.webGpuWorld?.client.beginGuardianShield(command);},confirm:(id,result)=>{owner.earlyGpuAttackGesture?.confirm(id);owner.provisionalBeastImpact?.end(id);if(['attack','growth','multiply','shield'].includes(spell))owner.webGpuWorld?.client.resolveGuardianAttack(id,true,result?.sequence);},reject:(id,result)=>{owner.earlyGpuAttackGesture?.reject(id);owner.guardianSummons?.rejectProvisional(id);owner.provisionalBeastImpact?.end(id);if(['attack','growth','multiply','shield'].includes(spell))owner.webGpuWorld?.client.resolveGuardianAttack(id,false,result?.sequence);},canBeginAttack:()=>owner.guardianSummons?.canBeginAttack()??owner.earlyGpuAttackGesture?.canBegin()??false,...(atomicGuardian?{submit:command=>runtime.submit({...command,guardianContext:{...guardianContext,exclusions:owner.guardianScreenExclusions?.()??[]}})}:{})}:null;
      const spellState=owner.workerGpuOnly?owner.actorAudio??ownerState:ownerState,result=dispatchPickedSpell(spellState,commandId(),spell,{entityId,point,hitPoint:contact,origin:()=>owner.guardianSummons?.plan(entityId,point)??provisionalOrigin},nav,runtime,presentation),applicationCpuSeconds=(performance.now()-applicationStarted)/1000;
      const finish=committed=>{if(owner!==world||ownerState!==state||!committed)return;if(spell!=='attack')manualMagicActivity.applied(state,state.spells.at(-1),{gestureSeconds,applicationCpuSeconds,benefited:state.events.at(-1)?.benefited});if(tool===ownerTool)toolSession.used(performance.now()/1000);return runtime?owner.workerSave():save();};
      if(result?.then)return result.then(async value=>{await finish(value);if(owner===world&&ownerState===state)updateUI(true);},error=>{if(owner===world&&ownerState===state)throw error;});
      finish(result);return;
    }
    if(pickedPlant&&tool?.kind!=='spell'&&tool?.kind!=='plant'){cancelTool();closeSurface();selection=null;return;}
    const pickedCenter=state.structures.find(s=>s.id===entityId&&s.kind==='center'&&operational(s));
    if(pickedCenter&&!state.raid&&state.time<300&&state.hiringPaidDay===state.day){cancelTool();hiringDialog(pickedCenter.id);return;}
    if(tool&&point) {
      if(tool.kind==='wall'&&entityId){selection=entityId;tool=null;return;}
      if(tool.kind==='village') {const payload=villageCatalog.find(v=>v.id===(tool.culture==='saheliana'?'saheliano':tool.culture)),owner=world,ownerState=state,ownerTool=tool;
        if(owner.workerRuntime&&!(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-local-village-preview'))){const pending={culture:ownerTool.culture,x:point.x,z:point.z,buildings:villageLayout(payload,point.x,point.z),cost:villageCost(ownerState.villages.length+1),valid:false,pending:true};pendingVillage=pending;owner.showVillagePreview(pending);villageConfirmPanel();return owner.workerRuntime.submit({kind:'previewVillage',culture:pending.culture,x:pending.x,z:pending.z,payload}).then(result=>{if(owner!==world||ownerState!==state||pendingVillage!==pending||tool!==ownerTool)return;if(result.rejection)throw Error(result.rejection);pendingVillage=result.value;owner.showVillagePreview(pendingVillage);villageConfirmPanel();}).catch(failure=>{if(owner===world&&ownerState===state&&pendingVillage===pending){cancelVillagePreview();throw failure;}});}
        pendingVillage=Game.previewVillage(state,tool.culture,point.x,point.z,payload,nav);world.showVillagePreview(pendingVillage);villageConfirmPanel();return;}
      const guided=guidedPlacementKind(tool,world.hands,world.guardianSummons?.guiding?world.guardianSummons.guide:null);let committed=false;
      if(world.workerRuntime&&(tool.kind==='center'||tool.kind==='wall'||tool.kind==='plant')){
        const owner=world,ownerState=state,ownerTool=tool,runtime=owner.workerRuntime;ensureWorkerSave(owner,ownerState);
        const id=commandId(),command=ownerTool.kind==='plant'?{kind:'plant',id,species:ownerTool.species,x:point.x,z:point.z,nearTouch:true}:{kind:'placeStructure',id,structure:{...ownerTool,x:point.x,z:point.z}};
        if(command.kind==='plant'){if(owner.workerGpuOnly){if(!owner.webGpuWorld?.client.beginProvisionalCrop(id,command.species,command.x,command.z))throw Error('Crop preview unavailable');}else owner.provisionalCrops.begin(id,command.species,command.x,command.z);}
        if(command.kind==='placeStructure'&&owner.workerGpuOnly){const nearest=ownerState.villages.reduce((best,v)=>!best||Math.hypot(v.x-point.x,v.z-point.z)<Math.hypot(best.x-point.x,best.z-point.z)?v:best,null);if(!owner.webGpuWorld?.client.beginProvisionalStructure({id,kind:ownerTool.kind,culture:nearest?.culture??ownerState.culture,material:ownerTool.material,gate:!!ownerTool.gate,x:point.x,z:point.z,yaw:ownerTool.yaw??0}))throw Error('Structure preview unavailable');}
        if(command.kind==='placeStructure'&&!owner.workerGpuOnly&&ownerTool.kind==='wall')owner.provisionalWalls?.begin(id,ownerTool.material,[{x:point.x,z:point.z,yaw:ownerTool.yaw??0}],{gate:!!ownerTool.gate});
        if(command.kind==='placeStructure'&&!owner.workerGpuOnly&&ownerTool.kind==='center'){const village=ownerState.villages.reduce((best,v)=>!best||Math.hypot(v.x-point.x,v.z-point.z)<Math.hypot(best.x-point.x,best.z-point.z)?v:best,null);owner.provisionalBuildings?.begin(id,village?.culture??ownerState.culture,point.x,point.z,ownerTool.yaw??0);}
        const removePreview=()=>{owner.provisionalWalls?.remove(id);owner.provisionalBuildings?.remove(id);};const rejectStructure=()=>{if(owner.workerGpuOnly&&command.kind==='placeStructure')owner.webGpuWorld?.client.rejectProvisionalStructure(id);};
        return owner.workerRuntime.submit(command).then(async result=>{removePreview();if(owner!==world||ownerState!==state)return;if(result.rejection)throw Error(result.rejection);if(result.value===false){rejectStructure();owner.provisionalCrops.reject(id);if(owner.workerGpuOnly)owner.webGpuWorld?.client.rejectProvisionalCrop(id);return;}if(owner.workerGpuOnly&&command.kind==='placeStructure'){const event=result.events?.find(item=>item.type==='PlacementCommitted'&&item.commandId===id);if(event?.targetId)owner.webGpuWorld?.client.confirmProvisionalStructure(id,event.targetId);else rejectStructure();}if(command.kind==='plant'){const targetId=confirmedCropId(result,id);if(targetId){owner.provisionalCrops.confirm(id,targetId);if(owner.workerGpuOnly)owner.webGpuWorld?.client.confirmProvisionalCrop(id,targetId);}else{owner.provisionalCrops.reject(id);if(owner.workerGpuOnly)owner.webGpuWorld?.client.rejectProvisionalCrop(id);}}uiAudio.guidedPlacement(guided);if(tool===ownerTool)toolSession.used(performance.now()/1000);owner.syncResidentProps();await owner.workerSave();if(owner===world&&ownerState===state)updateUI(true);}).catch(error=>{removePreview();rejectStructure();owner.provisionalCrops.reject(id);if(owner.workerGpuOnly)owner.webGpuWorld?.client.rejectProvisionalCrop(id);throw error;});
      }
      if(tool.kind==='center'||tool.kind==='wall')committed=Game.placeStructure(state,commandId(),{...tool,x:point.x,z:point.z},nav);
      else if(tool.kind==='plant')committed=plantNearTouch(state,commandId(),tool.species,point,nav);
      if(committed===false)return;
      uiAudio.guidedPlacement(guided);

      toolSession.used(performance.now()/1000);save();world.syncResidentProps();
    } else {closeSurface();selection=entityId;}
  });
}
function hideHudPanel({silent=false}={}){document.querySelector('#panel').replaceChildren();if(surfaces.active==='panel'){surfaces.close();uiAudio.close({silent});}}
function buildWallStroke(points){
  if(state.pauses.includes('hiring')||tool?.kind!=='wall'||tool.gate)return;
  if(world.workerRuntime){
    const owner=world,ownerState=state,ownerTool=tool;ensureWorkerSave(owner,ownerState);
    const id=commandId(),capacity=Game.wallCapacity(ownerState,ownerTool.material);if(owner.workerGpuOnly){if(!owner.webGpuWorld?.client.beginProvisionalStructure({id,kind:'wall',material:ownerTool.material,points,maxPieces:capacity}))throw Error('Wall preview unavailable');}else owner.provisionalWalls?.beginStroke(id,ownerTool.material,points,ownerState.structures,capacity);
    return owner.workerRuntime.submit({kind:'buildWallChain',id,material:ownerTool.material,points,capacityLimit:true}).then(async result=>{owner.provisionalWalls?.remove(id);if(owner!==world||ownerState!==state)return;if(owner.workerGpuOnly){const event=result.events?.find(item=>item.type==='WallChainBuilt'&&item.commandId===id);if(event?.targetId)owner.webGpuWorld?.client.confirmProvisionalStructure(id,event.targetId);else owner.webGpuWorld?.client.rejectProvisionalStructure(id);}if(result.rejection){if(result.rejection===RESERVE_MESSAGE)uiAudio.error({force:true});throw Error(result.rejection);}if(result.value===false){uiAudio.error({force:true});return;}if(tool===ownerTool)toolSession.used(performance.now()/1000);owner.clearWallPreview();owner.syncResidentProps();await owner.workerSave();if(owner===world&&ownerState===state)updateUI(true);}).catch(error=>{owner.provisionalWalls?.remove(id);if(owner.workerGpuOnly)owner.webGpuWorld?.client.rejectProvisionalStructure(id);throw error;});
  }
  const maxPieces=Game.wallCapacity(state,tool.material);if(!maxPieces){uiAudio.error({force:true});error(RESERVE_MESSAGE,{silent:true});return;}
  if(Game.buildWallChain(state,commandId(),tool.material,points,nav,{maxPieces})===false){uiAudio.error({force:true});return;}
  toolSession.used(performance.now()/1000);world.clearWallPreview();world.syncResidentProps();save();
}
function toolPanel(type) {
  if(state.pauses.includes('hiring'))return;
  cancelTool();
  world.clearWallPreview();
  let content='';
  const price=value=>`<span class="price"><img src="${ASSETS.coin.src}" alt="">${value}</span>`;
  if(type==='plant')content=`<div class="card-grid crop-grid">${B.crops.slice().sort((a,b)=>a.plant_cost-b.plant_cost).map(c=>`<button class="choice-card" data-crop="${c.id}" ${!permission(state,'plant')||numberOf(state.ledger.balance)<c.plant_cost?'disabled':''}><img class="card-image" src="${thumbnails[c.id]}" alt=""><strong>${c.name}</strong>${price(c.plant_cost)}</button>`).join('')}</div><p class="panel-note">Elige una semilla y toca un espacio libre.</p>`;
  if(type==='wall')content=`<div class="card-grid">${B.walls.map(w=>`<button class="choice-card" data-wall="${w.id}" ${!permission(state,'wall')||numberOf(state.ledger.balance)<w.cost+HIRING_RESERVE?'disabled':''}><img class="card-image" src="${ASSETS.event8.src}" alt=""><strong>${w.name}</strong><span class="detail">${w.hp} PV</span>${price(w.cost)}</button>`).join('')}</div><label class="panel-note"><input id="gate" type="checkbox"> Colocar una puerta individual</label><p class="panel-note">Arrastra sobre el suelo para trazar una muralla. Se construye al soltar, reservando 30 monedas para contratar. Un recinto cerrado incluye su puerta sin recargo.</p>`;
  if(type==='spell')content=spellCardsMarkup(state,spellSVG);
  showHudPanel({plant:'Cultivar',wall:'Defensas',spell:'Magias del Espíritu'}[type],content);
  document.querySelectorAll('[data-crop]').forEach(el=>el.onclick=()=>{const owner=world,choice={kind:'plant',species:el.dataset.crop},version=++cropSelectionGeneration,select=()=>{if(owner!==world||version!==cropSelectionGeneration||!el.isConnected)return;armTool(choice);hideHudPanel();updateUI(true);};if(owner?.workerGpuOnly){el.disabled=true;owner.webGpuWorld.client.prepareCropSpecies(choice.species).then(select,failure=>{if(el.isConnected)el.disabled=false;if(owner===world&&version===cropSelectionGeneration&&el.isConnected)error(failure.message);});}else select();});
  document.querySelectorAll('[data-wall]').forEach(el=>el.onclick=()=>{const owner=world,version=++cropSelectionGeneration,choice={kind:'wall',material:el.dataset.wall,gate:document.querySelector('#gate').checked},current=()=>owner===world&&version===cropSelectionGeneration&&el.isConnected,select=()=>{if(!current())return;armTool(choice);hideHudPanel();updateUI(true);};if(owner?.workerGpuOnly)owner.webGpuWorld.client.prepareStructure('wall',choice.material).then(select,failure=>{if(current())error(failure.message);});else select();});
  document.querySelectorAll('[data-spell]').forEach(el=>{const contact=bindMagicSelectionContact(el);el.onclick=e=>{if(el.disabled)return;const seconds=contact();manualMagicActivity.selected(state.day,el.dataset.spell,e.isTrusted&&e.detail>0?seconds:null);armTool({kind:'spell',spell:el.dataset.spell});hideHudPanel({silent:true});uiAudio.selectSpell(el.dataset.spell);updateUI(true);};});
}
function showHudPanel(title,body){
 if(!openSurface('panel',title))return false;
 const host=document.querySelector('#panel');host.className='native-panel-host';host.innerHTML=`<section class="panel" role="dialog" aria-label="${esc(title)}"><canvas class="frame-canvas" aria-hidden="true"></canvas><header class="panel-head"><h2 class="panel-title">${esc(title)}</h2><button class="close-panel" id="close-hud-panel" aria-label="Cerrar">×</button></header><div class="panel-body">${body}</div></section>`;
 bind('close-hud-panel',()=>{closeSurface();});
 paintPanelFrame(host,document.querySelector('#stage'),'No se ha podido cargar el marco del menú.');
}
function paintPanelFrame(host,stage,message){
 const panel=host.firstElementChild;
 const current=()=>host.isConnected&&host.firstElementChild===panel;
 if(frameImages){framePaint(host,layoutHud(stage),frameImages);return;}
 loadFrameImages().then(images=>{frameImages=images;if(current())framePaint(host,layoutHud(stage),images);}).catch(()=>{if(current())error(message);});
}
function openSurface(kind,key=kind){
  if(state.pauses.includes('hiring')&&!['hiring','result'].includes(kind))return false;
  if(!surfaces.open(kind,{mandatory:kind==='hiring',force:kind==='result'}))return false;
  if(tool?.kind==='awakening')cancelTool();
  dialogVoice.stop();
  setTutorialInteraction(false);if(!(kind==='panel'&&['basic.center','basic.plant','magic.growth','magic.multiply'].includes(state.tutorial.reading)))guardian?.hide({immediate:true,interrupt:true});
  if(kind!=='context'){selection=null;document.querySelector('#context').replaceChildren();}
  if(kind!=='panel')document.querySelector('#panel').replaceChildren();
  if(kind!=='modal'&&kind!=='hiring'&&kind!=='result')document.querySelector('#modal').replaceChildren();
  document.querySelector('#stage').classList.remove('hiring-open');
  if(kind!=='modal')changeSimulationPause(false,'menu',{sound:true});
  uiAudio.surface(kind,key);return true;
}
function closeSurface(){
  cropSelectionGeneration++;dialogVoice.stop();
  if(surfaces.mandatory&&state.pauses.includes('hiring'))return;
  const kind=surfaces.close({resolved:!state.pauses.includes('hiring')});uiAudio.close();
  document.querySelector('#panel').replaceChildren();document.querySelector('#context').replaceChildren();document.querySelector('#modal').replaceChildren();
  document.querySelector('#stage').classList.remove('hiring-open');selection=null;
  if(kind==='modal')changeSimulationPause(false,'menu',{sound:true});
  if(pendingVillage)cancelVillagePreview();
}
let cropSelectionGeneration=0;
function armTool(value){cropSelectionGeneration++;world?.cancelTutorialFocus?.();if(world?.workerGpuOnly)world.webGpuWorld?.client.preferCropSpecies(value.kind==='plant'?value.species:null);tool=toolSession.select(value,performance.now()/1000);if(!world?.qaEarlyTutorial||world?.workerGpuOnly&&['center','plant'].includes(value.kind))world?.focusTutorialPlacement(value.kind);}
function cancelTool(){cropSelectionGeneration++;world?.cancelTutorialFocus?.();if(world?.workerGpuOnly)world.webGpuWorld?.client.preferCropSpecies(null);if(pendingVillage)cancelVillagePreview();if(world?.workerGpuOnly)world.wallDrawing.setEnabled(false);tool=null;toolSession.clear();commandFeedback='';}
function toggleAwakening(){
  if(tool?.kind==='awakening'){cancelTool();return;}
  if(!permission(state,'awakening')||(state.awakenings?.progress??0)<100)return;
  closeSurface();cancelTool();selection=null;if(world?.workerGpuOnly){const owner=world;owner.webGpuWorld?.client.prepareGuardian({awakening:true}).catch(failure=>{if(owner===world)error(failure.message);});}armTool({kind:'awakening'});
  commandFeedback='Toca una planta o muralla. Cancelar conserva la carga.';
}
function confirmAwakening(){
  if(tool?.kind!=='awakening'||!tool.targetId)return;
  if(world?.workerRuntime){const owner=world,ownerState=state,ownerTool=tool,draft=owner.workerGpuOnly?ownerTool.confirmedDraft:Game.previewBlessing(ownerState,ownerTool.targetId),rules=owner.workerGpuOnly?owner.confirmedHud?.rules??ownerState:ownerState;if(owner.pendingAwakening)return;if(!draft?.valid||!permission(rules,'awakening')||(rules.awakenings?.progress??0)<100)return;const id=commandId();owner.guardianSummons?.beginProvisionalAwakening(id,ownerTool.targetId);const slot=owner.guardianSummons?.slots.find(s=>s.event?.commandId===id&&s.event?.provisional),selection=slot?{origin:{x:slot.origin.x,y:slot.origin.y,z:slot.origin.z},contact:{x:slot.target.x,y:slot.target.y,z:slot.target.z}}:owner.workerGpuOnly?provisionalAwakeningSelection(owner.camera.position.toArray(),ownerTool.hitPoint):null;if(owner.workerGpuOnly&&!selection)throw Error('La posición visual del objetivo no está disponible.');if(selection){const begun=owner.webGpuWorld?.client.beginGuardianAwakening({kind:'bless',id,targetId:ownerTool.targetId,selection});if(owner.workerGpuOnly&&!begun)throw Error('La presentación del Despertar no está disponible.');}const pending=owner.pendingAwakening={id,targetId:ownerTool.targetId};return owner.workerRuntime.submit({kind:'bless',id,targetId:ownerTool.targetId}).then(async result=>{if(owner!==world||ownerState!==state)return;if(result.rejection)throw Error(result.rejection);if(result.value){owner.webGpuWorld?.client.resolveGuardianAttack(id,true);if(tool===ownerTool)cancelTool();await save();}else {owner.webGpuWorld?.client.resolveGuardianAttack(id,false);owner.guardianSummons?.rejectProvisional(id);}}).catch(error=>{owner.webGpuWorld?.client.resolveGuardianAttack(id,false);owner.guardianSummons?.rejectProvisional(id);throw error;}).finally(()=>{if(owner.pendingAwakening===pending)owner.pendingAwakening=null;});}
  if(Game.bless(state,commandId(),tool.targetId)){cancelTool();save();}
}
function startDueCinematic(){
  if(campaignCinema||document.hidden)return false;
  const act=dueCinematicAct(world?.workerGpuOnly?world.confirmedHud?.cinematic??state:state);if(!act)return false;
  const ownerWorld=world,ownerState=state,runtime=ownerWorld?.workerRuntime??null;
  microevents?.cancel('cinematic');guardian?.hide({immediate:true,interrupt:true});dialogVoice.stop();
  if(audio.musicGain)audio.musicGain.gain.value=0;
  const owner=new CampaignCinematics({host:document.body,onError:failure=>error((moneyLocale().startsWith('es')?'No se pudo reproducir la cinemática: ':'Could not play cinematic: ')+failure.message),onComplete:()=>{
    if(campaignCinema!==owner)return;
    const complete=async()=>{if(runtime){const result=await runtime.submit({kind:'cinematicFinish',act});if(result.rejection)throw Error(result.rejection);}else finishCinematicAct(ownerState,act);if(campaignCinema!==owner||world!==ownerWorld||state!==ownerState)return;campaignCinema=null;audio.volume();await save();updateUI(true);};
    complete().catch(failure=>{if(campaignCinema===owner)error(failure.message);});
  }});
  campaignCinema=owner;
  if(runtime)runtime.submit({kind:'cinematicStart',act}).then(result=>{if(result.rejection)throw Error(result.rejection);if(campaignCinema===owner&&world===ownerWorld&&state===ownerState)owner.play(act);}).catch(failure=>{if(campaignCinema===owner){campaignCinema=null;owner.dispose();audio.volume();error(failure.message);}});
  else owner.play(act);
  return true;
}
function openInitialHiringWhenReady(){
  if(state.day===1&&state.initialPreparation&&!tool&&!surfaces.active&&!state.pauses.includes('hiring')&&state.plants.some(p=>p.alive)&&state.structures.some(operational)){
    if(!world.workerRuntime)Game.openInitialHiring(state);
    else if(initialHiringPending!==world){const owner=world,ownerState=state;initialHiringPending=owner;owner.workerRuntime.submit({kind:'openInitialHiring'}).then(()=>{if(owner===world&&ownerState===state)updateUI(true);},failure=>{if(owner===world&&ownerState===state)error(failure.message);}).finally(()=>{if(initialHiringPending===owner)initialHiringPending=null;});}
  }
}
function renderConfirmedNotices(activeTutorial,now){
  const noticeState=world?.workerGpuOnly?world.confirmedHud?.notices??state:state,stage=document.querySelector('#stage');
  if(commandFeedback&&tutorialCoversNotice(noticeState,{text:commandFeedback},activeTutorial))commandFeedback='';
  eventCards??=new EventCards(document.querySelector('#notices'),ASSETS);
  const tutorialBubble=stage.querySelector('#guardian-root[aria-hidden="false"] .bubble');
  const allowAwakeningUrgent=stage.classList.contains('portrait')&&!!tutorialBubble&&!surfaces.active&&!document.hidden&&tool?.kind!=='awakening'&&
    tutorialBubble.getBoundingClientRect().top-document.querySelector('#notices').getBoundingClientRect().top>=150;
  stage.classList.toggle('awakening-urgent-over-tutorial',allowAwakeningUrgent);
  eventCards.render(noticeLifetime.visible(noticeState,now/1000,activeTutorial,{tutorialVisible:(guardian?.lifecycle?.phase??'closed')!=='closed'||!!surfaces.active||document.hidden||tool?.kind==='awakening',maxVisible:stage.classList.contains('short')?2:3,allowAwakeningUrgent}),noticeLifetime,now/1000,{compactUrgent:allowAwakeningUrgent});
  document.querySelectorAll('[data-dismiss-notice]').forEach(el=>el.onclick=()=>{noticeLifetime.dismiss(el.dataset.dismissNotice);updateUI(true);});
  document.querySelectorAll('[data-notice]').forEach(el=>el.onclick=()=>{if(noticeState!==state){const target=confirmedNoticeFocus(noticeState,el.dataset.notice);if(target)world.focus(target);return;}const message=state.messages.find(m=>m.id===el.dataset.notice);if(!message)return;const target=[...state.plants,...state.structures,...state.workers,...(state.raid?.animals??[])].find(e=>e.id===message.target);if(target??message.location)world.focus(target??message.location);});
}
function renderResultAvailability(){
  renderSharedResultAvailability({state,surfaces,stage:document.querySelector('#stage'),document,openResult:resultDialog,runSafe:safe});
}
function updateUI(force=false) {
  if(screen!=='game'||!state)return;
  if(campaignCinema||startDueCinematic())return;
  if(world?.workerGpuOnly){const now=performance.now(),hud=world.confirmedHud??{time:state.time,day:state.day,completedNights:state.completedNights,balance:state.ledger.balance},hudState=hud.rules??state;openInitialHiringWhenReady();if(!state.pauses.includes('hiring'))surfaces.deferred.delete('hiring');if(state.pauses.includes('hiring')&&surfaces.shouldOpen('hiring',{mandatory:true}))hiringDialog();world.wallDrawing.setEnabled(tool?.kind==='wall'&&!tool.gate&&permission(hudState,'wall'));if(!force&&now-lastUI<200)return;lastUI=now;if(tool?.kind==='awakening'&&(state.awakenings?.progress??0)<100)cancelTool();if(tool&&(['plant','center','wall'].includes(tool.kind)||tool.kind==='spell'&&tool.spell!=='shield')&&toolSession.expired(now/1000,tool.kind==='wall'&&world.wallDrawing.active))cancelTool();awakeningHud?.render(hudState,{selecting:tool?.kind==='awakening',blocked:!!surfaces.active||!world.authoritativeGuardianPlacement});refreshSpellCards(document,hudState);refreshCommandFeedback();document.querySelector('#clockValue').textContent=Game.clockLabel(hud);document.querySelector('#moneyValue').textContent=localMoney(hud.balance);document.querySelector('#dayValue').textContent='Día '+hud.day;document.querySelector('#days').title=`${hud.completedNights}/100 noches superadas`;manualMagicActivity.update(state);const balance=numberOf(hud.balance);if(balance>lastBudgetBalance&&balance>BUDGET_WARNING_THRESHOLD)reserveWarningShown=false;if(balance<=BUDGET_WARNING_THRESHOLD&&lastBudgetBalance>BUDGET_WARNING_THRESHOLD&&!reserveWarningShown){reserveWarningShown=true;budgetWarningUntil=now+18000;}lastBudgetBalance=balance;refreshBuildPermissions(document,hudState);contextPanel();const activeTutorial=world.qaEarlyTutorial?narrator():null;renderConfirmedNotices(activeTutorial,now);renderResultAvailability();refreshCommandFeedback();return;}
  const now=performance.now();if(!force&&now-lastUI<200)return;lastUI=now;
  if(tool?.kind==='awakening'&&(state.awakenings?.progress??0)<100)cancelTool();
  world.awakeningSelecting=tool?.kind==='awakening';world.awakeningTargetId=world.awakeningSelecting?tool.targetId:null;
  awakeningHud?.render(state,{selecting:world.awakeningSelecting,blocked:!!surfaces.active});
  manualMagicActivity.update(state);
  if(tool&&(['plant','center','wall'].includes(tool.kind)||tool.kind==='spell'&&tool.spell!=='shield')&&toolSession.expired(now/1000,tool.kind==='wall'&&world.wallDrawing.active))cancelTool();
  openInitialHiringWhenReady();
  const balance=numberOf(state.ledger.balance);if(balance>lastBudgetBalance&&balance>BUDGET_WARNING_THRESHOLD)reserveWarningShown=false;if(balance<=BUDGET_WARNING_THRESHOLD&&lastBudgetBalance>BUDGET_WARNING_THRESHOLD&&!reserveWarningShown){reserveWarningShown=true;budgetWarningUntil=now+18000;}lastBudgetBalance=balance;
  world.wallDrawing.setEnabled(tool?.kind==='wall'&&!tool.gate&&permission(state,'wall'));
  refreshBuildPermissions(document,state);refreshSpellCards(document,state);
  if(guidanceQa){const stats=document.querySelector('#stats');stats.setAttribute('data-no-i18n','');stats.hidden=true;stats.textContent=JSON.stringify({step:state.tutorial.step,reading:state.tutorial.reading,guides:state.tutorial.guideAfterAuto,pauses:state.pauses,tool:tool?.kind,worldTool:world.tutorialToolKind,handsEnabled:world.tutorialHandsEnabled,worldHand:{visible:world.hands?.mesh.visible,textures:world.hands?.textures.size,...world.hands?.hints.getState()},hudHand:{hidden:!hudHand?.visible,loaded:!!guardian?.mesh?.model,selector:hudHand?.selector},voice:guardian?.voice?.status,camera:world.camera.position.toArray(),day:state.day,time:state.time,money:numberOf(state.ledger.balance),crates:state.crates.map(c=>({id:c.id,sourcePlantId:c.sourcePlantId,carrierId:c.carrierId,delivered:c.delivered,x:c.x,z:c.z})),raid:state.raid?{id:state.raid.id,animals:state.raid.animals.map(a=>({id:a.id,species:a.species,status:a.status,x:a.x,z:a.z}))}:null,plants:state.plants.map(p=>({id:p.id,growth:p.growth,water:p.water,alive:p.alive})),workers:state.workers.map(w=>({id:w.id,status:w.status,taskId:w.taskId,x:w.x,z:w.z}))});}
  const stage=document.querySelector('#stage'),size=`${stage.clientWidth}:${stage.clientHeight}`;
  if(size!==hudSize){hudSize=size;const dims=layoutHud(stage);if(frameImages&&document.querySelector('#hiring-dialog'))framePaint(document.querySelector('#modal'),dims,frameImages);}
  document.querySelector('#clockValue').textContent=Game.clockLabel(state);
  document.querySelector('#moneyValue').textContent=localMoney(state.ledger.balance);
  document.querySelector('#dayValue').textContent=`Día ${state.day}`;
  document.querySelector('#days').title=`${state.completedNights}/100 noches superadas`;
  const toolbar=document.querySelector('#toolbar');
  if(!toolbar.children.length||force) {
    toolbar.innerHTML=`${button('center-action','⌂ Centro · 800')}${button('plant-action','✿ Cultivos')}${button('wall-action','▥ Defensas')}${button('spell-action','✧ Magias')}${button('focus-action','◎ Centro de trabajo')}${state.postgame?button('village-action','⌂ Nuevo poblado'):''}`;
    bind('center-action',()=>{armTool({kind:'center'});hideHudPanel();});bind('plant-action',()=>toolPanel('plant'));bind('wall-action',()=>toolPanel('wall'));bind('spell-action',()=>toolPanel('spell'));bind('focus-action',()=>world.focusFarm());
    bind('village-action',villageCulturePanel);
  }
  document.querySelector('#center-action').disabled=!permission(state,'center');document.querySelector('#plant-action').disabled=!permission(state,'plant');document.querySelector('#wall-action').disabled=!permission(state,'wall');document.querySelector('#spell-action').disabled=!permission(state,'shield');
  if(surfaces.active==='panel'&&!document.querySelector('#panel').children.length)surfaces.active=null;
  contextPanel();const activeTutorial=narrator();
  renderConfirmedNotices(activeTutorial,now);
  if(!state.pauses.includes('hiring'))surfaces.deferred.delete('hiring');
  if(state.pauses.includes('hiring')&&surfaces.shouldOpen('hiring',{mandatory:true}))hiringDialog();
  renderResultAvailability();
  refreshCommandFeedback();
}
function refreshCommandFeedback(){
  const selecting=tool?.kind==='awakening',draft=selecting&&tool.targetId?(world?.workerGpuOnly?tool.confirmedDraft??null:Game.previewBlessing(state,tool.targetId)):null;
  const label=selecting?(draft?.valid?(draft.kind==='plant'?'Bendecir planta · fuente permanente':'Bendecir muralla · protección permanente'):'Selecciona una planta o muralla'):null;
  const message=draft&&!draft.valid?draft.reason:commandFeedback||(draft?.valid?awakeningSelectionCopy(draft.kind):selecting?'Toca una planta o muralla. Cancelar conserva la carga.':'');
  renderCommandFeedback(document,{label,message,
    confirmation:draft?{label:'Bendecir',disabled:!draft.valid||!permission(world?.workerGpuOnly?world.confirmedHud?.rules??state:state,'awakening')||!!world?.pendingAwakening,onConfirm:()=>safe(confirmAwakening)}:null,
    onCancel:()=>{cancelTool();updateUI(true);},onDismiss:()=>{commandFeedback='';updateUI(true);}});
}
function awakeningSelectionCopy(kind){return kind==='plant'?
  'Cultivos próximos: +20 % de crecimiento y valor base. Esta planta no se cosecha.':
  'Muralla: −25 % de daño propio y −10 % en secciones contiguas.';}

function buildPanel(){
  if(state.pauses.includes('hiring'))return;
 cancelTool();
 showHudPanel('Construir',`<div class="card-grid two"><button class="choice-card" id="native-center"><img class="card-image" src="${ASSETS.home_icon.src}" alt=""><strong>Centro de trabajo</strong><span class="price">800 monedas</span></button><button class="choice-card" id="native-wall"><img class="card-image" src="${ASSETS.event8.src}" alt=""><strong>Murallas</strong></button></div><div class="menu-list">${state.postgame?button('native-village','Fundar poblado','wood-button'):''}</div>`);
 bind('native-center',()=>{const owner=world,button=document.querySelector('#native-center'),version=++cropSelectionGeneration,current=()=>owner===world&&version===cropSelectionGeneration&&button?.isConnected;if(owner?.workerGpuOnly){owner.webGpuWorld.client.prepareStructure('center',state.culture).then(()=>{if(current()){armTool({kind:'center'});hideHudPanel();}},failure=>{if(current())error(failure.message);});}else{armTool({kind:'center'});hideHudPanel();}});bind('native-wall',()=>toolPanel('wall'));bind('native-village',villageCulturePanel);bind('native-close',()=>document.querySelector('#panel').innerHTML='');
 document.querySelector('#native-center').disabled=!permission(state,'center');document.querySelector('#native-wall').disabled=!permission(state,'wall');
}
function cancelVillagePreview(){world?.clearVillagePreview();pendingVillage=null;if(tool?.kind==='village')tool=null;hideHudPanel();}
async function villageCulturePanel() {
  if(state.pauses.includes('hiring'))return;
  const owner=world,ownerState=state,version=++cropSelectionGeneration,culture=ownerState.culture,payload=villageCatalog.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));await owner.ensureVillage(culture,payload);if(owner!==world||ownerState!==state||version!==cropSelectionGeneration)return;armTool({kind:'village',culture});hideHudPanel();
}
function villageConfirmPanel() {
  if(state.pauses.includes('hiring'))return;
  const p=pendingVillage,unavailable=!!world.workerRuntime&&!(world.workerGpuOnly||import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-village'));showHudPanel('Fundar poblado',`<div><p>${p.pending?'Comprobando ubicación…':p.valid?'Ubicación válida':'Ubicación inválida: '+esc(p.reason)}</p><p>${formatWholeCoins(p.cost,moneyLocale())} monedas. Toca otra posición para recolocar.</p>${unavailable?'<p>La fundación aún no está disponible en esta partida experimental.</p>':''}${button('found-village','Confirmar poblado')}${button('cancel-village','Cancelar')}</div>`);document.querySelector('#found-village').disabled=unavailable||!p.valid||!permission(state,'village');
  let submitting=false;bind('found-village',async()=>{if(submitting)return;submitting=true;const button=document.querySelector('#found-village');if(button)button.disabled=true;try{const owner=world,ownerState=state,payload=villageCatalog.find(v=>v.id===(p.culture==='saheliana'?'saheliano':p.culture));if(owner.workerRuntime){if(!owner.workerGpuOnly&&(!import.meta.env.DEV||!new URLSearchParams(location.search).has('qa-worker-village')))throw Error('La fundación de poblados aún no está disponible en el modo experimental Worker.');ensureWorkerSave(owner,ownerState);const result=await owner.workerRuntime.submit({kind:'foundVillage',id:commandId(),culture:p.culture,x:p.x,z:p.z,payload});if(owner!==world||ownerState!==state)return;if(result.rejection)throw Error(result.rejection);if(!result.value)return;if(pendingVillage===p){const founded=result.events?.find(event=>event.type==='VillageFounded');if(owner.workerGpuOnly&&founded?.targetId)owner.webGpuWorld?.client.confirmVillagePreview(founded.targetId);else owner.clearVillagePreview();pendingVillage=null;tool=null;hideHudPanel();}owner.syncResidentProps();await owner.workerSave();if(owner===world&&ownerState===state)updateUI(true);return;}Game.foundVillage(ownerState,commandId(),p.culture,p.x,p.z,payload,nav);owner.clearVillagePreview();pendingVillage=null;tool=null;hideHudPanel();await save();owner.syncResidentProps();}finally{submitting=false;if(button?.isConnected)button.disabled=unavailable||!p.valid||!permission(state,'village');}});bind('cancel-village',cancelVillagePreview);
}
function repairStructure(targetId,{persist=false}={}){
  const owner=world,ownerState=state,runtime=owner.workerRuntime;if(!runtime){const value=Game.requestRepair(state,commandId(),targetId);if(persist)save();return value;}
  ensureWorkerSave(owner,ownerState);
  return owner.workerRuntime.submit({kind:'requestRepair',id:commandId(),targetId}).then(async result=>{if(owner!==world||ownerState!==state)return;if(result.rejection)throw Error(result.rejection);if(result.value&&persist)await owner.workerSave();if(owner===world&&ownerState===state)updateUI(true);return result.value;});
}
function removeSelectedWall(targetId){
  const owner=world,ownerState=state,runtime=owner.workerRuntime;if(!runtime){Game.removeWall(state,commandId(),targetId,nav);selection=null;save();return;}
  ensureWorkerSave(owner,ownerState);
  return owner.workerRuntime.submit({kind:'removeWall',id:commandId(),targetId}).then(async result=>{if(owner!==world||ownerState!==state)return;if(result.rejection)throw Error(result.rejection);if(result.value){if(selection===targetId)selection=null;await owner.workerSave();}if(owner===world&&ownerState===state)updateUI(true);});
}
function contextPanel() {
  const view=world?.workerGpuOnly?world.actorAudio??state:state,el=document.querySelector('#context');if(!view.structures.some(s=>s.id===selection)){selection=null;el.replaceChildren();if(surfaces.active==='context'){surfaces.active=null;uiAudio.close({silent:true});}return;}if(surfaces.active!=='context')openSurface('context');const scroll=el.querySelector('.context')?.scrollTop??0;const p=view.plants.find(p=>p.id===selection&&p.alive),structure=view.structures.find(s=>s.id===selection);
  const key=JSON.stringify(p?[p.id,Math.floor(p.growth/cropSpec(p.species).growth_seconds*100),p.water.map(w=>w.status),p.harvestRequested,p.centerId,permission(view,'harvest')]:structure?[structure.id,structure.hp,structure.status,permission(view,'wall')]:null);if(el.dataset.key===key&&el.children.length)return;el.dataset.key=key;
  if(p) {selection=null;el.replaceChildren();return;  } else if(structure) {
    el.innerHTML=`<div class="context"><h3>${structure.kind==='center'?'Centro de trabajo':structure.gate?'Puerta':'Defensa'}</h3><p>${structure.status==='ruined'?'Ruinas':`${structure.hp}/${structure.maxHp} PV`}</p>${structure.hp<structure.maxHp?button('repair-action','Solicitar reparación'):''}${structure.kind==='wall'?button('remove-wall',structure.status==='ruined'?'Retirar escombros':'Eliminar muralla · +'+localMoney(Game.wallRefund(structure))+' monedas'):''}${button('close-context','Cerrar','ghost')}</div>`;bind('repair-action',()=>repairStructure(structure.id));
    bind('remove-wall',()=>removeSelectedWall(structure.id));if(document.querySelector('#remove-wall'))document.querySelector('#remove-wall').disabled=!permission(view,'wall');
  } else el.innerHTML='';if(el.querySelector('.context'))el.querySelector('.context').scrollTop=scroll;bind('close-context',closeSurface);
}
function setTutorialInteraction(blocking){
  if(blocking&&!tutorialInert){
    tutorialFocus=document.activeElement;tutorialInert=new Map();
    for(const child of document.querySelector('#stage')?.children??[])if(child.id!=='narrator'){tutorialInert.set(child,child.inert);child.inert=true;}
  }else if(!blocking&&tutorialInert){
    for(const [child,inert] of tutorialInert)child.inert=inert;tutorialInert=null;
    if(tutorialFocus?.isConnected&&!tutorialFocus.closest('#narrator'))tutorialFocus.focus({preventScroll:true});tutorialFocus=null;
  }
}
const budgetWarningVisible=()=>performance.now()<budgetWarningUntil&&(!tutorialMessageShownToday(state,'budget.reserve')||guardian?.key?.startsWith('budget.reserve:'))||guardian?.key?.startsWith('budget.reserve:')&&guardian.voice?.active;
function refreshTutorialGuidance(){
  const warning=budgetWarningVisible(),message=tutorial?.presentation({record:false});
  const guidePanel=surfaces.active==='panel'&&['basic.center','basic.plant'].includes(state.tutorial.reading);
  const guideAllowed=(!surfaces.active||guidePanel)&&!warning&&!state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p));
  hudHand??=new TutorialHudGuide(document.querySelector('#stage'));hudHand.show(guideAllowed?(guidePanel?(state.tutorial.reading==='basic.center'?'#native-center':'[data-crop]'):tutorialHudHandTarget(world?.workerGpuOnly?world.actorAudio??state:state,message,tool?.kind,tool?.spell)):null);
  const guidedStep=['magic.growth','magic.multiply'].includes(message?.id)||message?.id==='basic.'+state.tutorial.step||state.tutorial.guideAfterAuto?.includes('basic.'+state.tutorial.step);
  world.tutorialToolKind=tool?.kind??null;world.tutorialSpellKind=tool?.spell??null;world.tutorialHandsEnabled=guideAllowed&&guidedStep;
  guardian?.setGuide(hudHand.rect);
  let worldTarget=false;
  if(world.qaEarlyTutorial){const owner=world,ownerState=state,kind=tool?.kind,spell=tool?.spell??null,eligible=guideAllowed&&guidedStep&&['center','plant','spell'].includes(kind),targetNeeded=workerTutorialTargetNeeded({experimental:owner.experimentalTutorialGuide===true,dev:import.meta.env.DEV,qa:import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-game')}),keyOf=()=>JSON.stringify([tool?.kind,tool?.spell??null,state.tutorial.step,state.tutorial.reading,state.tutorial.guideAfterAuto,state.tutorial.dismissed,state.day,state.result,!!state.raid,state.villages,state.structures,state.plants,state.events.at(-1)?.id??null]),key=eligible&&targetNeeded&&!(owner.experimentalTutorialGuide===true&&owner.authoritativeGuardianPlacement&&owner.webGpuWorld?.client)?keyOf():null;
    const client=owner.webGpuWorld?.client;
    if(owner.experimentalTutorialGuide===true&&owner.authoritativeGuardianPlacement&&client){
      const guideKey=()=>JSON.stringify([tool?.kind??null,tool?.spell??null,owner.guardianScreenExclusions?.()??[]]);
      if(owner.workerTutorialGuideClient!==client){owner.workerTutorialGuide?.dispose();owner.workerTutorialGuideClient=client;owner.workerTutorialGuide=createWorkerTutorialGuide({client,runtime:owner.workerRuntime,isCurrent:()=>owner===world&&ownerState===state&&!owner.disposed&&owner.webGpuWorld?.client===client,keyNow:()=>owner.tutorialGuideBaseKey?guideKey()+JSON.stringify(webGpuCameraPose(owner.camera,owner.controls)):null,trackRevision:true,exclusions:()=>owner.guardianScreenExclusions?.()??[],onConfig:config=>{if(owner===world&&ownerState===state)owner.qaTutorialGuide={key:owner.tutorialGuideBaseKey,config};}});}
      owner.tutorialGuideBaseKey=eligible?guideKey():null;const cameraKey=owner.tutorialGuideBaseKey?owner.tutorialGuideBaseKey+JSON.stringify(webGpuCameraPose(owner.camera,owner.controls)):null;owner.workerTutorialGuide.update({key:cameraKey,toolKind:kind,toolSpell:spell});
    }else if(import.meta.env.DEV&&targetNeeded&&owner.qaTutorialGuide?.key!==key){const request=owner.qaTutorialGuide={key,config:null,sequence:owner.workerRuntime.status().confirmedSequence};if(key)owner.workerRuntime.submit({kind:'tutorialGuideTarget',toolKind:kind,toolSpell:spell}).then(result=>{if(owner!==world||ownerState!==state||owner.qaTutorialGuide!==request)return;if(keyOf()!==request.key||owner.workerRuntime.status().confirmedSequence!==result.sequence){owner.qaTutorialGuide=null;updateUI(true);return;}request.config=result.value??null;request.sequence=result.sequence;updateUI(true);},failure=>{if(owner===world&&owner.qaTutorialGuide===request){owner.qaTutorialGuide=null;error(failure.message);}});}
    // The visual guide stays disabled until camera exclusion is complete.
  }

  else worldTarget=!!(guideAllowed&&!world.workerGpuOnly&&world.tutorialGuideTarget());
  const targets={hudTarget:!!hudHand.visible,worldTarget,selectionOpen:surfaces.active==='panel'&&guidedStep};
  if(!world.workerRuntime)syncTutorialActionPause(state,targets);
  else{
    const owner=world,ownerState=state,key=JSON.stringify([targets,state.day,state.pauses,state.result,state.tutorial.basicSkipped,state.tutorial.step,state.tutorial.reading]);
    if(workerTutorialGuidance.get(owner)!==key){workerTutorialGuidance.set(owner,key);owner.workerRuntime.submit({kind:'tutorialActionPause',...targets}).catch(failure=>{if(workerTutorialGuidance.get(owner)===key)workerTutorialGuidance.delete(owner);if(owner===world&&ownerState===state)error(failure.message);});}
  }
}
function ensureGuardianView() {
  const el=document.querySelector('#narrator');guardian??=new NativeGuardian(el,e=>error(e.message),phase=>audio.guardianPhase(phase),new SpiritVoice({url:assetUrl,volume:()=>settings.sfx}));
  return guardian;
}
function narrator() {
  ensureGuardianView();
  tutorial?.update();const warning=budgetWarningVisible();const message=surfaces.active&&!(surfaces.active==='panel'&&['basic.center','basic.plant','magic.growth','magic.multiply'].includes(state.tutorial.reading))?null:warning?{id:'budget.reserve',gesture:'warning',text:RESERVE_MESSAGE,blocking:false}:tutorial?.presentation();setTutorialInteraction(false);
  refreshTutorialGuidance();
  if(!message){guardian.hide({immediate:state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p))});return null;}
  if(!world.workerRuntime)recordTutorialMessageToday(state,message.id);
  const advance=message.reading?()=>safe(()=>{tutorial.dismiss({automatic:true,message});save();}):null;
  guardian.show({key:message.id+':'+(message.reading?'reading':'action')+':'+(message.variant??''),text:message.text,gesture:message.gesture,blocking:message.blocking,result:message.result,advance,onVoiceEnded:()=>safe(()=>{if(warning)budgetWarningUntil=0;else tutorial.dismiss({automatic:true,message});save();}),dismiss:()=>safe(()=>{if(warning)budgetWarningUntil=0;else tutorial.dismiss({message});save();}),
    skip:message.canSkip?()=>safe(()=>{tutorial.skipBasic();save();}):null});
  return message;
}
function hiringDialog(centerId=null) {
  const additional=centerId!==null;
  if(!openSurface(additional?'modal':'hiring',additional?'additional-hiring':undefined))return;
  if(additional)changeSimulationPause(true,'menu');
  const selection=additional?{}:{...state.hiringSelection},modal=document.querySelector('#modal');
  modal.innerHTML=`<div class="overlay native-hiring" id="hiring-dialog">${hiringMarkup({day:state.day,clock:Game.clockLabel(state),hiring:{hasPrevious:state.day>1,draft:NPC_TYPES.map(p=>selection[p.id]??0)}})}</div>`;
  const agricultural=agriculturalDawnMessage(state);
  if(agricultural&&!additional){const announcement=document.createElement('p');announcement.className='hiring-intro';announcement.id='hiringAgriculturalNotice';announcement.role='status';announcement.textContent=agricultural;document.querySelector('#hiringIntro').before(announcement);}
  const stage=document.querySelector('#stage');stage.classList.add('hiring-open');
  if(additional){
    document.querySelector('#hiringTitle').textContent='Ampliar el equipo';
    document.querySelector('.panel-subtitle').textContent='Jornada en curso';
    document.querySelector('#hiringIntro').textContent='Contrata más personas para este centro. Pagas solo la parte de su jornada que queda, redondeada hacia arriba.';
    const close=document.createElement('button');close.id='close-additional-hiring';close.textContent='Cerrar';document.querySelector('.hiring-footer').append(close);close.onclick=closeSurface;
    const center=state.structures.find(s=>s.id===centerId);if(center.hp<center.maxHp){const repair=document.createElement('button');repair.textContent='Solicitar reparación';document.querySelector('.hiring-footer').append(repair);repair.onclick=()=>safe(()=>{closeSurface();return repairStructure(centerId,{persist:true});});}
    for(const [i,p] of NPC_TYPES.entries()){
      const card=document.querySelector(`[data-crew-card="${i}"]`),shift=card.querySelector('.hire-shift span');shift.textContent=Game.clockLabel(state)+'–'+shift.textContent.split('–')[1];
      if(state.time>=PROFILES.find(profile=>profile.id===p.id).end){const input=document.querySelector(`#crewCount${i}`);input.disabled=true;document.querySelectorAll(`[data-crew-step="${i}"]`).forEach(button=>button.disabled=true);}
    }
  }
  const refresh=()=>{
    for(const [i,p] of NPC_TYPES.entries())selection[p.id]=Number(document.querySelector(`#crewCount${i}`).value);
    if(!additional&&!world.workerRuntime)state.hiringSelection={...selection};
    try {const available=numberOf(state.ledger.balance),{cost,canConfirm,message}=hiringConfirmation(selection,available,additional?{time:state.time}:{});document.querySelector('#hireAvailable').textContent=localMoney(state.ledger.balance);document.querySelector('#hireCost').textContent=cost.toLocaleString(window.WildGuardiansLanguage?.locale()??'en-US');document.querySelector('#hireBalance').textContent=(available-cost).toLocaleString(window.WildGuardiansLanguage?.locale()??'en-US');document.querySelector('#hireConfirm').disabled=!canConfirm;document.querySelector('#hireBudgetMessage').textContent=message;}
    catch(e){document.querySelector('#hireConfirm').disabled=true;document.querySelector('#hireBudgetMessage').textContent=e.message;}
  };
  document.querySelectorAll('[data-crew-step]').forEach(el=>el.onclick=()=>{const input=document.querySelector(`#crewCount${el.dataset.crewStep}`);input.value=Math.max(0,Number(input.value)+Number(el.dataset.delta));refresh();});document.querySelectorAll('[data-crew-count]').forEach(el=>el.oninput=refresh);
  document.querySelector('[data-hire="clear"]').onclick=()=>{document.querySelectorAll('[data-crew-count]').forEach(el=>el.value=0);refresh();};
  bind('hireConfirm',()=>{if(!hiringConfirmation(selection,numberOf(state.ledger.balance),additional?{time:state.time}:{}).canConfirm)return;
    const owner=world,ownerState=state,runtime=owner.workerRuntime;if(!runtime){additional?Game.hireAdditional(state,commandId(),selection,centerId):Game.hire(state,commandId(),selection);closeSurface();save();audio.gameplay(state.day).catch(()=>{});return;}
    ensureWorkerSave(owner,ownerState);
    const button=document.querySelector('#hireConfirm');button.disabled=true;const command={kind:additional?'hireAdditional':'hire',id:commandId(),selection:{...selection},...(additional?{centerId}:{})};
    return owner.workerRuntime.submit(command).then(async result=>{if(owner!==world||ownerState!==state)return;if(result.rejection)throw Error(result.rejection);if(result.value===false){refresh();return;}closeSurface();await owner.workerSave();if(owner===world&&ownerState===state){audio.gameplay(state.day).catch(()=>{});updateUI(true);}}).catch(failure=>{if(owner===world&&ownerState===state&&button.isConnected)refresh();throw failure;});
  });refresh();
  paintPanelFrame(modal,stage,'No se ha podido cargar el marco de contratación.');
}
window.addEventListener('resize',()=>{if(screen==='game')layoutHud(document.querySelector('#stage'));});
function pauseDialog() {
  if(!openSurface('modal','pause'))return;
  changeSimulationPause(true,'menu',{sound:true});document.querySelector('#modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true"><h2>Un respiro</h2><p>El tiempo se detiene mientras escuchas al poblado.</p><div class="menu-actions">${button('resume','Volver a la finca')}${button('save','Guardar partida')}${button('game-settings','Ajustes')}${button('exit','Guardar y volver al menú')}</div></section></div>`;
  bind('resume',closeSurface);bind('save',()=>save({confirm:true}));bind('game-settings',()=>settingsDialog(true));bind('exit',menu);
}
function settingsDialog(inGame=false) {
  const html=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true"><h2>A tu ritmo</h2><label class="settings-row">Idioma<select data-language-select id="game-language"><option value="en">English</option><option value="es">Español</option></select></label><label class="settings-row">Sonidos<input id="sfx-volume" type="range" min="0" max="1" step=".05" value="${settings.sfx}"></label><label class="settings-row">Música<input id="music-volume" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><label class="settings-row">Microeventos<select id="microevent-frequency">${[['off','Desactivados'],['low','Baja'],['adaptive','Adaptativa'],['high','Alta']].map(([id,label])=>`<option value="${id}" ${settings.microevents===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="settings-row">Calidad<select id="quality">${[['muy_baja','Muy baja'],['baja','Baja'],['media','Media'],['alta','Alta']].map(([id,label])=>`<option value="${id}" ${settings.quality===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="settings-row">Resolución del mundo<select id="world-resolution">${WORLD_RESOLUTIONS.map(([id,label])=>`<option value="${id}" ${settings.resolution===id?'selected':''}>${label}</option>`).join('')}</select></label><p>Reduce la nitidez del mundo 3D; el HUD conserva su resolución.</p><div class="dialog-actions">${button('close-settings','Volver')}</div></section></div>`;
  if(inGame){if(!openSurface('modal','settings'))return;document.querySelector('#modal').innerHTML=html;}else {const el=document.createElement('div');el.id='settings-overlay';el.innerHTML=html;app.append(el);}
  document.querySelector('#game-language').value=window.WildGuardiansLanguage.getLanguage();
  for(const id of ['sfx-volume','music-volume','quality','world-resolution','microevent-frequency'])document.getElementById(id).oninput=()=>{settings.microevents=document.querySelector('#microevent-frequency').value;installMicroevents();settings.sfx=Number(document.querySelector('#sfx-volume').value);settings.music=Number(document.querySelector('#music-volume').value);const previous=settings.quality;settings.quality=document.querySelector('#quality').value;settings.resolution=worldResolution(document.querySelector('#world-resolution').value);if(world)applyWorldResolution(world,settings.resolution);localStorage.setItem('wild-guardians:settings',JSON.stringify(settings));audio.volume();guardian?.voice?.refreshVolume();dialogVoice.refreshVolume();if(world&&previous!==settings.quality){world.qualitySetting(settings.quality);if(!world.workerGpuOnly)world.syncChunks();}};
  bind('close-settings',()=>inGame?pauseDialog():document.querySelector('#settings-overlay').remove());
}
function resultDialog() {
  openSurface('result');
  const won=state.result==='victory';changeSimulationPause(true,'result');document.querySelector('#modal').innerHTML=`<div class="overlay"><section class="dialog" id="result-dialog" role="dialog" aria-modal="true"><div class="eyebrow">El Espíritu</div><h2>${won?'La tierra respira libre':'Otra semilla, otro comienzo'}</h2><p>${won?'Resististe cien noches. La oscuridad ya no muerde: puedes seguir cultivando y fundar nuevos poblados en paz.':esc(guardianCopy(state.messages.at(-1)?.text??'Faltan recursos para alimentar otro mañana.'))}</p><div class="dialog-actions">${button('close-result','Cerrar','ghost')}${button('result-menu','Volver al menú')}${won?button('continue','Seguir en este mundo'):button('retry','Nueva partida')}</div></section></div>`;
  narrateResultDialog();
  bind('close-result',closeSurface);bind('result-menu',menu);bind('retry',async()=>{if(!await save())return;state=null;clearWorld();newGameScreen();});bind('continue',async()=>{const owner=world,ownerState=state;if(owner?.workerRuntime)await owner.workerRuntime.submit({kind:'continuePostgame'});else{Game.resume(state,'result');Game.continuePostgame(state);}if(owner!==world||ownerState!==state)return;closeSurface();await save();});
}
function narrateResultDialog(){
  const paragraph=document.querySelector('#result-dialog p');if(!paragraph)return;
  const language=window.WildGuardiansLanguage?.getLanguage()??'en';
  const source=state.result==='victory'?'Resististe cien noches. La oscuridad ya no muerde: puedes seguir cultivando y fundar nuevos poblados en paz.':guardianCopy(state.messages.at(-1)?.text??'Faltan recursos para alimentar otro mañana.');
  const rendered=window.WildGuardiansLanguage?.translate(source,language)??source;
  paragraph.setAttribute('data-no-i18n','');paragraph.textContent=rendered;
  dialogVoice.play(spiritVoice(rendered,language),()=>safe(()=>{tutorial?.dismiss({automatic:true});closeSurface();save();}));
}
function libraryScreen() {
  clearWorld();screen='library';app.innerHTML=`<main class="screen"><header class="topbar"><div class="brand">Biblioteca</div>${button('back','← Volver','ghost')}</header><h2>Los archivos del poblado</h2><p class="muted">Laboratorios originales aislados de tus partidas. Los recursos se cargan al abrir cada demostración.</p><div class="library-grid">${[['crops','Cultivos','Ocho especies, cinco etapas y transiciones locales.'],['walls','Bastión','Materiales, puertas reforzadas y estados de daño.'],['destruction','Destrucción','Daño normalizado y colapso de los edificios.'],['sfx','Sonidos','126 sonidos originales, con usos y reservas documentados.']].map(([id,title,description])=>`<article class="library-card"><h3>${title}</h3><p class="muted">${description}</p><button data-demo="${id}">Abrir demostración →</button></article>`).join('')}</div><p class="muted">Modelos originales Meshy · Audio original ElevenLabs y paquetes musicales suministrados · Ga Maamli y Banga bajo SIL OFL.</p></main>`;
  bind('back',menu);document.querySelectorAll('[data-demo]').forEach(el=>el.onclick=()=>{libraryViewer=new LibraryViewer(app,el.dataset.demo,{onBack:libraryScreen,onMenu:menu});});
}
document.addEventListener('visibilitychange',()=>{world?.webGpuWorld?.client?.setPresentationVisibility?.(document.hidden);if(state){if(document.hidden){changeSimulationPause(true,'hidden');guardian?.hide({immediate:true});dialogVoice.stop();campaignCinema?.voice.pause();audio.suspend();}else {changeSimulationPause(false,'hidden');lastFrame=performance.now();audio.resume();if(campaignCinema?.active)campaignCinema.voice.play().catch(()=>{});else narrateResultDialog();}}});
document.addEventListener('keydown',e=>hudShortcut(e,document,{enabled:screen==='game'&&!!state&&!starting&&!campaignCinema?.active&&!tutorial?.presentation({record:false})?.blocking&&!document.querySelector('#modal')?.children.length}));
document.addEventListener('keydown',e=>{if(leaving)return;if(e.key==='Escape'&&campaignCinema?.active){e.preventDefault();campaignCinema.finish();return;}if(e.key==='Escape'&&state&&screen==='game'&&!starting){if(tutorial?.presentation({record:false})?.blocking){tutorial.dismiss({automatic:true});save();}else if(surfaces.active){closeSurface();}else if(tool){world?.cancelTutorialFocus?.();tool=null;commandFeedback='';hideHudPanel();}else if(state.pauses.includes('menu')){changeSimulationPause(false,'menu');document.querySelector('#modal').innerHTML='';}else pauseDialog();updateUI(true);}});
document.addEventListener('pointerdown',()=>{if(campaignCinema?.active)return;audio.unlock().then(()=>screen==='loading'?loadingAudio?.start():screen==='menu'?audio.menu():state?audio.gameplay(state.day):null).catch(()=>{});});
window.addEventListener('pagehide',()=>{guardian?.voice?.dispose();dialogVoice.dispose();});
window.addEventListener('wild-guardians:language-change',()=>{if(state){dialogVoice.stop();if(guardian){guardian.voice?.stop();guardian.key=null;}updateUI(true);narrateResultDialog();}const draft=document.querySelector('#hireConfirm');if(draft){document.querySelector('#crewCount0').dispatchEvent(new Event('input'));for(const [i,profile] of NPC_TYPES.entries()){const pace=document.querySelector(`[data-crew-card="${i}"] .hire-stats b`);if(pace)pace.textContent='×'+profile.speed.toLocaleString(moneyLocale(),{minimumFractionDigits:2,maximumFractionDigits:2});}}});
window.addEventListener('beforeunload',()=>{screenWakeLock.dispose();if(state)save();});
function updateRaidLoading(){
  if(world.actorsReady()){raidLoading?.remove();raidLoading=null;return;}
  if(raidLoading)return;
  raidLoading=document.createElement('div');raidLoading.id='raid-loading';raidLoading.setAttribute('role','status');raidLoading.textContent='Cargando…';
  raidLoading.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:25;background:#17261eee;color:white;padding:16px;border-radius:12px;pointer-events:none';
  document.querySelector('#stage').append(raidLoading);
}
function frame(now) {
  if(globalFrameSchedulerEnabled())globalFrameScheduler.beginFrame(now);

  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-microevents')&&screen==='game')recordMicroeventFrame(world?.canvas,now-lastFrame,{off:settings.microevents==='off',event:!!microevents?.active,blocked:!!state?.pauses.length||microevents?.qaFrozen||document.hidden});
  requestAnimationFrame(frame);if(cropSpellFrameQa&&globalThis.__wildSpellFrameManual)return;if(preparedLoading?.world.loadingCpuBudget)preparedLoading.world.loadingPresentationEpoch=(preparedLoading.world.loadingPresentationEpoch??0)+1;if(screen==='loading'&&world?.loadingCpuBudget)world.loadingPresentationEpoch=(world.loadingPresentationEpoch??0)+1;const dt=frameDelta(now,lastFrame);lastFrame=now;

  if(screen==='loading'&&loadingDiorama?.prepared){
    progressQa?.frame(now);
    try{
      if(progressQa)progressQa.invocation('presentation-progress-refresh',()=>loadingProgress?.refresh());else loadingProgress?.refresh();
      if(loadingCinema?.armed){if(progressQa)progressQa.invocation('presentation-cinematic-step',()=>loadingCinema.step(dt));else loadingCinema.step(dt);}
      else{if(progressQa)progressQa.invocation('presentation-diorama-render',()=>loadingDiorama.render(dt,loadingDiorama.loadingReady?1:loadingProgress?.value??0,{ready:loadingDiorama.loadingReady??false}));else loadingDiorama.render(dt,loadingDiorama.loadingReady?1:loadingProgress?.value??0,{ready:loadingDiorama.loadingReady??false});if(loadingMature&&loadingDiorama.plants.mature){loadingMature.resolve();loadingMature=null;}}
      if(progressQa)progressQa.invocation('presentation-overlay-refresh',refreshLoadingOverlay);else refreshLoadingOverlay();
    }catch(e){loadingProgress?.fail(e);cancelLoading(e);}
  }
  if(screen==='game'&&world?.workerGpuOnly&&state){if(campaignCinema)return;if(runtimeErrorWorld!==world&&!state.pauses.includes('runtime-error'))try{if(world.qaEarlyTutorial){tutorial?.update();tutorial?.advance(dt,{visible:!guardian?.voice?.active&&!surfaces.active&&!document.hidden&&!state.pauses.includes('menu')&&now>=budgetWarningUntil});}world.updateCamera();world.stepRaidCamera?.(dt);if(microevents){microevents.tick();syncWorkerNightSpeed(world.workerRuntime,!!microevents.holdsNightSpeed);}world.webGpuWorld?.syncVisual(world.presentationDraw);updateGameAudio({audio,state,world,nav,emptyEvents:NO_CONFIRMED_EVENTS,actorState:world.actorAudio??state});updateUI();if(!campaignCinema)juice?.update(world.actorAudio??state);if(world.qaEarlyTutorial)guardian?.update();if(world.experimentalTutorialGuide===true){const narration=world.guardianNarration?.();world.webGpuWorld?.client.setGuardianNarration(narration?.record??null,narration?.audio??null);}}catch(e){const owner=world;runtimeErrorWorld=owner;owner.workerRuntime?.submit({kind:'pause',reason:'runtime-error'}).catch(failure=>{if(owner===world)error(failure.message);});guardian?.hide({immediate:true});dialogVoice.stop();error(e.message);console.error(e);}return;}
  if(screen==='game'&&world&&state&&runtimeErrorWorld!==world&&!state.pauses.includes('runtime-error')) {
    ensureWorkerTutorial();
    const eventIndex=state.events.at(-1)?.id;

    try {if(!campaignCinema?.active){tutorial?.update();if(tutorial?.advance(dt,{visible:!guardian?.voice?.active&&!surfaces.active&&!document.hidden&&!state.pauses.includes('menu')&&now>=budgetWarningUntil}))save();refreshTutorialGuidance();microevents?.beforeSimulation();syncWorkerNightSpeed(world.workerRuntime,!!microevents?.holdsNightSpeed);if(!world.workerRuntime&&world.actorsReady()&&!(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-microevents-fixture')))Game.advanceReal(state,dt,nav,{nightFastForward:!microevents?.holdsNightSpeed});tutorial?.update();const directEvents=world.workerRuntime?.confirmedEventDelivery&&world.confirmedEventsSeeded;juice?.process(state,directEvents?NO_CONFIRMED_EVENTS:null);if(gameplayGpuQa)gameplayGpuQa.frame(now,world.renderer,()=>world.render(dt));else renderWithOptionalWebGpuPresentation(world,dt,skipLegacyDrawQa);world.webGpuWorld?.sync();updateRaidLoading();updateGameAudio({audio,state,world,nav,emptyEvents:NO_CONFIRMED_EVENTS});updateUI();guardian?.setWorldPresence((world.guardianSummons?.stats.active??0)>0,world.guardianSummons?.guideScreenPosition());guardian?.update();juice?.update(state);}}

    catch(e){const owner=world;runtimeErrorWorld=owner;if(owner.workerRuntime)owner.workerRuntime.submit({kind:'pause',reason:'runtime-error'}).catch(failure=>{if(owner===world)error(failure.message);});else Game.pause(state,'runtime-error');guardian?.hide({immediate:true});dialogVoice.stop();error(e.message);console.error(e);}
    if(!world.workerRuntime?.confirmedEventDelivery&&autosaveEventAfter(state.events,eventIndex))save();
  }
  if(globalFrameSchedulerEnabled())globalFrameScheduler.endFrame();
}
async function boot() {try {await window.WildGuardiansLanguageReady;[selector,thumbnails]=await Promise.all([json('/content/selector.json'),json('/content/crop-thumbnails.json')]);if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-load-slot')){requestAnimationFrame(frame);await startGame(null,{slotId:new URLSearchParams(location.search).get('qa-worker-load-slot')});}else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-raid')){requestAnimationFrame(frame);await startGame(await json('/docs/guardian/phase2/performance-components/native-raid-snapshot.json'));}else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-worker-start')){requestAnimationFrame(frame);await startGame();}else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-microevents-fixture')){requestAnimationFrame(frame);const fixture={wood:'microevent-wood',wet:'microevent-wet',rocks:'microevent-rocks'}[new URLSearchParams(location.search).get('qa-microevents-fixture')]??'microevent-world';await startGame(await json('/tests/fixtures/'+fixture+'.json'));}else{menu();requestAnimationFrame(frame);}}catch(e){app.textContent='No se pudo iniciar Wild Guardians: '+e.message;}}
boot();
