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
export function patchCinematicVegetation(source){
 return source.replace(/dayShade=vec3\(\.(?:17,\.28,\.34|15,\.25,\.31|14,\.26,\.32)\)/,'dayShade=vec3(.38,.48,.54)')
  .replace('mix(vec3(.17,.28,.34),vec3(.095,.17,.32)*uNightLight,uNight)','mix(vec3(.38,.48,.54),vec3(.095,.17,.32)*uNightLight,uNight)');
}
export function patchCinematicLighting(source,{ground=false,nativeSurface=false}={}){
 const anchor='#include <opaque_fragment>';
 if(!source.includes(anchor))throw Error('Cinematic lighting: output anchor missing');
 // Native volcanic emission is added inside its authored tone mapper. Grade
 // reflected radiance there, before emission, rather than tinting the output.
 if(nativeSurface&&!ground){
  const tint=`vec3 cinemaReflectedTint(float visibility,float night){
 float sun=smoothstep(.12,.90,clamp(visibility,0.,1.));
 return mix(mix(vec3(.77,.89,1.02),vec3(1.20,1.08,.87),sun),mix(vec3(.66,.91,.94),vec3(.76,.96,1.12),sun),night);
 }
`;
  if(!source.includes('toon+=emission;'))throw Error('Cinematic lighting: native emission anchor missing');
  source=source.replace('toon+=emission;','toon*=cinemaReflectedTint(visibility,uNight);\n toon+=emission;');
  // Illustrated native props override the toon result with this second path.
  source=source.replace('if(uArtVolcanicGlow>.5&&uSurfaceType>.5){','lit*=cinemaReflectedTint(1.-shadowCoverage*.93,uNight);\n if(uArtVolcanicGlow>.5&&uSurfaceType>.5){');
  return tint+source;
 }

 // Restore readable diffuse sky fill under projected shadows. Change the
 // daylight radiance before tone mapping, not shadow visibility or albedo.
 // Support both final-daylight and ungraded native ground recipes.
 if(ground){
  source=source.replace('vec3 biomeDirect=', 'biomeAmbient+=vec3(.30,.35,.40)*(1.-uNight)*(1.-groundVisibility);\n vec3 biomeDirect=');
  // Dry ground still uses the native banded response. A broad sky lobe keeps
  // authored sand normals readable when direct light falls into its lowest
  // band. This is approximate diffuse irradiance, not another sun or shadow.
  const dryAnchor='vec3 toon=albedo*base*(.76+.24*fill);';
  source=source.replace(dryAnchor,dryAnchor+'\n vec3 cinemaSkyDirection=normalize(vec3(-uLightDir.x,1.3,-uLightDir.z));\n toon+=albedo*vec3(.22,.25,.28)*max(dot(N,cinemaSkyDirection),0.)*(1.-visibility)*(1.-uNight);');
 }
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
