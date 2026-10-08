// Initial weights are estimates from the native Sabana/Mapungubwe pilot; each
// progress update is actual completed work. Recalibrate with the coverage runs.
export const LOADING_STAGES=Object.freeze([
 {id:'configuration',weight:8},{id:'sky',weight:4},{id:'biome',weight:4},
 {id:'buildings',weight:8},{id:'animals',weight:10},{id:'crops',weight:6},
 {id:'walls',weight:4},{id:'vfx',weight:2},{id:'chunks',weight:8},
 {id:'gpu',weight:15},{id:'far-assets',weight:25},{id:'visible-ready',weight:6}
]);

const STAGE_LABELS={configuration:['world configuration','configuración del mundo'],sky:['sky','cielo'],biome:['landscape','paisaje'],buildings:['buildings','construcciones'],animals:['animals','animales'],crops:['crops','cultivos'],walls:['walls','murallas'],vfx:['effects','efectos'],chunks:['terrain','terreno'],gpu:['rendering resources','recursos gráficos'],'far-assets':['distant landscape','paisaje lejano'],'visible-ready':['opening view','vista inicial']};
export function loadingWaitMessage(snapshot,locale='en-US'){const spanish=locale.startsWith('es'),label=STAGE_LABELS[snapshot.pending[0]]?.[spanish?1:0]??(spanish?'el mundo':'the world');return (spanish?'Preparando ':'Preparing ')+label+' · '+Math.floor(snapshot.progress*100)+' %';}
