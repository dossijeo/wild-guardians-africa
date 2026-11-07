import {attribute,cameraPosition,length,materialReference,max,mix,modelWorldMatrix,positionWorld,smoothstep,texture,uv,varying,vec4} from 'three/tsl';

// Both authored color atlases have opaque coverage. Keep the close atlas as
// material.map for alpha/depth/shadows and blend only its RGB and packed PBR
// values with the original atlas. A persistent per-instance centre and radius
// use the same bounds as the authored transition; standalone meshes without
// that contract retain the conservative surface-distance fallback.
export function configureWebGpuNearTree(material,{originalColor,originalPacked,nearPacked,blendStart,blendEnd,instanceData=false}){
 if(!material?.isNodeMaterial||!material.map?.isTexture||!originalColor?.isTexture||!Number.isFinite(blendStart)||!Number.isFinite(blendEnd)||blendStart<0||blendEnd<=blendStart||typeof instanceData!=='boolean'||originalPacked!==null&&!originalPacked?.isTexture||nearPacked!==null&&!nearPacked?.isTexture)throw TypeError('Invalid near tree material');
 const bounds=attribute('wgNearBounds','vec4'),distance=instanceData?varying(max(length(cameraPosition.sub(modelWorldMatrix.mul(vec4(bounds.xyz,1)).xyz)).sub(bounds.w),0)):max(0,length(cameraPosition.sub(positionWorld))),weight=smoothstep(blendStart,blendEnd,distance).oneMinus(),near=texture(material.map,uv(1)),original=texture(originalColor,uv(0));
 material.colorNode=vec4(mix(original.rgb,near.rgb,weight).mul(materialReference('color','color')),near.a);
 if(originalPacked&&nearPacked&&originalPacked!==nearPacked){const packed=mix(texture(originalPacked,uv(0)),texture(nearPacked,uv(1)),weight);material.roughnessNode=materialReference('roughness','float').mul(packed.g);material.metalnessNode=materialReference('metalness','float').mul(packed.b);}
}

// Centre is chunk-local so that the existing model transform remains the
// owner of world/origin offsets, just as in the native material.
export function setNearTreeInstanceBounds(attribute,index,item,bounds,cx,cz){
 const center=(bounds.min.y+bounds.max.y)*.5,radius=Math.max((bounds.max.x-bounds.min.x)*Math.abs(item.sx),(bounds.max.z-bounds.min.z)*Math.abs(item.sz))*.25;
 attribute.setXYZW(index,item.x-cx*48,item.y+center*item.sy,item.z-cz*48,radius);
}
