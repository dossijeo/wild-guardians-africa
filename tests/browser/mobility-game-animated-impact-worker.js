import {runGamePhysics} from './mobility-game-physics-core.js';
try{postMessage({kind:'result',result:await runGamePhysics({originalClips:true,initialAnimation:true,traceBones:true})});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
