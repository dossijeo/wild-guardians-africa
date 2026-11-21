import {runPhysics} from './mobility-physics-parity-core.js';
self.onmessage=async({data})=>{try{postMessage({result:await runPhysics(data)});}catch(error){postMessage({error:String(error?.stack??error)});}};
