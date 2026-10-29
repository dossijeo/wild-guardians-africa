// Reference-lighting candidate. Reuses native shadow visibility and day/night
// interpolation: no extra textures, lights, render targets, or postprocess pass.
export function cinematicLightingEnabled(search=''){
 return new URLSearchParams(search).get('cinematicLight')==='1';
}
// Low-frequency diffuse ground bounce, in linear radiance. A hemispheric
// approximation, not a light probe or simulated GI. Never includes emission.
const groundBounce=Object.freeze(Object.fromEntries(Object.entries({
 'sabana':[.16,.13,.075],'gran-rio':[.12,.145,.095],
 'manglares':[.085,.115,.08],'volcanes':[.075,.075,.08],
 'gran-canon':[.19,.12,.065],'desierto':[.22,.17,.105],
}).map(([key,value])=>[key,Object.freeze(value)])));
export function cinematicGroundBounce(biome){return groundBounce[biome]??groundBounce.sabana;}
export function patchCinematicLighting(source,{ground=false}={}){
 const anchor='#include <opaque_fragment>';
 if(!source.includes(anchor))throw Error('Cinematic lighting: output anchor missing');
 const visibility=ground?'groundVisibility':'toonVisibility';
 return source.replace(anchor,`// Apply to linear reflected radiance, preserving existing geometry/material response.
 float cinemaSun=smoothstep(.12,.90,clamp(${visibility},0.,1.));
 vec3 cinemaDay=mix(vec3(.77,.89,1.02),vec3(1.20,1.08,.87),cinemaSun);
 vec3 cinemaNight=mix(vec3(.66,.91,.94),vec3(.76,.96,1.12),cinemaSun);
 ${ground?'outgoingLight*=mix(cinemaDay,cinemaNight,uNight);':'outgoingLight=max(vec3(0.),outgoingLight-totalEmissiveRadiance)*mix(cinemaDay,cinemaNight,uNight)+totalEmissiveRadiance;'}
 ${anchor}`);
}

// DEST reads packed depth, whereas terrain uses hardware depth comparison.
// Keep its format and nine taps, but transfer the terrain receiver-plane bias.
export function patchBuildingShadow(source){
 const start=source.indexOf('float shadowFactor(vec3 N){');
 if(start<0)throw Error('Cinematic building shadow: function missing');
 let end=start,depth=0,opened=false;
 for(;end<source.length;end++){if(source[end]==='{'){depth++;opened=true;}else if(source[end]==='}'&&--depth===0&&opened){end++;break;}}
 return source.slice(0,start)+`float shadowFactor(vec3 N){
 vec3 p=vShadow.xyz/vShadow.w*.5+.5;
 vec2 dx=dFdx(p.xy),dy=dFdy(p.xy);float zx=dFdx(p.z),zy=dFdy(p.z),det=dx.x*dy.y-dx.y*dy.x;
 if(uShadows<.5||p.z<0.||p.z>1.||p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 1.;
 vec2 slope=abs(det)>1e-11?vec2(dy.y*zx-dx.y*zy,dx.x*zy-dy.x*zx)/det:vec2(0.);
 slope=clamp(slope,vec2(-4.),vec2(4.));
 float texel=1./uShadowSize,bias=max(.00017,.0004*(1.-dot(N,normalize(uSun))))+dot(abs(slope),vec2(texel))*.65;
 float sum=0.;
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
 vec2 offset=vec2(float(x),float(y))*texel*1.15;
 float depth=unpackRGBAToDepth(textureLod(uShadow,p.xy+offset,0.));
 sum+=p.z+dot(slope,offset)-bias<=depth?1.:0.;
 }
 return mix(.08,1.,sum/9.);
}`+source.slice(end);
}
