import sharp from 'sharp';

// Compare display-space RGBA8 explicitly: grayscale must not be mistaken for
// interleaved RGB/alpha. Texture data maps require a separate raw-data policy.
export async function compareColorPixels(input,output){
 const decode=bytes=>sharp(bytes).toColourspace('srgb').ensureAlpha().raw({depth:'uchar'}).toBuffer({resolveWithObject:true});
 const [before,after]=await Promise.all([decode(input),decode(output)]);
 const dimensionsMatch=before.info.width===after.info.width&&before.info.height===after.info.height;
 if(!dimensionsMatch)return {dimensionsMatch:false,alphaDifferences:null,maxAlphaDifference:null,rgbMeanAbsoluteDifference:null,maxRgbDifference:null};
 if(before.info.channels!==4||after.info.channels!==4||before.data.length!==after.data.length)throw Error('Expected matching RGBA8 image planes');
 let alphaDifferences=0,maxAlphaDifference=0,rgbError=0,maxRgbDifference=0;
 for(let i=0;i<before.data.length;i+=4){
  const alphaDelta=Math.abs(before.data[i+3]-after.data[i+3]);if(alphaDelta)alphaDifferences++;maxAlphaDifference=Math.max(maxAlphaDifference,alphaDelta);
  for(let lane=0;lane<3;lane++){const delta=Math.abs(before.data[i+lane]-after.data[i+lane]);rgbError+=delta;maxRgbDifference=Math.max(maxRgbDifference,delta);}
 }
 return {dimensionsMatch,alphaDifferences,maxAlphaDifference,rgbMeanAbsoluteDifference:rgbError/(before.info.width*before.info.height*3),maxRgbDifference};
}
