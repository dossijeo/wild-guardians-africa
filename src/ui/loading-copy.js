const COPY={
 en:{world:'Preparing your world...',terrain:'Preparing the terrain...',nature:'Awakening nature...',life:'Bringing your world to life...',ready:'Everything is ready',touch:'Tap the soil to plant more maize',mouse:'Click the soil to plant more maize',cancel:'Cancel'},
 es:{world:'Preparando tu mundo...',terrain:'Preparando el terreno...',nature:'Despertando la naturaleza...',life:'Dando vida a tu mundo...',ready:'Todo está listo',touch:'Toca la tierra para plantar más maíz',mouse:'Haz clic en la tierra para plantar más maíz',cancel:'Cancelar'}
};
const PHASE={configuration:'world',sky:'terrain',biome:'terrain',chunks:'terrain',animals:'nature','far-assets':'nature',buildings:'life',crops:'life',walls:'life',vfx:'life',gpu:'life','visible-ready':'life'};
export function loadingCopy(snapshot,{locale='en-US',pointer='mouse',progress=snapshot.progress}={}){
 const copy=COPY[locale.startsWith('es')?'es':'en'],value=Math.min(snapshot.ready?1:.99,snapshot.progress,Math.max(0,Number.isFinite(progress)?progress:0));
 return {value,percent:Math.min(snapshot.ready?100:99,Math.floor(value*100+1e-9)),title:copy[snapshot.ready?'ready':PHASE[snapshot.pending[0]]??'world'],help:copy[pointer==='touch'?'touch':'mouse'],cancel:copy.cancel};
}
