import {generateGrassChunkData} from './grass-chunk-data.js';

// A result is only a proposal: the owner must verify its request identity and
// terrain/occupancy revisions before admitting it to the presentation scene.
self.addEventListener('message',({data})=>{
 const {id,request}=data??{};
 try {
  const result=generateGrassChunkData(request);
  self.postMessage({id,result},[result.anchors.buffer,result.values.buffer,result.slopes.buffer]);
 } catch(error) {
  self.postMessage({id,error:String(error?.message??error)});
 }
});
