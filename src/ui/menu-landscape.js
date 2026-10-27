// Layered sanctuary art; rendered by the existing menu frame loop.
const menuPlateFS=`#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uPlate; uniform vec2 uAspect,uOffset;
uniform float uScale,uOpacity,uHDR;
layout(location=0) out vec4 sceneColor; layout(location=1) out vec4 glowColor;
${lightingFunctions}
vec3 plateInverseACES(vec3 y){vec3 a=2.51-2.43*y,b=.03-.59*y;return (-b+sqrt(max(b*b+.56*a*y,vec3(0.))))/(2.*a);}
void main(){
 vec2 uv=(vUV-.5)*uAspect/uScale+.5+uOffset; uv.y=1.-uv.y;
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))discard;
 vec4 texel=texture(uPlate,uv); float alpha=texel.a*uOpacity;
 if(alpha<.002)discard;
 vec3 c=clamp(srgbToLinear(texel.rgb),0.,.94);
 sceneColor=vec4(uHDR>.5?plateInverseACES(c):c,alpha);glowColor=vec4(0.);
}`;
let menuForegroundTex,menuSupportTex;
async function loadMenuPlate(url){
 const response=await fetch(url);if(!response.ok)throw Error('Missing menu artwork: '+url);
 const bitmap=await createImageBitmap(await response.blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
 try{return makeTexture(bitmap);}finally{bitmap.close();}
}
function drawMenuPlate(foreground){
 const p=programs.plate,aspect=W/H,artAspect=1672/941;
 gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.useProgram(p);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 bindTex(p,'uPlate',foreground?menuForegroundTex:bgTex,0);
 u2(p,'uAspect',Math.min(1,aspect/artAspect),Math.min(1,artAspect/aspect));
 const movement=opts.reduced?0:1;
 u2(p,'uOffset',parallax[0]*(foreground?.016:.004)*movement,parallax[1]*(foreground?.009:.002)*movement);
 u1(p,'uScale',foreground?1.035+travel*3.5:1.025+travel*.14);
 u1(p,'uOpacity',1);u1(p,'uHDR',gl.hdr?1:0);
 drawQuad();gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);
}

// The near surface uses the same camera as the totem, with fixed world UVs.
const menuSupportVS=`#version 300 es
uniform mat4 uVP;out vec3 vSupportWorld;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vSupportWorld=vec3((p.x-.5)*40.,-.072,(p.y-.5)*36.+.4);gl_Position=uVP*vec4(vSupportWorld,1.);}`;
const menuSupportFS=`#version 300 es
precision highp float;
in vec3 vSupportWorld;uniform sampler2D uPlate;uniform float uHDR;
layout(location=0)out vec4 sceneColor;layout(location=1)out vec4 glowColor;
${lightingFunctions}
vec3 supportInverseACES(vec3 y){vec3 a=2.51-2.43*y,b=.03-.59*y;return (-b+sqrt(max(b*b+.56*a*y,vec3(0.))))/(2.*a);}
void main(){vec2 uv=vSupportWorld.xz/vec2(30.,26.)+.5;
 float radius=length(vSupportWorld.xz/vec2(15.,13.));float alpha=1.-smoothstep(.42,1.,radius);if(alpha<.002)discard;
 vec3 c=clamp(srgbToLinear(texture(uPlate,uv).rgb),0.,.94);float shade=exp(-dot(vSupportWorld.xz/vec2(6.5,6.),vSupportWorld.xz/vec2(6.5,6.))*4.8)*.56;
 c=(uHDR>.5?supportInverseACES(c):c)*(1.-shade);sceneColor=vec4(c,alpha);glowColor=vec4(0.);
}`;
function drawMenuSupport(){
 const p=programs.ground;gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.useProgram(p);um(p,'uVP',VP);u1(p,'uHDR',gl.hdr?1:0);bindTex(p,'uPlate',menuSupportTex,0);drawQuad();gl.disable(gl.BLEND);gl.depthMask(true);
}
