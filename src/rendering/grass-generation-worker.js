import {generateGrassChunkData} from './grass-chunk-data.js';

// A result is only a proposal: the owner must verify its request identity and
// terrain/occupancy revisions before admitting it to the presentation scene.
self.addEventListener('message',({data})=>{
 const {id,request,qaTiming}=data??{};
 try {
  const started=qaTiming===true?performance.timeOrigin+performance.now():null;
  const result=generateGrassChunkData(request);
  const timing=started===null?{}:{qaTiming:{started,finished:performance.timeOrigin+performance.now()}};
  self.postMessage({id,result,...timing},[result.anchors.buffer,result.values.buffer,result.slopes.buffer]);
 } catch(error) {
  self.postMessage({id,error:String(error?.message??error)});
 }
});
