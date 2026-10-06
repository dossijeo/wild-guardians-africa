import sharp from 'sharp';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function requireDataImage(metadata){
 if(!['png','jpeg','webp'].includes(metadata.format)||!((metadata.space==='srgb'&&[3,4].includes(metadata.channels))||(metadata.space==='b-w'&&[1,2].includes(metadata.channels)))||metadata.depth!=='uchar'||metadata.icc||metadata.hasProfile||(metadata.orientation??1)!==1||(metadata.pages??1)!==1||(metadata.bitsPerSample??8)!==8)throw Error('Data image needs separate format/profile/depth/orientation review');
}
export async function dataPixels(bytes){
 const metadata=await sharp(bytes).metadata();requireDataImage(metadata);
 const {data,info}=await sharp(bytes).ensureAlpha().raw({depth:'uchar'}).toBuffer({resolveWithObject:true});
 if(info.channels!==4)throw Error('Expected raw RGBA8 data without color-space transform');
 return {data,info,metadata,sha256:sha(data)};
}
export async function compareDataPixels(input,output){
 const [a,b]=await Promise.all([dataPixels(input),dataPixels(output)]);
 const dimensionsMatch=a.info.width===b.info.width&&a.info.height===b.info.height;
 return {dimensionsMatch,rawPixelsEqual:dimensionsMatch&&a.data.equals(b.data),sourcePixelSha256:a.sha256,runtimePixelSha256:b.sha256};
}
export async function losslessDataWebp(input){
 await dataPixels(input);
 // No color transforms, resizing, rotation, gamma or normal-vector operations.
 const output=await sharp(input).webp({lossless:true,effort:6}).toBuffer();
 const comparison=await compareDataPixels(input,output);
 if(!comparison.rawPixelsEqual)throw Error('Lossless WebP did not preserve all decoded data channels');
 return {output,comparison};
}
