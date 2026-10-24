import {computeMudEdgeSteps} from '../../src/rendering/mangrove-mud-edge-data.js';
self.onmessage=({data})=>{
 try{
  const input={...data};for(const name of ['gp','gc','gn','p']){const a=data[name],get=(i,k)=>a.array[i*a.stride+a.offset+k];input[name]={count:a.count,getX:i=>get(i,0),getZ:i=>get(i,2),getComponent:get};}
  const start=performance.now(),steps=computeMudEdgeSteps(input);let step;do{step=steps.next();}while(!step.done);
  const result=step.value;self.postMessage({result,computeMs:performance.now()-start},[result.colors.buffer,result.normals.buffer,result.edges.buffer]);
 }catch(error){self.postMessage({error:String(error.stack??error)});}
};
