import {nativeRenderResolution} from '../rendering/render-quality.js';
import {focusTerrainCamera,updateTerrainCamera} from '../rendering/terrain-camera.js';
import {panEarlyCameraGesture} from './early-camera-gesture.js';

// Camera and viewport logic independent of WorldScene and of any WebGL
// renderer. The caller owns controls, terrain data and presentation lifecycle.
export function createPresentationCameraController({camera,controls,viewport,field,quality=()=> 'media',pixelRatioLimit=()=>Infinity,devicePixelRatio=()=>globalThis.devicePixelRatio??1,guard=null,raidCamera=()=>null,state=()=>null,onResolution=()=>{}}={}){
 if(!camera?.isCamera||!controls?.target||typeof controls.update!=='function'||typeof viewport?.getBoundingClientRect!=='function'||typeof field!=='function'||typeof quality!=='function'||typeof pixelRatioLimit!=='function'||typeof devicePixelRatio!=='function'||typeof state!=='function'||typeof raidCamera!=='function'||typeof onResolution!=='function'||guard!==null&&typeof guard.run!=='function')throw TypeError('Invalid presentation camera controller');
 let closed=false;
 function run(action){if(closed)throw Error('Presentation camera controller closed');return guard?guard.run(action):action();}
 function update(){return run(()=>updateTerrainCamera(camera,controls,field()));}
 function resize(){
  if(closed)throw Error('Presentation camera controller closed');const rect=viewport.getBoundingClientRect(),resolution=nativeRenderResolution(rect.width,rect.height,devicePixelRatio(),quality(),pixelRatioLimit()),aspect=resolution.width/resolution.height;
  if(camera.aspect!==aspect){camera.aspect=aspect;camera.updateProjectionMatrix();}
  onResolution(resolution);
  return resolution;
 }
 return {
  update,resize,
  step(dt,{cinematic=false}={}){if(!Number.isFinite(dt)||dt<0)throw TypeError('Invalid camera frame time');resize();if(!cinematic){update();raidCamera()?.update(state(),dt);}},
  focus(point){return run(()=>{raidCamera()?.cancel();const surface=field();if(surface)focusTerrainCamera(camera,controls,surface,point);});},
  wallGesture(previous,next){return run(()=>{const result=panEarlyCameraGesture(camera,controls,viewport.getBoundingClientRect(),previous,next);updateTerrainCamera(camera,controls,field());return result;});},
  dispose(){closed=true;},
 };
}
