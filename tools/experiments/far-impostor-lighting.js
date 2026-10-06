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
