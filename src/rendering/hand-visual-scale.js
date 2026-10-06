// CSS pixels, independent of render DPR. Preserve the native gesture/pivot and
// cap world size so a distant tutorial hand cannot become a giant obstacle.
export function handVisualScale({height,depth,projectionY,viewportHeight,minimumPixels=0,maximumScale=4}){
 if(!(height>0&&depth>0&&projectionY>0&&viewportHeight>0&&minimumPixels>0))return 1;
 const pixels=height*projectionY*viewportHeight/(2*depth);
 return Math.max(1,Math.min(Math.max(1,maximumScale),minimumPixels/pixels));
}
