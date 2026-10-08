export function ownLoadingBitmap(texture,bitmap){texture.image=bitmap;texture.needsUpdate=true;const close=()=>{texture.removeEventListener('dispose',close);bitmap.close();};texture.addEventListener('dispose',close);return texture;}
// HTMLImage onload does not guarantee decoded pixels ready for texImage2D.
// Decode before upload, using the same no-flip/no-premultiply/no-conversion
// convention as native asset textures. Only the original owner closes bitmap.
export async function prepareLoadingImage(texture,{cancelled=()=>false,createBitmap=globalThis.createImageBitmap,onDiagnostic=null}={}){
 const image=texture.image;let bitmap;
 const check=()=>{if(cancelled())throw Error('Loading image decode cancelled');};
 check();if(typeof image?.decode==='function'){const started=onDiagnostic?performance.now():0,pending=image.decode();onDiagnostic?.({step:'image-decode-submit',cpuMs:performance.now()-started,width:image.width,height:image.height});await pending;}check();
 if(typeof createBitmap==='function'&&typeof image?.decode==='function'){
  const started=onDiagnostic?performance.now():0,pending=createBitmap(image,{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});onDiagnostic?.({step:'image-bitmap-submit',cpuMs:performance.now()-started,width:image.width,height:image.height});bitmap=await pending;
  try{check();}catch(error){bitmap.close();throw error;}
  ownLoadingBitmap(texture,bitmap);
 }
 return texture;
}
