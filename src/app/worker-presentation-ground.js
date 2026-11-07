import {CameraTerrainUnavailable} from './confirmed-camera-terrain.js';

// Presentation-only HUD effects may wait until the authoritative terrain
// sample has reached the main thread; an unavailable height is not sea level.
export function workerPresentationGround(world,x,z){
 const field=world?.cameraField?.();if(!field||typeof field.surface!=='function')return null;
 try{const height=field.surface(x,z);return Number.isFinite(height)?height:null;}catch(error){if(error instanceof CameraTerrainUnavailable)return null;throw error;}
}
