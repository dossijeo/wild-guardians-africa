// Crop only unused transparent headroom; never reshape or cut visible terrain.
export function hqBackdropCrop(data,width,height){
 if(!(data instanceof Uint8Array)||data.length!==width*height*4)throw Error('Expected RGBA source pixels');
 const top=height-width/4;
 if(!Number.isInteger(top)||top<0)throw Error('Source cannot be cropped to 4:1 without distortion');
 let clipped=0;
 for(let y=0;y<top;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=90)clipped++;
 if(clipped)throw Error(`Crop would cut ${clipped} visible pixels`);
 return {left:0,top,width,height:height-top};
}
