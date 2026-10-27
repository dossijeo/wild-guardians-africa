import {applyMaterialStudy as applyStreaming} from './qa-grass-streaming.js';
import {grassProfiles} from './qa-grass-biomes.js';
export async function applyMaterialStudy(world){return applyStreaming(world,{assetPath:'/assets/visual-lab/grass-mixed.glb',profiles:grassProfiles,naturalGroups:true});}
