// WebGPU decodes the guide in its Worker; the main thread only supplies its URL.
export function prepareCinematicGuide({pencil,backend,sceneId,loadImage,imageUrl}){
 if(!pencil||!/^\d{2}$/.test(sceneId))return Promise.resolve(null);
 const path=`pencil-guides/scene-${sceneId}.webp`;
 return backend==='webgpu-worker'?Promise.resolve({src:imageUrl(path)}):loadImage(path).catch(()=>null);
}
