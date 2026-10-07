import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {readGlb} from './glb-container.mjs';
import {gltfImageRoles} from './audit_image_assets.mjs';
import {requireTinifyColorInput} from './tinify-color-policy.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function imageBytes(glb,index){
 const image=glb.json.images?.[index],view=glb.json.bufferViews?.[image?.bufferView],offset=view?.byteOffset??0;
 if(!image||image.uri||view?.buffer!==0||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(view.byteLength)||view.byteLength<=0||offset+view.byteLength>glb.bin.length)throw Error('Invalid embedded color image storage');
 return glb.bin.subarray(offset,offset+view.byteLength);
}
// Prepare a lossless PNG from original model pixels at the existing runtime
// resolution. Never use an already lossy runtime WebP as compression input.
export async function prepareEmbeddedColorInput(original,runtime,index){
 if(!Number.isSafeInteger(index)||index<0)throw Error('Invalid embedded color image index');
 const a=readGlb(original),b=readGlb(runtime),roles=gltfImageRoles(a.json,index),runtimeRoles=gltfImageRoles(b.json,index);
 if(roles.requiresExactPixels||runtimeRoles.requiresExactPixels||JSON.stringify(roles.references)!==JSON.stringify(runtimeRoles.references))throw Error('Original/runtime image must have matching exclusively color consumers');
 const input=imageBytes(a,index),runtimeImage=imageBytes(b,index),meta=await sharp(input).metadata(),target=await sharp(runtimeImage).metadata();
 await requireTinifyColorInput({distributed:true,requiresExactPixels:false,roles:roles.roles,sha256:sha(input),format:meta.format,width:meta.width,height:meta.height,alpha:meta.hasAlpha,pages:meta.pages??1},input);
 if(target.format!=='webp'||(target.pages??1)!==1||!target.width||!target.height||target.width>meta.width||target.height>meta.height)throw Error('Invalid existing runtime resolution');
 const prepared=await sharp(input).resize({width:target.width,height:target.height,fit:'inside',withoutEnlargement:true}).png().toBuffer(),after=await sharp(prepared).metadata();
 if(after.width!==target.width||after.height!==target.height)throw Error('Original/runtime aspect ratio mismatch');
 return {bytes:prepared,runtimeImage,format:'png',provenance:{recipe:'Original embedded image -> Sharp proportional resize at existing runtime dimensions -> lossless PNG; no lossy intermediate',originalGlbSha256:sha(original),runtimeGlbSha256:sha(runtime),imageIndex:index,originalImageSha256:sha(input),originalImageBytes:input.length,originalDimensions:[meta.width,meta.height],runtimeImageSha256:sha(runtimeImage),runtimeImageBytes:runtimeImage.length,runtimeDimensions:[target.width,target.height],uploadSha256:sha(prepared),uploadBytes:prepared.length,references:roles.references}};
}
