import {json} from './assets.js';
import {loadCropBridges} from './crop-library.js';

// These resources share the world's Assets owner/cache. Only their adoption
// depends on sky readiness; fetching models/catalogues does not touch the scene.
// Promise.all observes both paths even if one fails; World owns late disposal.
export async function loadDioramaSharedAssets(world,{phase=(label,run)=>run(),parallel=false,cancelled=()=>false}={}) {
 const check=()=>{if(cancelled()||world.disposed||world.loading.signal.aborted)throw Error('Loading diorama cancelled');};
 check();
 const sky=()=>phase('diorama-prepare-sky',()=>world.loadReady(world.sky.load()));
 const maize=async()=>{
  check();
  const [models,bridges,ground]=await phase('diorama-prepare-catalogues',()=>world.loadReady(Promise.all([json('/content/models.json',{signal:world.loading.signal}),json('/content/crop-bridges.json',{signal:world.loading.signal}),json('/content/ground-materials.json',{signal:world.loading.signal})])));
  check();const descriptor=models.find(m=>m.source.includes('Cultivos'));if(!descriptor)throw Error('Missing native maize model');
  const [gltf,preparedBridges]=await Promise.all([phase('diorama-prepare-maize-model',()=>world.loadReady(world.assets.model(descriptor.url))),phase('diorama-prepare-maize-bridges',()=>world.loadReady(loadCropBridges(bridges,url=>world.assets.model(url))))]);
  check();return {gltf,preparedBridges,ground};
 };
 if(parallel){const [,resources]=await Promise.all([sky(),maize()]);check();return resources;}
 await sky();check();return maize();
}
