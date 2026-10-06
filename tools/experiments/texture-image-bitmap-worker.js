self.onmessage=async({data})=>{
 let bitmap;
 try{
  const response=await fetch(data.url);if(!response.ok)throw Error('Texture fetch failed: '+response.status);
  bitmap=await createImageBitmap(await response.blob(),data.options);
  self.postMessage({bitmap},[bitmap]);bitmap=null;
 }catch(error){bitmap?.close();self.postMessage({error:String(error.message??error)});}
};
