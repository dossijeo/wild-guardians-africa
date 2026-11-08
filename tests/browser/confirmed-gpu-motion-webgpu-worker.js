import {auditMotion,auditRealAnimalMotion,auditPooledMotion} from './confirmed-gpu-motion-webgpu.js';
self.onmessage=async({data})=>{try{postMessage({result:data?.pooledOnly?{pooled:await auditPooledMotion()}:{primitive:await auditMotion(),animal:await auditRealAnimalMotion(),pooled:await auditPooledMotion()}});}catch(error){postMessage({error:String(error?.stack??error)});}};
