import {applyMaterialStudy as apply} from './qa-night-readability.js';
export function applyMaterialStudy(world){return world.state.biome==='desierto'?{control:true,nightLight:1.12}:apply(world);}
