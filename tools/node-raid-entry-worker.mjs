// QA transport only: the production browser worker uses the same computation.
import {parentPort} from 'node:worker_threads';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
parentPort.on('message',request=>{
 try{parentPort.postMessage(computeRaidEntry(request));}
 catch(error){parentPort.postMessage({key:request.key,token:request.token,error:String(error)});}
});
