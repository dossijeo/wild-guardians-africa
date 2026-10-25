import {applyMaterialStudy as placeGrass} from './qa-grass-biomes.js';
export async function applyMaterialStudy(world,variant='original'){
 if(!world.qaDryGrass)world.qaDryGrass=await placeGrass(world);
 const material=world.groundDetails.material;
 const color=variant==='dry'?[1.,.68,.48]:[.90,.82,.55];
 material.color.setRGB(...color);
 return {variant,...world.qaDryGrass,color,newTextures:0,newGeometry:0,scope:'Canyon grass material tint only; identical instances, source mesh and lighting'};
}
