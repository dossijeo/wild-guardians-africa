(async () => {
'use strict';
const $=id=>document.getElementById(id), TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],scale:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)},lerp:(a,b,t)=>a.map((v,i)=>mix(v,b[i],t))};
const M={
 I:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul:(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[r+4]*b[c*4+1]+a[r+8]*b[c*4+2]+a[r+12]*b[c*4+3];return o},
 tr:p=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,p[0],p[1],p[2],1]),
 sc:s=>new Float32Array([s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,0,0,0,1]),
 rx:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])},
 ry:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])},
 rz:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])},
 model:(p=[0,0,0],r=[0,0,0],s=[1,1,1])=>M.mul(M.tr(p),M.mul(M.rz(r[2]),M.mul(M.ry(r[1]),M.mul(M.rx(r[0]),M.sc(s))))),
 pt:(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]],
 normal:(m,n)=>{let d0=m[0]**2+m[1]**2+m[2]**2,d1=m[4]**2+m[5]**2+m[6]**2,d2=m[8]**2+m[9]**2+m[10]**2;return V.norm([m[0]*n[0]/d0+m[4]*n[1]/d1+m[8]*n[2]/d2,m[1]*n[0]/d0+m[5]*n[1]/d1+m[9]*n[2]/d2,m[2]*n[0]/d0+m[6]*n[1]/d1+m[10]*n[2]/d2])},
 perspective:(fov,ar,n,f)=>{const t=1/Math.tan(fov/2);return new Float32Array([t/ar,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0])},
 ortho:(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]),
 look:(eye,tar,up=[0,1,0])=>{const z=V.norm(V.sub(eye,tar)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])}
};
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
function color(s){if(Array.isArray(s))return s;let n=parseInt(s.replace('#',''),16);return [linear((n>>16&255)/255),linear((n>>8&255)/255),linear((n&255)/255)]}
let seed=7131;function random(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296}const rand=(a=0,b=1)=>a+(b-a)*random();const choose=a=>a[Math.floor(random()*a.length)];
const settings={density:1,speed:1,wind:.3,nightFill:.14,quality:'high',cycleDuration:60,showProxy:true,showTarget:true,shake:false,layers:{telegraph:true,textures:true,ribbons:true,dust:true,fragments:true,lights:true}};
const canvas=$('scene'), gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
if(!gl)throw new Error('Este laboratorio necesita WebGL 2. Ábrelo en una pestaña de Chrome, Edge, Firefox o Safari con aceleración gráfica, no en la previsualización de archivos.');
const floatRT=!!gl.getExtension('EXT_color_buffer_float');
let drawCalls=0, width=0,height=0,dpr=1, mainRT=null,depthRT=null,shadowRT=null;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function program(vs,fs){const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));const u={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const a=gl.getActiveUniform(p,i);u[a.name]={loc:gl.getUniformLocation(p,a.name),type:a.type}}return {p,u}}
function uniforms(p,values){for(const [n,v]of Object.entries(values)){const a=p.u[n];if(!a)continue;switch(a.type){case gl.FLOAT:gl.uniform1f(a.loc,v);break;case gl.INT:case gl.BOOL:case gl.SAMPLER_2D:gl.uniform1i(a.loc,v);break;case gl.FLOAT_VEC2:gl.uniform2fv(a.loc,v);break;case gl.FLOAT_VEC3:gl.uniform3fv(a.loc,v);break;case gl.FLOAT_VEC4:gl.uniform4fv(a.loc,v);break;case gl.FLOAT_MAT4:gl.uniformMatrix4fv(a.loc,false,v);break;}}}
const vsFull=`#version 300 es
precision highp float;
out vec2 vUV;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const worldVertex=`
layout(location=0)in vec3 aPosition;
layout(location=1)in vec3 aNormal;
layout(location=2)in vec3 aColor;
layout(location=3)in vec4 aMaterial;
layout(location=4)in mat4 iModel;
layout(location=8)in vec3 iColor;
layout(location=9)in vec4 iMaterial;
uniform mat4 uVP,uModel;uniform bool uInst;uniform float uTime,uWind;
vec3 windy(vec3 p,float kind){if(kind>3.5&&kind<4.5){float h=max(p.y-.22,0.);p.x+=sin(uTime*1.6+p.x*1.8+p.z)*h*h*.016*uWind;p.z+=cos(uTime*1.3+p.z*1.4)*h*.014*uWind;}return p;}
`;
const meshP=program(`#version 300 es
precision highp float;${worldVertex}
uniform mat4 uView,uShadowVP;out vec3 vW,vN,vC;out vec4 vMat,vShadow;out float vDistance;
void main(){mat4 m=uInst?iModel:uModel;vec4 mat=uInst?iMaterial:aMaterial;vec3 wp=(m*vec4(aPosition,1.)).xyz;wp=windy(wp,mat.x);vW=wp;
vec3 c0=m[0].xyz,c1=m[1].xyz,c2=m[2].xyz;vN=normalize(c0*aNormal.x/max(dot(c0,c0),1e-6)+c1*aNormal.y/max(dot(c1,c1),1e-6)+c2*aNormal.z/max(dot(c2,c2),1e-6));vC=aColor*(uInst?iColor:vec3(1.));vMat=mat;vShadow=uShadowVP*vec4(wp+vN*.02,1.);vDistance=-(uView*vec4(wp,1.)).z;gl_Position=uVP*vec4(wp,1.);}
`,`#version 300 es
precision highp float;
in vec3 vW,vN,vC;in vec4 vMat,vShadow;in float vDistance;
uniform vec3 uEye,uSunDir,uSun,uSky,uGround,uLightPos0,uLightPos1,uLightCol0,uLightCol1;uniform sampler2D uShadow;uniform vec2 uShadowTexel;uniform float uWet,uNight;out vec4 fragColor;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float shadow(float nl){vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;float s=0.;float bias=.001+.0015*(1.-nl);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float z=texture(uShadow,p.xy+vec2(x,y)*uShadowTexel*1.2).r;s+=step(p.z-bias,z);}return s/9.;}
vec3 pointLight(vec3 p,vec3 c,vec3 n,vec3 v,float rough){vec3 d=p-vW;float d2=dot(d,d);vec3 l=normalize(d);float diffuse=max(dot(n,l),0.);float spec=pow(max(dot(n,normalize(l+v)),0.),mix(90.,8.,rough))*.15;return c*(vC*diffuse+spec)/(1.+d2*2.2);}
void main(){vec3 n=normalize(vN),v=normalize(uEye-vW);if(!gl_FrontFacing)n=-n;vec3 base=vC;float rough=vMat.y, kind=vMat.x;float tex=1.;
if(kind<.5){float n0=noise(vW*3.5),n1=noise(vW*45.);tex=.87+.19*n0+.095*n1;float wet=(1.-smoothstep(.35,.76,length(vW.xz-vec2(.05,.06))))*uWet*step(.08,vW.y)*step(vW.y,.2);base*=mix(1.,.52,wet);rough=mix(rough,.28,wet);}
else if(kind<1.5){float lines=sin(vW.y*2.+sin(vW.x*38.+sin(vW.z*25.))*1.9+vW.x*50.+vW.z*30.);tex=.89+.11*lines;tex*=.94+.1*noise(vW*25.);}
else if(kind<3.5){tex=.92+.12*noise(vW*11.)+.025*noise(vW*72.);}
else if(kind>6.5){float a=sin(vW.y*90.),b=sin((vW.x+vW.z)*62.);tex=.8+.2*smoothstep(-.4,.4,a*b);}
base*=tex;float nl=max(dot(n,uSunDir),0.);float sh=shadow(nl);float hemi=n.y*.5+.5;vec3 ambient=mix(uGround,uSky,hemi)*vMat.z;
float power=mix(140.,8.,rough);vec3 halfv=normalize(uSunDir+v);float spec=pow(max(dot(n,halfv),0.),power)*mix(.4,.024,rough)*nl*sh;
float wrap=kind>3.5&&kind<4.5?max(dot(-n,uSunDir),0.)*.12:0.;vec3 c=base*(ambient+uSun*(nl*sh+wrap))+uSun*spec;
c+=pointLight(uLightPos0,uLightCol0,n,v,rough)+pointLight(uLightPos1,uLightCol1,n,v,rough);c+=base*vMat.w;
fragColor=vec4(max(c,vec3(0.)),1.);}
`);
const shadowP=program(`#version 300 es
precision highp float;${worldVertex}
void main(){mat4 m=uInst?iModel:uModel;vec4 mat=uInst?iMaterial:aMaterial;vec3 p=windy((m*vec4(aPosition,1.)).xyz,mat.x);gl_Position=uVP*vec4(p,1.);}
`,`#version 300 es
precision highp float;void main(){}`);
const skyP=program(vsFull,`#version 300 es
precision highp float;in vec2 vUV;uniform vec3 uTop,uBottom;uniform float uNight,uTime;out vec4 fragColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 uv=vUV;vec3 c=mix(uBottom,uTop,smoothstep(0.,1.,uv.y));c+=vec3(.015,.012,.005)*(1.-length((uv-vec2(.5,.55))*vec2(1.,.7)));
vec2 g=uv*vec2(140.,100.);vec2 id=floor(g),f=fract(g);float h=hash(id);float st=(1.-smoothstep(.015,.095,length(f-.5)))*step(.988,h)*smoothstep(.7,1.,uNight)*smoothstep(.25,.55,uv.y);c+=vec3(.45,.5,.55)*st;fragColor=vec4(c,1.);}
`);
const postP=program(vsFull,`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uImage;uniform vec2 uTexel;uniform float uExposure;out vec4 fragColor;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec2 uv=vUV;vec3 c=texture(uImage,uv).rgb;
vec3 n=texture(uImage,uv+vec2(0,uTexel.y)).rgb,s=texture(uImage,uv-vec2(0,uTexel.y)).rgb,e=texture(uImage,uv+vec2(uTexel.x,0)).rgb,w=texture(uImage,uv-vec2(uTexel.x,0)).rgb;float l=lum(c),ln=lum(n),ls=lum(s),le=lum(e),lw=lum(w);float lo=min(l,min(min(ln,ls),min(le,lw))),hi=max(l,max(max(ln,ls),max(le,lw)));float edge=smoothstep(.06,.3,(hi-lo)/(hi+.05));c=mix(c,(n+s+e+w+c*4.)/8.,edge*.38);
c=aces(c*uExposure);c=pow(c,vec3(1./2.2));float vign=smoothstep(.35,.83,length((uv-.5)*vec2(.9,1.)));c*=1.-vign*.075;fragColor=vec4(c,1.);}
`);
const spriteP=program(`#version 300 es
precision highp float;
layout(location=0)in vec2 aCorner;layout(location=1)in vec3 iPos;layout(location=2)in vec2 iSize;layout(location=3)in float iAngle;layout(location=4)in vec4 iRect;layout(location=5)in vec4 iNext;layout(location=6)in vec4 iColor;layout(location=7)in vec4 iParams;layout(location=8)in vec3 iDirection;
uniform mat4 uVP;uniform vec3 uRight,uUp,uEye;out vec2 vUV,vNext,vLocal;out vec4 vColor;out vec3 vW;out vec4 vParams;
void main(){vec3 right=uRight,up=uUp;if(iParams.y>.5&&iParams.y<1.5){right=vec3(1,0,0);up=vec3(0,0,1);}else if(iParams.y>1.5&&iParams.y<2.5){up=vec3(0,1,0);right=normalize(cross(up,uEye-iPos));}else if(iParams.y>3.5){vec3 nn=normalize(iDirection);right=normalize(cross(abs(nn.y)>.95?vec3(0,0,1):vec3(0,1,0),nn));up=normalize(cross(nn,right));}else if(iParams.y>2.5){up=normalize(iDirection);right=normalize(cross(up,uEye-iPos));}
float c=cos(iAngle),s=sin(iAngle);vec2 q=vec2(c*aCorner.x-s*aCorner.y,s*aCorner.x+c*aCorner.y)*iSize;
vW=iPos+right*q.x+up*q.y;gl_Position=uVP*vec4(vW,1.);vec2 uv=aCorner+.5;vLocal=uv;vUV=iRect.xy+uv*iRect.zw;vNext=iNext.xy+uv*iNext.zw;vColor=iColor;vParams=iParams;
}`,
`#version 300 es
precision highp float;in vec2 vUV,vNext,vLocal;in vec4 vColor;in vec3 vW;in vec4 vParams;uniform sampler2D uAtlas,uDepth;uniform vec2 uViewport;uniform vec3 uParticleLight,uEye,uLightPos0,uLightPos1,uLightCol0,uLightCol1;uniform float uNear,uFar;out vec4 fragColor;
float eyeDepth(float d){return 2.*uNear*uFar/(uFar+uNear-(d*2.-1.)*(uFar-uNear));}
void main(){vec4 tex=mix(texture(uAtlas,vUV),texture(uAtlas,vNext),vParams.x);float alpha=tex.a*vColor.a;float border=min(min(vLocal.x,1.-vLocal.x),min(vLocal.y,1.-vLocal.y));alpha*=smoothstep(0.,.045,border);
if(vParams.w>0.){float opaque=eyeDepth(texture(uDepth,gl_FragCoord.xy/uViewport).r);float here=eyeDepth(gl_FragCoord.z);alpha*=smoothstep(0.,vParams.w,opaque-here);}
alpha*=smoothstep(.3,.75,distance(uEye,vW));if(alpha<.002)discard;
vec3 illum=uParticleLight+uLightCol0/(1.+dot(vW-uLightPos0,vW-uLightPos0)*3.)*.3+uLightCol1/(1.+dot(vW-uLightPos1,vW-uLightPos1)*3.)*.3;
if(vParams.z>.01)illum=vec3(min(vParams.z,1.6));fragColor=vec4(tex.rgb*vColor.rgb*illum,clamp(alpha,0.,.94));}
`);
function texture2D(unit,tex){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex)}
function depthTexture(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function renderTarget(w,h,onlyDepth=false){const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);const depth=depthTexture(w,h);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,depth,0);let tex=null;if(!onlyDepth){tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,floatRT?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,floatRT?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);}else{gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);}if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('No se ha podido crear el búfer de renderizado.');gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {fbo,tex,depth,w,h}}
function disposeRT(r){if(!r)return;gl.deleteFramebuffer(r.fbo);gl.deleteTexture(r.depth);if(r.tex)gl.deleteTexture(r.tex)}
function resizeRenderer(){const d=Math.min(devicePixelRatio||1,settings.quality==='high'?1.65:1),w=Math.max(1,Math.round(canvas.clientWidth*d)),h=Math.max(1,Math.round(canvas.clientHeight*d));if(w!==width||h!==height){width=w;height=h;dpr=d;canvas.width=w;canvas.height=h;disposeRT(mainRT);disposeRT(depthRT);mainRT=renderTarget(w,h);depthRT=renderTarget(w,h,true);}const ss=settings.quality==='high'?1536:768;if(!shadowRT||shadowRT.w!==ss){disposeRT(shadowRT);shadowRT=renderTarget(ss,ss,true);}}
class Mesh {
 constructor(data){this.count=data.length/13;this.vao=gl.createVertexArray();this.buffer=gl.createBuffer();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);for(const[l,n,o]of[[0,3,0],[1,3,12],[2,3,24],[3,4,36]]){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,52,o);}gl.bindVertexArray(null);this.instanceBuffer=null;this.instances=0;}
 instancesFrom(data,n){if(!this.instanceBuffer){this.instanceBuffer=gl.createBuffer();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,256*23*4,gl.DYNAMIC_DRAW);for(let c=0;c<4;c++){gl.enableVertexAttribArray(4+c);gl.vertexAttribPointer(4+c,4,gl.FLOAT,false,92,c*16);gl.vertexAttribDivisor(4+c,1);}for(const [l,n,o]of[[8,3,64],[9,4,76]]){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,92,o);gl.vertexAttribDivisor(l,1);}gl.bindVertexArray(null);}gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,n*23));this.instances=n;}
 draw(p,model=M.I(),inst=false){if(!this.count||inst&&!this.instances)return;uniforms(p,{uModel:model,uInst:inst});gl.bindVertexArray(this.vao);if(inst)gl.drawArraysInstanced(gl.TRIANGLES,0,this.count,this.instances);else gl.drawArrays(gl.TRIANGLES,0,this.count);drawCalls++;}
 dispose(){gl.deleteVertexArray(this.vao);gl.deleteBuffer(this.buffer);if(this.instanceBuffer)gl.deleteBuffer(this.instanceBuffer);}
}
const ASSETS=JSON.parse($('embedded-assets').textContent);
const atlasTexture=gl.createTexture();
const atlasImage=new Image();await new Promise((resolve,reject)=>{atlasImage.onload=resolve;atlasImage.onerror=()=>reject(Error('No se ha podido leer el atlas de texturas incrustado.'));atlasImage.src=ASSETS.atlas});
gl.bindTexture(gl.TEXTURE_2D,atlasTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlasImage);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
const spriteRects={};for(const a of ASSETS.resources){spriteRects[a.id]=[];const [x,y,w,h]=a.rect,[cols,rows]=a.grid;for(let i=0;i<(a.frames||cols*rows);i++){let xx=x+(i%cols)*w/cols,yy=y+Math.floor(i/cols)*h/rows;spriteRects[a.id].push([(xx+.7)/atlasImage.width,1-(yy+h/rows-.7)/atlasImage.height,(w/cols-1.4)/atlasImage.width,(h/rows-1.4)/atlasImage.height]);}}
const MAX_SPRITES=760,spriteData=new Float32Array(MAX_SPRITES*25),spriteVAO=gl.createVertexArray(),spriteVBO=gl.createBuffer(),quadVBO=gl.createBuffer();gl.bindVertexArray(spriteVAO);gl.bindBuffer(gl.ARRAY_BUFFER,quadVBO);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,spriteVBO);gl.bufferData(gl.ARRAY_BUFFER,spriteData.byteLength,gl.DYNAMIC_DRAW);for(const[l,n,o]of[[1,3,0],[2,2,12],[3,1,20],[4,4,24],[5,4,40],[6,4,56],[7,4,72],[8,3,88]]){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,100,o);gl.vertexAttribDivisor(l,1);}gl.bindVertexArray(null);
function paintSprites(list,env,cam){if(!list.length)return;list.sort((a,b)=>V.dot(V.sub(b.p,cam.eye),cam.forward)-V.dot(V.sub(a.p,cam.eye),cam.forward));const count=Math.min(MAX_SPRITES,list.length);for(let i=0;i<count;i++){const s=list[i],o=i*25;const frames=spriteRects[s.tex];const f=clamp(s.frame||0,0,frames.length-1),a=frames[Math.floor(f)],b=frames[Math.min(Math.floor(f)+1,frames.length-1)];spriteData.set(s.p,o);spriteData.set(s.size,o+3);spriteData[o+5]=s.angle||0;spriteData.set(a,o+6);spriteData.set(b,o+10);spriteData.set(s.col,o+14);spriteData[o+17]=s.alpha;spriteData.set([f%1,s.orient||0,s.emit||0,s.soft||0],o+18);spriteData.set(s.dir||[0,1,0],o+22);}
gl.useProgram(spriteP.p);uniforms(spriteP,{uVP:cam.vp,uRight:cam.right,uUp:cam.up,uEye:cam.eye,uAtlas:0,uDepth:1,uViewport:[width,height],uNear:cam.near,uFar:cam.far,uParticleLight:env.particle,uLightPos0:lightPos0,uLightPos1:lightPos1,uLightCol0:lightCol0,uLightCol1:lightCol1});texture2D(0,atlasTexture);texture2D(1,depthRT.depth);gl.bindVertexArray(spriteVAO);gl.bindBuffer(gl.ARRAY_BUFFER,spriteVBO);gl.bufferSubData(gl.ARRAY_BUFFER,0,spriteData.subarray(0,count*25));gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);drawCalls++;gl.depthMask(true);gl.disable(gl.BLEND);}

// Procedural study props. The pack provides VFX textures, not farm models.
function tri(out,a,b,c,na,nb=na,nc=na){if(V.dot(V.cross(V.sub(b,a),V.sub(c,a)),na)<0){[b,c]=[c,b];[nb,nc]=[nc,nb]}out.push(...a,...na,...b,...nb,...c,...nc)}
function roundedBox(w=1,h=1,d=1,r=.12,steps=5){const out=[],half=[w/2,h/2,d/2],inner=half.map(v=>Math.max(.001,v-r));const faces=[[[1,0,0],[0,0,-1],[0,1,0],d,h,w], [[-1,0,0],[0,0,1],[0,1,0],d,h,w],[[0,1,0],[1,0,0],[0,0,-1],w,d,h],[[0,-1,0],[1,0,0],[0,0,1],w,d,h],[[0,0,1],[1,0,0],[0,1,0],w,h,d],[[0,0,-1],[-1,0,0],[0,1,0],w,h,d]];
 for(const [n,u,v,uw,vh,dep]of faces){const at=(i,j)=>{const p=V.add(V.scale(n,dep/2),V.add(V.scale(u,(i/steps-.5)*uw),V.scale(v,(j/steps-.5)*vh)));const q=p.map((x,k)=>clamp(x,-inner[k],inner[k]));let nn=V.norm(V.sub(p,q));return {p:V.add(q,V.scale(nn,r)),n:nn}};for(let i=0;i<steps;i++)for(let j=0;j<steps;j++){const a=at(i,j),b=at(i+1,j),c=at(i+1,j+1),e=at(i,j+1);tri(out,a.p,b.p,c.p,a.n,b.n,c.n);tri(out,a.p,c.p,e.p,a.n,c.n,e.n)}}return out;}
function sphere(seg=16,rings=10,irregular=0){const o=[];const at=(i,j)=>{const p=i/seg*TAU,t=j/rings*Math.PI,n=[Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)],f=1+irregular*(Math.sin(p*3+1)*Math.sin(t*4)*.4+Math.sin(p*5-2)*Math.sin(t)*.3);return{p:V.scale(n,.5*f),n}};for(let i=0;i<seg;i++)for(let j=0;j<rings;j++){let a=at(i,j),b=at(i+1,j),c=at(i+1,j+1),d=at(i,j+1);tri(o,a.p,b.p,c.p,a.n,b.n,c.n);tri(o,a.p,c.p,d.p,a.n,c.n,d.n)}return o;}
function cylinder(r0=.5,r1=.5,h=1,seg=20,caps=true){const o=[];for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU,n0=V.norm([Math.cos(a),(r0-r1)/h,Math.sin(a)]),n1=V.norm([Math.cos(b),(r0-r1)/h,Math.sin(b)]),p0=[Math.cos(a)*r0,-h/2,Math.sin(a)*r0],p1=[Math.cos(b)*r0,-h/2,Math.sin(b)*r0],p2=[Math.cos(b)*r1,h/2,Math.sin(b)*r1],p3=[Math.cos(a)*r1,h/2,Math.sin(a)*r1];tri(o,p0,p1,p2,n0,n1,n1);tri(o,p0,p2,p3,n0,n1,n0);if(caps){tri(o,[0,h/2,0],p2,p3,[0,1,0]);tri(o,[0,-h/2,0],p0,p1,[0,-1,0]);}}return o;}
function torus(major=.5,minor=.04,seg=32,tube=7){const o=[];const at=(i,j)=>{let a=i/seg*TAU,b=j/tube*TAU,n=[Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b)];return{p:[(major+minor*Math.cos(b))*Math.cos(a),minor*Math.sin(b),(major+minor*Math.cos(b))*Math.sin(a)],n}};for(let i=0;i<seg;i++)for(let j=0;j<tube;j++){const a=at(i,j),b=at(i+1,j),c=at(i+1,j+1),d=at(i,j+1);tri(o,a.p,b.p,c.p,a.n,b.n,c.n);tri(o,a.p,c.p,d.p,a.n,c.n,d.n)}return o;}
function leafShape(){const o=[];const at=(i,side)=>{let t=i/8,w=Math.sin(t*Math.PI)**.8*.25;return [side*w,t,.22*Math.sin(t*Math.PI)+(side===0?.045:0)*Math.sin(t*Math.PI)]};for(let i=0;i<8;i++)for(let s=-1;s<1;s++){let a=at(i,s),b=at(i+1,s),c=at(i+1,s+1),d=at(i,s+1),n=V.norm(V.cross(V.sub(b,a),V.sub(c,a)));tri(o,a,b,c,n);n=V.norm(V.cross(V.sub(c,a),V.sub(d,a)));tri(o,a,c,d,n);}return o;}
function lathe(profile,seg=32){let o=[];for(let j=0;j<profile.length-1;j++){const [r0,y0]=profile[j],[r1,y1]=profile[j+1];for(let i=0;i<seg;i++){let a=i/seg*TAU,b=(i+1)/seg*TAU,n0=V.norm([Math.cos(a)*(y1-y0),r0-r1,Math.sin(a)*(y1-y0)]),n1=V.norm([Math.cos(b)*(y1-y0),r0-r1,Math.sin(b)*(y1-y0)]),p0=[r0*Math.cos(a),y0,r0*Math.sin(a)],p1=[r0*Math.cos(b),y0,r0*Math.sin(b)],p2=[r1*Math.cos(b),y1,r1*Math.sin(b)],p3=[r1*Math.cos(a),y1,r1*Math.sin(a)];tri(o,p0,p1,p2,n0,n1,n1);tri(o,p0,p2,p3,n0,n1,n0);}}return o;}
const G={box:roundedBox(),ball:sphere(18,12),rock:sphere(13,9,.24),leaf:leafShape(),cyl:cylinder(),small:sphere(10,7),ring:torus()};
class Builder{
 constructor(){this.data=[]}
 add(geo,p=[0,0,0],s=[1,1,1],c='#ffffff',mat=[2,.9,1,0],r=[0,0,0]){const m=M.model(p,r,s),col=color(c);for(let i=0;i<geo.length;i+=6){const wp=M.pt(m,geo.slice(i,i+3)),n=M.normal(m,geo.slice(i+3,i+6));this.data.push(...wp,...n,...col,...mat)}return this}
 box(p,s,c,kind=2,r=[0,0,0],rough=.86){return this.add(G.box,p,s,c,[kind,rough,1,0],r)}
 ball(p,s,c,kind=2,rough=.88){return this.add(G.ball,p,s,c,[kind,rough,1,0])}
 rod(a,b,r0,r1,c,kind=1){const d=V.sub(b,a),len=Math.hypot(...d),n=V.scale(d,1/len),side=V.norm(Math.abs(n[1])<.98?V.cross([0,1,0],n):V.cross([1,0,0],n)),forward=V.cross(side,n),mid=V.scale(V.add(a,b),.5),m=new Float32Array([side[0],side[1],side[2],0,n[0],n[1],n[2],0,forward[0],forward[1],forward[2],0,...mid,1]);const geo=cylinder(r0,r1,len,12);const col=color(c);for(let i=0;i<geo.length;i+=6){this.data.push(...M.pt(m,geo.slice(i,i+3)),...M.normal(m,geo.slice(i+3,i+6)),...col,kind,.9,1,0)}return this}
 mesh(){return new Mesh(this.data)}
}
function crop(b,x,z,scale=1){const root=.15;const h=.85*scale; b.rod([x,root,z],[x+.025,root+h,z],.022,.01,'#638345',4);for(let j=0;j<5;j++){const angle=j*2.38+x*2;const yy=root+.15*scale+j*.115*scale;const len=(.76-j*.058)*scale;b.add(G.leaf,[x,yy,z],[len*.8,len,len],'#6f973e',[4,.64,1,0],[.8+j*.07,angle,.15*Math.sin(angle)]);}b.add(G.ball,[x+.08,root+h*.77,z],[.115*scale,.36*scale,.13*scale],'#d5a646',[3,.78,1,0],[0,0,-.23]);}
function basket(b,p,s=1){b.add(lathe([[.2,0],[.31,.07],[.39,.39],[.39,.43],[.33,.44],[.31,.15],[.14,.08]],28),p,[s,s,s],'#bd8851',[7,.9,1,0]);b.add(torus(.37,.033,28,6),V.add(p,[0,.43*s,0]),[s,s,s],'#d6ad6b',[7,.86,1,0]);for(let i=0;i<4;i++){let a=i*2.5;b.ball(V.add(p,[Math.cos(a)*.13*s,.28*s,Math.sin(a)*.13*s]),[.21*s,.22*s,.2*s],choose(['#c99742','#ba7737','#d0a354']),3)}}
function tree(b,x,z,s=1){b.rod([x,0,z],[x+.1*s,1.35*s,z],.17*s,.105*s,'#735536');b.rod([x+.08*s,.85*s,z],[x-.55*s,1.72*s,z+.08*s],.09*s,.04*s,'#80603e');b.rod([x+.08*s,1.15*s,z],[x+.54*s,1.93*s,z-.13*s],.08*s,.04*s,'#80603e');b.rod([x+.1*s,1.3*s,z],[x+.1*s,2.13*s,z+.27*s],.07*s,.03*s,'#80603e');const blobs=[[-.65,1.9,.03,1.4,.7,1.15],[.05,2.14,.22,1.7,.65,1.3],[.74,2.05,-.1,1.5,.65,1.1],[-.1,2.32,-.16,1.6,.5,1.1]];for(let i=0;i<blobs.length;i++){let [a,y,c,w,h,d]=blobs[i];b.add(G.rock,[x+a*s,y*s,z+c*s],[w*s,h*s,d*s],['#677b38','#7d903f','#718538','#89974b'][i],[4,.87,1,0]);}}
function buildBackground(){const b=new Builder();seed=804;
 b.add(lathe([[4.24,-.73],[4.51,-.63],[4.65,-.29],[4.62,-.065],[4.52,0]],80),[0,0,0],[1,1,1],'#967450',[3,.97,1,0]);b.add(cylinder(4.52,4.52,.035,80),[0,-.016,0],[1,1,1],'#c1a575',[0,.98,1,0]);b.add(torus(4.5,.02,100,5),[0,-.012,0],[1,1,1],'#d0b788',[0,.98,1,0]);
 tree(b,-3.2,-1.65,.84);
 for(let i=0;i<13;i++){let a=rand(0,TAU),r=rand(3.35,4.18),x=Math.cos(a)*r,z=Math.sin(a)*r;const s=rand(.2,.48);b.add(G.rock,[x,s*.22,z],[s,s*.6,s*.87],choose(['#8d8778','#a49984','#9e9682']),[2,.94,.95,0],[rand(-.2,.2),rand(0,TAU),rand(-.2,.2)]);}
 for(let i=0;i<88;i++){let a=rand(0,TAU),r=rand(2.35,4.2),x=Math.cos(a)*r,z=Math.sin(a)*r;if(x<-2.2&&z<-1)continue;let s=rand(.14,.31);for(let j=0;j<3;j++)b.add(G.leaf,[x,0,z],[s*.45,s,s*.8],choose(['#92945d','#a6a166','#8e9256','#b2a371']),[4,.92,1,0],[rand(.25,.75),rand(0,TAU),rand(-.25,.25)]);}
 // Small sandstone stack and a terracotta jar give scale without distracting from the test.
 for(const [x,y,z,s]of[[2.8,.18,-1.95,.7],[3.18,.12,-1.65,.43],[2.63,.28,-2.17,.6]])b.add(G.rock,[x,y,z],[s,s*.73,s*.8],'#a89a7f',[2,.93,.96,0]);
 b.add(lathe([[.12,0],[.28,.06],[.38,.31],[.33,.57],[.19,.72],[.2,.77],[.15,.78],[.13,.7]],28),[2.5,0,-1.13],[1,1,1],'#ad7050',[3,.85,1,0]);b.add(cylinder(.12,.12,.01,24),[2.5,.685,-1.13],[1,1,1],'#443d2c',[3,1,.6,0]);
 // Three inset calibration pebbles, intentionally unlit.
 for(let i=0;i<3;i++)b.add(G.small,[-.24+i*.24,.008,3.56],[.1,.038,.16],'#dcc7a1',[2,.86,1,0]);return b.mesh();}
const backgroundMesh=buildBackground();
let stationMesh=null,wallMesh=null,toolMesh=null,toolModel=M.I(),toolVisible=false,wallVisible=true,wallBlocks=[];
const style={soil:[0,.97,1,0],wood:[1,.91,1,0],adobe:[3,.95,1,0],stone:[2,.9,1,0],leaf:[4,.75,1,0],water:[5,.13,1,0],corn:[3,.75,1,0]};
function makeWaterCan(){const b=new Builder();b.add(cylinder(.24,.29,.42,28),[0,0,0],[1,1,1],'#648e89',[5,.32,1,0]);b.add(torus(.275,.018,30,6),[0,.21,0],[1,1,1],'#83aaa1',[5,.3,1,0]);b.add(cylinder(.245,.245,.014,28),[0,.205,0],[1,1,1],'#344a43',[2,.95,1,0]);b.add(torus(.27,.035,28,7),[-.26,.07,0],[.76,1,1],'#648e89',[5,.35,1,0],[Math.PI/2,0,0]);b.rod([.17,-.09,0],[.6,.22,0],.065,.085,'#769d93',5);b.add(G.ball,[.61,.225,0],[.13,.13,.2],'#b8ba9d',[5,.48,1,0]);return b.mesh();}
function makeHoe(){const b=new Builder();b.rod([0,-.86,0],[0,.72,0],.028,.025,'#bf955e');b.box([0,-.87,.075],[.26,.06,.31],'#727d73',5,[-.12,0,0],.5);return b.mesh();}
function buildStation(id){
 disposeProxy();for(const m of[stationMesh,wallMesh,toolMesh])if(m)m.dispose();stationMesh=wallMesh=toolMesh=null;wallVisible=true;wallBlocks=[];toolVisible=false;const b=new Builder(),w=new Builder();seed=185+id.length*9;
 if(['dig','water','harvest'].includes(id)){
  b.add(roundedBox(2.5,.18,2.12,.085,5),[0,.06,0],[1,1,1],'#795839',style.soil);b.rod([-1.31,.08,-1.13],[1.29,.08,-1.13],.055,.045,'#987044');b.rod([-1.31,.08,1.12],[1.29,.08,1.12],.048,.055,'#987044');
  for(let i=-1;i<=1;i++)b.add(G.ball,[i*.69,.12,0],[.33,.1,1.8],'#6d4c31',style.soil);
  for(const [x,z]of[[-.88,-.62],[.77,-.62],[-.85,.58],[.86,.57]])crop(b,x,z,id==='harvest'?1.12:.74);
  basket(b,[-1.75,0,1.07],.83);
  if(id==='water')toolMesh=makeWaterCan();if(id==='dig')toolMesh=makeHoe();
 }else if(id==='dust'){
  // Scattered pebbles along a small dry path; no pointless glowing emitter marker.
  for(let i=0;i<8;i++){const x=rand(-1.6,1.6),z=choose([-1,1])*rand(.65,.9);b.add(G.rock,[x,.025,z],[.09,.05,.08],'#b8a383',style.stone);}
 }else if(['wood','adobe','stone'].includes(id)){
  b.add(roundedBox(3.15,.08,1.4,.035,4),[0,.025,0],[1,1,1],'#b29d7a',[0,.98,1,0]);
  if(id==='wood'){
   for(let i=-1;i<=1;i++){let x=i*.78;w.add(cylinder(.125,.112,1.6,20),[x,.84,0],[1,1,1],i%2?'#9e7448':'#ae8453',style.wood);w.add(cylinder(.112,.112,.012,20),[x,1.646,0],[1,1,1],'#d0ab6e',style.wood);}
   for(const y of [.5,1.13]){w.box([0,y,.015],[2.26,.18,.145],'#b18b56',1);for(let x of[-.79,0,.79])w.add(torus(.126,.014,16,5),[x,y,.005],[1,1,1],'#d3b681',[7,.92,1,0],[Math.PI/2,0,0]);}
  }else{
   const isStone=id==='stone';for(let row=0;row<4;row++)for(let col=0;col<5;col++){const p=[(col-2)*.51+(row%2?.09:-.03),.23+row*.34,-.02+rand(-.025,.025)],s=[.48+rand(-.025,.025),.315+rand(-.016,.016),.5+rand(-.025,.025)],r=[rand(-.018,.018),rand(-.025,.025),rand(-.015,.015)];const c=isStone?choose(['#92948b','#a3a499','#8c928b','#b4b1a0']):choose(['#b77956','#ba805b','#ac704f','#c38860']);w.add(G.box,p,s,c,isStone?style.stone:style.adobe,r);wallBlocks.push({p,s,r,c,kind:isStone?'stone':'adobe'});}
   w.box([0,.083,0],[2.85,.09,.66],isStone?'#777b6f':'#936847',isStone?2:3);
  }
  wallMesh=w.mesh();
 }else if(['spirit','shield','repel','heal'].includes(id)){
  for(let i=0;i<5;i++){const a=i/5*TAU;b.add(G.rock,[Math.cos(a)*.49,.13,Math.sin(a)*.4],[.5,.29,.42],choose(['#9a9d8d','#969787','#b0ac97']),style.stone,[0,a,0]);}
  b.add(cylinder(.29,.23,1.23,24),[0,.73,0],[1,1,1],'#926e47',style.wood);b.add(G.ball,[0,1.22,.04],[.81,.72,.48],'#b28e58',style.wood);
  // Carved inset eyes and a small nose. These are shapes, not a borrowed character.
  for(let s of[-1,1]){b.add(G.box,[s*.19,1.29,.246],[.2,.09,.042],'#3b4737',[2,.9,1,0],[0,0,s*-.18]);b.add(G.box,[s*.19,1.296,.27],[.125,.029,.016],'#9cd5b2',[6,.5,1,.34],[0,0,s*-.18]);}
  b.add(G.rock,[0,1.15,.28],[.12,.2,.13],'#c9a66a',style.wood);b.add(G.box,[0,.975,.255],[.2,.028,.02],'#635735',style.wood);
  b.rod([-.22,1.4,0],[-.48,1.79,-.04],.068,.031,'#9d784d');b.rod([.23,1.4,0],[.48,1.69,.0],.065,.028,'#9d784d');b.add(G.leaf,[-.45,1.68,0],[.3,.43,.35],'#7f9b4d',style.leaf,[.3,-1,.8]);
  b.add(torus(.82,.015,56,5),[0,.005,0],[1,1,1],'#c5b38c',[0,.95,1,0]);
 }
 if(BEAST_IDS.includes(id)||id==='stun'){makeProxy(id==='stun'?'hyena':id==='roar'?'lion':id);makeTarget(b,id);}
 stationMesh=b.mesh();}
const rigidGeo={soil:new Builder().add(G.rock).mesh(),wood:new Builder().add(roundedBox(1,1,1,.07,3)).mesh(),stone:new Builder().add(G.rock).mesh(),adobe:new Builder().add(G.box).mesh(),leaf:new Builder().add(G.leaf,[0,-.5,0]).mesh(),water:new Builder().add(G.small).mesh(),corn:new Builder().add(G.ball).mesh()};
const rigidBuffers=Object.fromEntries(Object.keys(rigidGeo).map(k=>[k,new Float32Array(256*23)]));
const cam={yaw:.55,pitch:.61,dist:11.9,target:[0,.4,0],eye:[0,0,0],right:[1,0,0],up:[0,1,0],forward:[0,0,-1],view:M.I(),vp:M.I(),near:.1,far:65};
function updateCamera(){const cp=Math.cos(cam.pitch),d=[Math.sin(cam.yaw)*cp,Math.sin(cam.pitch),Math.cos(cam.yaw)*cp];cam.eye=V.add(cam.target,V.scale(d,cam.dist));cam.forward=V.norm(V.sub(cam.target,cam.eye));cam.right=V.norm(V.cross(cam.forward,[0,1,0]));cam.up=V.cross(cam.right,cam.forward);cam.view=M.look(cam.eye,cam.target);cam.vp=M.mul(M.perspective((width<height?48:43)*Math.PI/180,width/height,cam.near,cam.far),cam.view);}
let lightPos0=[0,1,0],lightPos1=[0,1,0],lightCol0=[0,0,0],lightCol1=[0,0,0];
let environmentMode='sunset',environmentValue=.43,environmentTarget=.43,cycleClock=0;
function environment(dt){if(environmentMode==='auto'){cycleClock+=dt;environmentTarget=(1-Math.cos(cycleClock/settings.cycleDuration*TAU))*.5;}environmentValue=mix(environmentValue,environmentTarget,1-Math.exp(-dt*4.2));if(environmentMode!=='auto'&&Math.abs(environmentValue-environmentTarget)<.00008)environmentValue=environmentTarget;const v=environmentValue;
 const t=clamp(v/.46),n=smooth(.42,1,v);let sun=V.lerp([1.9,1.73,1.37],[1.34,.83,.4],t);sun=V.lerp(sun,[.105,.154,.25],n);
 let sky=V.lerp([.39,.44,.4],[.26,.29,.27],t);sky=V.lerp(sky,[settings.nightFill*.65,settings.nightFill*.9,settings.nightFill*1.38],n);
 let ground=V.lerp([.15,.115,.066],[.014,.021,.034],n);
 let top=V.lerp(color('#718b8c'),color('#717a78'),t);top=V.lerp(top,color('#111f30'),n);
 let bottom=V.lerp(color('#c5c9af'),color('#c4ab85'),t);bottom=V.lerp(bottom,color('#293841'),n);
 let dir=V.norm(V.lerp([-.5,.8,.34],[-.64,.42,.46],t));dir=V.norm(V.lerp(dir,[.35,.68,-.63],n));
 const shadowVP=M.mul(M.ortho(-6.3,6.3,-6.3,6.3,.1,26),M.look(V.scale(dir,12),[0,0,0]));
 return {night:n,sun,sky,ground,dir,top,bottom,shadowVP,particle:V.add(V.scale(sky,.95),V.scale(sun,.4))};}

// Test maquettes only. No final character models, wall health or structural destruction.
const BEAST_IDS=['rhino','lion','buffalo','warthog','hyena','roar'];
let proxy=null,proxyRoot=M.I(),proxyHead=M.I(),proxyGait=0,proxyBob=0;
function disposeProxy(){if(proxy){for(const m of Object.values(proxy))if(m?.dispose)m.dispose();proxy=null;}}
function horn(b,points,r,c='#e7d9ae') {for(let j=0;j<points.length-1;j++)b.rod(points[j],points[j+1],r*(1-j/points.length),j===points.length-2?.003:r*(1-(j+1)/points.length),c,3);}
function makeProxy(type){
 const b=new Builder(),h=new Builder(),l=new Builder();
 const palette={rhino:['#777b72','#919185','#b3b19e'],lion:['#c49a58','#b18a48','#875a34'],buffalo:['#615d50','#7a7361','#4b443a'],warthog:['#917957','#b09368','#654c35'],hyena:['#ab9267','#c3ae7c','#756046']};
 const [skin,light,dark]=palette[type]||palette.rhino;
 const sc=type==='hyena'?[1.28,.71,.59]:type==='lion'?[1.18,.8,.73]:type==='warthog'?[1.24,.8,.81]:[1.37,.99,.93];
 b.add(G.ball,[-.2,.79,0],sc,skin,[2,.89,1,0]);
 b.add(G.ball,[-.47,.88,0],[.72,.67,.76],light,[2,.92,1,0]);
 b.rod([-.76,.93,0],[-1.03,1.01,-.02],.06,.02,dark,2);
 if(type==='lion')b.add(G.ball,[-1.03,1.01,-.02],[.17,.18,.17],dark,[2,.96,1,0]);
 if(type==='hyena')for(let j=0;j<9;j++){let x=-.68+(j%3)*.28,y=.62+Math.floor(j/3)*.2;for(const z of[-1,1])b.add(G.small,[x,y,z*(.255+.015*Math.sin(j))],[.1,.08,.035],dark,[2,.99,1,0]);}
 if(type==='warthog'||type==='hyena')for(let j=0;j<5;j++)b.add(G.rock,[-.65+j*.19,1.13+.035*Math.sin(j),0],[.15,.22,.15],dark,[2,.94,1,0]);
 // Head space is attached to the front of the body at runtime.
 if(type==='lion'){
  for(let j=0;j<11;j++){const a=j/11*TAU;h.add(G.rock,[-.1,Math.cos(a)*.39,Math.sin(a)*.39],[.48,.32,.33],j%2?dark:'#93693c',[2,.95,1,0]);}
  h.add(G.ball,[.15,0,0],[.77,.74,.7],light,[2,.92,1,0]);h.add(G.ball,[.51,-.15,0],[.31,.28,.39],'#dbbc83',[2,.87,1,0]);
 }else{
  h.add(G.ball,[.08,-.015,0],type==='rhino'?[.92,.76,.76]:[.83,.76,.67],skin,[2,.89,1,0]);
  h.add(G.ball,[.5,-.17,0],[.5,.4,type==='warthog'?.53:.39],light,[2,.88,1,0]);
 }
 for(const sign of[-1,1]){
  h.add(G.ball,[-.12,.38,sign*.3],[.25,type==='hyena'?.4:.29,.16],skin,[2,.9,1,0]);
  h.add(G.ball,[-.085,.39,sign*.305],[.13,.18,.17],dark,[2,.97,1,0]);
  h.add(G.ball,[.28,.055,sign*.317],[.115,.105,.036],'#292d29',[2,.45,1,0]);
  h.add(G.small,[.299,.08,sign*.334],[.023,.025,.009],'#e0d3ac',[2,.4,1,0]);
  h.add(G.small,[.69,-.145,sign*.13],[.025,.063,.085],dark,[2,.9,1,0]);
 }
 if(type==='rhino'){horn(h,[[.63,.02,0],[.84,.24,0],[.9,.58,0]],.14);horn(h,[[.29,.29,0],[.39,.51,0],[.4,.58,0]],.087);}
 if(type==='buffalo')for(const s of[-1,1])horn(h,[[-.04,.29,s*.18],[.04,.22,s*.48],[.16,.32,s*.68],[.18,.68,s*.64]],.108);
 if(type==='warthog')for(const s of[-1,1])horn(h,[[.49,-.29,s*.2],[.63,-.18,s*.39],[.67,.13,s*.41],[.57,.32,s*.32]],.076);
 if(type==='hyena')for(const s of[-1,1])horn(h,[[.46,-.33,s*.15],[.51,-.23,s*.17]],.034);
 if(type==='lion')h.add(G.small,[.64,-.08,0],[.1,.095,.16],dark,[2,.63,1,0]);
 l.add(cylinder(.1,.14,.46,14),[0,-.22,0],[1,1,1],skin,[2,.9,1,0]);l.add(G.box,[.065,-.48,0],[.25,.17,.23],dark,[2,.94,1,0]);
 proxy={body:b.mesh(),head:h.mesh(),leg:l.mesh(),type};
}
function makeTarget(b,id){
 if(id==='buffalo'||id==='roar'||id==='stun')return;
 b.add(cylinder(.18,.14,1.32,22),[1.16,.69,0],[1,1,1],'#987449',style.wood);
 b.add(G.ball,[1.16,1.09,.015],[.72,.73,.34],'#bfa475',[7,.96,1,0]);
 b.add(torus(.32,.035,32,6),[1.16,1.1,.162],[1,1,1],'#836743',[7,.92,1,0],[Math.PI/2,0,0]);
 b.add(torus(.19,.025,32,6),[1.16,1.1,.192],[1,1,1],'#986f47',[7,.92,1,0],[Math.PI/2,0,0]);
 b.add(G.small,[1.16,1.1,.206],[.1,.1,.022],'#bb7750',[3,.9,1,0]);
 b.rod([.98,.22,-.22],[1.36,.06,.27],.052,.058,'#805b36');b.rod([.96,.06,.27],[1.4,.22,-.21],.057,.05,'#805b36');
}
function proxyPose(){
 const id=current.id,t=clock;let x=-1.95,y=0,lean=0,gait=0,s=.86,headTilt=0;
 if(id==='rhino'){const run=smooth(.88,1.65,t);x=mix(-2.38,-.24,run)-.1*Math.sin(smooth(1.72,2.1,t)*Math.PI);y=Math.sin(run*TAU*3)*.045*(run>0&&run<1?1:0);lean=-.08*smooth(.2,.8,t)+.1*smooth(1.7,2.2,t);gait=Math.sin(run*TAU*3)*.5;headTilt=-.17*smooth(.1,.7,t);}
 if(id==='lion'){x=mix(-1.8,-.1,smooth(.73,.99,t));let p=0;for(const at of[1.05,1.38,1.75])p+=Math.sin(clamp((t-at+.13)/.34)*Math.PI);y=.12*p;lean=.11*p;gait=.4*Math.sin(t*22)*(t>.74&&t<2?1:0);}
 if(id==='hyena'){x=mix(-1.85,-.06,smooth(.85,1.2,t))-.36*smooth(1.46,1.94,t);const jump=Math.sin(smooth(.85,1.42,t)*Math.PI);y=jump*.32;lean=.11*jump;gait=.48*jump;headTilt=-.1*jump;s=.82;}
 if(id==='warthog'){x=mix(-2.05,-.18,smooth(.7,1.2,t));const jump=Math.sin(smooth(1.02,1.75,t)*Math.PI);y=.2*jump;lean=.32*jump;gait=.45*jump;s=.83;}
 if(id==='buffalo'){x=-.72;const rear=smooth(.55,1.03,t)*(1-smooth(1.16,1.46,t));lean=.37*rear;y=.04*rear;gait=-rear*.42;}
 if(id==='roar'){x=-1.3;lean=.09*smooth(.5,.85,t)*(1-smooth(2.5,2.8,t));headTilt=.12*Math.sin(clamp((t-.6)/2)*Math.PI);}
 if(id==='stun'){x=0;headTilt=.07*Math.sin(t*7);s=.95;}
 proxyRoot=M.model([x,y,0],[0,0,lean],[s,s,s]);proxyHead=M.mul(proxyRoot,M.model([.39,.89,0],[0,0,headTilt],[1,1,1]));proxyGait=gait;proxyBob=y;
}
function drawProxy(p){if(!proxy||!settings.showProxy)return;proxyPose();proxy.body.draw(p,proxyRoot);proxy.head.draw(p,proxyHead);for(let i=0;i<4;i++){const xx=i<2?.31:-.65,zz=i%2?.27:-.27,phase=i===0||i===3?1:-1;proxy.leg.draw(p,M.mul(proxyRoot,M.model([xx,.56,zz],[0,0,phase*proxyGait],[1,1,1])));}}

// Transparent triangle geometry: warnings, tapered trails, waves and a true 3D shield.
// All sizes are world-space units. Alpha compositing + a single final tone map.
const fxP=program(`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;layout(location=2)in vec4 aColor;layout(location=3)in float aKind;
uniform mat4 uVP;out vec3 vW,vN;out vec4 vC;out float vKind;
void main(){vW=aPosition;vN=aNormal;vC=aColor;vKind=aKind;gl_Position=uVP*vec4(aPosition,1.);}
`,`#version 300 es
precision highp float;in vec3 vW,vN;in vec4 vC;in float vKind;uniform vec3 uEye;uniform float uTime;out vec4 fragColor;
void main(){float a=vC.a;vec3 c=vC.rgb;
 if(vKind>1.5){vec3 n=normalize(vN),v=normalize(uEye-vW);float rim=pow(1.-abs(dot(n,v)),2.3);vec2 uv=vec2(atan(n.z,n.x),asin(clamp(n.y,-1.,1.)))*5.2;
  // Nearest axial hexagon, converted to cube coordinates and rounded consistently.
  float q=uv.x*0.6666667,r=-uv.x*.3333333+uv.y*.5773503;vec3 cube=vec3(q,-q-r,r),rc=floor(cube+.5),err=abs(rc-cube);
  if(err.x>err.y&&err.x>err.z)rc.x=-rc.y-rc.z;else if(err.y>err.z)rc.y=-rc.x-rc.z;else rc.z=-rc.x-rc.y;
  vec2 hp=uv-vec2(1.5*rc.x,1.7320508*(rc.z+rc.x*.5));float edge=abs(max(abs(hp.y),abs(hp.x)*.8660254+abs(hp.y)*.5)-.8660254);
  float aa=max(fwidth(edge),.008);float line=(1.-smoothstep(.018,.038+aa,edge))*(1.-smoothstep(.9,.995,n.y));float scan=pow(max(0.,sin(vW.y*5.-uTime*2.8)),16.);
  a*=.032+rim*.72+line*.23+scan*.022;c*=.74+rim*.62+line*.12;
 }else if(vKind>.5){c*=1.12;}
 if(a<.002)discard;fragColor=vec4(min(c,vec3(1.7)),clamp(a,0.,.85));}
`);
const fxVAO=gl.createVertexArray(),fxVBO=gl.createBuffer(),MAX_FX_VERTS=48000;let fxVertices=[];
gl.bindVertexArray(fxVAO);gl.bindBuffer(gl.ARRAY_BUFFER,fxVBO);gl.bufferData(gl.ARRAY_BUFFER,MAX_FX_VERTS*44,gl.DYNAMIC_DRAW);
for(const[l,n,o]of[[0,3,0],[1,3,12],[2,4,24],[3,1,40]]){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,44,o);}gl.bindVertexArray(null);
function fxTri(a,b,c,col,alpha,kind=0,normals=null){if(alpha<.003)return;const n=normals||[V.norm(V.cross(V.sub(b,a),V.sub(c,a)))];for(const [i,p]of[a,b,c].entries())fxVertices.push(...p,...(n[i]||n[0]),...col,alpha,kind);}
function fxQuad(a,b,c,d,col,alpha,kind=0){fxTri(a,b,c,col,alpha,kind);fxTri(a,c,d,col,alpha,kind);}
function fxBand(p,r0,r1,a0,a1,c,alpha,U=[1,0,0],W=[0,0,1],steps=56,kind=0){if(r1<=r0||alpha<.003)return;const at=(r,a)=>V.add(p,V.add(V.scale(U,Math.cos(a)*r),V.scale(W,Math.sin(a)*r)));for(let i=0;i<steps;i++){const a=mix(a0,a1,i/steps),b=mix(a0,a1,(i+1)/steps);fxQuad(at(r0,a),at(r1,a),at(r1,b),at(r0,b),c,alpha,kind);}}
function fxLine(a,b,w,c,alpha,normal=[0,1,0]){const side=V.scale(V.norm(V.cross(V.sub(b,a),normal)),w*.5);fxQuad(V.add(a,side),V.sub(a,side),V.sub(b,side),V.add(b,side),c,alpha);}
function fxRibbon(path,normal,width,c,alpha,segments=36){if(alpha<.003)return;for(let j=0;j<segments;j++){const t0=j/segments,t1=(j+1)/segments,p0=path(t0),p1=path(t1),side=V.norm(V.cross(V.sub(p1,p0),normal)),w0=width*(.035+Math.sin(t0*Math.PI)**.7)*.5,w1=width*(.035+Math.sin(t1*Math.PI)**.7)*.5;fxQuad(V.add(p0,V.scale(side,w0)),V.sub(p0,V.scale(side,w0)),V.sub(p1,V.scale(side,w1)),V.add(p1,V.scale(side,w1)),c,alpha,1);}}
function arcRibbon(p,U,W,r,width,a0,a1,c,alpha){const n=V.norm(V.cross(U,W));fxRibbon(t=>V.add(p,V.add(V.scale(U,Math.cos(mix(a0,a1,t))*r),V.scale(W,Math.sin(mix(a0,a1,t))*r))),n,width,c,alpha);}
function warningCircle(p,r,t,c=color('#eea85e')){if(!settings.layers.telegraph||t<0||t>1)return;const pulse=.56+.14*Math.sin(t*TAU*4);const a=V.add(p,[0,.024,0]);fxBand(a,0,r,0,TAU,c,.065+ t*.04);fxBand(a,r-.032,r,0,TAU,c,pulse);fxBand(V.add(a,[0,.003,0]),r-.135,r-.085,-Math.PI/2,-Math.PI/2+t*TAU,c,.8);for(let j=0;j<12;j++){let u=j/12*TAU;fxBand(a,r+.04,r+.15,u-.012,u+.012,c,.5,[1,0,0],[0,0,1],1);}}
function warningLane(start,end,half,t){if(!settings.layers.telegraph||t<0||t>1)return;const c=color('#f0aa62'),y=.024,a=[start,y,-half],b=[end,y,-half],d=[start,y,half],e=[end,y,half];fxQuad(a,b,e,d,c,.085);fxLine(a,b,.028,c,.62);fxLine(d,e,.028,c,.62);fxLine(b,e,.025,c,.6);fxQuad(a,[mix(start,end,t),y,-half],[mix(start,end,t),y,half],d,c,.08);for(let j=0;j<6;j++){const x=mix(start+.15,end-.2,j/6),aa=.23+.6*smooth(j/6,j/6+.15,t);fxLine([x,y+.003,-half*.46],[x+.18,y+.003,0],.035,c,aa);fxLine([x+.18,y+.003,0],[x,y+.003,half*.46],.035,c,aa);}}
function warningCone(p,r,half,t){if(!settings.layers.telegraph||t<0||t>1)return;const c=color('#e9a46a'),q=V.add(p,[0,.025,0]);fxBand(q,.04,r,-half,half,c,.07+.02*t);fxBand(q,r-.035,r,-half,half,c,.62);fxBand(q,r-.15,r-.1,-half,mix(-half,half,t),c,.68);for(const a of[-half,half])fxLine(q,V.add(q,[Math.cos(a)*r,0,Math.sin(a)*r]),.027,c,.55);}
function shieldDome(radius,alpha){if(alpha<.005)return;const center=[0,.04,0],seg=48,rings=17,c=color('#7bcfb8');for(let i=0;i<seg;i++)for(let j=0;j<rings;j++){const at=(x,y)=>{let a=x/seg*TAU,t=y/rings*Math.PI/2,n=[Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)];return {p:V.add(center,[n[0]*radius,n[1]*radius*1.2,n[2]*radius]),n:V.norm([n[0],n[1]/1.2,n[2]])}};const a=at(i,j),b=at(i+1,j),d=at(i,j+1),e=at(i+1,j+1);fxTri(a.p,b.p,e.p,c,alpha,2,[a.n,b.n,e.n]);fxTri(a.p,e.p,d.p,c,alpha,2,[a.n,e.n,d.n]);}}
function attackWindow(start,length){const u=(clock-start)/length;return u<0||u>1?null:u;}
function composeGeometryFX(){fxVertices=[];const id=current.id,t=clock,amber=color('#eac18a'),ivory=color('#f7e2b4'),jade=color('#81d8b7'),blue=color('#91cfdb');
 if(id==='rhino'){warningLane(-2.7,1.38,.57,t/.91);const u=attackWindow(1.7,.64);if(u!==null&&settings.layers.ribbons){const r=.22+u*1.55;fxBand([.86,.65,0],r,r+.075*(1-u),0,TAU,ivory,.55*(1-u),[0,1,0],[0,0,1]);for(let j=0;j<2;j++)arcRibbon([.6,.045,0],[1,0,0],[0,0,1],.35+u*(1.8+j*.35),.09*(1-u),-.9,2.9,amber,.6*(1-u));}}
 if(id==='lion'){warningCone([-.84,0,0],1.7,.54,t/.77);if(settings.layers.ribbons)for(const [i,at]of[1.05,1.38,1.75].entries()){const u=attackWindow(at-.09,.51);if(u===null)continue;const a=(1-smooth(.55,1,u))*smooth(0,.16,u),sweep=u*1.4;for(let claw=0;claw<3;claw++){let center=[.62+(claw-1)*.12,1.07+(claw-1)*.15,.03+(claw-1)*.18];arcRibbon(center,[1,0,0],[0,.91,.32],.74+claw*.085,.09,Math.PI*.04+sweep,Math.PI*1.22+sweep,i===1?amber:ivory,a*.8);}}}
 if(id==='buffalo'){warningCircle([-.2,0,0],1.65,t/1.25);const u=attackWindow(1.43,1.18);if(u!==null&&settings.layers.ribbons){for(let j=0;j<2;j++){const x=clamp(u-j*.16);if(x<=0)continue;let r=.24+x*2.7;fxBand([-.03,.025,0],r,r+.043*(1-x),0,TAU,amber,.62*(1-x));}}}
 if(id==='warthog'){warningLane(-2.35,1.32,.4,t/.83);const u=attackWindow(1.24,.61);if(u!==null&&settings.layers.ribbons)for(const s of[-1,1])arcRibbon([.57,.93,s*.25],[1,0,0],[0,1,0],.83,.16,.9+u*1.1,4.7+u*1.1,ivory,.76*(1-smooth(.5,1,u)));}
 if(id==='hyena'){warningCircle([.72,0,0],.66,t/.89);const u=attackWindow(1.21,.32);if(u!==null&&settings.layers.ribbons){const close=1-smooth(0,.48,u),a=(1-smooth(.52,1,u));for(const s of[-1,1])arcRibbon([.8,1.05+s*.19*close,.05],[1,0,0],[0,1,0],.38+.07*close,.065,s>0?0:Math.PI,s>0?Math.PI:TAU,ivory,a*.85);}}
 if(id==='roar'){warningCone([-.76,0,0],3.35,.48,t/.78);if(settings.layers.ribbons)for(let j=0;j<4;j++){const u=attackWindow(.95+j*.26,1.43);if(u===null)continue;let radius=.18+u*.84;fxBand([-.55+u*2.85,1.1,0],radius,radius+.025+.015*(1-u),0,TAU,amber,(1-u)*.53,[0,1,0],[0,0,1]);}}
 if(id==='shield'&&settings.layers.ribbons){const vis=smooth(.35,.9,t)*(1-smooth(3.65,4.65,t)),r=1.65*smooth(.35,.92,t);shieldDome(r,vis*.65);fxBand([0,.033,0],r-.045,r,0,TAU,jade,vis*.68);fxBand([0,.038,0],r+.1,r+.12,0,TAU,jade,vis*.3);const u=attackWindow(1.85,.7);if(u!==null){for(let j=0;j<3;j++){const a=clamp(u-j*.12);if(a>0)fxBand([-1.5,.86,0],a*.88,a*.88+.026,0,TAU,ivory,(1-a)*.6,[0,1,0],[0,0,1]);}}}
 if(id==='repel'&&settings.layers.ribbons){const prep=smooth(.1,.5,t)*(1-smooth(1.14,1.34,t));for(let j=0;j<3;j++)arcRibbon([0,.06+j*.18,0],[1,0,0],[0,0,1],.53+j*.17,.065,t*2+j*2,t*2+j*2+3.5,jade,prep*.65);const u=attackWindow(1.27,1.25);if(u!==null)for(let j=0;j<3;j++){const p=clamp(u-j*.13);if(p<=0)continue;let r=.5+p*2.75;fxBand([0,.045,0],r,r+.06*(1-p),0,TAU,jade,.8*(1-p));arcRibbon([0,.15+.3*(1-p),0],[1,0,0],[0,0,1],r,.085,clock*1.5,clock*1.5+5.4,blue,.5*(1-p));if(j===0)for(let k=0;k<4;k++){const a=k*Math.PI/2+clock*.23;arcRibbon([0,.07,0],[Math.cos(a),0,Math.sin(a)],[0,.55,0],r,.035,0,Math.PI,jade,.24*(1-p));}}}
 if(id==='heal'&&settings.layers.ribbons){const vis=smooth(.3,.8,t)*(1-smooth(3.8,4.6,t));fxBand([0,.025,0],.76,.79,0,TAU,jade,.5*vis);for(let j=0;j<2;j++)fxRibbon(u=>{const angle=u*TAU*1.1+t*1.7+j*Math.PI;return[Math.cos(angle)*(.55-.2*u),.18+u*1.6,Math.sin(angle)*(.55-.2*u)]},[0,0,1],.033,jade,.37*vis,45);}
 if(id==='stun'&&settings.layers.ribbons){const vis=smooth(.25,.7,t)*(1-smooth(3.4,4.2,t));fxBand([.18,1.66,0],.32,.338,0,TAU,amber,.48*vis);}
 return fxVertices.length/11;
}
function paintGeometryFX(){const count=Math.min(MAX_FX_VERTS,Math.floor(fxVertices.length/11));if(!count)return;gl.useProgram(fxP.p);uniforms(fxP,{uVP:cam.vp,uEye:cam.eye,uTime:clock});gl.bindVertexArray(fxVAO);gl.bindBuffer(gl.ARRAY_BUFFER,fxVBO);gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(fxVertices.slice(0,count*11)));gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.drawArrays(gl.TRIANGLES,0,count);drawCalls++;gl.depthMask(true);gl.disable(gl.BLEND);}

const definitions=[
{id:'rhino',name:'Rinoceronte',title:'Embestida del rinoceronte',group:'Bestias',duration:4.5,icon:'rhino',species:'Rinoceronte',phases:[.88,1.7,2.4],desc:'Carril de aviso → arranque pesado → choque puntual. Polvo de carrera, líneas de velocidad, impacto animado y ondas tridimensionales. No rompe el objetivo.',chips:['Aviso + carga + contacto','Big hit · CodeManu','Polvo y suelo 3D']},
{id:'lion',name:'León',title:'Combo de tres zarpazos',group:'Bestias',duration:4.1,icon:'claw',species:'León',phases:[.77,1.05,2.35],desc:'Tres golpes encadenados con barridos inclinados, marcas de garra, estelas afiladas y destellos breves. Cada contacto emite su propio evento.',chips:['Garras · Kenney','Cintas 3D afiladas','3 contactos separados']},
{id:'buffalo',name:'Búfalo',title:'Pisotón de la sabana',group:'Bestias',duration:4.5,icon:'buffalo',species:'Búfalo',phases:[1.25,1.43,2.7],desc:'Círculo de aviso, elevación del cuerpo y golpe pesado. Corona de polvo, ondas rasantes y tierra con gravedad; ningún edificio se fragmenta.',chips:['Corona de polvo','Onda de suelo','Terrones, no escombros']},
{id:'warthog',name:'Facóquero',title:'Barrido de colmillos',group:'Bestias',duration:4.1,icon:'horn',species:'Facóquero',phases:[.83,1.27,2.2],desc:'Carga corta que termina en dos barridos ascendentes. Los filos siguen los colmillos en el espacio y el polvo permanece junto al suelo.',chips:['Slash curvo · Kenney','Doble estela 3D','Impulso ascendente']},
{id:'hyena',name:'Hiena',title:'Mordida y retirada',group:'Bestias',duration:3.9,icon:'bite',species:'Hiena',phases:[.89,1.25,2.1],desc:'Un salto corto, dos arcos que se cierran sobre el punto de contacto y retirada. Golpe seco sin sangre ni explosión.',chips:['Arcos de mordida','Impacto blanco · CodeManu','Contacto localizado']},
{id:'roar',name:'Rugido',title:'Rugido intimidatorio',group:'Bestias',duration:4.6,icon:'roar',species:'León',phases:[.78,.95,2.9],desc:'El cono indica el área de amenaza. Cuatro frentes de presión se alejan de la boca, orientados en tres dimensiones, y remueven el polvo.',chips:['Aviso en cono','Frentes de presión 3D','Sin daño programado']},
{id:'shield',name:'Protección',title:'Cúpula del guardián',group:'Espíritu',duration:5.1,icon:'shield',phases:[.4,.9,3.7],desc:'Una cúpula tridimensional envuelve el tótem. Bordes Fresnel, patrón de celdas y una ondulación localizada cuando recibe un impacto de prueba.',chips:['Superficie 3D','Colisión visual localizada','Luz verde controlada']},
{id:'repel',name:'Repulsión',title:'Pulso de repulsión',group:'Espíritu',duration:4.6,icon:'repel',phases:[.3,1.27,2.9],desc:'La energía converge, se enrolla sobre el suelo y sale en tres ondas. El efecto comunica expulsión, no una explosión de fuego.',chips:['Charge + vortex · CodeManu','Tres frentes expansivos','Motivo circular']},
{id:'heal',name:'Bendición',title:'Bendición de la tierra',group:'Espíritu',duration:5,icon:'heart',phases:[.3,.8,3.9],desc:'Aura animada en verde, corrientes ascendentes, hojas y pequeños corazones. Una señal de recuperación que puede acompañar al espíritu.',chips:['Aura · CodeManu','Corazones · Kenney','Espirales tridimensionales']},
{id:'stun',name:'Aturdimiento',title:'Aturdimiento legible',group:'Espíritu',duration:4.6,icon:'stun',phases:[.25,.6,3.5],desc:'Estrellas orbitan la cabeza de la maqueta y dejan estelas discretas. Feedback de estado separado del ataque, sin cambiar la IA.',chips:['Estrellas · Kenney','Órbita sobre la cabeza','Estado visual independiente']},
{id:'dust',name:'Pisadas',title:'Pisadas en tierra',group:'Movimiento',duration:3.6,icon:'dust',desc:'Tres apoyos cortos: polvo bajo, motas pequeñas y dispersión lateral. Sin humo blanco ni emisión de luz.',chips:['Kenney · humo','Tamaño: 15–55 cm','Alpha normal']},
{id:'dig',name:'Cavar',title:'Tierra con peso',group:'Cultivo',duration:3.5,icon:'dig',desc:'El golpe de la azada levanta terrones sólidos y una nube animada. Los fragmentos caen, rebotan y se asientan.',chips:['Brackeys · 64 frames','Terrones 3D','Kenney · tierra']},
{id:'water',name:'Regar',title:'Agua sobre la tierra',group:'Cultivo',duration:4.3,icon:'water',desc:'Gotas 3D desde una regadera, gravedad hacia abajo, salpicaduras al contacto y un pequeño rastro húmedo.',chips:['Gotas 3D','Kenney · ondas','Agua sin glow']},
{id:'harvest',name:'Cosechar',title:'Una buena cosecha',group:'Cultivo',duration:3.9,icon:'harvest',desc:'Hojas que giran, pequeñas mazorcas que llegan a la cesta y un destello breve para confirmar la recogida.',chips:['Hojas y cosecha 3D','Kenney · destello','Brillo acotado']},
{id:'wood',name:'Madera',title:'Impacto en madera',group:'Defensa',duration:3.1,icon:'wood',desc:'Astillas alargadas salen de la cara golpeada. Un toque de serrín acompaña el impacto, sin chispas de metal.',chips:['Astillas 3D','Kenney · tierra','Material mate']},
{id:'adobe',name:'Adobe',title:'Impacto en adobe',group:'Defensa',duration:3.3,icon:'adobe',desc:'Fragmentos rojizos y polvo cálido. La nube queda pegada al punto de impacto y se disipa sin tapar el muro.',chips:['Brackeys · polvo','Fragmentos 3D','Color del material']},
{id:'stone',name:'Piedra',title:'Impacto en piedra',group:'Defensa',duration:3.3,icon:'stone',desc:'Esquirlas cortas y pesadas, rebote más seco y una cantidad pequeña de polvo mineral. Nada de explosiones.',chips:['Piedras 3D','Polvo mineral','Rebote controlado']},
{id:'spirit',name:'Espíritu',title:'La presencia del guardián',group:'Espíritu',duration:5.5,icon:'spirit',desc:'Motas diminutas trazan espirales en el espacio. Dos luces locales colorean la madera; la escena conserva su oscuridad.',chips:['Kenney · halo y estela','Trayectorias 3D','Dos luces locales']},
];
let current=definitions[0],clock=0,paused=false,looping=true,events=[],eventIndex=0,parts=[],rigids=[],wetness=0,hitTime=-10;
const MAX_RIGIDS=230;
function sprite(o){if(parts.length>=MAX_SPRITES-100)return;parts.push(Object.assign({tex:'cloud',age:0,life:1,p:[0,.2,0],v:[0,0,0],size0:.4,size1:.8,ratio:1,col:color('#b99b70'),alpha:.4,orient:0,emit:0,angle:rand(0,TAU),spin:rand(-.2,.2),soft:.13,drag:.85,gravity:0,ground:.02,phase:rand(0,TAU)},o));}
function solid(kind,p,v,size,c,extra={}){if(rigids.length>=MAX_RIGIDS)return;rigids.push(Object.assign({kind,p:p.slice(),v:v.slice(),size:size.slice(),col:color(c),rot:[rand(0,TAU),rand(0,TAU),rand(0,TAU)],spin:[rand(-5,5),rand(-5,5),rand(-5,5)],life:2.8,age:0,gravity:9.81,bounce:kind==='stone'?.34:kind==='wood'?.24:.16,drag:.07,settled:false,landed:false},extra));}
function count(n){return Math.max(1,Math.round(n*settings.density));}
function dustAt(p,n=5,strength=1,c='#bfa375',cloud=true){for(let i=0;i<count(n);i++){let a=rand(0,TAU),s=rand(.28,.47)*strength;const pp=V.add(p,[rand(-.13,.13)*strength,rand(.04,.13),rand(-.13,.13)*strength]);sprite({tex:cloud?'cloud':'smoke',p:pp,v:[Math.cos(a)*rand(.18,.43)*strength,rand(.17,.42)*strength,Math.sin(a)*rand(.18,.43)*strength],life:rand(.85,1.55),size0:s,size1:s*rand(2.1,2.7),col:color(c),alpha:cloud?rand(.32,.49):rand(.2,.34),soft:.14,angle:rand(-.6,.6),ground:floorAt(p),drag:1.3});}}
function fineDirt(p,c='#a38b61',n=3){for(let i=0;i<count(n);i++)sprite({tex:'dirt',p:V.add(p,[rand(-.12,.12),.07,rand(-.12,.12)]),v:[rand(-.6,.6),rand(.5,1.3),rand(-.6,.6)],life:rand(.35,.7),size0:rand(.14,.3),size1:.34,col:color(c),alpha:.5,soft:.025,gravity:3.3,ground:floorAt(p),drag:.5});}
function stepDust(x,z){dustAt([x,.015,z],4,.55,'#c4a777',false);for(let i=0;i<count(4);i++)solid('soil',[x+rand(-.06,.06),.04,z+rand(-.06,.06)],[rand(-.45,.45),rand(.3,.75),rand(-.4,.4)],[.03,.025,.028],'#a88c64',{life:1.25});}
function dig(){const p=[.12,.155,.12];hitTime=clock;dustAt(p,6,1.05,'#ad8654');fineDirt(p,'#997044',3);for(let i=0;i<count(19);i++){const a=rand(0,TAU),s=rand(.047,.12),vel=rand(.55,1.35);solid('soil',V.add(p,[rand(-.16,.16),.07,rand(-.14,.14)]),[Math.cos(a)*vel,rand(1.3,2.8),Math.sin(a)*vel],[s,s*rand(.6,1.1),s*.8],choose(['#80603d','#967349','#735333','#ac8051']),{life:2.5,landDust:i<2});}}
function strike(kind){hitTime=clock;const p=[.05,.98,.33];const col={wood:'#b58d58',adobe:'#b78460',stone:'#a3a59b'}[kind];dustAt(p,kind==='stone'?2:4,kind==='wood'?.45:.67,col,kind!=='wood');fineDirt(p,col,2);for(let i=0;i<count(kind==='wood'?14:13);i++){let s=rand(.04,.1),sz=kind==='wood'?[s*.45,rand(.12,.25),s*.32]:[s,s*rand(.65,1.15),s*.76];solid(kind,V.add(p,[rand(-.09,.09),rand(-.09,.09),.012]),[rand(-1.1,1.1),rand(.2,1.65),rand(.65,1.65)],sz,col,{life:2.5});}}
function waterDrop(){if(rigids.length>185)return;const mouth=M.pt(toolModel,[.62,.21,0]);for(let i=0;i<count(2);i++){const s=rand(.021,.032);solid('water',V.add(mouth,[rand(-.025,.025),rand(-.025,.025),rand(-.065,.065)]),[rand(1.4,2.05),rand(-.48,-.15),rand(-.45,.45)],[s,s*1.7,s],choose(['#7daaa8','#82bfc0','#adc9be']),{life:1.3,mainDrop:true,rot:[0,0,0],spin:[0,0,0],bounce:0});}}
function splash(p,ring=true){wetness=clamp(wetness+.024,0,.85);if(ring&&parts.filter(p=>p.tex==='ring').length<20)sprite({tex:'ring',p:[p[0],.164,p[2]],v:[0,0,0],life:rand(.27,.48),size0:.065,size1:rand(.2,.35),col:color('#82afb0'),alpha:.36,soft:0,orient:1,angle:0,spin:0,ground:.16});for(let j=0;j<2;j++){let a=rand(0,TAU),s=rand(.014,.024);solid('water',[p[0],.177,p[2]],[Math.cos(a)*rand(.22,.6),rand(.32,.78),Math.sin(a)*rand(.22,.6)],[s,s*1.4,s],'#a3c6be',{life:.45,mainDrop:false,rot:[0,0,0],spin:[0,0,0],bounce:0});}}
function twinkle(p,n=6,c='#eac886'){for(let i=0;i<count(n);i++){let a=rand(0,TAU);sprite({tex:'star',p:V.add(p,[rand(-.07,.07),rand(-.08,.08),rand(-.07,.07)]),v:[Math.cos(a)*rand(.1,.4),rand(.1,.4),Math.sin(a)*rand(.1,.4)],life:rand(.4,.8),size0:rand(.07,.13),size1:.04,col:color(c),alpha:.72,emit:.94,soft:.025,spin:rand(-.7,.7),angle:rand(0,TAU),ground:0});}}
function harvest(){for(let i=0;i<4;i++){const start=[i%2?.78:-.86,.98,i<2?-.62:.58];solid('corn',start,[0,0,0],[.11,.32,.11],'#dbad52',{life:1.2,flight:{start,end:[-1.75,.37,1.07],duration:1.05+i*.07,arc:.65+i*.09},spin:[1,3,1]});for(let j=0;j<count(3);j++){solid('leaf',V.add(start,[rand(-.08,.08),-.1,rand(-.08,.08)]),[rand(-.55,.55),rand(.7,1.5),rand(-.55,.55)],[.24,.32,.32],choose(['#88a04b','#6d913f','#a3b66a']),{life:2.5,gravity:2.4,bounce:.04,drag:.6});}}}
function toolPose(){if(current.id==='water'){const amount=smooth(.2,.64,clock)*(1-smooth(2.15,2.7,clock));toolModel=M.model([-1.48,1.35,0],[0,0,-.2-.6*amount],[1,1,1]);toolVisible=true;}else if(current.id==='dig'){const angle=-.92*(1-smooth(.2,.56,clock))+.6*smooth(.72,1.42,clock);toolModel=M.model([.12,1.08,.07],[0,.22,angle],[1,1,1]);toolVisible=true;}else toolVisible=false;}
function restartEffect(rebuild=false){seed=2481+definitions.indexOf(current)*379;parts=[];rigids=[];clock=0;events=[];eventIndex=0;wetness=0;wallVisible=true;hitTime=-10;lastImpact=null;lightCol0=[0,0,0];lightCol1=[0,0,0];if(rebuild)buildStation(current.id);seed=2481+definitions.indexOf(current)*379;toolPose();const at=(t,fn)=>events.push({t,fn});switch(current.id){case'dust':at(.25,()=>stepDust(-.72,.17));at(.57,()=>stepDust(0,-.06));at(.93,()=>stepDust(.75,.17));break;case'dig':at(.56,dig);break;case'water':for(let i=0;i<43;i++)at(.52+i*.037,waterDrop);break;case'harvest':at(.48,harvest);break;case'wood':case'adobe':case'stone':at(.42,()=>strike(current.id));break;default:scheduleCombat(at);break;}events.sort((a,b)=>a.t-b.t);}
function floorAt(p){return ['dig','water','harvest'].includes(current.id)&&Math.abs(p[0])<1.25&&Math.abs(p[2])<1.06?.15:0;}
function simulate(dt){clock+=dt;toolPose();while(eventIndex<events.length&&events[eventIndex].t<=clock+1e-7){events[eventIndex++].fn();}
 for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.age+=dt;if(p.age>p.life){parts.splice(i,1);continue;}p.v[0]+=settings.wind*.15*dt;p.v[1]-=p.gravity*dt;p.v[2]+=Math.sin(p.phase+p.age*2)*.05*dt;const drag=Math.exp(-p.drag*dt);for(let k=0;k<3;k++){p.v[k]*=drag;p.p[k]+=p.v[k]*dt;}if(p.p[1]<p.ground+.025&&p.orient!==1){p.p[1]=p.ground+.025;p.v[1]=Math.max(0,p.v[1]);}p.angle+=p.spin*dt;}
 for(let i=rigids.length-1;i>=0;i--){const r=rigids[i];r.age+=dt;
  if(r.flight){const t=clamp(r.age/r.flight.duration),s=r.flight.start,e=r.flight.end;r.p=V.lerp(s,e,t);r.p[1]+=Math.sin(t*Math.PI)*r.flight.arc;r.rot[0]+=dt*2;r.rot[1]+=dt*3;if(t>=1){rigids.splice(i,1);twinkle(e,3,'#e3c17c');}continue;}
  if(r.age>=r.life){rigids.splice(i,1);continue;}
  if(r.kind==='leaf'){r.v[0]+=(Math.sin(r.age*4+r.rot[1])*.42+settings.wind*.5)*dt;r.v[2]+=Math.cos(r.age*3+r.rot[0])*.3*dt;}
  if(!r.settled){r.v[1]-=r.gravity*dt;const drag=Math.exp(-r.drag*dt);for(let k=0;k<3;k++){r.v[k]*=drag;r.p[k]+=r.v[k]*dt;r.rot[k]+=r.spin[k]*dt;}}
  const floor=floorAt(r.p),height=r.kind==='water'?r.size[1]*.3:r.size[1]*.36;
  if(r.p[1]<=floor+height){r.p[1]=floor+height;if(r.kind==='water'){rigids.splice(i,1);if(r.mainDrop)splash(r.p,random()<.3);continue;}
   const impact=Math.abs(r.v[1]);if(!r.landed){r.landed=true;if(r.landDust&&impact>.8)dustAt([r.p[0],floor+.025,r.p[2]],1,r.kind==='adobe'?.7:.35,r.kind==='adobe'?'#af875d':'#a7885e');}
   if(r.v[1]<0)r.v[1]=-r.v[1]*r.bounce;r.v[0]*=.64;r.v[2]*=.64;r.spin=r.spin.map(x=>x*.52);if(impact<.2){r.settled=true;r.v=[0,0,0];if(r.kind==='leaf'){r.rot[0]=Math.PI/2;r.p[1]=floor+.015;}}}
 }
}
function seekTo(t){isSeeking=true;const was=paused;restartEffect(false);const target=clamp(t,0,current.duration);while(clock+1/60<target)simulate(1/60);if(clock<target)simulate(target-clock);paused=was;isSeeking=false;}
function spriteInstances(){const out=[];for(const p of parts){const t=p.age/p.life,fade=smooth(0,.1,t)*(1-smooth(.5,1,t)),s=mix(p.size0,p.size1,1-(1-t)**2);out.push({tex:p.tex,p:p.p,size:[s,s*p.ratio],col:p.col,alpha:p.alpha*fade,angle:p.angle,soft:p.soft,orient:p.orient,emit:p.emit,dir:p.dir||[0,1,0],frame:mix(p.frameStart||0,p.frameEnd??((spriteRects[p.tex]?.length||1)-1),t)});}
 lightCol0=[0,0,0];lightCol1=[0,0,0];
 if(current.id==='spirit'){
  const visible=smooth(.18,.75,clock)*(1-smooth(4.25,5.35,clock));const path=(i,t)=>{const a=t*1.3+i*TAU/8,r=.61+.11*Math.sin(i*2+t*.7);return[Math.cos(a)*r,.53+(i/8)*1.24+.10*Math.sin(a*1.7),Math.sin(a)*r]};
  if(visible>.001)for(let i=0;i<8;i++){const p=path(i,clock),c=color(i%3===0?'#e9c982':i%3===1?'#83d5bd':'#a7c6d4'),a=visible*(.67+.2*Math.sin(clock*3+i));out.push({tex:'glow',p,size:[.16,.16],col:c,alpha:a,emit:1.2,soft:.018});if(i%2===0)out.push({tex:'star',p,size:[.14,.14],col:c,alpha:a*.6,emit:1.2,soft:.018,angle:clock*.2});for(let j=0;j<5;j++){const p0=path(i,clock-j*.082),p1=path(i,clock-(j+1)*.082),d=V.sub(p0,p1),len=Math.hypot(...d);out.push({tex:'trail',p:V.scale(V.add(p0,p1),.5),size:[.17,len*1.75],dir:d,orient:3,col:c,alpha:visible*(1-j/5)*.32,emit:1.02,soft:.035});}}
  lightPos0=path(1,clock);lightPos1=path(3,clock);lightCol0=V.scale([.08,.42,.27],visible);lightCol1=V.scale([.33,.17,.035],visible);
 }
 combatSprites(out);
 return out.filter(p=>settings.layers.textures&&(settings.layers.dust||!DUST_TEXTURES.has(p.tex)));
}
function updateRigidBuffers(){const counts=Object.fromEntries(Object.keys(rigidGeo).map(k=>[k,0]));for(const r of rigids){const n=counts[r.kind]++;if(n>=256)continue;const data=rigidBuffers[r.kind],o=n*23;let fade=r.flight?1:1-smooth(r.life-.48,r.life,r.age);const s=r.size.map(x=>x*Math.max(.001,fade));let rot=r.rot;if(r.kind==='water'&&!r.settled){const d=V.norm(r.v),angle=Math.acos(clamp(d[1],-1,1));rot=[angle,Math.atan2(d[0],d[2]),0];}data.set(M.model(r.p,rot,s),o);data.set(r.col,o+16);data.set(style[r.kind],o+19);}for(const k of Object.keys(rigidGeo))rigidGeo[k].instancesFrom(rigidBuffers[k],Math.min(256,counts[k]));}
function renderScene(env,time){resizeRenderer();updateCamera();const sprites=spriteInstances();composeGeometryFX();updateRigidBuffers();drawCalls=0;gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.CULL_FACE);
 const sceneDraw=(p)=>{backgroundMesh.draw(p);if(settings.showTarget||!BEAST_IDS.includes(current.id))stationMesh?.draw(p);drawProxy(p);if(wallVisible&&wallMesh){let shake=(true?(1-smooth(0,.36,clock-hitTime))*Math.sin((clock-hitTime)*42)*.012:0);wallMesh.draw(p,M.tr([shake,0,0]));}if(toolVisible&&toolMesh)toolMesh.draw(p,toolModel);for(const [k,m] of Object.entries(rigidGeo))if(settings.layers.fragments||['water','corn','leaf'].includes(k))m.draw(p,M.I(),true);};
 // 1. Directional shadow map. Fragment meshes take part in the same shadow pass.
 gl.bindFramebuffer(gl.FRAMEBUFFER,shadowRT.fbo);gl.viewport(0,0,shadowRT.w,shadowRT.h);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(shadowP.p);uniforms(shadowP,{uVP:env.shadowVP,uTime:time,uWind:settings.wind});sceneDraw(shadowP);
 // 2. Opaque, lit geometry into a linear off-screen target.
 gl.bindFramebuffer(gl.FRAMEBUFFER,mainRT.fbo);gl.viewport(0,0,width,height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.useProgram(skyP.p);gl.bindVertexArray(null);uniforms(skyP,{uTop:env.top,uBottom:env.bottom,uNight:env.night,uTime:time});gl.drawArrays(gl.TRIANGLES,0,3);drawCalls++;gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
 gl.useProgram(meshP.p);uniforms(meshP,{uVP:cam.vp,uView:cam.view,uShadowVP:env.shadowVP,uEye:cam.eye,uSunDir:env.dir,uSun:env.sun,uSky:env.sky,uGround:env.ground,uShadow:2,uShadowTexel:[1/shadowRT.w,1/shadowRT.h],uTime:time,uWind:settings.wind,uWet:wetness,uNight:env.night,uLightPos0:lightPos0,uLightPos1:lightPos1,uLightCol0:lightCol0,uLightCol1:lightCol1});texture2D(2,shadowRT.depth);sceneDraw(meshP);
 // Copy only depth, so soft particles never sample their own attached texture.
 gl.bindFramebuffer(gl.READ_FRAMEBUFFER,mainRT.fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,depthRT.fbo);gl.blitFramebuffer(0,0,width,height,0,0,width,height,gl.DEPTH_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,mainRT.fbo);
 // 3. Sorted, depth-tested, world-sized billboards. No gl.POINTS, no global additive glow.
 paintGeometryFX();paintSprites(sprites,env,cam);
 // 4. One final tone-mapping pass, after geometry and VFX have been composited.
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(postP.p);gl.bindVertexArray(null);uniforms(postP,{uImage:0,uTexel:[1/width,1/height],uExposure:1.03});texture2D(0,mainRT.tex);gl.drawArrays(gl.TRIANGLES,0,3);drawCalls++;
 return {sprites:sprites.length,rigids:rigids.length,calls:drawCalls,fxVertices:fxVertices.length/11};
}
const DUST_TEXTURES=new Set(['cloud','smoke','dirt','dustRing']);
let isSeeking=false,lastImpact=null;
function contact(point,strength=1,tag='impact',material='soil'){
 const radial=tag==='stomp'||tag==='spirit-repulse';
 hitTime=clock;lastImpact={event:'wgvfx:impact',preview:true,space:'lab-world',effect:current.id,tag,position:point.slice(),normal:radial?[0,1,0]:[-1,0,0],radial,strength,material,time:Number(clock.toFixed(3)),structuralDamage:'external'};
 if(!isSeeking)window.dispatchEvent(new CustomEvent('wgvfx:impact',{detail:{...lastImpact}}));
}
function flip(tex,p,size,life,col='#f1d3a0',extra={}){sprite({tex,p:p.slice(),v:[0,0,0],size0:size,size1:size*1.13,col:color(col),alpha:.78,emit:.98,life,orient:0,angle:0,spin:0,soft:.06,gravity:0,drag:0,frameStart:['burst','impact'].includes(tex)?2:0,...extra});}
function radialStreaks(p,n=10,speed=2,col='#e6c592'){
 for(let i=0;i<count(n);i++){const a=rand(0,TAU),d=V.norm([Math.cos(a),rand(-.08,.8),Math.sin(a)]);sprite({tex:'speedLine',p:p.slice(),v:V.scale(d,rand(.6,1.1)*speed),size0:rand(.15,.25),size1:.08,ratio:2.3,col:color(col),alpha:.7,emit:.82,orient:3,dir:d,life:rand(.25,.48),soft:.04,drag:1,ground:0,angle:0,spin:0});}
}
function earthBurst(p,n=15,strength=1){
 for(let i=0;i<count(n);i++){let a=rand(0,TAU),s=rand(.045,.12);solid('soil',V.add(p,[rand(-.2,.2),.09,rand(-.2,.2)]),[Math.cos(a)*rand(.6,1.5)*strength,rand(1.2,2.6)*strength,Math.sin(a)*rand(.6,1.5)*strength],[s,s*.65,s*.85],choose(['#a88c63','#97744d','#b49766']),{life:2.1,bounce:.2});}
}
function impactDust(p,strength=1){for(let i=0;i<count(11);i++){const a=i/11*TAU+rand(-.12,.12),r=rand(.16,.44)*strength; sprite({tex:'cloud',p:[p[0]+Math.cos(a)*r,.12+rand(0,.1),p[2]+Math.sin(a)*r],v:[Math.cos(a)*rand(.8,1.4)*strength,rand(.45,.95),Math.sin(a)*rand(.8,1.4)*strength],size0:rand(.43,.65)*strength,size1:rand(1.15,1.65)*strength,col:color(choose(['#967248','#a08358','#b89a6d'])),alpha:.55,life:rand(1.1,1.65),frameStart:12,frameEnd:55,soft:.13,orient:0,emit:0,drag:1.35,ground:0});}}
function groundCrown(p,scale=1){sprite({tex:'dustRing',p:[p[0],.037,p[2]],v:[0,0,0],orient:1,life:1.2,size0:.65*scale,size1:4.6*scale,alpha:.58,col:color('#a38257'),soft:0,angle:rand(0,TAU),spin:.06,ground:0});}
function heavyImpact(p,strength=1){contact(p,strength,'heavy-contact','wood');flip('burst',p,1.55*strength,.5,'#f0d8aa',{alpha:.8});impactDust(p,strength*.95);groundCrown(p,.62*strength);earthBurst([p[0],.02,p[2]],12,.76*strength);radialStreaks(p,11,strength*2);}
function scheduleCombat(at){const id=current.id;
 if(id==='rhino'){
  for(let i=0;i<9;i++)at(.91+i*.082,()=>{let x=mix(-2.36,-.35,i/9);dustAt([x-.4,.01,i%2?.3:-.3],2,.65,'#bda171',false);if(i%2===0)fineDirt([x-.1,.01,0],'#9e875f',1);});
  at(1.7,()=>heavyImpact([.84,.98,0],1.15));
 }
 if(id==='lion')for(const [i,t]of[1.05,1.38,1.75].entries())at(t,()=>{
  const p=[.78,1.1,.09];contact(p,.65+i*.12,'claw-'+(i+1),'wood');
  flip('scratch',V.add(p,[0,0,.22]),1.75,.42,'#efc890',{angle:i%2?-.3:.5,alpha:.72,emit:.9});
  flip('impact',p,.94+i*.09,.3,'#f0e0b7',{alpha:.8,angle:rand(-.5,.5)});radialStreaks(p,5,1.5);dustAt([.72,.01,0],2,.48,'#b8a075',false);
 });
 if(id==='buffalo')at(1.43,()=>{const p=[-.03,.03,0];contact(p,1.4,'stomp');groundCrown(p,1.22);earthBurst(p,26,1.1);impactDust(p,1.17);flip('burst',[0,.25,0],1.15,.4,'#ead7ad',{orient:1,soft:0,alpha:.55});radialStreaks([0,.2,0],12,2.4,'#bda37b');});
 if(id==='warthog')at(1.27,()=>{contact([.8,1.03,0],.94,'tusk-sweep','wood');for(const s of[-1,1])flip('hornArc',[.66,1.06,s*.27],1.9,.48,'#f1d5a2',{angle:s*.45,alpha:.66,ratio:.75});flip('burst',[.87,.95,0],1.05,.34,'#eaca97',{alpha:.65});dustAt([-.13,.02,0],6,.8,'#bda071',false);radialStreaks([.82,1.06,0],7,1.8);});
 if(id==='hyena')at(1.25,()=>{const p=[.84,1.1,0];contact(p,.78,'bite','wood');for(const s of[-1,1])flip('slash',V.add(p,[0,s*.085,.19]),.96,.28,'#efd5b0',{angle:s>0?0:Math.PI,alpha:.82});flip('impact',p,.94,.32,'#efdab5');dustAt([-.35,.015,0],4,.65,'#bda475',false);radialStreaks(p,5,1.5);});
 if(id==='roar'){
  at(.95,()=>contact([-.64,1.14,0],.6,'roar','air'));
  for(let i=0;i<7;i++)at(1.02+i*.17,()=>dustAt([-.4+i*.42,.03,Math.sin(i)*.17],2,.54,'#bca378',false));
 }
 if(id==='shield'){
  at(.54,()=>twinkle([0,.7,0],7,'#9bdbc6'));
  at(1.85,()=>{contact([-1.5,.86,0],.8,'shield-block','spirit');flip('impact',[-1.48,.86,0],.91,.34,'#c5e7d4',{orient:4,dir:[-1,0,0],alpha:.85});radialStreaks([-1.52,.9,0],7,1.2,'#9cd7ca');});
 }
 if(id==='repel'){
  at(.28,()=>flip('charge',[0,1.7,0],1.07,1.04,'#88d8c4',{alpha:.66,frameStart:0,emit:1.14}));
  at(1.27,()=>{contact([0,.08,0],1.2,'spirit-repulse','spirit');flip('vortex',[0,.038,0],1.4,.95,'#80bfae',{orient:1,size1:4.6,soft:0,alpha:.43,frameStart:0,emit:.76});radialStreaks([0,.7,0],17,2.6,'#a7ddc2');groundCrown([0,0,0],.88);});
 }
 if(id==='heal'){
  for(let j=0;j<6;j++)at(.65+j*.44,()=>{const a=j*2.4;flip('heart',[Math.cos(a)*.34,1.05,Math.sin(a)*.34],.16,1.2,'#ace2af',{size1:.11,v:[Math.cos(a)*.08,.74,Math.sin(a)*.08],alpha:.66,soft:.02,emit:1.03});});
  at(.65,()=>{for(let j=0;j<7;j++){const a=j/7*TAU;solid('leaf',[Math.cos(a)*.55,.1,Math.sin(a)*.55],[Math.cos(a)*.11,1.25,Math.sin(a)*.11],[.11,.22,.16],'#9fb765',{life:2.8,gravity:.9,drag:.3,spin:[1,2,1]});}});
 }
 if(id==='stun')at(.45,()=>{contact([.38,1.22,0],.35,'stun-feedback','status');flip('impact',[.32,1.24,0],.7,.24,'#eac98d',{alpha:.58});});
}
function staticSprite(out,tex,p,size,alpha,c='#e2c28d',extra={}){out.push({tex,p,size:Array.isArray(size)?size:[size,size],col:color(c),alpha,emit:1,soft:.025,angle:0,frame:0,...extra});}
function combatSprites(out){const id=current.id,t=clock;
 if(id==='rhino'&&t>.88&&t<1.7){const u=smooth(.88,1.65,t),x=mix(-2.36,-.24,u);for(let j=0;j<7;j++){const a=j/7*TAU;staticSprite(out,'speedLine',[x-.6-.17*(j%3),.65+Math.sin(a)*.4,Math.cos(a)*.43],[.06,.6],.27+u*.15,'#e1c08c',{orient:3,dir:[1,0,0],emit:.79});}}
 if(id==='roar')for(let j=0;j<4;j++){const u=attackWindow(.95+j*.26,1.43);if(u!==null)staticSprite(out,'ring',[-.55+u*2.85,1.1,0],(.18+u*.84)*2.17,(1-u)*.13,'#e4c499',{orient:4,dir:[1,0,0],emit:.8,soft:.14});}
 if(id==='shield'){
  const vis=smooth(.38,.92,t)*(1-smooth(3.65,4.7,t));lightPos0=[-.5,1.05,.5];lightPos1=[.8,.75,-.5];lightCol0=V.scale([.04,.56,.35],vis*.67);lightCol1=V.scale([.06,.3,.4],vis*.38);
  for(let j=0;j<10;j++){const a=t*.55+j/10*TAU;staticSprite(out,'star',[Math.cos(a)*1.54,.18+.5*(.5+.5*Math.sin(a*1.7+j)),Math.sin(a)*1.54],.067,vis*.57,'#b4ded0',{emit:1.05});}
  const u=attackWindow(1.25,.61);if(u!==null){const p=[mix(-2.9,-1.5,u),.85,0];staticSprite(out,'trail',p,[.14,.7],.65,'#d9b48a',{orient:3,dir:[1,0,0],emit:.95});staticSprite(out,'star',p,.17,.69,'#f4d5a2');}
 }
 if(id==='repel'){
  const vis=smooth(.15,.5,t)*(1-smooth(1.4,2.7,t));lightPos0=[0,1,.5];lightPos1=[0,.4,-.8];lightCol0=V.scale([.05,.49,.31],vis*.7);lightCol1=V.scale([.06,.28,.33],vis*.7);
  const prep=smooth(.15,.45,t)*(1-smooth(1.22,1.4,t));for(let j=0;j<15;j++){const r=.35+1.45*(1-smooth(.12,1.25,t)),a=j/15*TAU+t*2,p=[Math.cos(a)*r,.4+(j%5)*.24,Math.sin(a)*r];staticSprite(out,'glow',p,.085,prep*.66,'#a0d7bc');}
 }
 if(id==='heal'){
  const vis=smooth(.32,.85,t)*(1-smooth(3.75,4.75,t));for(let j=0;j<2;j++)staticSprite(out,'aura',[0,.9,0],[1.34,1.8],vis*.19,'#a7d5a4',{orient:4,dir:[Math.cos(j*Math.PI/2),0,Math.sin(j*Math.PI/2)],frame:(t*11+j*13)%29,angle:0,soft:.15,emit:.98});
  for(let j=0;j<14;j++){const u=(t*.3+j/14)%1,a=t*1.7+j*2.4;staticSprite(out,'star',[Math.cos(a)*(.6-.24*u),.2+u*1.95,Math.sin(a)*(.6-.24*u)],.055+.02*Math.sin(j),vis*Math.sin(u*Math.PI)*.61,'#d3dda2',{emit:1.02});}
  lightPos0=[.3,1.13,.6];lightPos1=[-.6,.5,-.4];lightCol0=V.scale([.16,.43,.13],vis*.65);lightCol1=V.scale([.11,.3,.2],vis*.45);
 }
 if(id==='stun'){
  const vis=smooth(.36,.7,t)*(1-smooth(3.4,4.25,t));for(let j=0;j<4;j++){const a=t*2.1+j/4*TAU,p=[.18+Math.cos(a)*.39,1.67+Math.sin(a*1.9)*.05,Math.sin(a)*.39];staticSprite(out,'stunStar',p,.19,vis*.92,'#e8bd6e',{angle:Math.sin(a)*.3,emit:.96});for(let k=1;k<4;k++){const b=a-k*.16;staticSprite(out,'glow',[.18+Math.cos(b)*.39,1.67+Math.sin(b*1.9)*.05,Math.sin(b)*.39],.05,vis*(1-k/4)*.3,'#ddbe86');}}
 }
 if(!settings.layers.lights){lightCol0=[0,0,0];lightCol1=[0,0,0];}
}

const paths={
 rhino:'M3 17h16l2-5-4-2-2-5-2 5H7l-4 4Zm4 0v4m9-4v4M17 10l4-5v7M6 10l2-4 5 3',
 claw:'M6 3 3 14l3 7 4-17m4 0-4 12 3 5 5-16m3 1-4 12 2 3 3-10',
 buffalo:'M4 5 2 11l5 1m13-7 2 6-5 1M7 8h10l1 6-6 7-6-7ZM9 13h1m4 0h1',
 horn:'M4 19c7-2 12-7 13-16 5 9 1 17-10 18Zm3-3c4-2 6-5 7-8',
 bite:'m3 6 3 6 3-5 3 6 3-6 3 5 3-6M3 18l3-3 3 4 3-4 3 4 3-4 3 3',
 roar:'M3 10h5l5-5v14l-5-5H3Zm13-3c4 2 4 8 0 10m3-13c6 4 6 12 0 16',
 shield:'m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5ZM8 12l3 3 5-6',
 repel:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M4 4l3 3m10 10 3 3m0-16-3 3M4 20l3-3',
 heart:'M12 21 3 12C-1 4 8 1 12 7c4-6 13-3 9 5Z',
 stun:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',

 dust:'M3 16h4m-1-5h3m4 8h7M9 16c0-2 1-3 3-3s3 1 3 3m-3-5c-1-3 1-6 4-5 2 0 3 2 2 4',
 dig:'M16 3 6 18m-3-1 6 4 3-4-6-4m10-9 3 2',
 water:'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Zm-3 11c0 2 1 3 3 3',
 harvest:'M12 21V5m0 7C6 12 4 8 5 5c5 0 7 3 7 7Zm0 5c6 0 8-4 7-7-5 0-7 3-7 7Z',
 wood:'M6 4h12v16H6ZM9 4l1 5-1 5 1 6m4-16-1 7 2 5-1 4',
 adobe:'M3 5h18v14H3Zm0 7h18M10 5v7m5 0v7',
 stone:'m5 7 8-3 6 4 2 8-6 4-10-2-2-6Zm0 0 6 6 8-5m-8 5 4 7',
 spirit:'M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10Zm7 0v4m-2-2h4',
 day:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1m-1-13 1-1M5 19l1-1',
 sunset:'M3 17h18M6 14a6 6 0 0 1 12 0M12 3v3M3 8l2 2m14 0 2-2M6 21h12',
 night:'M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10Z',
 auto:'M19 7a8 8 0 0 0-13-1L3 9m0-5v5h5m-3 8a8 8 0 0 0 13 1l3-3m0 5v-5h-5',
 play:'m9 5 10 7-10 7Z', pause:'M8 5v14m8-14v14', replay:'M4 10a8 8 0 1 1 1 8M4 3v7h7',
 assets:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
 settings:'M3 6h18M3 12h18M3 18h18M8 3v6m8 0v6m-7 0v6',
 home:'M4 12a8 8 0 0 1 14-5l3 3m0-6v6h-6M20 14a8 8 0 0 1-14 5',
 capture:'M4 7h4l2-3h4l2 3h4v13H4Zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'
};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n]||paths.spirit}"/></svg>`;
$('openAssets').innerHTML=icon('assets');$('openSettings').innerHTML=icon('settings');$('home').innerHTML=icon('home');$('capture').innerHTML=icon('capture');
for(const id of['replay','mobileReplay'])$(id).innerHTML=icon('replay')+'Repetir efecto';
for(const id of['pause','mobilePause'])$(id).innerHTML=icon('pause');for(const id of['loop','mobileLoop'])$(id).innerHTML=icon('auto');
for(const target of['effects','mobileEffects']){for(const d of definitions){const btn=document.createElement('button');btn.className='effect';btn.dataset.effect=d.id;btn.innerHTML=icon(d.icon)+`<span>${d.name}</span>`;btn.title=d.title;btn.setAttribute('aria-pressed','false');btn.onclick=()=>selectEffect(d.id);$(target).append(btn);}}
const categories=['Bestias','Espíritu','Granja','Materiales'];let activeCategory='Bestias',showcase=false;
function categoryOf(d){return BEAST_IDS.includes(d.id)?'Bestias':['spirit','shield','repel','heal','stun'].includes(d.id)?'Espíritu':['wood','adobe','stone'].includes(d.id)?'Materiales':'Granja';}
function filterCategory(cat){activeCategory=cat;document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===cat));document.querySelectorAll('[data-effect]').forEach(b=>b.classList.toggle('hidden',categoryOf(definitions.find(d=>d.id===b.dataset.effect))!==cat));}
for(const id of ['filters','mobileFilters'])for(const cat of categories){const b=document.createElement('button');b.className='filter';b.dataset.category=cat;b.textContent=cat;b.onclick=()=>{filterCategory(cat);const first=definitions.find(d=>categoryOf(d)===cat);selectEffect(first.id);};$(id).append(b);}
const modes=[['day','Día'],['sunset','Ocaso'],['night','Noche'],['auto','Ciclo']];for(const[id,title]of modes){const btn=document.createElement('button');btn.className='mode';btn.dataset.mode=id;btn.innerHTML=icon(id)+'<span>'+title+'</span>';btn.title=title;btn.setAttribute('aria-label',title);btn.onclick=()=>setMode(id);btn.setAttribute('aria-pressed',id==='sunset'?'true':'false');if(id==='sunset')btn.classList.add('active');$('modes').append(btn);}
function setMode(mode,immediate=false){environmentMode=mode;if(mode!=='auto')environmentTarget={day:0,sunset:.43,night:1}[mode];else cycleClock=Math.acos(clamp(1-2*environmentValue,-1,1))/TAU*settings.cycleDuration;if(immediate)environmentValue=environmentTarget;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',b.dataset.mode===mode)});$('envLabel').textContent={day:'Luz de día',sunset:'Luz de atardecer',night:'Luz nocturna',auto:'Ciclo de luz · '+settings.cycleDuration+' s'}[mode];}
function updatePause(){for(const id of['pause','mobilePause']){$(id).innerHTML=icon(paused?'play':'pause');$(id).setAttribute('aria-label',paused?'Continuar':'Pausar');$(id).classList.toggle('on',paused);}}
function setPause(value){paused=value;updatePause();}
function selectEffect(id,fromDemo=false){if(!fromDemo){showcase=false;$('showcase').classList.remove('on');}const d=definitions.find(x=>x.id===id);if(!d)return;current=d;filterCategory(categoryOf(d));restartEffect(true);setPause(false);document.querySelectorAll('[data-effect]').forEach(b=>{const active=b.dataset.effect===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});const n=String(definitions.indexOf(d)+1).padStart(2,'0');$('selNum').textContent=n;$('selName').textContent=d.title;$('selDesc').textContent=d.desc;$('selChips').innerHTML=d.chips.map(s=>`<span class="chip">${s}</span>`).join('');$('sceneName').textContent=d.title;$('scenePre').textContent=`${n} / ${definitions.length} · ${d.group.toUpperCase()}`;$('mobileName').textContent=d.title;}
function replay(){restartEffect(false);setPause(false);}
for(const id of['replay','mobileReplay'])$(id).onclick=replay;
for(const id of['pause','mobilePause'])$(id).onclick=()=>{if(clock>=current.duration)restartEffect();setPause(!paused)};
for(const id of['loop','mobileLoop'])$(id).onclick=()=>{looping=!looping;for(const i of['loop','mobileLoop']){$(i).classList.toggle('on',looping);$(i).setAttribute('aria-pressed',looping)}toast(looping?'Repetición automática activada':'Un solo pase');};
for(const id of['scrub','mobileScrub'])$(id).addEventListener('input',e=>{setPause(true);seekTo(Number(e.target.value)/1000*current.duration);updateTime();});
function updateTime(){updatePhase();const t=Math.min(clock,current.duration),s=`${t.toFixed(1)} / ${current.duration.toFixed(1)} s`;for(const id of['timeLabel','mobileTime'])$(id).textContent=s;for(const id of['scrub','mobileScrub'])$(id).value=String(Math.round(t/current.duration*1000));}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2200);}
// Pointer controls work with mouse, touch and pen; a drag can never trigger an effect.
const pointers=new Map();let downPos=null,gestureMoved=false,previousGesture=null;
function gesture(){const v=[...pointers.values()];if(v.length<2)return null;return{x:(v[0].x+v[1].x)*.5,y:(v[0].y+v[1].y)*.5,d:Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y)}}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){downPos=[e.clientX,e.clientY];gestureMoved=false;}else gestureMoved=true;previousGesture=gesture();});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const last=pointers.get(e.pointerId),dx=e.clientX-last.x,dy=e.clientY-last.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(downPos&&Math.hypot(e.clientX-downPos[0],e.clientY-downPos[1])>5)gestureMoved=true;
 const pan=(x,y)=>{const scale=cam.dist*.0013;cam.target=V.add(cam.target,V.add(V.scale(cam.right,-x*scale),V.scale(V.norm([cam.forward[0],0,cam.forward[2]]),-y*scale)));cam.target[0]=clamp(cam.target[0],-3,3);cam.target[2]=clamp(cam.target[2],-3,3)};
 if(pointers.size>1){const g=gesture();if(previousGesture&&g){cam.dist=clamp(cam.dist*(previousGesture.d/Math.max(g.d,5)),4.4,19);pan(g.x-previousGesture.x,g.y-previousGesture.y);}previousGesture=g;}else if(e.buttons===2||e.buttons===4||e.shiftKey)pan(dx,dy);else{cam.yaw-=dx*.006;cam.pitch=clamp(cam.pitch+dy*.005,.18,1.24);}});
function pointerEnd(e){const wasTwo=pointers.size>1;pointers.delete(e.pointerId);previousGesture=gesture();if(!pointers.size&&!gestureMoved&&e.type==='pointerup'&&e.button===0)replay();if(wasTwo)gestureMoved=true;}
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*Math.exp(e.deltaY*.001),4.4,19);},{passive:false});
function resetCamera(){cam.yaw=.35;cam.pitch=.54;cam.dist=canvas.clientWidth<650?10.8:7.7;cam.target=[0,.74,0];} $('home').onclick=()=>{resetCamera();toast('Cámara restablecida')};
let focusBeforeModal=null;
function openModal(id){focusBeforeModal=document.activeElement;$(id).classList.add('open');document.querySelector('.app').inert=true;document.querySelector('.top').inert=true;$(id).querySelector('button')?.focus();}
function closeModal(overlay){overlay.classList.remove('open');document.querySelector('.app').inert=false;document.querySelector('.top').inert=false;focusBeforeModal?.focus();}
$('openAssets').onclick=()=>openModal('assetOverlay');$('openSettings').onclick=()=>openModal('settingsOverlay');
for(const el of document.querySelectorAll('.overlay')){el.addEventListener('click',e=>{if(e.target===el||e.target.closest('.close'))closeModal(el)});el.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal(el);if(e.key==='Tab'){const a=[...el.querySelectorAll('button,input,select,summary')].filter(x=>!x.disabled&&x.getClientRects().length),first=a[0],last=a[a.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}}});}
for(const a of ASSETS.resources){const card=document.createElement('div');card.className='asset-card';card.innerHTML=`<img src="${a.thumb}" alt="${a.title}"><div><strong>${a.title}</strong><small>${a.reason}</small><small class="origin">${a.source} · ${a.file}</small></div>`;$('assetGrid').append(card);}
$('licenses').textContent=Object.entries(ASSETS.licenses).map(([k,v])=>k.toUpperCase()+'\n'+v).join('\n\n');
function syncSettings(){for(const key of['density','speed','wind','nightFill']){$(key).value=settings[key];$(key+'Out').textContent=settings[key].toFixed(2)+(key==='density'||key==='speed'?'×':'');}$('quality').value=settings.quality;$('cycleDuration').value=settings.cycleDuration;}
for(const key of['density','speed','wind','nightFill'])$(key).oninput=()=>{settings[key]=Number($(key).value);if(key==='density')seekTo(clock);syncSettings();};
$('quality').onchange=()=>settings.quality=$('quality').value;$('cycleDuration').onchange=()=>{settings.cycleDuration=Number($('cycleDuration').value);if(environmentMode==='auto')setMode('auto');};
$('resetSettings').onclick=()=>{Object.assign(settings,{density:1,speed:1,wind:.3,nightFill:.14,quality:'high',cycleDuration:60,showProxy:true,showTarget:true});for(const k of Object.keys(settings.layers))settings.layers[k]=true;syncLayerChecks();syncSettings();replay();toast('Ajustes restablecidos');};
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$('exportPreset').onclick=()=>{saveBlob(new Blob([JSON.stringify({version:'4.0-beasts-guardians',effect:current.id,settings,environment:environmentMode,camera:{yaw:cam.yaw,pitch:cam.pitch,distance:cam.dist,target:cam.target},seed:2481+definitions.indexOf(current)*379,assets:ASSETS.resources.map(a=>({id:a.id,file:a.file,source:a.source}))},null,2)],{type:'application/json'}),'Wild_Guardians_VFX_V4_preset.json');toast('Ajustes exportados');};
$('capture').onclick=()=>{renderScene(environment(0),clock);canvas.toBlob(blob=>{if(blob)saveBlob(blob,`Wild_Guardians_${current.id}_${environmentMode}.png`)},'image/png')};
addEventListener('keydown',e=>{if(document.querySelector('.overlay.open')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();setPause(!paused)}else if(e.key.toLowerCase()==='r')replay();else if(e.key.toLowerCase()==='d')setMode('day');else if(e.key.toLowerCase()==='n')setMode('night');else if(e.key>='1'&&e.key<='9')selectEffect(definitions[Number(e.key)-1].id);});
let lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;$('loading').classList.remove('hide');$('loading').innerHTML='<div><b>Se ha interrumpido el contexto gráfico.</b><p>Vuelve a abrir el HTML para recuperar el laboratorio.</p></div>';});

const layerNames={telegraph:'Avisos en el suelo',textures:'Texturas de los packs',ribbons:'Cintas, ondas y cúpula',dust:'Polvo y tierra fina',fragments:'Terrones y microfragmentos',lights:'Luces locales del espíritu'};
for(const [key,label] of Object.entries(layerNames)){const el=document.createElement('label');el.className='toggle';el.innerHTML=`<input type="checkbox" data-layer="${key}" checked>${label}`;el.querySelector('input').onchange=e=>{settings.layers[key]=e.target.checked;};$('layerList').append(el);}
function syncLayerChecks(){document.querySelectorAll('[data-layer]').forEach(x=>x.checked=settings.layers[x.dataset.layer]);$('showProxy').checked=settings.showProxy;$('showTarget').checked=settings.showTarget;$('proxyToggle').classList.toggle('on',settings.showProxy);}
for(const k of ['showProxy','showTarget'])$(k).onchange=()=>{settings[k]=$(k).checked;syncLayerChecks();};
$('proxyToggle').onclick=()=>{settings.showProxy=!settings.showProxy;syncLayerChecks();toast(settings.showProxy?'Maquetas visibles':'Solo efectos y objetivo de prueba');};
function slow(){settings.speed=settings.speed<.7?1:.35;syncSettings();$('slow').classList.toggle('on',settings.speed<.7);$('mobileSlow').classList.toggle('on',settings.speed<.7);$('mobileSlow').textContent=settings.speed<.7?'1×':'0,35×';}
$('slow').onclick=slow;$('mobileSlow').onclick=slow;
$('showcase').onclick=()=>{showcase=!showcase;$('showcase').classList.toggle('on',showcase);if(showcase){selectEffect('rhino',true);toast('Demo: seis ataques y cuatro efectos de espíritu');}};
function updatePhase(){const thresholds=current.phases||[.15,.43,current.duration*.67];let i=0;for(const x of thresholds)if(clock>=x)i++;const names=current.group==='Bestias'?['AVISO DE ATAQUE','MOVIMIENTO','CONTACTO / ACCIÓN','DISIPACIÓN']:categoryOf(current)==='Espíritu'?['PREPARACIÓN','ACTIVACIÓN','EFECTO ACTIVO','DISIPACIÓN']:['PREPARACIÓN','GESTO','RESULTADO','DISIPACIÓN'];$('phaseLabel').textContent=names[i]||names[3];[...$('phaseTrack').children].forEach((s,k)=>{s.classList.toggle('current',k===i);s.classList.toggle('past',k<i);});
 if(lastImpact){$('eventLabel').textContent='Contacto → motor externo';$('eventSub').textContent=lastImpact.tag+' · sin destruir el objetivo';$('eventCode').textContent=JSON.stringify(lastImpact,null,2);}else{$('eventLabel').textContent=BEAST_IDS.includes(current.id)||current.id==='stun'?'Maquetas de ensayo':'Composición independiente';$('eventSub').textContent=BEAST_IDS.includes(current.id)||current.id==='stun'?'No son los modelos finales del juego.':'Geometría 3D + recursos seleccionados.';$('eventCode').textContent='Todavía no hay contacto.';}}
function presetObject(){return {version:'4.0-beasts-guardians',effect:current.id,settings:JSON.parse(JSON.stringify(settings)),environment:environmentMode,camera:{yaw:cam.yaw,pitch:cam.pitch,distance:cam.dist,target:cam.target},time:clock,paused,assets:ASSETS.resources.map(a=>({id:a.id,file:a.file,source:a.source}))};}
$('exportPreset').onclick=()=>{saveBlob(new Blob([JSON.stringify(presetObject(),null,2)],{type:'application/json'}),'Wild_Guardians_VFX_V4_preset.json');toast('Preset de laboratorio exportado');};
function applySettings(s){if(!s||typeof s!=='object')return;for(const [k,a,b] of [['density',.5,1.8],['speed',.15,1.5],['wind',0,1.5],['nightFill',.04,.28],['cycleDuration',10,240]])if(Number.isFinite(Number(s[k])))settings[k]=clamp(Number(s[k]),a,b);if(['high','medium'].includes(s.quality))settings.quality=s.quality;for(const k of ['showProxy','showTarget'])if(typeof s[k]==='boolean')settings[k]=s[k];if(s.layers)for(const k of Object.keys(settings.layers))if(typeof s.layers[k]==='boolean')settings.layers[k]=s.layers[k];syncLayerChecks();syncSettings();}
$('importPreset').onclick=()=>$('presetFile').click();$('presetFile').onchange=async()=>{const f=$('presetFile').files[0];if(!f)return;try{if(f.size>200000)throw Error('Archivo demasiado grande.');const p=JSON.parse(await f.text());if(!definitions.some(d=>d.id===p.effect))throw Error('Efecto desconocido.');applySettings(p.settings);selectEffect(p.effect);if(['day','sunset','night','auto'].includes(p.environment))setMode(p.environment,true);if(p.camera){if(Number.isFinite(p.camera.yaw))cam.yaw=p.camera.yaw;if(Number.isFinite(p.camera.pitch))cam.pitch=clamp(p.camera.pitch,.18,1.24);if(Number.isFinite(p.camera.distance))cam.dist=clamp(p.camera.distance,4.4,19);if(Array.isArray(p.camera.target)&&p.camera.target.length===3&&p.camera.target.every(Number.isFinite))cam.target=p.camera.target.map((v,i)=>clamp(v,i===1?-.1:-3,i===1?2:3));}if(Number.isFinite(p.time))seekTo(p.time);setPause(!!p.paused);toast('Preset restaurado');}catch(e){toast('No se pudo importar: '+e.message);}finally{$('presetFile').value='';}};
syncLayerChecks();
selectEffect('rhino');syncSettings();resetCamera();resizeRenderer();setMode('sunset',true);
let last=performance.now(),lastStats=last,frameCount=0,lastResult={sprites:0,rigids:0,calls:0},finished=false,lastVisualSignature='';
function frame(now){if(lost)return;const dt=Math.min(.065,Math.max(0,(now-last)/1000));last=now;const env=environment(dt);
 if(!paused){let left=dt*settings.speed;while(left>1e-6){const step=Math.min(left,1/60);simulate(step);left-=step;}if(clock>=current.duration){if(showcase){const ids=['rhino','lion','buffalo','warthog','hyena','roar','shield','repel','heal','stun'];selectEffect(ids[(ids.indexOf(current.id)+1)%ids.length],true);}else if(looping)restartEffect(false);else{clock=current.duration;setPause(true);}}}
 const signature=[current.id,clock,environmentValue,cam.yaw,cam.pitch,cam.dist,...cam.target,settings.wind,settings.nightFill,settings.quality,settings.showProxy,settings.showTarget,JSON.stringify(settings.layers),canvas.clientWidth,canvas.clientHeight].join('|');if(signature!==lastVisualSignature||!finished){lastResult=renderScene(env,clock);lastVisualSignature=signature;frameCount++;}updateTime();$('stage').classList.toggle('night',environmentValue>.62);$('particleCount').textContent=lastResult.sprites;$('rigidCount').textContent=lastResult.rigids;$('drawcalls').textContent=lastResult.calls;if(now-lastStats>=650){$('fps').textContent=paused?'—':String(Math.round(frameCount*1000/(now-lastStats)));$('particleCount').textContent=lastResult.sprites;$('rigidCount').textContent=lastResult.rigids;$('drawcalls').textContent=lastResult.calls;lastStats=now;frameCount=0;}
 if(!finished){finished=true;$('loading').classList.add('hide');window.WGVFXLab.ready=true;}
 requestAnimationFrame(frame);
}
window.WGVFXLab={ready:false,definitions:definitions.map(({id,title,duration})=>({id,title,duration})),setEffect:selectEffect,setEnvironment:(m,immediate=true)=>setMode(m,immediate),pause:setPause,seek:t=>{setPause(true);seekTo(t);lastResult=renderScene(environment(0),clock);updateTime();},replay,render:()=>renderScene(environment(0),clock),getState:()=>({effect:current.id,time:clock,paused,looping,environment:environmentMode,night:environmentValue,...lastResult,settings:{...settings},glError:gl.getError(),floatTarget:floatRT,dimensions:[width,height],camera:{yaw:cam.yaw,pitch:cam.pitch,distance:cam.dist},lastImpact}),setCamera:(yaw,pitch,distance)=>{cam.yaw=yaw;cam.pitch=clamp(pitch,.18,1.24);cam.dist=clamp(distance,4.4,19)},atlasCount:ASSETS.resources.length,setLayer:(k,v)=>{if(k in settings.layers){settings.layers[k]=!!v;syncLayerChecks();}},setSettings:cfg=>{applySettings(cfg);},getLastImpact:()=>lastImpact,exportConfig:()=>presetObject()};
requestAnimationFrame(frame);
})().catch(error=>{console.error(error);const el=document.getElementById('loading');if(el){el.classList.remove('hide');el.replaceChildren();const box=document.createElement('div'),title=document.createElement('b'),p=document.createElement('p');title.textContent='No se ha podido iniciar la escena';p.textContent=error.message||String(error);box.append(title,p);el.append(box);}});
