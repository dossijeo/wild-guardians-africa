import {skyNight} from './sky.js';

// Match the existing game's confirmed-time light intensities. Terrain and
// specialized material/sky shaders are not yet ported by this helper.
export function syncWebGpuWorldLighting(state,sun,ambient){
 if(!state||!sun?.isDirectionalLight||!ambient?.isHemisphereLight)throw TypeError('Invalid world lighting');
 const night=skyNight(state);sun.intensity=3-2.6*night;ambient.intensity=2-.9*night;return night;
}
