self.onmessage=async({data})=>{
 let bitmap;const received=performance.now(),receivedEpochMs=performance.timeOrigin+received;
 try{
  const response=await fetch(data.url);const headers=performance.now();if(!response.ok)throw Error('Texture fetch failed: '+response.status);
  const blob=await response.blob(),body=performance.now();bitmap=await createImageBitmap(blob,data.options);const decoded=performance.now();
  const timing={receivedEpochMs,fetchHeadersMs:headers-received,fetchBodyMs:body-headers,bitmapMs:decoded-body,workerTotalMs:decoded-received,postEpochMs:performance.timeOrigin+performance.now()};
  self.postMessage({bitmap,timing},[bitmap]);bitmap=null;
 }catch(error){bitmap?.close();self.postMessage({error:String(error.message??error)});}
};
