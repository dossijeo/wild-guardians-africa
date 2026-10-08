import {FarSceneStream} from './far-scene-stream.js';
import {loadFarSceneData} from './far-scene-loader.js';

// One bounded active worker and one last complete CPU result. The renderer will
// own its uploaded geometry separately; this does not create a GPU resource.
export class FarGroundSeamStream extends FarSceneStream{
 constructor({workerFactory=()=>new Worker(new URL('./far-ground-seam-worker.js',import.meta.url),{type:'module'})}={}){
  super({load:(request,options)=>loadFarSceneData(request,{...options,workerFactory})});
 }
}
