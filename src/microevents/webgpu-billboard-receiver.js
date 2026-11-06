import {Texture} from 'three';
import {MICROEVENT_ATLAS} from './definitions.js';
import {assetUrl} from '../rendering/asset-url.js';
import {createWebGpuMicroeventLayer} from './webgpu-billboard-layer.js';

async function loadAtlas(signal){
 const response=await fetch(assetUrl(MICROEVENT_ATLAS.url),{signal});if(!response.ok)throw Error(`Microevent atlas HTTP ${response.status}`);const bitmap=await createImageBitmap(await response.blob());if(signal.aborted){bitmap.close();throw new DOMException('Microevent preparation cancelled','AbortError');}const texture=new Texture(bitmap);texture.needsUpdate=true;return texture;
}

// No microevent is created here: the controller owns selection, interaction
// and authoritative economy. Resources are requested only when needed.
export function createWebGpuMicroeventReceiver({scene,state,load=loadAtlas}={}){
 if(!scene?.isScene||!state||typeof load!=='function')throw TypeError('Invalid microevent receiver');
 let closed=false,layer=null,pending=null,atlas=null;const abort=new AbortController();
 function prepare(){if(closed)return Promise.reject(Error('Microevent receiver disposed'));if(pending)return pending;if(layer)return Promise.resolve();pending=Promise.resolve().then(()=>load(abort.signal)).then(async texture=>{if(!texture?.isTexture)throw TypeError('Invalid microevent atlas');if(closed){texture.image?.close?.();texture.dispose();throw new DOMException('Microevent preparation cancelled','AbortError');}atlas=texture;layer=createWebGpuMicroeventLayer({scene,state,atlas});await layer.ready;if(closed)throw new DOMException('Microevent preparation cancelled','AbortError');}).catch(error=>{if(!closed){if(layer)layer.dispose();else atlas?.dispose();layer=null;atlas?.image?.close?.();atlas=null;}throw error;}).finally(()=>{pending=null;});return pending;}
 return {prepare,update(frame){if(closed||!layer)throw Error('Microevent receiver not ready');return layer.update(frame);},hide(){layer?.hide();},clear(sequence){if(closed||!layer)throw Error('Microevent receiver not ready');layer.clear(sequence);},status(){return {closed,preparing:!!pending,ready:!!layer&&!closed,...(layer?{frame:layer.status()}:{})};},dispose(){if(closed)return;closed=true;abort.abort();layer?.dispose();layer=null;atlas?.image?.close?.();atlas=null;}};
}
