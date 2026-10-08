// HTMLImage onload does not guarantee decoded pixels ready for texImage2D.
// Decode before upload, using the same no-flip/no-premultiply/no-conversion
// convention as native asset textures. Only the original owner closes bitmap.
export async function prepareLoadingImage(texture,{cancelled=()=>false,createBitmap=globalThis.createImageBitmap}={}){
 const image=texture.image;let bitmap;
 const check=()=>{if(cancelled())throw Error('Loading image decode cancelled');};
 check();if(typeof image?.decode==='function')await image.decode();check();
 if(typeof createBitmap==='function'&&typeof image?.decode==='function'){
  bitmap=await createBitmap(image,{imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});
  try{check();}catch(error){bitmap.close();throw error;}
  texture.image=bitmap;texture.needsUpdate=true;
  const close=()=>{texture.removeEventListener('dispose',close);bitmap.close();};texture.addEventListener('dispose',close);
 }
 return texture;
}
