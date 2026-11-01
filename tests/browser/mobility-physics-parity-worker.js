import {runPhysics} from './mobility-physics-parity-core.js';
try{postMessage({result:await runPhysics()});}catch(error){postMessage({error:String(error?.stack??error)});}
