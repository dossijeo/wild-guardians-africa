import sharp from 'sharp';
// Never trade pixel fidelity or the texture-size limit for a smaller file.
export async function smallerLosslessImage(source,encoded,{lossless,mimeType,width,height,maxSize=2048}){
 if(!lossless||source.length>=encoded.length||width>maxSize||height>maxSize||!['image/png','image/jpeg','image/webp'].includes(mimeType))return {bytes:encoded,mimeType:'image/webp',retained:false};
 const decode=bytes=>sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const [a,b]=await Promise.all([decode(source),decode(encoded)]);
 if(a.info.width!==b.info.width||a.info.height!==b.info.height||!a.data.equals(b.data))return {bytes:encoded,mimeType:'image/webp',retained:false};
 return {bytes:source,mimeType,retained:true};
}
