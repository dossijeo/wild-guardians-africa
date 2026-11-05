import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {WorldScene} from '../rendering/scene.js';
import {approvedVisualSearch} from '../rendering/approved-visual-profile.js';
import {nativeRenderResolution} from '../rendering/render-quality.js';
import {configureTerrainControls,installTerrainCameraIntent} from '../rendering/terrain-camera.js';
import {WallDrawing} from '../rendering/wall-drawing.js';
import {WallStrokePreview} from '../rendering/wall-stroke-preview.js';
import {ProvisionalCrops} from '../rendering/provisional-crops.js';
import {PreciseTap} from '../ui/precise-tap.js';
import {guardConfirmedCamera,clearBlockedOrbitMomentum} from './confirmed-camera-control.js';
import {panEarlyCameraGesture} from './early-camera-gesture.js';

// QA-only input/camera owner for the already existing graphical Worker. It
// deliberately creates no renderer or graphics context on the main thread.
export function createEarlyWorkerWorld(canvas,onPick,{visualSearch=globalThis.location?.search??''}={}){
 if(!canvas||typeof onPick!=='function')throw TypeError('Invalid worker world');
 const world=Object.create(WorldScene.prototype);Object.assign(world,{canvas,requestedVisualSearch:visualSearch,visualSearch:approvedVisualSearch(null,visualSearch),approvedVisuals:true,loading:new AbortController(),canvasEvents:new AbortController(),objects:new Map(),mixers:new Map(),chunks:new Map(),buildingTemplates:new Map(),terrainMeshes:[],quality:'media',pixelRatioLimit:Infinity,destructionPass:{},provisionalCrops:new ProvisionalCrops(),scene:new THREE.Scene(),raycaster:new THREE.Raycaster(),cursor:new THREE.Vector2(),disposed:false});
 world.camera=new THREE.PerspectiveCamera(42,1,.1,500);world.camera.position.set(40,35,50);world.controls=new OrbitControls(world.camera,canvas);world.controls.enableDamping=true;configureTerrainControls(world.controls);world.releaseCameraIntent=installTerrainCameraIntent(world.camera,world.controls,()=>world.cameraField());world.controls.enableRotate=true;world.controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
 if(new URLSearchParams(visualSearch).has('qa-webgpu-camera-terrain')){let attached=false;const active=()=>{if(world.webGpuWorld)attached=true;return attached;},field=()=>world.webGpuWorld?.client.cameraTerrain??null;world.cameraField=()=>active()?field():world.nav?.field;const guard=guardConfirmedCamera({camera:world.camera,controls:world.controls,active,field,onBlocked:()=>clearBlockedOrbitMomentum(world.controls)});world.confirmedCameraGuard=guard;world.updateCamera=()=>guard.run(()=>WorldScene.prototype.updateCamera.call(world));world.focus=point=>guard.run(()=>WorldScene.prototype.focus.call(world,point));globalThis.wildGuardiansConfirmedCameraQa=()=>({attached,confirmed:attached&&!!field()&&world.cameraField()===field(),status:field()?.status()??null,eye:world.camera.position.toArray(),target:world.controls.target.toArray()});}
 world.renderer={setSize(width,height){canvas.width=width;canvas.height=height;}};
 world.resize=()=>{const r=canvas.getBoundingClientRect(),resolution=nativeRenderResolution(r.width,r.height,globalThis.devicePixelRatio,world.quality,world.pixelRatioLimit),aspect=resolution.width/resolution.height;world.renderResolution=resolution;if(canvas.width!==resolution.width||canvas.height!==resolution.height)world.renderer.setSize(resolution.width,resolution.height);if(world.camera.aspect!==aspect){world.camera.aspect=aspect;world.camera.updateProjectionMatrix();}};
 world.qualitySetting=quality=>{world.quality=quality;world.resize();};world.configureVisualBiome=biome=>{if(world.state&&world.state.biome!==biome)throw Error('A loaded scene cannot change biome');world.visualSearch=approvedVisualSearch(biome,visualSearch);};
 world.strokePreview=new WallStrokePreview(canvas);world.wallDrawing=new WallDrawing(canvas,{screenSpace:true,point:()=>null,stroke:points=>world.onWallStroke?.(points),tap:event=>world.onDiscretePick?.(event,{}),preview:points=>world.strokePreview.showScreen(points),gesture:(old,next)=>world.wallCameraGesture(old,next),activity:phase=>world.onWallGesture?.(phase)});
 const tap=new PreciseTap(),options={signal:world.canvasEvents.signal};canvas.addEventListener('pointerdown',event=>tap.down(event),options);canvas.addEventListener('pointermove',event=>tap.move(event),options);canvas.addEventListener('pointerup',event=>{const gesture=tap.up(event);if(world.controls.enabled&&world.state&&gesture)world.onDiscretePick?.(event,gesture);},options);canvas.addEventListener('pointercancel',event=>tap.up(event,true),options);
 world.wallCameraGesture=(old,next)=>{const apply=()=>{panEarlyCameraGesture(world.camera,world.controls,canvas.getBoundingClientRect(),old,next);WorldScene.prototype.updateCamera.call(world);};if(world.confirmedCameraGuard)world.confirmedCameraGuard.run(apply);else apply();};
 world.clearSpellPreview=()=>{};world.clearWallPreview=()=>{};world.resizeObserver=new ResizeObserver(()=>world.resize());world.resizeObserver.observe(canvas);world.resize();
 world.dispose=()=>{if(world.disposed)return;world.disposed=true;if(world.confirmedCameraGuard)delete globalThis.wildGuardiansConfirmedCameraQa;world.loading.abort();world.canvasEvents.abort();world.wallDrawing.dispose();world.strokePreview.dispose();world.resizeObserver.disconnect();world.confirmedCameraGuard?.dispose();world.releaseCameraIntent?.();world.controls.dispose();world.provisionalCrops.entries.clear();world.state=null;};
 return world;
}
