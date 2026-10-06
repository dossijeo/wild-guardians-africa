// Experimental only: reuse the world art grading with an approximate canopy envelope, without a normal atlas.
import {toonFunctions} from '../../src/rendering/african-toon-source.js';
import {artLightingFunctions} from '../../src/rendering/biome-material-source.js';
const colorFunctions=toonFunctions.slice(toonFunctions.indexOf('vec3 toLinear4'),toonFunctions.indexOf('float toonRamp4'));
export const impostorLightingDeclarations=`varying vec3 vFarWorld,vFarRight,vFarFacing;varying float vRelativeHeight;
uniform vec3 uLightDir,uArtSun,uArtShade,uArtFoliage;
uniform vec4 uArtParams,uArtShape;
uniform float uNight,uNightLight,uExposure,uSurfaceType,uArtHighlight,uArtVolcanicGlow,uLeafStrength,uCrown;
${colorFunctions}
${artLightingFunctions}`;
export const impostorLightingColor=`vec3 base=sRGBTransferOETF(vec4(c.rgb/max(c.a,.0001),1.)).rgb;
float leaf=smoothstep(.013,.115,base.g-base.r*.85)*smoothstep(.028,.12,base.g-base.b*.85)*uLeafStrength;
vec3 view=normalize(cameraPosition-vFarWorld);
// Approximate the same canopy envelope used by the near material; never bake time of day.
vec3 canopy=normalize(vFarRight*(vUv.x-.5)*1.8+vFarFacing*.5+vec3(0.,(vRelativeHeight-uCrown)*2.5+.13,0.));
vec3 bark=normalize(vFarFacing+vFarRight*(vUv.x-.5)*.3+vec3(0.,.3,0.));
vec3 normal=normalize(mix(bark,normalize(mix(vec3(0.,1.,0.),canopy,uArtShape.x)),leaf));
vec3 graded=artLighting416(base,view,normal,view,leaf,.8,mix(.80,1.,smoothstep(0.,.22,vRelativeHeight)),0.);
gl_FragColor=vec4(toLinear4(graded),1.);`;
export function impostorLightingUniforms(toon,source){return {...toon.uniforms,...toon.artUniforms,uSurfaceType:{value:1},uCrown:{value:source.material.userData.artBounds?.crown??.68},uLeafStrength:{value:source.material.userData.nativeSurface?.params[2]??1}};}

export const normalAtlasDeclarations=`uniform sampler2D uNormalAtlas;uniform float uNormalAtlasEnabled;
varying vec2 vFarRotation;varying vec3 vFarScale;
vec4 normalAt(float index){vec2 cell=vec2(clamp(vUv.x,.5/256.,255.5/256.),vUv.y);return texture2D(uNormalAtlas,vec2((mod(index,8.)+cell.x)/8.,cell.y));}`;
const normalAtlasSelection=`vec3 normal;bool usedAtlasNormal=false;
if(uNormalAtlasEnabled>.5){
 vec4 sampleNormal=uBlend>.5?mix(normalAt(first),normalAt(first+1.),fract(vView)):normalAt(floor(vView+.5));
 vec3 localNormal=sampleNormal.rgb/max(sampleNormal.a,.0001)*2.-1.;
 if(sampleNormal.a>.01&&dot(localNormal,localNormal)>.0025){
  localNormal/=max(vFarScale,vec3(.0001));
  normal=normalize(vec3(vFarRotation.x*localNormal.x+vFarRotation.y*localNormal.z,localNormal.y,-vFarRotation.y*localNormal.x+vFarRotation.x*localNormal.z));usedAtlasNormal=true;
 }
}
`;
export function normalAtlasLightingColor(){
 const start=impostorLightingColor.indexOf('vec3 canopy='),end=impostorLightingColor.indexOf('vec3 graded=');
 const fallback=impostorLightingColor.slice(start,end).replace('vec3 normal=','normal=');
 return impostorLightingColor.slice(0,start)+normalAtlasSelection+'if(!usedAtlasNormal){'+fallback+'}\n'+impostorLightingColor.slice(end);
}
export function decodedImpostorNormal(rgb,alpha,tree,fallback=[0,1,0]){
 const local=rgb.map(value=>value/Math.max(alpha,.0001)*2-1);
 if(alpha<=.01||Math.hypot(...local)<=.05)return [...fallback];
 const x=local[0]/(tree.sx??tree.scale??1),y=local[1]/(tree.sy??tree.scale??1),z=local[2]/(tree.sz??tree.scale??1),c=Math.cos(tree.yaw),s=Math.sin(tree.yaw),world=[c*x+s*z,y,-s*x+c*z],length=Math.hypot(...world);
 return world.map(value=>value/length);
}
