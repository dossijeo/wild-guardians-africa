// QA only: conversion feasibility, not a new production decoder.
self.onmessage=({data:{bitmap}})=>{
 const start=performance.now();
 try{
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(bitmap,0,0);const pixels=context.getImageData(0,0,bitmap.width,bitmap.height).data;
  let opaque=true;for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255){opaque=false;break;}
  self.postMessage({pixels,opaque,conversionMs:performance.now()-start},[pixels.buffer]);
 }catch(error){self.postMessage({error:String(error)});}finally{bitmap.close();}
};
