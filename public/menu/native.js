const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)},mix:(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)};
const M={identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),mul:(a,b)=>{let r=new Float32Array(16);for(let c=0;c<4;c++)for(let r0=0;r0<4;r0++)for(let k=0;k<4;k++)r[c*4+r0]+=a[k*4+r0]*b[c*4+k];return r},perspective:(fov,aspect,near,far)=>{let f=1/Math.tan(fov/2),r=new Float32Array(16);r[0]=f/aspect;r[5]=f;r[10]=(far+near)/(near-far);r[11]=-1;r[14]=2*far*near/(near-far);return r},lookAt:(eye,center,up=[0,1,0])=>{let z=V.norm(V.sub(eye,center)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},transform:(m,p)=>{const [x,y,z,w=1]=p;return [m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w]},invert:a=>{let r=new Float32Array(16),v=Array.from({length:4},(_,i)=>Array.from({length:8},(_,j)=>j<4?a[j*4+i]:(j-4===i?1:0)));for(let k=0;k<4;k++){let pivot=k;for(let i=k+1;i<4;i++)if(Math.abs(v[i][k])>Math.abs(v[pivot][k]))pivot=i;[v[k],v[pivot]]=[v[pivot],v[k]];let d=v[k][k];if(Math.abs(d)<1e-12)return M.identity();for(let j=0;j<8;j++)v[k][j]/=d;for(let i=0;i<4;i++)if(i!==k){d=v[i][k];for(let j=0;j<8;j++)v[i][j]-=d*v[k][j]}}for(let i=0;i<4;i++)for(let j=0;j<4;j++)r[j*4+i]=v[i][j+4];return r}};
function shaderProgram(gl,vs,fs){function s(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh}let p=gl.createProgram();gl.attachShader(p,s(gl.VERTEX_SHADER,vs));gl.attachShader(p,s(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
async function parseGLB(buffer,gl){const dv=new DataView(buffer);if(dv.getUint32(0,true)!==0x46546c67)throw Error('El archivo no es un GLB válido.');let j,bin;for(let o=12;o<buffer.byteLength;){const l=dv.getUint32(o,true),t=dv.getUint32(o+4,true);if(t===0x4e4f534a)j=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,o+8,l)));if(t===0x004e4942)bin=o+8;o+=l+8}const get=i=>{let a=j.accessors[i],v=j.bufferViews[a.bufferView],T={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],n={VEC3:3,VEC2:2,SCALAR:1,VEC4:4}[a.type];return new T(buffer,bin+(v.byteOffset||0)+(a.byteOffset||0),a.count*n).slice()};const primitive=j.meshes[0].primitives[0],p=get(primitive.attributes.POSITION),n=get(primitive.attributes.NORMAL),uv=get(primitive.attributes.TEXCOORD_0),idx=get(primitive.indices);const mn=j.accessors[primitive.attributes.POSITION].min,mx=j.accessors[primitive.attributes.POSITION].max;let scale=10/(mx[1]-mn[1]);for(let i=0;i<p.length;i+=3){p[i]=(p[i]-(mn[0]+mx[0])/2)*scale;p[i+1]=(p[i+1]-mn[1])*scale;p[i+2]=(p[i+2]-(mn[2]+mx[2])/2)*scale}let vao=gl.createVertexArray();gl.bindVertexArray(vao);[p,n,uv].forEach((a,k)=>{let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);gl.enableVertexAttribArray(k);gl.vertexAttribPointer(k,k===2?2:3,gl.FLOAT,false,0,0)});let e=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,e);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);gl.bindVertexArray(null);let textures=[],images=[];for(let im of j.images){let v=j.bufferViews[im.bufferView];let blob=new Blob([new Uint8Array(buffer,bin+(v.byteOffset||0),v.byteLength)],{type:im.mimeType});let img=await createImageBitmap(blob);images.push(img);let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);textures.push(t)}return {vao,p,n,uv,idx,count:idx.length,textures,images,scale,mn,mx}}
M.ortho=(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);

// Wild Guardians · native WebGL2 materials, sunset lighting, local lights & bloom.
const meshVS=`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform mat4 uLightVP;
out vec3 vPos;out vec3 vNormal;out vec2 vUV;out vec4 vShadow;
void main(){vPos=aPos;vNormal=aNormal;vUV=aUV;vShadow=uLightVP*vec4(aPos,1.);gl_Position=uVP*vec4(aPos,1.);}`;
const lightingFunctions=`
const float PI=3.14159265359;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgbToLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 linearToSRGB(vec3 c){c=max(c,vec3(0.));return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}
`;
const meshFS=`#version 300 es
precision highp float;
in vec3 vPos;in vec3 vNormal;in vec2 vUV;in vec4 vShadow;
uniform sampler2D uAlbedo,uNormal,uORM,uShadow,uCleanAlbedo;
uniform vec3 uEye;
uniform vec3 uFirePos[8];uniform vec4 uFireColor[8];
uniform float uTime,uSun,uGlow,uHDR,uNormalStrength,uLightCount,uIconOpacity;
uniform int uActive;
layout(location=0)out vec4 sceneColor;layout(location=1)out vec4 glowColor;
${lightingFunctions}
float shadow(vec3 n,vec3 l){vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.z>1.||p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 1.;float result=0.;float bias=max(.00065*(1.-dot(n,l)),.0002);vec2 texel=1./vec2(textureSize(uShadow,0));for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadow,p.xy+vec2(float(x),float(y))*texel).r;result+=step(p.z-bias,d);}return result/9.;}
vec3 mappedNormal(vec3 base,float strength){vec3 q1=dFdx(vPos),q2=dFdy(vPos);vec2 st1=dFdx(vUV),st2=dFdy(vUV);vec3 q2p=cross(q2,base),q1p=cross(base,q1);vec3 t=q2p*st1.x+q1p*st2.x;vec3 b=q2p*st1.y+q1p*st2.y;float k=inversesqrt(max(max(dot(t,t),dot(b,b)),.000000001));vec3 mapN=texture(uNormal,vUV).xyz*2.-1.;mapN.xy*=strength;return normalize(mat3(t*k,b*k,base)*normalize(mapN));}
vec3 brdf(vec3 albedo,vec3 n,vec3 v,vec3 l,vec3 radiance,float rough,float metal){float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001);vec3 h=normalize(l+v);float nh=max(dot(n,h),0.),hv=max(dot(h,v),0.);float a=rough*rough,a2=a*a;float de=nh*nh*(a2-1.)+1.;float d=a2/max(PI*de*de,.0001);float k=(rough+1.)*(rough+1.)*.125;float g=(nl/(nl*(1.-k)+k))*(nv/(nv*(1.-k)+k));vec3 f0=mix(vec3(.045),albedo,metal);vec3 f=f0+(1.-f0)*pow(1.-hv,5.);vec3 spec=d*g*f/max(4.*nl*nv,.001);vec3 diffuse=(1.-f)*(1.-metal)*albedo/PI;return (diffuse+spec)*radiance*nl;}
float boxMask(vec3 p,vec3 c,vec3 r){return 1.-smoothstep(.85,1.05,length((p-c)/r));}
void main(){
 vec3 tex=texture(uAlbedo,vUV).rgb;vec4 repair=texture(uCleanAlbedo,vUV);tex=mix(tex,repair.rgb,(1.-uIconOpacity)*repair.a);vec3 color=srgbToLinear(tex);vec3 gn=normalize(vNormal);if(!gl_FrontFacing)gn=-gn;
 float green=smoothstep(.015,.12,tex.g-max(tex.r,tex.b));
 float warm=smoothstep(.035,.16,tex.r-tex.g)*smoothstep(.04,.17,tex.g-tex.b);
 float roof=smoothstep(8.65,8.85,vPos.y)*(1.-green)* (1.-smoothstep(1.2,2.0,length(vPos.xz-vec2(.0,-2.05))));
 float woodZones=max(boxMask(vPos,vec3(.1,8.5,-2.),vec3(1.1,.7,.8)),max(boxMask(vPos,vec3(.15,5.15,1.15),vec3(.62,1.1,.65)),boxMask(vPos,vec3(0.,3.,.9),vec3(1.85,.85,1.05))));
 woodZones=max(woodZones,boxMask(vPos,vec3(0.,1.25,1.8),vec3(1.6,1.1,1.1)));
 float wood=warm*(1.-green)*(1.-roof)*mix(.35,1.,woodZones);
 float terracotta=smoothstep(.11,.23,tex.r-tex.g)*(1.-roof)*.7;
 vec3 orm=texture(uORM,vUV).rgb;
 float rough=mix(.91,.58,wood);rough=mix(rough,.98,roof);rough=mix(rough,.49,green);rough=mix(rough,.42,terracotta);rough=clamp(rough+(orm.g-.58)*.18,.28,1.);
 float metal=clamp(orm.b*.65,0.,.28);
 vec3 n=mappedNormal(gn,mix(.68,.4,roof)*uNormalStrength);vec3 v=normalize(uEye-vPos);
 vec3 sky=mix(vec3(.10,.055,.040),vec3(.13,.18,.29),n.y*.5+.5);
 vec3 lit=color*sky*.22*mix(.62,1.,orm.r);
 vec3 sunDir=normalize(vec3(.68,.57,-.40));
 lit+=brdf(color,n,v,sunDir,vec3(1.,.53,.23)*4.2*uSun,rough,metal)*mix(.18,1.,shadow(gn,sunDir));
 lit+=brdf(color,n,v,normalize(vec3(-.3,.6,1.)),vec3(.74,.65,.56)*.52*uSun,rough,metal);
 lit+=brdf(color,n,v,normalize(vec3(.6,-.15,1.)),vec3(1.,.51,.2)*.052,rough,metal);
 for(int i=0;i<8;i++){if(float(i)>=uLightCount)break;vec3 delta=uFirePos[i]-vPos;float dist=length(delta);vec3 l=delta/max(dist,.001);float fall=1./(1.+3.7*dist*dist);lit+=brdf(color,n,v,l,uFireColor[i].rgb*uFireColor[i].a*fall,rough,metal);}
 // Existing glyphs: emissive only within measured UV/geometry regions, not all yellow pixels.
 float zones[4];zones[0]=boxMask(vPos,vec3(.091,8.567,-1.791),vec3(.28,.29,.28));zones[1]=boxMask(vPos,vec3(.162,4.866,1.593),vec3(.29,.28,.30));zones[2]=boxMask(vPos,vec3(.154,2.996,1.120),vec3(.31,.25,.35));zones[3]=boxMask(vPos,vec3(.085,1.015,1.069),vec3(.28,.28,.32));
 float glyph=smoothstep(.56,.83,tex.g)*smoothstep(.57,.85,tex.r);float z=0.;for(int i=0;i<4;i++){float boost=(uActive==(i==0?0:i+1))?1.35:1.;z=max(z,zones[i]*boost);}
 vec3 emissive=vec3(1.,.55,.12)*glyph*z*(3.4*uGlow)*uIconOpacity;
 // Small embedded lanterns / braziers emit softly, independently of the sun.
 float flameZone=max(boxMask(vPos,vec3(-.80,4.91,1.44),vec3(.20,.34,.28)),boxMask(vPos,vec3(1.11,4.93,1.46),vec3(.2,.36,.28)));
 emissive+=vec3(1.,.39,.065)*glyph*flameZone*(1.4+.12*sin(uTime*5.));
 lit+=emissive;
 sceneColor=vec4(uHDR>.5?lit:aces(lit),1.);glowColor=vec4((emissive+max(lit-vec3(.75),vec3(0.))*.24)*(uHDR>.5?1.:.2),1.);
}`;
const depthVS=`#version 300 es
layout(location=0)in vec3 aPos;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aPos,1.);}`;
const depthFS=`#version 300 es
precision highp float;void main(){}`;
const quadVS=`#version 300 es
out vec2 vUV;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const bgVS=`#version 300 es
layout(location=0)in vec3 aPos;layout(location=1)in vec2 aUV;uniform mat4 uVP;out vec2 vUV;out vec3 vPos;
void main(){vUV=aUV;vPos=aPos;gl_Position=uVP*vec4(aPos,1.);}`;
const bgFS=`#version 300 es
precision highp float;in vec2 vUV;in vec3 vPos;uniform sampler2D uBG,uTerrainMask;uniform float uHDR,uSun;uniform int uLayer;
layout(location=0)out vec4 sceneColor;layout(location=1)out vec4 glowColor;
${lightingFunctions}
vec3 inverseACES(vec3 y){vec3 a=2.51-2.43*y,b=.03-.59*y;return (-b+sqrt(max(b*b+.56*a*y,vec3(0.))))/(2.*a);}
void main(){
 vec2 uv=1.-abs(mod(vUV,2.)-1.);
 float alpha=1.;if(uLayer==1)alpha=texture(uTerrainMask,uv).r;else if(uLayer==2)alpha=smoothstep(.755,.86,vUV.y);if(alpha<.002)discard;vec3 c=srgbToLinear(texture(uBG,uv).rgb);
 // Twilight grade preserves orange cloud edges, while reducing the whole background.
 c*=vec3(.91,.95,1.12)*(.16+.22*uSun);
 float outside=max(abs(vUV.x-.5)-.5,0.)+max(abs(vUV.y-.5)-.5,0.);
 c*=1.-min(outside*.20,.28);
 c=clamp(c,0.,.94);
 sceneColor=vec4(uHDR>.5?inverseACES(c):c,alpha);glowColor=vec4(0.);
}`;
const groundVS=`#version 300 es
uniform mat4 uVP;out vec2 vUV;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=uVP*vec4((p.x-.5)*13.,-.045,(p.y-.5)*12.+.4,1.);}`;
const groundFS=`#version 300 es
precision highp float;in vec2 vUV;layout(location=0)out vec4 sceneColor;layout(location=1)out vec4 glowColor;void main(){vec2 p=(vUV-.5)*2.;float a=exp(-dot(p,p)*4.8)*.56;sceneColor=vec4(.026,.010,.003,a);glowColor=vec4(0.);}`;
const ringVS=`#version 300 es
uniform mat4 uVP;uniform vec3 uCenter;uniform float uSize;out vec2 vUV;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=uVP*vec4(uCenter+vec3((p-.5)*uSize,0.),1.);}`;
const ringFS=`#version 300 es
precision highp float;in vec2 vUV;uniform vec3 uTint;uniform float uActive,uTime,uGlow,uHDR,uIconOpacity;uniform int uKind;uniform sampler2D uGlyph;
layout(location=0)out vec4 sceneColor;layout(location=1)out vec4 glowColor;${lightingFunctions}
void main(){vec2 p=(vUV-.5)*2.;float r=length(p);if(r>1.)discard;float radius=.68+uActive*.023;float ring=exp(-pow((r-radius)*45.,2.));float outer=exp(-pow((r-radius)*10.,2.))*.08;
 float orbit=atan(p.y,p.x)+uTime*.36;float fleck=pow(max(cos(orbit*3.),0.),38.)*exp(-pow((r-.84)*40.,2.))*.65;
 float a=(ring+outer+fleck)*(.62+uActive*.28);vec3 c=uTint*(2.7+uActive*1.2)*uGlow;
 if(uKind==1){vec4 glyph=texture(uGlyph,vec2(vUV.x,1.-vUV.y));float disc=(1.-smoothstep(.58,.62,r))*.82;float ga=glyph.a;a=max(a,max(disc,ga));c=mix(vec3(.014,.034,.006),uTint*3.7*uGlow,ga);c+=uTint*ring*3.*uGlow;}
 sceneColor=vec4(uHDR>.5?c:aces(c),a*uIconOpacity);glowColor=vec4(c*(uHDR>.5?1.:.25),uIconOpacity*(uKind==1?min(a, max(ring,.0)+texture(uGlyph,vec2(vUV.x,1.-vUV.y)).a):a));
}`;
const flyVS=`#version 300 es
layout(location=0)in vec3 aPos;layout(location=1)in vec4 aColor;uniform mat4 uVP;uniform vec3 uEye;uniform float uHeight;out vec4 vColor;void main(){gl_Position=uVP*vec4(aPos,1.);float d=length(uEye-aPos);gl_PointSize=clamp(aColor.a*uHeight/max(d,1.),2.5,34.);vColor=aColor;}`;
const flyFS=`#version 300 es
precision highp float;in vec4 vColor;uniform float uHDR;layout(location=0)out vec4 sceneColor;layout(location=1)out vec4 glowColor;${lightingFunctions}
void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;float a=exp(-r*6.5);vec3 c=vColor.rgb*(1.05+4.8*exp(-r*58.))+vec3(1.)*exp(-r*130.)*.9;sceneColor=vec4(uHDR>.5?c:aces(c),a);glowColor=vec4(c*(uHDR>.5?1.:.28),a);}`;
const blurFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uDirection;out vec4 color;void main(){vec3 c=texture(uTex,vUV).rgb*.227027;c+=(texture(uTex,vUV+uDirection*1.384615).rgb+texture(uTex,vUV-uDirection*1.384615).rgb)*.316216;c+=(texture(uTex,vUV+uDirection*3.230769).rgb+texture(uTex,vUV-uDirection*3.230769).rgb)*.070270;color=vec4(c,1.);}`;
const compositeFS=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uScene,uBloom;uniform float uHDR,uBloomStrength,uTime;uniform vec2 uViewport;out vec4 color;${lightingFunctions}
void main(){vec3 c=texture(uScene,vUV).rgb+texture(uBloom,vUV).rgb*uBloomStrength; if(uHDR>.5)c=aces(c);c=linearToSRGB(c);
 vec2 p=(vUV-.5)*2.;float edge=pow(clamp(length(p*vec2(.72,.86))*.72,0.,1.),2.6);c*=1.-edge*.38;
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.004;
 color=vec4(c,1.);}`;

document.getElementById('end-logo').src=document.querySelector('#brand img').src;
/*
 WILD GUARDIANS: AFRICA · Diorama menu V2 — Spirit Journey
 Self-contained WebGL2: no libraries, no CDN, no requests, no telemetry.
 Source geometry: the user's Meshy GLB; geometry and UVs are unmodified except
 for uniform normalization. 2K albedo / normal maps; oversized ORM reduced to 1K.
 Materials are spatial / colour masks because the original is ONE BakedMaterial.
 Navigation integration: listen to `wildguardians:action` (cancelable), with
 detail { action: 'new-game' | 'continue' | 'exit', config }. preventDefault()
 suppresses the prototype's confirmation. `wildguardians:navigate` is emitted
 for section changes. No real gameplay or real save-game data is fabricated.
*/
(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)}, ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=document.documentElement, canvas=$('#world');
const defaults={sun:.24,glow:.95,firePower:1.15,fireflies:true,quality:'balanced',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
let storageOK=true;const mem={};
const store={get(k){try{return localStorage.getItem(k)}catch{storageOK=false;return mem[k]??null}},set(k,v){mem[k]=v;try{localStorage.setItem(k,v)}catch{storageOK=false}}};
let savedOpts={};try{savedOpts=JSON.parse(store.get('wg.menu.options.v2')||'{}')||{}}catch{}
let opts={...defaults,...savedOpts};opts.sun=clamp(Number(opts.sun)||.24,.04,1.4);opts.firePower=clamp(Number(opts.firePower)||1.15,.15,2.5);opts.glow=clamp(Number(opts.glow)||1,.55,2);opts.quality=['low','balanced','high'].includes(opts.quality)?opts.quality:'balanced';opts.fireflies=!!opts.fireflies;opts.reduced=!!opts.reduced;
let demoConfig=null;try{const d=JSON.parse(store.get('wg.menu.demo-config')||'null');if(d&&d.demo===true&&typeof d.name==='string')demoConfig=d}catch{}
const slots=[
 {id:'continue',title:'Continuar',anchor:[.091,8.567,-1.746],focus:[.091,8.50,-1.79],tint:[1,.60,.18],size:.94},
 {id:'new',title:'Juego nuevo',anchor:[.14,7.02,1.09],focus:[.1,6.9,.45],tint:[.45,1,.11],size:1.08},
 {id:'options',title:'Opciones',anchor:[.162,4.866,1.646],focus:[.162,5.08,1.40],tint:[1,.60,.16],size:.98},
 {id:'library',title:'Biblioteca',anchor:[.154,2.996,1.176],focus:[.1,3.03,1.1],tint:[1,.70,.27],size:1.03},
 {id:'exit',title:'Salir',anchor:[.085,1.015,1.127],focus:[.07,1.25,1.10],tint:[1,.34,.08],size:.96}
];
let gl,model,programs={},loc=new Map(),resources=[],shadow,targets,quadVAO,glyphTex,bgTex,flyVAO,flyBuf,flyColBuf;
let W=innerWidth,H=innerHeight,RW=0,RH=0,home,pose,VP,invVP,lightVP;
let state='loading',active=-1,hover=-1,section=-1,travel=0,tween=null,travelPose=null,parallax=[0,0],pointer=[0,0],time=0,ready=false,lastFrame=0,renderCount=0,frameMS=16.7;
let renderPaused=false;let fpsTimes=[],toastTimer,resizeTimer,ambient=null,audioOn=true,paused=false;
const heroPositions=new Float32Array(24),heroColors=new Float32Array(32),flyPositions=new Float32Array(64*3),flyColors=new Float32Array(64*4);
const flyPalette=[[1,.63,.12],[.18,.91,1],[.49,1,.14],[1,.23,.36],[.61,.36,1],[1,.76,.24],[.18,1,.54],[1,.43,.20]];
const frontProfile=[3.94,3.91,3.49,3.09,3.31,2.84,2.29,2.30,2.39,2.22,1.64,1.68,1.55,1.18,.96,-.13,-.66,-1.35,-1.21,-1.63,-2.];
// V2 · physical background relief, reversible spirit routes, and texture-level glyph fading.
// Every position below is in the same normalized world space as the supplied GLB.
const safeSurfaceMeta={"nx": 140, "ny": 220, "xmin": -3.85, "xmax": 3.85, "ymin": -0.05, "ymax": 10.1, "offset": 6, "scale": 4000};
let surfaceGrid=null,backdropMesh=null,skyTex=null,terrainMaskTex=null,cleanTex=null,iconOpacity=1,iconTween=null,entryTime=0,frameDT=.016;
let bgReference=null,bgReferenceVP=null,manualPreview=false,homeDriftResume=0;
async function initSurface(){const bytes=new Uint8Array(await (await fetch($('#surfacedata').textContent.trim())).arrayBuffer());surfaceGrid=new Uint16Array(bytes.buffer);$('#surfacedata').textContent='';}
function surfaceZ(x,y){
 const m=safeSurfaceMeta;
 if(!surfaceGrid||x<m.xmin||x>m.xmax||y<m.ymin||y>m.ymax)return -6;
 const u=clamp((x-m.xmin)/(m.xmax-m.xmin)*(m.nx-1),0,m.nx-1),v=clamp((y-m.ymin)/(m.ymax-m.ymin)*(m.ny-1),0,m.ny-1);
 const ix=Math.floor(u),iy=Math.floor(v),jx=Math.min(ix+1,m.nx-1),jy=Math.min(iy+1,m.ny-1);
 return lerp(lerp(surfaceGrid[iy*m.nx+ix],surfaceGrid[iy*m.nx+jx],u-ix),lerp(surfaceGrid[jy*m.nx+ix],surfaceGrid[jy*m.nx+jx],u-ix),v-iy)/m.scale-m.offset;
}
function clearanceZ(x,y,r=.16){let z=surfaceZ(x,y);for(const [dx,dy] of [[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,-r]])z=Math.max(z,surfaceZ(x+dx,y+dy));return z;}
function guardPoint(p,clearance=3.25){return [p[0],p[1],Math.max(p[2],clearanceZ(p[0],p[1],.24)+clearance)];}
function nearStep(x,y,clearance=1.38){return [x,y,Math.max(surfaceZ(x,y)+clearance+2.55,front(y)+2.75)];}
function copyPose(p){return {eye:[...p.eye],target:[...p.target],shift:[...p.shift]};}
function setIconTarget(value,duration=240){iconTween={from:iconOpacity,to:value,start:performance.now(),duration};}
function advanceIcons(now){if(!iconTween)return;const t=clamp((now-iconTween.start)/iconTween.duration,0,1);iconOpacity=lerp(iconTween.from,iconTween.to,smooth(t));if(t>=1)iconTween=null;}
// V2.6 — Continuous spirit motion, not a chain of corrected waypoints.
// A seventh-degree ease has zero velocity, acceleration AND jerk at each end.
// Evaluate it symmetrically to keep the reverse path identical and numerically
// stable near 1. Camera height and look-at height have independent endpoints.
function spiritEase(t){
 t=clamp(t,0,1);const x=t<=.5?t:1-t;
 const y=x*x*x*x*(35+x*(-84+x*(70-20*x)));
 return t<=.5?y:1-y;
}
function routeGeometry(route,u,swayScale=1){
 const eye=V.mix(route.start.eye,route.end.eye,u);
 const target=V.mix(route.start.target,route.end.target,u);
 const bell=u*(1-u),sway=route.sway*bell*(1-2*u)*swayScale;
 // One broad, continuous lateral sway. The gaze follows only a small part,
 // rather than abruptly steering at every stair or surface-grid sample.
 eye[0]+=sway;target[0]+=sway*.18;
 eye[2]+=route.depthBow*bell;
 return {eye,target,shift:V.mix(route.start.shift,route.end.shift,u)};
}
function makeRoute(i,start){
 const end=travelDestination(i);
 const route={start:copyPose(start),end:copyPose(end),index:i,
  sway:[7.0,6.0,-6.0,5.0,-4.0][i],depthBow:0,
  duration:[6800,6400,5900,5300,4900][i],points:[],eyes:[],look:[],length:0};
 route.finalClearance=Math.max(3.25,end.eye[2]-clearanceZ(end.eye[0],end.eye[1],.24));
 // Fit one smooth OUTWARD safety bow in advance. Never clamp a moving camera
 // against a jagged height map: such clamps were creating sudden Z turns.
 // Include both the ordinary path and the reduced-motion straight path.
 let requiredBow=0;
 const safetySamples=2048;
 for(let k=1;k<safetySamples;k++){
  const u=k/safetySamples,bell=u*(1-u);
  for(const swayScale of [0,1]){
   const p=routeGeometry(route,u,swayScale).eye;
   const safeZ=clearanceZ(p[0],p[1],.24)+route.finalClearance;
   requiredBow=Math.max(requiredBow,(safeZ-p[2])/bell);
  }
 }
 if(requiredBow>0)route.depthBow=requiredBow*1.035+.12;
 // Samples are for diagnostics only. Animation always evaluates the exact
 // analytic curve, so there are no linear-segment joins or waypoint corners.
 let previous=null;
 for(let k=0;k<=256;k++){
  const u=k/256,p=routeGeometry(route,u,opts.reduced?0:1);
  if(previous)route.length+=Math.hypot(...V.sub(p.eye,previous));
  route.points.push({eye:p.eye,target:p.target,s:u,distance:route.length});
  if(k%32===0){route.eyes.push([...p.eye]);route.look.push([...p.target]);}
  previous=p.eye;
 }
 return route;
}
function sampleRoute(route,progress){
 // Preserve the actual destinations EXACTLY, including Continuar (upper hut)
 // and Opciones (gear terrace). Neither a clamp nor a smoothing pass may edit
 // these endpoints. The identical function is used in both directions.
 if(progress<=0)return copyPose(route.start);
 if(progress>=1)return copyPose(route.end);
 return routeGeometry(route,spiritEase(progress),opts.reduced?0:1);
}
// Normally the route clock is linear: spiritEase supplies the physical ease.
// If Escape interrupts a flight, a quintic clock preserves the current speed
// and acceleration, brakes first, then reverses instead of flipping direction.
function travelClock(tw,now){
 if(now<=tw.start)return {value:tw.from,velocity:0,acceleration:0};
 const t=clamp((now-tw.start)/tw.duration,0,1);
 if(t>=1)return {value:tw.to,velocity:0,acceleration:0};
 if(!tw.coefficients)return {value:lerp(tw.from,tw.to,t),velocity:(tw.to-tw.from)/tw.duration,acceleration:0};
 const c=tw.coefficients;
 const value=c[0]+t*(c[1]+t*(c[2]+t*(c[3]+t*(c[4]+t*c[5]))));
 const velocity=(c[1]+t*(2*c[2]+t*(3*c[3]+t*(4*c[4]+t*5*c[5]))))/tw.duration;
 const acceleration=(2*c[2]+t*(6*c[3]+t*(12*c[4]+t*20*c[5])))/(tw.duration*tw.duration);
 return {value,velocity,acceleration};
}
function reversingClock(from,to,velocity,acceleration,start,duration){
 const v=velocity*duration,a=acceleration*duration*duration,d=to-from;
 return {from,to,start,duration,coefficients:[from,v,a*.5,
  10*d-6*v-1.5*a,-15*d+8*v+1.5*a,6*d-3*v-.5*a]};
}
function uiForTravel(){
 root.style.setProperty('--travel',String(smooth(travel/.16)));
 const alpha=smooth((travel-.86)/.14);root.style.setProperty('--panel-alpha',alpha.toFixed(5));
 const underway=state==='entering'||state==='leaving';$('#journey').classList.toggle('visible',underway&&travel>.015&&travel<.975);
 $('#journey-label').textContent=(state==='leaving'?'Regresando al santuario':(slots[section]?.title||'Recorriendo el santuario'));
 $('#journey-bar').style.transform='scaleX('+clamp(travel,0,1)+')';
 $('#journey-skip').textContent=state==='leaving'?'Volver ya':'Omitir recorrido';
 $('#journey-back').style.display=state==='leaving'?'none':'';
}
function skipJourney(){if(!tween)return;travel=tween.to;tween=null;finishTween();uiForTravel();updatePose();placeHotspots();draw(time);}
function backgroundRidge(u){
 const keys=[[0,.45],[.03,.43],[.07,.36],[.09,.30],[.14,.30],[.16,.39],[.185,.38],[.22,.445],[.29,.45],[.37,.433],[.435,.49],[.49,.50],[.50,.46],[.52,.51],[.59,.50],[.64,.44],[.674,.355],[.711,.35],[.745,.42],[.78,.46],[.82,.49],[.91,.495],[1,.515]];
 u=clamp(u,0,1);for(let i=1;i<keys.length;i++)if(u<=keys[i][0])return lerp(keys[i-1][1],keys[i][1],(u-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return .51;
}
function createBackgroundRelief(){
 if(backdropMesh)for(const m of backdropMesh){gl.deleteVertexArray(m.vao);gl.deleteBuffer(m.buffer);gl.deleteBuffer(m.index);}
 const camera=copyPose(home),aspect=W/H,P=M.perspective(32*Math.PI/180,aspect,.10,460);P[8]=home.shift[0];P[9]=home.shift[1];
 const vpm=M.mul(P,M.lookAt(camera.eye,camera.target)),iv=M.invert(vpm),fw=V.norm(V.sub(camera.target,camera.eye));
 bgReference=copyPose(home);bgReferenceVP=vpm;backdropMesh=[];
 // Rigid far layers preserve cliff silhouettes during lateral moves. A separate
 // projectively textured ground plane supplies the stronger near-field parallax.
 for(let layer=0;layer<3;layer++){
  const nx=layer===2?52:2,ny=layer===2?32:2,verts=new Float32Array((nx+1)*(ny+1)*5),indices=new Uint32Array(nx*ny*6);
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
   const sx=-1.25+x/nx*3.50,sy=layer===2?(-1.25+y/ny*1.60):(-1.10+y/ny*3.20);
   let u=sx,v=sy;if(aspect>16/9)v=(sy-.5)*(16/9)/aspect+.5;else u=(sx-.5)*aspect/(16/9)+.5;
   u=(u-.5)*.975+.5;v=(v-.5)*.975+.5;
   const q=M.transform(iv,[sx*2-1,sy*2-1,1,1]),rd=V.norm([q[0]/q[3]-camera.eye[0],q[1]/q[3]-camera.eye[1],q[2]/q[3]-camera.eye[2]]);
   const cosine=Math.max(.18,V.dot(rd,fw));let dist=(layer===0?154:73)/cosine;
   if(layer===2)dist=rd[1]<-.008?(-.072-camera.eye[1])/rd[1]:220;
   const pos=V.add(camera.eye,V.mul(rd,dist)),k=(y*(nx+1)+x)*5;verts.set([...pos,u,1-v],k);
  }
  let n=0;for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.set([a,b,c,b,d,c],n);n+=6;}
  const vao=gl.createVertexArray(),buffer=gl.createBuffer(),index=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);
  backdropMesh.push({vao,buffer,index,count:indices.length,layer});
 }
}

const progress=(p,text)=>{$('#loadbar').style.width=p+'%';$('#loadtext').textContent=text;};
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4100)}
function fail(error){console.error(error);state='error';$('#loading').style.display='grid';$('#loading').style.opacity=1;$('.loadingbox').classList.add('error');$('#loadtitle').textContent='No se pudo abrir el santuario';$('#loadtext').textContent=error?.message||'Error al inicializar la escena 3D.';}
function uniforms(prog){if(!loc.has(prog))loc.set(prog,{});return loc.get(prog)}
function ul(prog,name){let l=uniforms(prog);if(!(name in l))l[name]=gl.getUniformLocation(prog,name);return l[name]}
const u1=(p,n,v)=>gl.uniform1f(ul(p,n),v),ui=(p,n,v)=>gl.uniform1i(ul(p,n),v),u2=(p,n,a,b)=>gl.uniform2f(ul(p,n),a,b),u3=(p,n,v)=>gl.uniform3fv(ul(p,n),v),u4=(p,n,v)=>gl.uniform4fv(ul(p,n),v),um=(p,n,m)=>gl.uniformMatrix4fv(ul(p,n),false,m);
function bindTex(p,name,t,unit){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);ui(p,name,unit)}
function compile(vs,fs){const p=shaderProgram(gl,vs,fs);resources.push(p);return p}
function decode64(s){s=s.trim();const raw=atob(s);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
async function modelBytes(){const el=$('#modeldata');if(el.textContent.trim().startsWith('/assets/'))return await (await fetch(el.textContent.trim())).arrayBuffer();const b=decode64(el.textContent);el.textContent='';if(el.dataset.encoding==='gzip'){if(!window.DecompressionStream)throw Error('Abre este archivo en un navegador actualizado con WebGL2 y descompresión nativa (Chrome, Edge, Firefox o Safari).');const stream=new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));return await new Response(stream).arrayBuffer()}return b.buffer}
async function imageFromData(data){if(data.startsWith('/assets/'))return await createImageBitmap(await (await fetch(data)).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});const comma=data.indexOf(',');const mime=data.slice(5,data.indexOf(';'));return await createImageBitmap(new Blob([decode64(data.slice(comma+1))],{type:mime}),{premultiplyAlpha:'none',colorSpaceConversion:'none'})}
function makeTexture(image,rgba=true){let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,rgba?gl.RGBA:gl.RGB,rgba?gl.RGBA:gl.RGB,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function gardenGlyph(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.strokeStyle='#e9ffd1';x.fillStyle='#e9ffd1';x.lineWidth=9;x.lineCap='round';x.beginPath();x.moveTo(127,172);x.lineTo(127,117);x.stroke();x.beginPath();x.moveTo(126,139);x.bezierCurveTo(88,138,80,114,78,99);x.bezierCurveTo(111,99,132,111,126,139);x.fill();x.beginPath();x.moveTo(129,123);x.bezierCurveTo(129,94,146,81,176,79);x.bezierCurveTo(172,109,153,126,129,123);x.fill();x.lineWidth=5;x.beginPath();x.moveTo(96,81);x.lineTo(96,59);x.moveTo(85,70);x.lineTo(107,70);x.stroke();return makeTexture(c)}
function createShadow(){if(shadow){gl.deleteTexture(shadow.texture);gl.deleteFramebuffer(shadow.fbo)}let size=opts.quality==='high'?2048:1024;let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,size,size,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);let f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,t,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('El navegador no admite el mapa de sombras requerido.');shadow={fbo:f,texture:t,size};let sun=V.mul(V.norm([.68,.57,-.4]),28);lightVP=M.mul(M.ortho(-10.5,10.5,-10.5,10.5,1,60),M.lookAt(V.add([0,4,0],sun),[0,4,0]));gl.viewport(0,0,size,size);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,3);gl.disable(gl.BLEND);gl.useProgram(programs.depth);um(programs.depth,'uVP',lightVP);gl.bindVertexArray(model.vao);gl.drawElements(gl.TRIANGLES,model.count,gl.UNSIGNED_INT,0);gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
function rt(w,h,mrt=false){let f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);let textures=[];for(let i=0;i<(mrt?2:1);i++){let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.hdr?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,gl.hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,t,0);textures.push(t)}let depth=null;if(mrt){depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth)}gl.drawBuffers(mrt?[gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]:[gl.COLOR_ATTACHMENT0]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('No se pudo crear el búfer de iluminación.');return {fbo:f,textures,depth,w,h}}
function disposeRT(t){if(!t)return;gl.deleteFramebuffer(t.fbo);t.textures.forEach(x=>gl.deleteTexture(x));if(t.depth)gl.deleteRenderbuffer(t.depth)}
function configureResolution(){if(!gl)return;const maxDpr={low:1,balanced:1.45,high:2}[opts.quality];let ratio=Math.min(devicePixelRatio||1,maxDpr);let cap={low:850000,balanced:1650000,high:2700000}[opts.quality];ratio=Math.min(ratio,Math.sqrt(cap/(W*H)));RW=Math.max(1,Math.round(W*ratio));RH=Math.max(1,Math.round(H*ratio));canvas.width=RW;canvas.height=RH;if(targets){disposeRT(targets.main);disposeRT(targets.a);disposeRT(targets.b)}const bw=Math.max(64,Math.round(RW/4)),bh=Math.max(64,Math.round(RH/4));try{targets={main:rt(RW,RH,true),a:rt(bw,bh),b:rt(bw,bh)}}catch(e){if(gl.hdr){gl.hdr=false;targets={main:rt(RW,RH,true),a:rt(bw,bh),b:rt(bw,bh)}}else throw e}gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
function projectedBounds(d){const eye=[d*.014,4.85+d*.115,d],target=[0,4.85,0];const p=M.perspective(32*Math.PI/180,W/H,.10,460),vp=M.mul(p,M.lookAt(eye,target));let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;for(let i=0;i<model.p.length;i+=36){const pt=M.transform(vp,[model.p[i],model.p[i+1],model.p[i+2]]);const x=pt[0]/pt[3],y=pt[1]/pt[3];minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY)}return {eye,target,p,minX,maxX,minY,maxY}}
function computeHome(){const brand=$('#brand');const top=brand.offsetTop+brand.offsetHeight+(H<540?2:14);const bottom=H-(W/H<.8?95:(H<540?35:74));const availableH=Math.max(90,bottom-top);const availableW=W-(W/H<.8?34:Math.max(100,W*.40));let low=12,high=75;for(let i=0;i<15;i++){let d=(low+high)/2,b=projectedBounds(d);if((b.maxX-b.minX)*W/2>availableW||(b.maxY-b.minY)*H/2>availableH)low=d;else high=d}let b=projectedBounds(high);let cx=(b.maxX+b.minX)/2,cy=(b.maxY+b.minY)/2;let wantedY=1-2*((top+bottom)/2)/H;home={eye:b.eye,target:b.target,shift:[cx,cy-wantedY],distance:high};if(!pose||state==='home'||state==='loading')pose={eye:[...home.eye],target:[...home.target],shift:[...home.shift]};return home}
function currentVP(){
 // Fixed lens: the old sin(progress)^.85 FOV pulse had a sharp derivative at
 // both ends, perceived as a kick even when camera positions were smoothed.
 const p=M.perspective(32*Math.PI/180,W/H,.10,460);
 p[8]=pose.shift[0];p[9]=pose.shift[1];VP=M.mul(p,M.lookAt(pose.eye,pose.target));invVP=M.invert(VP);
}
function project(a){const p=M.transform(VP,a);return {x:(p[0]/p[3]*.5+.5)*W,y:(.5-p[1]/p[3]*.5)*H,z:p[2]/p[3],w:p[3]}}
function prepareHotspots(){slots.forEach((s,i)=>{const btn=document.createElement('button');btn.className='hotspot';btn.id='hot-'+s.id;btn.dataset.index=i;btn.setAttribute('aria-label',s.title);btn.innerHTML='<span class="hitspace" aria-hidden="true"></span><span class="label">'+s.title+'</span>';btn.addEventListener('click',()=>navigate(i));btn.addEventListener('focus',()=>{if(state==='home')setActive(i)});btn.addEventListener('mouseenter',()=>{if(state==='home')setActive(i)});$('#hotspots').appendChild(btn);s.button=btn;s.screen={x:0,y:0};})}
function placeHotspots(){if(!VP)return;slots.forEach(s=>{const p=project(s.anchor);s.screen=p;let x=p.x,y=p.y;const btn=s.button;const bw=btn.offsetWidth||145;if(x-22+bw>W-9)x=W-9-bw+22;if(x-22<8)x=30;btn.style.left=x+'px';btn.style.top=y+'px';btn.style.visibility=p.w>0?'visible':'hidden';btn.classList.toggle('dim',s.id==='continue'&&!demoConfig);btn.tabIndex=state==='home'?0:-1});}
function setActive(i){active=i;slots.forEach((s,j)=>s.button.classList.toggle('active',i===j));canvas.style.cursor=i>=0?'pointer':'default'}
function iconAt(x,y,touch=false){let result=-1,best=1e9;slots.forEach((s,i)=>{const p=s.screen;if(p.w<=0)return;const edge=project([s.anchor[0]+s.size*.35,s.anchor[1],s.anchor[2]]);const rad=Math.max(touch?25:20,Math.abs(edge.x-p.x)+5);const d=Math.hypot(x-p.x,y-p.y);if(d<rad&&d<best){result=i;best=d}});return result}
// Ray / triangle selection on the actual GLB. Called only on click, never every frame.
function raycast(x,y){const near=M.transform(invVP,[x/W*2-1,1-y/H*2,-1,1]),far=M.transform(invVP,[x/W*2-1,1-y/H*2,1,1]);const o=[near[0]/near[3],near[1]/near[3],near[2]/near[3]],d=V.norm([far[0]/far[3]-o[0],far[1]/far[3]-o[1],far[2]/far[3]-o[2]]);let best=Infinity,hit=null,p=model.p,I=model.idx;for(let k=0;k<I.length;k+=3){let ai=I[k]*3,bi=I[k+1]*3,ci=I[k+2]*3;let ax=p[ai],ay=p[ai+1],az=p[ai+2],e1x=p[bi]-ax,e1y=p[bi+1]-ay,e1z=p[bi+2]-az,e2x=p[ci]-ax,e2y=p[ci+1]-ay,e2z=p[ci+2]-az;let hx=d[1]*e2z-d[2]*e2y,hy=d[2]*e2x-d[0]*e2z,hz=d[0]*e2y-d[1]*e2x;let det=e1x*hx+e1y*hy+e1z*hz;if(Math.abs(det)<1e-8)continue;let f=1/det,sx=o[0]-ax,sy=o[1]-ay,sz=o[2]-az,u=f*(sx*hx+sy*hy+sz*hz);if(u<0||u>1)continue;let qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=f*(d[0]*qx+d[1]*qy+d[2]*qz);if(v<0||u+v>1)continue;let t=f*(e2x*qx+e2y*qy+e2z*qz);if(t>0&&t<best){best=t;hit={distance:t,point:[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t],triangle:k/3}}}return hit}
function travelDestination(i){
 const a=slots[i].focus;const portrait=W/H<.85;
 const distance=portrait?11.8:10.2;
 let eye=[a[0]+(i===2?.85:.68),a[1]+(i===1?1.05:.57),a[2]+distance];
 eye=guardPoint(eye,2.85);
 return {eye,target:[...a],shift:[W/H>1.2?.45:0,0]};
}

function bezier(a,b,c,d,t){const u=1-t;return a.map((x,i)=>u*u*u*x+3*u*u*t*b[i]+3*u*t*t*c[i]+t*t*t*d[i])}
function updatePose(){
 if(travelPose){
  pose=sampleRoute(travelPose,travel);
 }else{
  // Blend idle mouse parallax back in from rest after a return. Do not snap
  // from the saved departure pose to a freshly centred home camera, including
  // when reduced motion was enabled while an option panel was open.
  const resume=spiritEase((performance.now()-homeDriftResume)/650);
  const k=1-Math.exp(-frameDT*2.4*resume),wanted=opts.reduced?[0,0]:pointer;
  parallax[0]=lerp(parallax[0],wanted[0],k);parallax[1]=lerp(parallax[1],wanted[1],k);
  pose={eye:[home.eye[0]+parallax[0]*.42,home.eye[1]+parallax[1]*.20,home.eye[2]],target:[...home.target],shift:[...home.shift]};
 }
 currentVP();
}

function saveOptions(){store.set('wg.menu.options.v2',JSON.stringify(opts))}
function emit(action,config){return window.dispatchEvent(new CustomEvent('wildguardians:action',{cancelable:true,detail:{action,config:config??null}}))}
function navigate(i){
 if(!ready||state!=='home')return;if(typeof i==='string')i=slots.findIndex(s=>s.id===i);if(!Number.isInteger(i)||i<0||i>4)return;
 section=i;setActive(i);state='entering';renderPanel(slots[i].id);$('#panelstage').classList.add('visible');$('#panelstage').inert=true;$('#hotspots').inert=true;$('#utilities').inert=true;canvas.tabIndex=-1;
 travelPose=makeRoute(i,copyPose(pose));entryTime=performance.now();setIconTarget(0,220);
 // The first 240 ms belong to the glyph dissolve; the camera starts afterwards.
 tween={from:0,to:1,start:entryTime+(opts.reduced?90:240),duration:opts.reduced?460:travelPose.duration};
 root.style.setProperty('--ui',0);$('#live').textContent='Viajando a '+slots[i].title+'. Escape para regresar.';
 window.dispatchEvent(new CustomEvent('wildguardians:navigate',{detail:{section:slots[i].id}}));
}

function back(){
 if(!ready||['home','loading','error','leaving'].includes(state))return;if(state==='end'){endBack();return;}
 const now=performance.now();
 const interrupted=state==='entering'&&tween;
 const clock=interrupted?travelClock(tween,now):{value:travel,velocity:0,acceleration:0};
 travel=clamp(clock.value,0,1);
 state='leaving';$('#panelstage').inert=true;setIconTarget(0,100);
 // Same full duration as the outward journey: no 0.70 speed-up on the return.
 const duration=(opts.reduced?460:(travelPose?.duration||5900))*Math.max(travel,.12);
 tween=interrupted&&clock.velocity>0
  ?reversingClock(travel,0,clock.velocity,clock.acceleration,now,duration)
  :{from:travel,to:0,start:now,duration};
}

function finishTween(){
 if(travel>=.999){
  travel=1;state='panel';$('#panelstage').inert=false;$('#panelstage .back')?.focus({preventScroll:true});
 }else{
  const arrived=travelPose?copyPose(travelPose.start):copyPose(home);
  travel=0;state='home';travelPose=null;
  parallax=[(arrived.eye[0]-home.eye[0])/.42,(arrived.eye[1]-home.eye[1])/.20];
  pointer=[0,0];homeDriftResume=performance.now();pose=arrived;
  $('#panelstage').classList.remove('visible');$('#panelstage').inert=true;$('#hotspots').inert=false;$('#utilities').inert=false;canvas.tabIndex=0;
  setIconTarget(1,300);root.style.setProperty('--ui',1);if(section>=0)slots[section].button.focus({preventScroll:true});section=-1;
 }
 $('#journey').classList.remove('visible');
}

function renderPanel(id){const backHTML='<button class="back" data-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 5-7 7 7 7M6 12h14"/></svg>Volver al santuario <span class="sr-only">(Escape)</span></button>';
 let body='';
 if(id==='continue'){
  body='<div class="sectionmark">Tu refugio</div><h1>Volver a casa.</h1>';
  if(demoConfig)body+='<p class="lede">Tu próxima aventura ya tiene nombre. Esta es la configuración que has preparado en el prototipo.</p><div class="savecard"><strong>'+esc(demoConfig.name)+'</strong><span>Entorno: Sabana<br>Experiencia: '+esc(demoConfig.difficulty)+'</span><br><span class="tag">CONFIGURACIÓN DE DEMOSTRACIÓN</span></div><button class="primary" id="continue-action">Continuar aventura <span>→</span></button><p class="fineprint">El juego no está conectado todavía. Este botón emite el evento de continuación para integrarlo con el motor.</p>';
  else body+='<div class="empty-emblem" aria-hidden="true">⌂</div><p class="lede">Todavía no hay una aventura preparada.<br>Empieza en el huerto y dale nombre a tu granja.</p><button class="primary" id="go-new">Preparar una aventura <span>→</span></button><p class="fineprint">Este menú no busca ni modifica partidas del juego. Solo guarda una configuración de prueba en este navegador.</p>';
 }
 if(id==='new')body='<div class="sectionmark">Una nueva semilla</div><h1>Todo empieza aquí.</h1><p class="lede">Un pequeño huerto. Un lugar al que volver.<br>Prepara tu primera aventura en la sabana.</p><label class="field"><span>Nombre de tu granja</span><input id="farmname" type="text" maxlength="32" autocomplete="off" placeholder="Mi refugio" value="'+esc(demoConfig?.name||'')+'"></label><h2>Tu forma de jugar</h2><div class="choice-row" role="group" aria-label="Experiencia"><button class="choice" data-choice="Relax"><span class="choiceicon">☼</span><strong>Relax</strong></button><button class="choice selected" data-choice="Guardián"><span class="choiceicon">♧</span><strong>Guardián</strong></button><button class="choice" data-choice="Desafío"><span class="choiceicon">✦</span><strong>Desafío</strong></button></div><button class="primary" id="new-action">Preparar aventura <span>→</span></button><div class="demo-note">✧ <span>Vista de demostración. Guarda estos ajustes y emite el evento de nueva partida; todavía no inicia el juego.</span></div>';
 if(id==='options')body='<div class="sectionmark">A tu ritmo</div><h1>La luz del santuario.</h1><p class="lede">Ajusta la atmósfera. Los cambios se ven directamente en la escena.</p><div class="control"><div class="control-top"><label for="sun">Luz ambiental del atardecer</label><output id="sun-out">'+Math.round(opts.sun*100)+' %</output></div><input id="sun" type="range" min="4" max="140" value="'+Math.round(opts.sun*100)+'"></div><div class="control"><div class="control-top"><label for="glow">Brillo de los símbolos</label><output id="glow-out">'+Math.round(opts.glow*100)+' %</output></div><input id="glow" type="range" min="55" max="200" value="'+Math.round(opts.glow*100)+'"></div><div class="control"><div class="control-top"><label for="firePower">Luz de las luciérnagas</label><output id="firePower-out">'+Math.round(opts.firePower*100)+' %</output></div><input id="firePower" type="range" min="15" max="250" value="'+Math.round(opts.firePower*100)+'"><small>Iluminación local independiente del sol.</small></div><div class="rule"></div><div class="toggleline"><div><span>Luciérnagas</span><small>Partículas y luces de colores sobre el modelo.</small></div><button class="toggle" role="switch" aria-label="Luciérnagas" aria-checked="'+opts.fireflies+'" data-toggle="fireflies"></button></div><div class="toggleline"><div><span>Movimiento reducido</span><small>Acercamiento directo, sin rodeos y con transiciones breves.</small></div><button class="toggle" role="switch" aria-label="Movimiento reducido" aria-checked="'+opts.reduced+'" data-toggle="reduced"></button></div><div class="toggleline"><div><span>Música del menú</span><small>Balafon&#39;s Call · tema principal de Wild Guardians.</small></div><button class="toggle" role="switch" aria-label="Música del menú" aria-checked="'+audioOn+'" data-audio></button></div><div class="rule"></div><h2>Calidad de imagen</h2><div class="quality-row" role="group" aria-label="Calidad">'+[['low','Ahorro'],['balanced','Equilibrada'],['high','Alta']].map(([q,l])=>'<button data-quality="'+q+'" class="'+(opts.quality===q?'selected':'')+'">'+l+'</button>').join('')+'</div><button class="reset" id="reset-options">Restablecer valores</button>';
 if(id==='library')body='<div class="sectionmark">El mundo que te rodea</div><h1>Pequeños descubrimientos.</h1><p class="lede">Un espacio para las fichas de cultivos, construcciones y paisajes del juego.</p><div class="tabs" role="tablist" aria-label="Categorías de la biblioteca"><button class="selected" role="tab" aria-selected="true" data-tab="cultivos">Cultivos</button><button role="tab" aria-selected="false" data-tab="edificios">Edificios</button><button role="tab" aria-selected="false" data-tab="paisajes">Paisajes</button></div><div id="library-content" role="tabpanel"></div><div class="fineprint">Contenido de muestra para probar la navegación. No representa descubrimientos ni progreso de una partida.</div>';
 if(id==='exit')body='<div class="sectionmark">Hasta la próxima</div><h1>La sabana puede esperar.</h1><p class="lede">¿Quieres salir del menú?<br>Tus ajustes de este prototipo se conservarán en este navegador.</p><button class="primary" id="exit-action">Salir del santuario <span>→</span></button><button class="secondary" data-back>Quedarme un poco más</button><p class="fineprint">El navegador puede impedir que una página cierre su propia pestaña. En ese caso aparecerá una pantalla de despedida.</p>';
 $('#panel').innerHTML=backHTML+body;$('#panel').scrollTop=0;$('#panel').setAttribute('aria-label',slots.find(s=>s.id===id).title);$$('[data-back]').forEach(b=>b.addEventListener('click',back));
 if(id==='new'){$$('[data-choice]').forEach(b=>{b.setAttribute('aria-pressed',b.classList.contains('selected'));b.onclick=()=>{$$('[data-choice]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b)})}});$('#new-action').onclick=()=>{const name=$('#farmname').value.trim()||'Mi refugio';demoConfig={demo:true,name:name.slice(0,32),difficulty:$('.choice.selected').dataset.choice,biome:'Sabana',created:new Date().toISOString()};store.set('wg.menu.demo-config',JSON.stringify(demoConfig));if(emit('new-game',demoConfig))toast('Configuración preparada. La aventura se conectará al motor del juego.');$('#new-action').textContent='Configuración preparada ✓';};$('#farmname').addEventListener('keydown',e=>{if(e.key==='Enter')$('#new-action').click()})}
 if(id==='continue'){$('#continue-action')?.addEventListener('click',()=>{if(emit('continue',demoConfig))toast('Evento «continuar» enviado. El juego aún no está conectado.');});$('#go-new')?.addEventListener('click',()=>{back();const until=setInterval(()=>{if(state==='home'){clearInterval(until);navigate(1)}},70)})}
 if(id==='options'){
  for(const key of ['sun','glow','firePower'])$('#'+key).oninput=e=>{opts[key]=Number(e.target.value)/100;$('#'+key+'-out').textContent=e.target.value+' %';saveOptions()};
  $$('[data-toggle]').forEach(b=>b.onclick=()=>{const k=b.dataset.toggle;opts[k]=!opts[k];b.setAttribute('aria-checked',opts[k]);saveOptions()});
  $('[data-audio]').onclick=()=>toggleAudio();
  $$('[data-quality]').forEach(b=>b.onclick=()=>{opts.quality=b.dataset.quality;$$('[data-quality]').forEach(x=>x.classList.toggle('selected',x===b));configureResolution();createShadow();saveOptions()});
  $('#reset-options').onclick=()=>{opts={...defaults};saveOptions();configureResolution();createShadow();renderPanel('options');toast('Ajustes restablecidos.')};
 }
 if(id==='library'){$$('[data-tab]').forEach(b=>b.onclick=()=>{$$('[data-tab]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-selected',x===b)});libraryTab(b.dataset.tab)});libraryTab('cultivos')}
 if(id==='exit')$('#exit-action').onclick=()=>{if(!emit('exit'))return;state='end';$('#end').classList.add('visible');$('#panelstage').inert=true;$('#end-back').focus();if(window.opener)try{window.close()}catch{}};
}
// Inserted inside the original menu closure by prepare_menu.py.
const nativeRenderPanel=renderPanel;
const sendProduction=(action,detail={})=>parent.postMessage({type:'wild-guardians:menu',action,...detail},location.origin);
let productionLabViewer=null;
function closeProductionLab(){
 if(!productionLabViewer)return;
 const {root,frame,inert,trigger,childDocument,childKeydown}=productionLabViewer;
 childDocument?.removeEventListener('keydown',childKeydown);frame.onload=null;
 frame.src='about:blank';root.remove();productionLabViewer=null;
 for(const [element,value] of inert)if(element.isConnected)element.inert=value;
 lastFrame=performance.now();trigger?.focus({preventScroll:true});
}
function openProductionLab(key,title,trigger){
 if(!['crops','walls','destruction','sfx'].includes(key))return;
 closeProductionLab();
 const root=document.createElement('main');root.className='production-lab-viewer';
 const header=document.createElement('header');header.className='production-lab-header';
 const backButton=document.createElement('button');backButton.type='button';backButton.className='secondary';backButton.textContent='← Biblioteca';backButton.onclick=closeProductionLab;
 const heading=document.createElement('h1');heading.textContent=title;
 const homeButton=document.createElement('button');homeButton.type='button';homeButton.className='secondary';homeButton.textContent='Volver al santuario';homeButton.onclick=()=>{closeProductionLab();back();};
 const frame=document.createElement('iframe');frame.className='production-lab-frame';frame.title='Laboratorio '+title;frame.src='../library.html?lab='+key;
 header.append(backButton,heading,homeButton);root.append(header,frame);
 const inert=Array.from(document.body.children,element=>[element,element.inert]);
 for(const [element] of inert)element.inert=true;
 productionLabViewer={root,frame,inert,trigger};
 frame.onload=()=>{
  if(productionLabViewer?.frame!==frame)return;
  const viewer=productionLabViewer;
  viewer.childDocument?.removeEventListener('keydown',viewer.childKeydown);
  viewer.childDocument=frame.contentDocument;
  viewer.childKeydown=event=>{
   if(event.key!=='Escape')return;
   // Wait for all lab handlers, even those installed later on this document.
   queueMicrotask(()=>{
    if(productionLabViewer?.frame!==frame||event.defaultPrevented)return;
    event.preventDefault();closeProductionLab();
   });
  };
  // Consumed Escape stays local; deferred callbacks retain the frame guard.
  viewer.childDocument?.addEventListener('keydown',viewer.childKeydown);
 };
 document.body.append(root);backButton.focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{
 if(!productionLabViewer)return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeProductionLab();return;}
 if(event.key==='Tab'){
  const buttons=productionLabViewer.root.querySelectorAll('button');
  if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons[buttons.length-1].focus();}
 }
},true);
const sectionFrame=(src,title)=>`<iframe class="production-section" title="${title}" src="${src}" style="width:100%;height:70dvh;min-height:340px;border:0;border-radius:9px"></iframe>`;
renderPanel=function(id){
 nativeRenderPanel(id);
 if(id==='new'||id==='continue')sendProduction('prepare-loading');
 const panel=$('#panel'),backButton=$('#panel [data-back]');
 panel.style.width=id==='new'||id==='library'?'min(1160px,94vw)':'';
 const replace=html=>{panel.replaceChildren(backButton);panel.insertAdjacentHTML('beforeend',html);};
 if(id==='new')replace(sectionFrame('/selector/index.html?embedded=1','Nueva partida · Bioma y cultura'));
 if(id==='continue'){
  replace('<div class="sectionmark">Tu refugio</div><h1>Volver a casa.</h1><div id="production-saves" aria-live="polite">Consultando tus poblados…</div>');sendProduction('request-saves');
 }
 if(id==='library'){
  replace('<div class="sectionmark">El mundo que te rodea</div><h1>Pequeños descubrimientos.</h1><div id="production-library">'+[['crops','Cultivos'],['walls','Bastión'],['destruction','Destrucción'],['sfx','Sonidos']].map(([key,title])=>`<button class="secondary" data-production-lab="${key}">${title} →</button>`).join('')+'</div>');
  panel.insertAdjacentHTML('beforeend','<p class="fineprint">Ga Maamli · Banga · SIL OFL 1.1<br><a style="color:inherit;text-underline-offset:3px" href="../licenses/ga.txt" target="_blank" rel="noopener">Ga Maamli</a> · <a style="color:inherit;text-underline-offset:3px" href="../licenses/banga.txt" target="_blank" rel="noopener">Banga</a> · <a style="color:inherit;text-underline-offset:3px" href="../licenses/bangaAuthors.txt" target="_blank" rel="noopener">David Sargent</a></p>');
  $$('[data-production-lab]').forEach(button=>button.onclick=()=>openProductionLab(button.dataset.productionLab,button.textContent.replace(/\s*→\s*$/,''),button));
 }
 if(id==='options'){
  panel.insertAdjacentHTML('afterbegin','<label class="field"><span>Idioma</span><select data-language-select id="menu-language"><option value="en">English</option><option value="es">Español</option></select></label>');$('#menu-language').value=window.WildGuardiansLanguage?.getLanguage()??'en';
  panel.insertAdjacentHTML('beforeend','<div class="rule"></div><h2>Audio del juego</h2><label class="control">Sonidos<input id="production-sfx" type="range" min="0" max="1" step=".05"></label><label class="control">Música<input id="production-music" type="range" min="0" max="1" step=".05"></label><label class="field"><span>Calidad del juego</span><select id="production-quality"><option value="muy_baja">Muy baja</option><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label><label class="field"><span>Resolución del mundo</span><select id="production-resolution"><option value="profile">Según calidad</option><option value="economy">Ahorro</option><option value="low">Ahorro alto</option><option value="minimum">Ahorro máximo</option></select></label><p>Reduce la nitidez del mundo 3D; el HUD conserva su resolución.</p>');sendProduction('request-settings');
  for(const id of ['production-sfx','production-music','production-quality','production-resolution'])$('#'+id).oninput=()=>sendProduction('settings-change',{settings:{sfx:Number($('#production-sfx').value),music:Number($('#production-music').value),quality:$('#production-quality').value,resolution:$('#production-resolution').value}});
 }
};
window.addEventListener('message',event=>{
 if(event.origin!==location.origin)return;
 if(event.source===parent&&event.data?.type==='wild-guardians:menu-data'){
  if(event.data.slots&&$('#production-saves')){
   $('#production-saves').innerHTML=event.data.slots.length?event.data.slots.map(slot=>`<div class="savecard"><strong>${esc(slot.cultureName)}</strong><span>Día ${slot.day} · ${esc(slot.biomeName)} · ${esc(slot.money)} monedas</span><button class="secondary" data-production-save="${esc(slot.slotId)}">Continuar →</button><button class="secondary" data-production-delete="${esc(slot.slotId)}">Eliminar partida</button></div>`).join(''):'<p class="lede">Todavía no hay poblados guardados.</p>';
   $$('[data-production-save]').forEach(button=>button.onclick=()=>sendProduction('load-slot',{slotId:button.dataset.productionSave}));
   $$('[data-production-delete]').forEach(button=>button.onclick=()=>sendProduction('delete-slot',{slotId:button.dataset.productionDelete}));
  }
  if(event.data.settings&&$('#production-sfx')){const settings=event.data.settings;$('#production-sfx').value=settings.sfx;$('#production-music').value=settings.music;$('#production-quality').value=settings.quality;$('#production-resolution').value=settings.resolution??'profile';}
 }
 const frame=$('#panel iframe.production-section');
 if(event.source===frame?.contentWindow&&event.data?.type==='wild-guardians:selector'){
  if(event.data.action==='back')back();
  if(event.data.action==='start')sendProduction('start',{biome:event.data.biome,culture:event.data.culture});
 }
});
const nativeBack=back;
back=function(){
 const frames=$$('#panel iframe');sendProduction('cancel-loading');nativeBack();
 if(frames.length)requestAnimationFrame(function cleanup(){if(state==='home'){frames.forEach(frame=>frame.remove());return;}requestAnimationFrame(cleanup);});
};

function libraryTab(tab){const items={cultivos:[['♧','Semillas','El comienzo de cada cultivo. La biblioteca podrá reunir aquí sus fichas y requisitos.'],['☼','Cuidado','Un lugar para consultar el riego, el crecimiento y las necesidades de cada planta.'],['✦','Cosecha','Las futuras fichas mostrarán el momento de recoger cada cultivo.']],edificios:[['⌂','La casa','El punto de regreso a tu aventura, en la cima del diorama.'],['⚙','El santuario','Aquí se ajustan la iluminación, los efectos y el ritmo de la escena.'],['▤','La biblioteca','Este refugio reúne el conocimiento del mundo del juego.']],paisajes:[['☼','Sabana','La luz cálida, los pastizales y las acacias forman el paisaje de este menú.'],['△','Acantilados','Las mesetas del horizonte dan profundidad al fondo ilustrado.'],['✧','Atardecer','Las luces del diorama y las luciérnagas acompañan el final del día.']]};$('#library-content').innerHTML=items[tab].map(([icon,title,desc])=>'<article class="library-item"><div class="library-icon" aria-hidden="true">'+icon+'</div><div><h3>'+title+'</h3><p>'+desc+'</p></div></article>').join('')}
function endBack(){$('#end').classList.remove('visible');state='panel';back()}
const menuMusic=$('#menu-music');
menuMusic.volume=.72;
let musicGestureArmed=true;

function syncAudioUI(){
 $('#audio-toggle').classList.toggle('on',audioOn);
 $('#audio-toggle').setAttribute('aria-pressed',audioOn);
 $('#audio-toggle').setAttribute('aria-label',audioOn?'Silenciar música':'Activar música');
 $('[data-audio]')?.setAttribute('aria-checked',audioOn);
}
async function startMenuMusic(silentFailure=true){
 if(!audioOn)return false;
 try{
  await menuMusic.play();
  musicGestureArmed=false;
  return true;
 }catch(e){
  if(!silentFailure)toast('El navegador activará la música con el próximo toque o tecla.');
  return false;
 }
}
async function toggleAudio(){
 audioOn=!audioOn;
 syncAudioUI();
 if(audioOn){
  const ok=await startMenuMusic(true);
  toast(ok?'Música activada.':'Música activa · comenzará con la próxima interacción.');
 }else{
  menuMusic.pause();
  toast('Música silenciada.');
 }
}
function armMenuMusic(){
 syncAudioUI();
 if(!musicGestureArmed||!audioOn)return;
 startMenuMusic(true);
}
window.addEventListener('pointerdown',armMenuMusic,{passive:true});
window.addEventListener('keydown',armMenuMusic);
window.addEventListener('touchstart',armMenuMusic,{passive:true});
function front(y){let f=clamp(y*2,0,19.99),i=Math.floor(f);return lerp(frontProfile[i],frontProfile[Math.min(20,i+1)],f-i)}
function updateFlies(t){
 const lightCount={low:4,balanced:6,high:8}[opts.quality],count={low:26,balanced:43,high:58}[opts.quality];
 heroColors.fill(0);
 for(let i=0;i<count;i++){
  const hero=i<8,seed=i*2.3999632,c=flyPalette[(i===lightCount-1&&travelPose)?1:i%8];
  let y=hero?1.12+i*1.035+Math.sin(t*.53+seed)*.40:.45+(i*1.713)%8.8+Math.sin(t*.25+seed)*.45;
  y=clamp(y,.30,9.30);let x=Math.sin(seed+t*(hero?.38:.19))*(2.25-y*.115)+(hero?Math.cos(t*.44+seed)*.28:0);
  let z=Math.max(surfaceZ(x,y),front(y)-.52)+(hero?.42:.9)+Math.sin(seed+t*.33)*.18;
  // A nearby guide light accompanies the spirit over the actual terraces.
  if(i===lightCount-1&&travelPose&&travel>.18){
   const focus=V.mix(pose.target,slots[section].focus,.18);x=focus[0]+Math.sin(t*.72)*.48;y=clamp(focus[1]+.28+Math.sin(t*.81)*.19,.5,9.3);z=Math.max(surfaceZ(x,y)+.48,Math.min(pose.eye[2]-.65,focus[2]+1.2));
  }
  let pulse=.66+.34*Math.pow(Math.sin(t*(1.2+(i%4)*.14)+seed),2);
  flyPositions.set([x,y,z],i*3);flyColors.set([c[0]*pulse,c[1]*pulse,c[2]*pulse,hero?.31:.15],i*4);
  if(hero){heroPositions.set([x,y,z],i*3);heroColors.set([c[0],c[1],c[2],pulse*(opts.fireflies?23*opts.firePower:0)],i*4);}
 }
 return opts.fireflies?count:0;
}

function drawQuad(){gl.bindVertexArray(quadVAO);gl.drawArrays(gl.TRIANGLES,0,3)}
function draw(t){
 const flies=updateFlies(opts.reduced?t*.35:t),p=programs;
 gl.bindFramebuffer(gl.FRAMEBUFFER,targets.main.fbo);gl.viewport(0,0,RW,RH);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);gl.clearColor(.012,.017,.025,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
 // The backdrop is a depth-tested world-space relief. It uses the SAME VP as the GLB.
 gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.useProgram(p.bg);um(p.bg,'uVP',VP);u1(p.bg,'uHDR',gl.hdr?1:0);u1(p.bg,'uSun',opts.sun);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);bindTex(p.bg,'uTerrainMask',terrainMaskTex,1);for(const layer of backdropMesh){ui(p.bg,'uLayer',layer.layer);bindTex(p.bg,'uBG',layer.layer===0?skyTex:bgTex,0);gl.bindVertexArray(layer.vao);gl.drawElements(gl.TRIANGLES,layer.count,gl.UNSIGNED_INT,0);}
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.useProgram(p.ground);um(p.ground,'uVP',VP);drawQuad();gl.disable(gl.BLEND);gl.depthMask(true);
 gl.useProgram(p.mesh);um(p.mesh,'uVP',VP);um(p.mesh,'uLightVP',lightVP);u3(p.mesh,'uEye',pose.eye);u1(p.mesh,'uHDR',gl.hdr?1:0);u1(p.mesh,'uSun',opts.sun);u1(p.mesh,'uGlow',opts.glow);u1(p.mesh,'uTime',t);ui(p.mesh,'uActive',active);u1(p.mesh,'uIconOpacity',iconOpacity);u1(p.mesh,'uNormalStrength',1);u1(p.mesh,'uLightCount',opts.fireflies?({low:4,balanced:6,high:8}[opts.quality]):0);u3(p.mesh,'uFirePos[0]',heroPositions);u4(p.mesh,'uFireColor[0]',heroColors);
 bindTex(p.mesh,'uAlbedo',model.textures[1],0);bindTex(p.mesh,'uNormal',model.textures[0],1);bindTex(p.mesh,'uORM',model.textures[2],2);bindTex(p.mesh,'uShadow',shadow.texture,3);bindTex(p.mesh,'uCleanAlbedo',cleanTex,4);gl.bindVertexArray(model.vao);gl.drawElements(gl.TRIANGLES,model.count,gl.UNSIGNED_INT,0);
 gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 if(iconOpacity>.001){gl.useProgram(p.ring);um(p.ring,'uVP',VP);u1(p.ring,'uTime',t);u1(p.ring,'uHDR',gl.hdr?1:0);u1(p.ring,'uGlow',opts.glow);u1(p.ring,'uIconOpacity',iconOpacity);bindTex(p.ring,'uGlyph',glyphTex,0);slots.forEach((s,i)=>{u3(p.ring,'uCenter',s.anchor);u3(p.ring,'uTint',s.tint);u1(p.ring,'uSize',s.size);u1(p.ring,'uActive',active===i?1:0);ui(p.ring,'uKind',i===1?1:0);drawQuad();});}
 if(flies){gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(p.fly);um(p.fly,'uVP',VP);u3(p.fly,'uEye',pose.eye);u1(p.fly,'uHeight',RH);u1(p.fly,'uHDR',gl.hdr?1:0);gl.bindVertexArray(flyVAO);gl.bindBuffer(gl.ARRAY_BUFFER,flyBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,flyPositions);gl.bindBuffer(gl.ARRAY_BUFFER,flyColBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,flyColors);gl.drawArrays(gl.POINTS,0,flies);}
 gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(p.blur);gl.bindFramebuffer(gl.FRAMEBUFFER,targets.a.fbo);gl.viewport(0,0,targets.a.w,targets.a.h);bindTex(p.blur,'uTex',targets.main.textures[1],0);u2(p.blur,'uDirection',1.50/targets.a.w,0);drawQuad();gl.bindFramebuffer(gl.FRAMEBUFFER,targets.b.fbo);bindTex(p.blur,'uTex',targets.a.textures[0],0);u2(p.blur,'uDirection',0,1.50/targets.b.h);drawQuad();
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,RW,RH);gl.useProgram(p.composite);bindTex(p.composite,'uScene',targets.main.textures[0],0);bindTex(p.composite,'uBloom',targets.b.textures[0],1);u1(p.composite,'uHDR',gl.hdr?1:0);u1(p.composite,'uBloomStrength',.52);u1(p.composite,'uTime',t);u2(p.composite,'uViewport',W,H);drawQuad();renderCount++;
}

function tick(now){
 requestAnimationFrame(tick);if(productionLabViewer||!ready||paused||document.hidden||manualPreview)return;if(renderPaused&&!tween&&!iconTween)return;
 const interval=opts.quality==='low'?31:15;if(now-lastFrame<interval)return;const delta=now-lastFrame;lastFrame=now;frameDT=clamp(delta*.001,.001,.10);frameMS=lerp(frameMS,delta,.06);time=now*.001;
 advanceIcons(now);
 if(tween){const tw=tween;travel=clamp(travelClock(tw,now).value,0,1);if(now>=tw.start+tw.duration){travel=tw.to;tween=null;finishTween();}}
 uiForTravel();updatePose();placeHotspots();if(!renderPaused||tween||iconTween)draw(time);
}

function onResize(){
 W=innerWidth;H=innerHeight;if(!ready)return;configureResolution();computeHome();createBackgroundRelief();
 if(travelPose){const i=Math.max(section,0);travelPose=makeRoute(i,copyPose(home));}
 updatePose();placeHotspots();uiForTravel();draw(time);
}

function setupInput(){let down=null;canvas.addEventListener('pointermove',e=>{pointer=[clamp(e.clientX/W*2-1,-1,1),clamp(1-e.clientY/H*2,-1,1)];if(state==='home'){hover=iconAt(e.clientX,e.clientY,e.pointerType==='touch');if(hover!==active)setActive(hover)}});canvas.addEventListener('pointerleave',()=>{pointer=[0,0];if(state==='home')setActive(-1)});canvas.addEventListener('pointerdown',e=>{if(state==='home')down={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointerup',e=>{if(!down||state!=='home')return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>14)return;let i=iconAt(e.clientX,e.clientY,e.pointerType==='touch');if(i>=0){const hit=raycast(e.clientX,e.clientY); // Real geometry hit retained for integration / inspection.
 window.WildGuardiansMenu.lastPick=hit;navigate(i)}});
 document.addEventListener('keydown',e=>{if(e.key==='Tab'&&state==='panel'){const a=Array.from($('#panel').querySelectorAll('button:not(:disabled),input,select,[tabindex=\"0\"]')).filter(x=>x.offsetParent!==null);if(a.length){if(e.shiftKey&&(document.activeElement===a[0]||!$('#panel').contains(document.activeElement))){e.preventDefault();a[a.length-1].focus()}else if(!e.shiftKey&&document.activeElement===a[a.length-1]){e.preventDefault();a[0].focus()}}}if(e.key==='Escape'){if(state==='end')endBack();else back();return}if(state!=='home'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();const dir=['ArrowDown','ArrowRight'].includes(e.key)?1:-1;setActive((active+dir+slots.length)%slots.length);slots[active].button.focus({preventScroll:true})}else if(e.key==='Enter'&&document.activeElement===canvas){navigate(active<0?0:active)}});
 $('#journey-back').onclick=back;$('#journey-skip').onclick=skipJourney;$('#audio-toggle').onclick=toggleAudio;$('#help-toggle').onclick=()=>toast('Toca un símbolo o su nombre. Usa ↑ / ↓ y Enter con teclado; Escape para volver.');$('#end-back').onclick=endBack;$('#retry').onclick=()=>location.reload();window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(onResize,90)});document.addEventListener('visibilitychange',()=>{if(document.hidden){menuMusic.pause()}else if(audioOn){startMenuMusic(true)}});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;fail(Error('El navegador ha pausado WebGL. Cierra otras pestañas y vuelve a abrir este archivo.'))});
 let padLatch=false,padLast=0;setInterval(()=>{if(!ready)return;const pad=navigator.getGamepads?.()[0];if(!pad)return;const y=pad.axes[1]||0,up=pad.buttons[12]?.pressed,down=pad.buttons[13]?.pressed;if(state==='home'&&(Math.abs(y)>.6||up||down)&&performance.now()-padLast>250){padLast=performance.now();setActive((active+((y>.6||down)?1:-1)+5)%5);slots[active].button.focus({preventScroll:true})}let confirm=pad.buttons[0]?.pressed,cancel=pad.buttons[1]?.pressed;if(!padLatch){if(confirm&&state==='home')navigate(active<0?0:active);if(cancel)back()}padLatch=confirm||cancel},70);
}
async function init(){try{
 progress(8,'Preparando los recursos integrados…');await new Promise(r=>setTimeout(r,30));
 gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 no está disponible. Abre el HTML en Chrome, Edge, Firefox o Safari con aceleración gráfica activada.');gl.hdr=!!gl.getExtension('EXT_color_buffer_float');gl.getExtension('OES_texture_float_linear');
 const raw=await modelBytes();progress(30,'Cargando la geometría y sus texturas…');await new Promise(r=>setTimeout(r,10));model=await parseGLB(raw,gl);
 const anis=gl.getExtension('EXT_texture_filter_anisotropic');if(anis)model.textures.forEach(t=>{gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameterf(gl.TEXTURE_2D,anis.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anis.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))});
 progress(61,'Preparando el crepúsculo y las superficies…');await new Promise(r=>setTimeout(r,10));
 programs={mesh:compile(meshVS,meshFS),depth:compile(depthVS,depthFS),bg:compile(bgVS,bgFS),ground:compile(groundVS,groundFS),ring:compile(ringVS,ringFS),fly:compile(flyVS,flyFS),blur:compile(quadVS,blurFS),composite:compile(quadVS,compositeFS)};
 quadVAO=gl.createVertexArray();bgTex=makeTexture(await imageFromData($('#backgrounddata').textContent.trim()));glyphTex=gardenGlyph();cleanTex=makeTexture(await imageFromData($('#cleandata').textContent.trim()));$('#cleandata').textContent='';skyTex=makeTexture(await imageFromData($('#skydata').textContent.trim()));terrainMaskTex=makeTexture(await imageFromData($('#terrainmaskdata').textContent.trim()));$('#skydata').textContent='';$('#terrainmaskdata').textContent='';await initSurface();
 flyVAO=gl.createVertexArray();gl.bindVertexArray(flyVAO);flyBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,flyBuf);gl.bufferData(gl.ARRAY_BUFFER,flyPositions,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);flyColBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,flyColBuf);gl.bufferData(gl.ARRAY_BUFFER,flyColors,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 prepareHotspots();configureResolution();createShadow();computeHome();createBackgroundRelief();progress(88,'Situando el paisaje y encendiendo las luciérnagas…');setupInput();syncAudioUI();startMenuMusic(true);
 window.WildGuardiansMenu={navigate,back,setRenderPaused:v=>{renderPaused=!!v},renderOnce:()=>draw(time),getState:()=>({version:"2.8",iconOpacity,backgroundMode:"world-space-layered-parallax",state,section:slots[section]?.id||null,travel,options:{...opts},triangles:model.count/3,vertices:model.p.length/3,resolution:[RW,RH],HDR:gl.hdr,renderCount,estimatedFPS:Math.round(1000/frameMS),storageAvailable:storageOK}),getHotspots:()=>slots.map(s=>({id:s.id,title:s.title,anchor:[...s.anchor],screen:{...s.screen}})),setOptions:o=>{opts={...opts,...o};saveOptions();onResize();createShadow()},raycast,debugPose:()=>({home,pose}),
  debugRoute:()=>travelPose?{length:travelPose.length,duration:travelPose.duration,interpolation:"analytic-C3-reversible",finalClearance:travelPose.finalClearance,start:copyPose(travelPose.start),end:copyPose(travelPose.end),waypoints:travelPose.eyes,samples:travelPose.points.filter((p,i)=>i%8===0).map(q=>({eye:q.eye,clearance:q.eye[2]-clearanceZ(q.eye[0],q.eye[1],.20)}))}:null,
  previewJourney:(id,fraction)=>{manualPreview=true;tween=null;section=typeof id==='number'?id:slots.findIndex(s=>s.id===id);section=clamp(section,0,4);travelPose=makeRoute(section,copyPose(home));travel=clamp(fraction,0,1);state=travel>=1?'panel':(travel>0?'entering':'home');renderPanel(slots[section].id);$('#panelstage').classList.add('visible');$('#panelstage').inert=state!=='panel';root.style.setProperty('--ui',travel>0?0:1);iconOpacity=travel>0?0:1;iconTween=null;uiForTravel();updatePose();placeHotspots();draw(time||4);return {pose,travel};},
  resumePreview:()=>{manualPreview=false;lastFrame=performance.now();},
  renderAt:(t)=>{manualPreview=true;draw(t);},
  // Pure diagnostics: does not move the camera or change the active menu.
  inspectJourney:(id,fractions=[0,.25,.5,.75,1])=>{const i=typeof id==='number'?id:slots.findIndex(s=>s.id===id);if(!Number.isInteger(i)||i<0||i>=slots.length)throw Error('Opción desconocida');const r=makeRoute(i,copyPose(home));return {id:slots[i].id,minimumClearance:r.finalClearance,duration:r.duration,start:r.start,end:r.end,samples:fractions.map(t=>{const p=sampleRoute(r,t);return {progress:t,...p,clearance:p.eye[2]-clearanceZ(p.eye[0],p.eye[1],.24)};})};},
  lastPick:null};
 state='home';ready=true;updatePose();placeHotspots();draw(0);progress(100,'Bienvenido al santuario.');await new Promise(r=>setTimeout(r,120));$('#loading').style.opacity=0;setTimeout(()=>$('#loading').style.display='none',750);$('#live').textContent='Menú listo. Cinco símbolos interactivos: Continuar, Juego nuevo, Opciones, Biblioteca y Salir.';lastFrame=performance.now();requestAnimationFrame(tick);
 }catch(e){fail(e)}}
// Begin once the logo has its intrinsic dimensions, so portrait framing is stable.
const brandImg=$('#brand img');if(brandImg.complete&&brandImg.naturalWidth)init();else{brandImg.onload=init;brandImg.onerror=init}
})();
