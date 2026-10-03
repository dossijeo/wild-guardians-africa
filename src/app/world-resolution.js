// These limits affect only the world canvas; HTML and HUD canvases retain the
// browser's device ratio. The default preserves the authored quality recipe.
export const WORLD_RESOLUTIONS=[
  ['profile','Según calidad',Infinity],
  ['economy','Ahorro',1],
  ['low','Ahorro alto',.75],
  ['minimum','Ahorro máximo',.5],
];
export function worldResolution(value){
  return WORLD_RESOLUTIONS.some(([id])=>id===value)?value:'profile';
}
export function applyWorldResolution(world,value){
  const limit=WORLD_RESOLUTIONS.find(([id])=>id===worldResolution(value))[2];
  if(world.pixelRatioLimit===limit)return;
  world.pixelRatioLimit=limit;world.resize();
}
