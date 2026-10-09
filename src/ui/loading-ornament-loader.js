import {assetUrl} from '../rendering/asset-url.js';

// Retained UI cache, independent of any destroyed loading scene. Decoded during
// the existing menu preparation; CSS/HTML presentation creates no WebGL texture.
export function createLoadingFrameLoader(loadFrames,{createImage=()=>new Image()}={}){
 let pending;
 const ornament=()=>{if(!pending){const image=createImage();pending=new Promise((resolve,reject)=>{image.onload=()=>Promise.resolve().then(()=>image.decode?.()).then(()=>resolve(image),reject);image.onerror=()=>reject(Error('Loading frame image failed'));image.src=assetUrl('/assets/ui/loading-ornament-v2.webp');});pending.catch(()=>{pending=null;});}return pending;};
 return ()=>Promise.all([loadFrames(),ornament()]).then(([frames,image])=>({...frames,loading_ornament:image}));
}
