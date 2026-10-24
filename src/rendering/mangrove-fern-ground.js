// Selected fern study ground balance; only called for opted-in Mangrove substrate.
export function patchFernGround(source){
 const a='vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));';
 const b='outgoingLight=toLinear4(filmic4(groundLit));';
 if(!source.includes(a)||!source.includes(b))throw Error('Fern ground lighting anchor missing');
 source=source.replace(a,a+'if(uBiome>1.5&&uBiome<2.5)groundAlbedo=mix(groundAlbedo,vec3(dot(groundAlbedo,vec3(.2126,.7152,.0722)))*vec3(1.06,1.02,.91),.25);');
 source=source.replace(b,'if(uBiome>1.5&&uBiome<2.5)groundLit*=1.-.45*(1.-groundVisibility)*(1.-uNight);'+b);
 for(const [uv,dx,dy]of [['uv','dx','dy'],['uv2','dx2','dy2']])for(const map of ['uGroundDetailMap','uGroundNormal','uGroundARH'])source=source.replaceAll('textureGrad('+map+','+uv+','+dx+','+dy+')','textureGrad('+map+','+uv+','+dx+'*1.35,'+dy+'*1.35)');
 return source.replaceAll('uGroundParams.z*uGroundMicro','uGroundParams.z*uGroundMicro*.8');
}
