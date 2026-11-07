import {cameraPosition,length,materialReference,max,mix,positionWorld,smoothstep,texture,uv,vec4} from 'three/tsl';

// Both authored color atlases have opaque coverage. Keep the close atlas as
// material.map for alpha/depth/shadows and blend only its RGB and packed PBR
// values with the original atlas. Distance is evaluated on the surface; the
// old instanced path instead measures the instance's bounding sphere.
export function configureWebGpuNearTree(material,{originalColor,originalPacked,nearPacked,blendStart,blendEnd}){
 if(!material?.isNodeMaterial||!material.map?.isTexture||!originalColor?.isTexture||!Number.isFinite(blendStart)||!Number.isFinite(blendEnd)||blendStart<0||blendEnd<=blendStart||originalPacked!==null&&!originalPacked?.isTexture||nearPacked!==null&&!nearPacked?.isTexture)throw TypeError('Invalid near tree material');
 const weight=smoothstep(blendStart,blendEnd,max(0,length(cameraPosition.sub(positionWorld)))).oneMinus(),near=texture(material.map,uv(1)),original=texture(originalColor,uv(0));
 material.colorNode=vec4(mix(original.rgb,near.rgb,weight).mul(materialReference('color','color')),near.a);
 if(originalPacked&&nearPacked&&originalPacked!==nearPacked){const packed=mix(texture(originalPacked,uv(0)),texture(nearPacked,uv(1)),weight);material.roughnessNode=materialReference('roughness','float').mul(packed.g);material.metalnessNode=materialReference('metalness','float').mul(packed.b);}
}
