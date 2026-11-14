import {createDefaultContainer,write,read,VK_FORMAT_BC7_SRGB_BLOCK,VK_FORMAT_BC7_UNORM_BLOCK} from 'three/addons/libs/ktx-parse.module.js';

// Input levels are already BC7 blocks, produced during offline authoring.
// Reject unsupported shapes instead of silently padding or changing UVs.
export function packNativeBc7({width,height,colorSpace,levels}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<4||height<4||width%4||height%4||!['srgb','srgb-linear'].includes(colorSpace)||!Array.isArray(levels)||!levels.length||levels.length>Math.floor(Math.log2(Math.max(width,height)))+1)throw TypeError('Invalid BC7 texture metadata');
 const container=createDefaultContainer();container.vkFormat=colorSpace==='srgb'?VK_FORMAT_BC7_SRGB_BLOCK:VK_FORMAT_BC7_UNORM_BLOCK;container.pixelWidth=width;container.pixelHeight=height;container.levelCount=levels.length;container.levels=levels.map((level,i)=>{const w=Math.max(1,width>>i),h=Math.max(1,height>>i),bytes=level.data;if(level.width!==w||level.height!==h||!(bytes instanceof Uint8Array)||bytes.byteLength!==Math.ceil(w/4)*Math.ceil(h/4)*16)throw TypeError('Invalid BC7 mip level '+i);return {levelData:bytes,uncompressedByteLength:bytes.byteLength};});
 Object.assign(container.dataFormatDescriptor[0],{colorModel:134,transferFunction:colorSpace==='srgb'?2:1,texelBlockDimension:[3,3,0,0],bytesPlane:[16,0,0,0,0,0,0,0],samples:[{bitOffset:0,bitLength:127,channelType:0,samplePosition:[0,0,0,0],sampleLower:0,sampleUpper:0xffffffff}]});const bytes=write(container),verified=read(bytes);if(verified.vkFormat!==container.vkFormat||verified.levels.length!==levels.length||verified.levels.some((level,i)=>level.levelData.length!==levels[i].data.length))throw Error('Native KTX2 round-trip failed');return bytes;
}
