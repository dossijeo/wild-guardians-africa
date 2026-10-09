import {json} from './asset-fetch.js';

// Opt-in preparation only: Assets keeps ownership; rigs and all GPU work remain
// in the normal animal/readiness stages. Rejections are observed immediately
// but the original failure is retained for the normal consumer.
export function startAnimalModelPrefetch(world,sources,{loadCatalogue=json}={}) {
  const check=()=>{if(world.disposed||world.loading.signal.aborted)throw Error('Carga de mundo cancelada');};
  const catalogue=Promise.resolve().then(()=>{check();return world.loadReady(loadCatalogue('/content/models.json',{signal:world.loading.signal}));});
  catalogue.catch(()=>{});
  const ready=catalogue.then(models=>{
    check();
    const descriptors=Object.entries(sources).map(([id,source])=>{
      const descriptor=models.find(model=>model.source.includes(source));
      if(!descriptor)throw Error('Falta el modelo de '+id);
      return descriptor;
    });
    return world.loadReady(Promise.all(descriptors.map(descriptor=>world.assets.model(descriptor.url))));
  }).then(()=>{check();});
  ready.catch(()=>{});
  return {catalogue,ready};
}
