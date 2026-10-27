import {computeMudEdgeSteps} from './mangrove-mud-edge-data.js';
import {decodeMudEdgeInput} from './mangrove-mud-edge-codec.js';
self.onmessage=({data:{id,input}})=>{
 try{const start=performance.now(),steps=computeMudEdgeSteps(decodeMudEdgeInput(input));let step;do{step=steps.next();}while(!step.done);const result=step.value;self.postMessage({id,result,computeMs:performance.now()-start},[result.colors.buffer,result.normals.buffer,result.edges.buffer]);}
 catch(error){self.postMessage({id,error:String(error.stack??error)});}
};
