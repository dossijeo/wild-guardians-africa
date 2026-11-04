import {auditMotion,auditRealAnimalMotion} from './confirmed-gpu-motion-webgpu.js';
self.onmessage=async()=>{try{postMessage({result:{primitive:await auditMotion(),animal:await auditRealAnimalMotion()}});}catch(error){postMessage({error:String(error?.stack??error)});}};
