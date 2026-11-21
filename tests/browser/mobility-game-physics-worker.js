import {runGamePhysics} from './mobility-game-physics-core.js';
try{postMessage({kind:'result',result:await runGamePhysics()});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
