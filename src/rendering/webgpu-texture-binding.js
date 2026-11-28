import {FloatType,IntType,UnsignedIntType} from 'three';

// The shader binding type matters here, not whether float color data happens
// to be stored as BC7 or ordinary RGBA on the device.
export function webGpuTextureBinding(texture){
 const dimension=texture.isCubeTexture?'cube':texture.isArrayTexture||texture.isDataArrayTexture||texture.isCompressedArrayTexture?'2d-array':texture.is3DTexture||texture.isData3DTexture?'3d':'2d';
 let sample='float';if(texture.isDepthTexture)sample='depth';else if(texture.isDataTexture||texture.isDataArrayTexture||texture.isData3DTexture){if(texture.type===IntType)sample='sint';else if(texture.type===UnsignedIntType)sample='uint';else if(texture.type===FloatType)sample='float32';}
 return [dimension,sample,texture.isDepthTexture?texture.compareFunction:null,texture.renderTarget?.samples??0];
}
