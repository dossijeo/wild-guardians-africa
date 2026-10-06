// Experimental conversion: orientation/premultiplication must be baked into
// ImageBitmap because WebGL ignores those unpack flags for bitmap sources.
export async function textureImageBitmap(texture,{createBitmap=globalThis.createImageBitmap,cancelled=()=>false}={}){
 if(typeof createBitmap!=='function')throw Error('ImageBitmap unavailable');
 if(cancelled())throw Error('Bitmap conversion cancelled');const original=texture.image,begin=performance.now();
 const bitmap=await createBitmap(original,{imageOrientation:texture.flipY?'flipY':'none',premultiplyAlpha:texture.premultiplyAlpha?'premultiply':'none',colorSpaceConversion:'none'});
 if(cancelled()){bitmap.close();throw Error('Bitmap conversion cancelled');}
 texture.image=bitmap;texture.needsUpdate=true;let released=false;
 return {elapsedMs:performance.now()-begin,width:bitmap.width,height:bitmap.height,release(){if(released)return;released=true;if(texture.image===bitmap){texture.image=original;texture.needsUpdate=true;}bitmap.close();}};
}
