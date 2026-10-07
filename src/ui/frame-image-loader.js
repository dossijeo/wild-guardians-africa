// Retain the small, fixed HUD frame set across panel openings and games.
export function createFrameImageLoader(assets,{createImage=()=>new Image()}={}) {
  const entries=Object.entries(assets).filter(([key])=>key.startsWith('frame_'));
  const images=new Map();
  let batch=null;
  function loadImage(src) {
    if(images.has(src))return images.get(src);
    const pending=new Promise((resolve,reject)=>{
      const image=createImage();
      image.onload=()=>{image.onload=image.onerror=null;resolve(image);};
      image.onerror=()=>{image.onload=image.onerror=null;reject(new Error('HUD frame image failed: '+src));};
      image.src=src;
    });
    const retained=pending.catch(error=>{images.delete(src);throw error;});
    images.set(src,retained);
    return retained;
  }
  return ()=>{
    if(!batch)batch=Promise.all(entries.map(async([key,{src}])=>[key,await loadImage(src)]))
      .then(Object.fromEntries).catch(error=>{batch=null;throw error;});
    return batch;
  };
}
