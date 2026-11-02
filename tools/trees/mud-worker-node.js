import {parentPort} from 'node:worker_threads';
import {mudPatchGeometry} from '../../src/rendering/mud-patches.js';
import {mudSnapshotField} from './mud-worker-input.js';
parentPort.on('message',({id,input})=>{try{const at=performance.now(),g=mudPatchGeometry(mudSnapshotField(input),input.cx,input.cz,input.scale);const result=g?{position:g.attributes.position.array,normal:g.attributes.normal.array,uv:g.attributes.uv.array,userData:g.userData}:null;const elapsed=performance.now()-at;g?.dispose();parentPort.postMessage({id,result,elapsed},result?[result.position.buffer,result.normal.buffer,result.uv.buffer]:[]);}catch(e){parentPort.postMessage({id,error:String(e.stack??e)});}});
