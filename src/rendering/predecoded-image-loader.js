// GLTFLoader still owns texture creation and sampler/color-space setup. This
// handler supplies an already decoded bitmap for a synthetic data URI only.
export function createPredecodedImageLoader(manager){
 if(typeof manager?.addHandler!=='function'||typeof manager?.removeHandler!=='function')throw TypeError('Invalid image loading manager');
 const pattern=/^data:application\/x-wg-bitmap,\d+$/i,images=new Map();let next=0,closed=false;
 const loader={isImageBitmapLoader:true,load(url,onLoad,_onProgress,onError){manager.itemStart(url);queueMicrotask(()=>{try{const image=images.get(url);if(closed||!image)throw Error('Predecoded character image unavailable');onLoad(image);}catch(error){manager.itemError(url);onError?.(error);}finally{manager.itemEnd(url);}});}};
 manager.addHandler(pattern,loader);
 return {add(image){if(closed||!image||typeof image.close!=='function')throw TypeError('Invalid predecoded character image');const uri=`data:application/x-wg-bitmap,${next++}`;images.set(uri,image);return uri;},dispose(){if(closed)return;closed=true;manager.removeHandler(pattern);images.clear();}};
}
