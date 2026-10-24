// QA only: conversion feasibility, not a new production decoder.
self.onmessage=({data:{bitmap}})=>{
 const start=performance.now();
 try{
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(bitmap,0,0);const pixels=context.getImageData(0,0,bitmap.width,bitmap.height).data;
  self.postMessage({pixels,conversionMs:performance.now()-start},[pixels.buffer]);
 }catch(error){self.postMessage({error:String(error)});}finally{bitmap.close();}
};
