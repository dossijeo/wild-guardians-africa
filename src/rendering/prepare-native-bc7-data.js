import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {read,VK_FORMAT_BC7_UNORM_BLOCK,VK_FORMAT_BC7_SRGB_BLOCK} from 'three/addons/libs/ktx-parse.module.js';
import {RGBA_BPTC_Format,UnsignedByteType} from 'three';

// KTX2Loader's native path parses BC7 without a renderer or transcoder. Its
// plain mip views can be transferred to the actual WebGPU owner unchanged.
const loader=new KTX2Loader().detectSupport({isWebGPURenderer:true,hasFeature:name=>name==='texture-compression-bc'});
export async function prepareNativeBc7Data(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteOffset!==0||bytes.byteLength!==bytes.buffer.byteLength)throw TypeError('Invalid native BC7 buffer');
 const header=read(bytes);if(![VK_FORMAT_BC7_UNORM_BLOCK,VK_FORMAT_BC7_SRGB_BLOCK].includes(header.vkFormat)||header.supercompressionScheme!==0||header.pixelDepth!==0||header.faceCount!==1||header.layerCount!==0)throw Error('Unsupported native BC7 texture');
 const texture=await new Promise((resolve,reject)=>{try{loader.parse(bytes.buffer,resolve,reject);}catch(error){reject(error);}});
 try{if(!texture.isCompressedTexture||texture.format!==RGBA_BPTC_Format||texture.type!==UnsignedByteType||!texture.mipmaps.length)throw Error('Invalid native BC7 texture');const mipmaps=texture.mipmaps.map(level=>{const data=level.data;if(!(data instanceof Uint8Array)||data.buffer!==bytes.buffer)throw Error('Invalid native BC7 mip ownership');return {offset:data.byteOffset,length:data.byteLength,width:level.width,height:level.height};});return {buffer:bytes.buffer,width:texture.image.width,height:texture.image.height,format:texture.format,type:texture.type,colorSpace:texture.colorSpace,minFilter:texture.minFilter,magFilter:texture.magFilter,generateMipmaps:texture.generateMipmaps,mipmaps};}
 finally{texture.dispose();}
}
