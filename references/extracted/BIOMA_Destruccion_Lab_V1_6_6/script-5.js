
/* BIOMA Destruction Lab v1.5. Native WebGL2. Model supplied by the user.
   All geometry, textures, shaders, particles, UI and camera code run offline.
   Damage is a visual volume mask, NOT a new collision/CSG mesh.
   v1.1: highp depth samplers; exact texel reads; nearest-surface opening mask.
   The inset dark shell can NEVER overwrite an uncut surface, even if it folds
   outside the original mesh. Opening/depth prepass follows the actual collapse
   and is invalidated by camera, damage, pattern and render-target changes.
   Texture gradients are evaluated before any non-uniform discard.
   v1.2: embedded building catalogue, Casa Suajili, initial damage 0%;
   one-way collapse latch; touch hits through the complete destruction cycle;
   crease-aware architectural shading normals with no position/UV/texture edits.
   v1.3: two original embedded models; switching rebuilds the mesh, textures,
   damage sites and ash footprint; new building opens intact with a pending render.
   v1.4: Casa etíope reference artwork; third original embedded GLB.
   v1.5: Mapungubwe name and reference artwork; fourth original embedded GLB.
   All four models retain their unmodified original geometry and texture bytes. */
'use strict';
(async function(){
const $=id=>document.getElementById(id), canvas=$('canvas'), host=$('sceneHost');
const BUILDINGS=[
 {id:'casa-suajili',name:'Casa Suajili',dataId:'model-data',preview:$('buildingThumbnail').src,previewKind:'reference',seed:57021,repairPlaster:true},
 {id:'edificio-2',name:'Casa etíope',dataId:'model-data-2',preview:"/assets/34b8b7358f43fe77db052c134ea894c765635d1d15491790e32e618dd610c61b.jpg",previewKind:'reference',seed:66173,repairPlaster:false,fitSites:true},
 {id:'edificio-3',name:'Casa Mapungubwe',dataId:'model-data-3',preview:"/assets/94e78f8e48e5777204314722453d773eb10ae73b3f0b2318a0b9db50ffbd3b6b.jpg",previewKind:'reference',seed:75329,repairPlaster:false,fitSites:true},
 {id:'edificio-4',name:'Casa saheliana',dataId:'model-data-4',preview:"/assets/ad7e13ebfcbcec8c4eaceb4194aa3a4064e1ab5bf66e1e8abdf0efad667ddb72.jpg",previewKind:'reference',seed:84503,repairPlaster:false,fitSites:true,fitGround:true,roofCap:{heightRatio:.525,insetX:.158,insetZ:.09,selectionMargin:.0,capYellow:true}},
 {id:'edificio-5',name:'Casa musgum',dataId:'model-data-5',preview:"/assets/b040fb0ebcc6095ae67d72314b36a0354298c4928866b43049f122a520636223.jpg",previewKind:'reference',seed:91217,repairPlaster:false,fitSites:true,fitGround:true}
];
// Keep encoded assets in the registry, not as enormous live DOM text nodes.
// Decoding and GPU upload remain lazy: only the selected model is resident.
for(const building of BUILDINGS){const payload=$(building.dataId);if(payload){building.glbBase64=payload.textContent.trim();payload.remove();}}
// Open the new addition at 0% so it can be identified before naming it.
let activeBuilding=BUILDINGS[0];
$('buildingSelect').replaceChildren(...BUILDINGS.map(building=>{const o=document.createElement('option');o.value=building.id;o.textContent=building.name;return o;}));
const COLLAPSE_THRESHOLD=.79,COLLAPSE_SECONDS=3.2;
let collapsing=false,collapseElapsed=0,collapseFrom=COLLAPSE_THRESHOLD,collapseSpeed=1;
let sourceTriGroups=[],repairNormals;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const fract=x=>x-Math.floor(x), TAU=Math.PI*2;
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm:a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)}};
const M={identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),mul:(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},persp:(fov,aspect,n,f)=>{const t=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=t/aspect;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o},ortho:(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]),look:(eye,target,up=[0,1,0])=>{const z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},inv:a=>{let out=new Float32Array(16),m=Array.from({length:4},(_,r)=>[a[r],a[4+r],a[8+r],a[12+r],...Array.from({length:4},(_,c)=>+(r===c))]);for(let i=0;i<4;i++){let k=i;for(let j=i+1;j<4;j++)if(Math.abs(m[j][i])>Math.abs(m[k][i]))k=j;[m[i],m[k]]=[m[k],m[i]];let d=m[i][i];if(Math.abs(d)<1e-10)return M.identity();m[i]=m[i].map(x=>x/d);for(let j=0;j<4;j++)if(j!==i){let t=m[j][i];m[j]=m[j].map((x,c)=>x-t*m[i][c])}}for(let r=0;r<4;r++)for(let c=0;c<4;c++)out[c*4+r]=m[r][4+c];return out},point:(m,p)=>{const w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return[(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w,(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w,(m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14])/w]}};
function rng(seed){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
let rand=rng(57021), seed=activeBuilding.seed, gl, ready=false;
function showModelLoading(building){
 const overlay=$('loading');if(overlay){clearTimeout(hideLoadingTimer);overlay.style.display='grid';overlay.style.opacity='1';}
 $('loadText').textContent='Preparando '+building.name+'…';host.setAttribute('aria-busy','true');
}
let hideLoadingTimer=0;
function hideModelLoading(){const overlay=$('loading');host.removeAttribute('aria-busy');if(overlay){overlay.style.opacity='0';hideLoadingTimer=setTimeout(()=>{overlay.style.display='none';},400);}}
function loadProgress(v,text){const bar=$('loadProgress'),label=$('loadText');if(bar)bar.style.width=v+'%';if(label)label.textContent=text;}
function fail(err){console.error(err);if($('loading'))$('loading').style.display='none';$('error').style.display='grid';$('errorText').textContent=String(err.stack||err);window.__labError=String(err)}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2400)}
try{
gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
if(!gl)throw new Error('WebGL 2 no está disponible en este navegador o la aceleración gráfica está desactivada.');
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;fail(new Error('El navegador ha perdido el contexto gráfico. Pulsa «Volver a intentar».'))});
let repairStrength=1.; let damage=0, playing=false, duration=24, elapsed=0, timelineFrom=0, timelineDuration=24, time=0, lastTime=0, quality='medium';
let autoRotate=false, smokeEnabled=true, debrisEnabled=true, interiorEnabled=true, shadowsEnabled=true, embersEnabled=true, smokeAmount=.65;
let camTheta=.61,camPhi=1.10,camDistance=19.6, camTarget=[0,3.1,0],eye=[12,10,15], view,projection,viewProjection,invVP,cameraRight=[1,0,0],cameraUp=[0,1,0];
let width=1,height=1,fpsAcc=0,fpsFrames=0,lastUI=-1,destructionAt=-100,lastHitStage=-1,hitPulse=0;
let shadowDirty=true,intactKey='',openingDirty=true;
let mesh,ground,ash,chipMesh,debrisMesh,bounds,hitSites=[],textureObjects=[],triangleCount=0,sourcePositions,sourceNormals,sourceUV,sourceIndices;
let stats={fps:0,frames:0,triangles:0,particles:0,ready:false,drawCalls:0};
const holes=new Float32Array(32),fociNormals=new Float32Array(24), smoke=[],debris=[];
const noiseBytes=new Uint8Array(32*32*32);for(let i=0;i<noiseBytes.length;i++)noiseBytes[i]=rand()*255;
const noiseTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,noiseTex);gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,32,32,32,0,gl.RED,gl.UNSIGNED_BYTE,noiseBytes);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R])gl.texParameteri(gl.TEXTURE_3D,p,gl.REPEAT);
const vertexBase=`#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in vec3 aAnchor;
layout(location=4) in float aSeed;
layout(location=5) in vec3 aRepairNormal;
uniform mat4 uVP;
uniform mat4 uLightVP;
uniform float uDamage;
uniform float uInner;
uniform int uMode;
out vec3 vWorld;
out vec3 vOriginal;
out vec3 vNormal;
out vec2 vUV;
out vec4 vShadow;
out float vSeed;out vec3 vRepairNormal;
vec3 rotateAxis(vec3 p,vec3 axis,float angle){float c=cos(angle),s=sin(angle);return p*c+cross(axis,p)*s+axis*dot(axis,p)*(1.0-c);}
void main(){
 vec3 p=aPos,n=aNormal,rn=aRepairNormal;vOriginal=aPos;vUV=aUV;vSeed=aSeed;
 if(uMode==0){
  p-=n*uInner*.21;
  float c=smoothstep(.79,1.0,uDamage);
  float start=(1.0-clamp(aAnchor.y/8.0,0.0,1.0))*.20+aSeed*.12;
  float t=clamp((c-start)/(1.0-start),0.0,1.0);
  vec3 axis=normalize(vec3(sin(aSeed*47.8),.12,cos(aSeed*32.9)));
  float angle=t*t*(aSeed-.5)*2.8;
  p=rotateAxis(p-aAnchor,axis,angle)+aAnchor;
  n=rotateAxis(n,axis,angle);rn=rotateAxis(rn,axis,angle);
  p.xz+=vec2(sin(aSeed*59.0),cos(aSeed*73.0))*t*t*.72;
  p.y-=aAnchor.y*t*t*1.22;
  p.y=max(p.y,.035+abs(sin(aSeed*27.0))*.045*t);
 }
 if(uMode==2){float ashGrow=smoothstep(.22,1.0,uDamage);p.xz*=mix(.15,1.0,ashGrow);p.y*=mix(.3,1.0,ashGrow);}
 vRepairNormal=rn;vWorld=p;vNormal=n;vShadow=uLightVP*vec4(p,1.0);gl_Position=uVP*vec4(p,1.0);
}`;
const damageGLSL=`
uniform vec4 uHoles[8];
uniform sampler3D uNoise;
uniform float uDamage;
uniform float uInner;
float n3(vec3 p){return textureLod(uNoise,p,0.).r;}
float damageField(vec3 p){float f=100.0;for(int i=0;i<8;i++){float r=uHoles[i].w;if(r>.005){r*=mix(1.0,smoothstep(.42,.90,uDamage)*.87,uInner);f=min(f,length(p-uHoles[i].xyz)-r);}}return f+(n3(p*.141)-.5)*.40+(n3(p*.427+vec3(.21))-.5)*.12;}
`;
const fragmentMain=`#version 300 es
precision highp float;precision highp int;
precision highp sampler3D;
in vec3 vWorld;in vec3 vOriginal;in vec3 vNormal;in vec2 vUV;in vec4 vShadow;in float vSeed;in vec3 vRepairNormal;
uniform vec3 uEye;uniform vec3 uSun;uniform sampler2D uAlbedo;uniform sampler2D uNormalMap;uniform sampler2D uMR;uniform highp sampler2D uShadow;
uniform highp sampler2D uIntactDepth;uniform highp sampler2D uOpeningMask;uniform vec2 uResolution;uniform float uAshAge;
uniform float uRepair;uniform float uTime;uniform float uShadowSize;uniform float uShadows;uniform float uEmbers;uniform float uQuality;uniform int uMode;
out vec4 fragColor;
${damageGLSL}
vec3 tonemap(vec3 x){x=max(x,vec3(0));return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
vec3 toSRGB(vec3 x){return mix(x*12.92,1.055*pow(max(x,vec3(0)),vec3(1./2.4))-.055,step(vec3(.0031308),x));}
mat3 cotangent(vec3 N,vec3 p,vec2 uv){vec3 dp1=dFdx(p),dp2=dFdy(p);vec2 duv1=dFdx(uv),duv2=dFdy(uv);vec3 a=cross(dp2,N),b=cross(N,dp1);vec3 T=a*duv1.x+b*duv2.x,B=a*duv1.y+b*duv2.y;float l=inversesqrt(max(max(dot(T,T),dot(B,B)),.000001));return mat3(T*l,B*l,N);}
float shadowFactor(vec3 N){if(uShadows<.5)return 1.;vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.z>1.||p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 1.;float bias=max(.00075,.0022*(1.-max(dot(N,uSun),0.)));float s=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadow,p.xy+vec2(x,y)*1.35/uShadowSize).r;s+=p.z-bias<=d?1.:0.;}return mix(.08,1.,s/9.);}
void main(){
 vec3 N=normalize(vNormal);vec3 base=vec3(.4),emit=vec3(0);float rough=.9,metal=0.;
 if(uMode==0){
  // Evaluate implicit texture gradients / cotangent derivatives before discard.
  // uInner and uQuality are uniform branches, not per-fragment branches.
  if(uInner<.5){
   bool cap=vUV.x<-.5&&vUV.y<-.5;
   if(cap){
    // Explicit facade-yellow cap: same lighting/shading path as adobe walls, without inheriting the brown atlas tint.
    base=vec3(0.93,0.77,0.44);
    rough=.88;metal=.02;
   }else{
    base=texture(uAlbedo,vUV).rgb;
    vec2 mr=texture(uMR,vUV).gb;rough=clamp(mr.x,.64,1.);metal=mr.y*.15;
    if(uQuality>.2){vec3 map=texture(uNormalMap,vUV).xyz*2.-1.;map.xy*=.55;N=normalize(cotangent(N,vWorld,vUV)*normalize(map));}
    // Keep albedo and all GLB bytes intact: fix only how pale plaster is lit.
    float mx=max(base.r,max(base.g,base.b)),mn=min(base.r,min(base.g,base.b));
    float plaster=(1.-smoothstep(.30,.65,(mx-mn)/max(mx,.001)))*smoothstep(.06,.20,mn)*(1.-smoothstep(5.65,6.15,vOriginal.y));
    N=normalize(mix(N,normalize(vRepairNormal),plaster*uRepair));
   }
  }
  if(uInner>.5){
   // Only a removed NEAREST exterior surface may reveal the auxiliary shell.
   // Integer texel coordinates avoid sampling a neighbour along the silhouette.
   ivec2 pixel=ivec2(gl_FragCoord.xy);
   if(texelFetch(uOpeningMask,pixel,0).r<.5)discard;
   highp float originalDepth=texelFetch(uIntactDepth,pixel,0).r;
   // Two 24-bit depth-buffer steps; the highp sampler is essential on mobile.
   if(originalDepth>=1.||gl_FragCoord.z<=originalDepth+2./16777215.)discard;
  }
  if(uDamage>=.9998)discard;
  if(uDamage>.972+vSeed*.027)discard;
  float f=damageField(vOriginal);if(f<0.)discard;
  float soot=1.-smoothstep(.13,.79,f);float global=smoothstep(.42,.98,uDamage)*.76;
  float burn=max(soot*.97,global*(.8+n3(vOriginal*.5)*.3));
  vec3 coal=vec3(.032,.026,.022)*(0.65+n3(vOriginal*.8)*.9);
  float crack=(1.-smoothstep(.009,.032,abs(n3(vOriginal*.33)-.53)))*soot;
  base=mix(base,coal,burn);base*=1.-crack*.55;
  float edge=1.-smoothstep(.015,.085,f);
  float pulse=.65+.35*sin(uTime*2.6+vOriginal.y*9.+vOriginal.x*7.);
  emit=vec3(.43,.083,.008)*edge*pulse*uEmbers*smoothstep(.09,.4,uDamage)*(1.-smoothstep(.93,1.,uDamage));
  if(uInner>.5){base=vec3(.035,.027,.020)*(0.6+.7*n3(vOriginal*.61));emit*=.12;rough=1.;}
  if(!gl_FrontFacing){N=-N;base*=.31;emit*=.35;}
 }else if(uMode==1){
  float n=n3(vOriginal*.17)*.54+n3(vOriginal*.63)*.32+n3(vOriginal*2.8)*.14;
  base=mix(vec3(.22,.205,.143),vec3(.38,.345,.248),n);
  float edge=clamp(length(vWorld.xz)/8.,0.,1.);base*=mix(1.015,.88,smoothstep(.6,1.,edge));
 }else if(uMode==2){
  if(uDamage<.235)discard;
  float a=n3(vOriginal*.28),b=n3(vOriginal*1.8),c=n3(vOriginal*8.);
  if(vUV.x>.88+(b-.5)*.14)discard;
  base=mix(vec3(.025,.024,.023),vec3(.132,.127,.115),a*.68+b*.32);
  base=mix(base,vec3(.20,.194,.18),smoothstep(.67,.9,c)*.55);
  base*=mix(1.,.38,smoothstep(.70,.95,vUV.x));
  float hot=pow(max(0.,b-.73)*3.7,3.)*(1.-smoothstep(4.,11.,uAshAge));
  emit=vec3(.5,.06,.003)*hot*uEmbers;
 }
 vec3 V=normalize(uEye-vWorld),L=normalize(uSun),H=normalize(L+V);
 float ndl=max(dot(N,L),0.),ndv=max(dot(N,V),.05),ndh=max(dot(N,H),0.);
 float sh=shadowFactor(N);
 vec3 ambient=mix(vec3(.28,.265,.20),vec3(.47,.56,.61),N.y*.5+.5);
 vec3 direct=vec3(1.90,1.59,1.11)*ndl*sh;
 vec3 rim=vec3(.14,.20,.27)*max(dot(N,normalize(vec3(1.,.5,-1.))),0.);
 float a=rough*rough,a2=a*a,den=ndh*ndh*(a2-1.)+1.;float D=a2/max(3.14159*den*den,.001);
 vec3 F=mix(vec3(.04),base,metal);vec3 spec=F*D*ndl*sh*.3;
 vec3 color=base*(ambient+direct+rim)+spec+emit;
 if(uMode==1){float foot=exp(-dot(vWorld.xz*vec2(.27,.31),vWorld.xz*vec2(.27,.31))*1.8);color*=1.-foot*.34*(1.-smoothstep(.75,1.,uDamage));}
 float dist=length(uEye-vWorld);float fog=uMode==1?smoothstep(20.,52.,dist):smoothstep(38.,84.,dist);
 vec2 screenUV=gl_FragCoord.xy/uResolution;vec3 bg=mix(vec3(.665,.684,.574),vec3(.47,.552,.533),smoothstep(0.,1.,screenUV.y));float glow=pow(max(0.,1.-length((screenUV-vec2(.2,.77))*vec2(1.,.75))),3.);bg+=vec3(.16,.11,.035)*glow;
 fragColor=vec4(mix(toSRGB(tonemap(color)),bg,fog),1.);
}`;
const fragmentDepth=`#version 300 es
precision highp float;precision highp int;precision highp sampler3D;
in vec3 vOriginal;in float vSeed;
uniform int uMode;uniform float uUncut;
${damageGLSL}
void main(){if(uUncut>.5)return;if(uDamage>=.9998||uDamage>.972+vSeed*.027)discard;if(damageField(vOriginal)<0.)discard;}
`;
const fragmentOpening=`#version 300 es
precision highp float;precision highp int;precision highp sampler3D;
in vec3 vOriginal;in float vSeed;
out vec4 fragMask;
${damageGLSL}
void main(){
 bool removed=uDamage>=.9998||uDamage>.972+vSeed*.027||damageField(vOriginal)<0.;
 fragMask=vec4(removed?1.:0.,0.,0.,1.);
}`;
const fullscreenVS=`#version 300 es
precision highp float;precision highp int;
out vec2 uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const skyFS=`#version 300 es
precision highp float;precision highp int;in vec2 uv;out vec4 fragColor;
void main(){vec3 low=vec3(.665,.684,.574),high=vec3(.47,.552,.533);float y=smoothstep(.0,1.,uv.y);vec3 c=mix(low,high,y);float glow=pow(max(0.,1.-length((uv-vec2(.2,.77))*vec2(1.,.75))),3.);c+=vec3(.16,.11,.035)*glow;fragColor=vec4(c,1.);}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)+'\n'+src.split('\n').map((s,i)=>(i+1)+': '+s).join('\n'));return s}
function program(vs,fs){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const info=gl.getActiveUniform(p,i);u[info.name.replace('[0]','')]=gl.getUniformLocation(p,info.name)}return {p,u}}
function uniform(pr,name,value){const loc=pr.u[name];if(loc===undefined||loc===null)return;if(typeof value==='number')gl.uniform1f(loc,value);else if(value.length===16)gl.uniformMatrix4fv(loc,false,value);else if(value.length===3)gl.uniform3fv(loc,value);else if(value.length===2)gl.uniform2fv(loc,value);else if(value.length===4)gl.uniform4fv(loc,value);else gl.uniform4fv(loc,value)}
function ui(pr,name,value){const loc=pr.u[name];if(loc!==undefined&&loc!==null)gl.uniform1i(loc,value)}
const mainProgram=program(vertexBase,fragmentMain),depthProgram=program(vertexBase,fragmentDepth),openingProgram=program(vertexBase,fragmentOpening),skyProgram=program(fullscreenVS,skyFS);
const sun=V.norm([-8,13,9]),lightVP=M.mul(M.ortho(-11,11,-11,11,.5,52),M.look(V.mul(sun,26),[0,2,0]));
function createMesh(data){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data instanceof Float32Array?data:new Float32Array(data),gl.STATIC_DRAW);for(const [loc,size,offset]of [[0,3,0],[1,3,3],[2,2,6],[3,3,8],[4,1,11]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,48,offset*4)}gl.bindVertexArray(null);return {vao,buffer,count:data.length/12}}
function vertex(out,p,n,uv=[0,0],anchor=p,seed=.5){out.push(...p,...n,...uv,...anchor,seed)}
function makeGround(radius=6.3){const out=[],N=128;const rings=[[0,-.10],[radius,-.10],[radius+.85,-.19],[radius+1.20,-.45],[85,-.51]];for(let r=0;r<rings.length-1;r++)for(let a=0;a<N;a++){const a0=a/N*TAU,a1=(a+1)/N*TAU;let ps=[[Math.cos(a0)*rings[r][0],rings[r][1],Math.sin(a0)*rings[r][0]],[Math.cos(a1)*rings[r][0],rings[r][1],Math.sin(a1)*rings[r][0]],[Math.cos(a1)*rings[r+1][0],rings[r+1][1],Math.sin(a1)*rings[r+1][0]],[Math.cos(a0)*rings[r+1][0],rings[r+1][1],Math.sin(a0)*rings[r+1][0]]];for(const ids of [[0,1,2],[0,2,3]]){const n=V.norm(V.cross(V.sub(ps[ids[1]],ps[ids[0]]),V.sub(ps[ids[2]],ps[ids[0]])));for(const j of ids)vertex(out,ps[j],n,[ps[j][0],ps[j][2]])}}return createMesh(out)}
function convexHull(points){points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);let lower=[],upper=[];for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p)}for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p)}lower.pop();upper.pop();return lower.concat(upper)}
let hull=[];
function radiusAt(a){const dx=Math.cos(a),dz=Math.sin(a);let radius=0;for(let i=0;i<hull.length;i++){const p=hull[i],q=hull[(i+1)%hull.length],ex=q[0]-p[0],ez=q[1]-p[1],det=dx*ez-dz*ex;if(Math.abs(det)<1e-8)continue;const t=(p[0]*ez-p[1]*ex)/det,s=(p[0]*dz-p[1]*dx)/det;if(t>0&&s>=-.001&&s<=1.001)radius=Math.max(radius,t)}return radius||4}
function makeAsh(){const out=[],N=160,R=18;function p(a,r){const rad=radiusAt(a)*1.10*(1+Math.sin(a*17.3)*.016+Math.sin(a*9.2)*.018);const x=Math.cos(a)*rad*r,z=Math.sin(a)*rad*r;return [x,.015+Math.pow(1-r*r,2)*(.15+.04*Math.sin(x*2.1)*Math.sin(z*1.8)),z]}
 for(let j=0;j<R;j++)for(let i=0;i<N;i++){let a=i/N*TAU,b=(i+1)/N*TAU,r=j/R,s=(j+1)/R,ps=[p(a,r),p(b,r),p(b,s),p(a,s)],uvs=[[r,a],[r,b],[s,b],[s,a]];for(const ids of [[0,1,2],[0,2,3]]){let n=V.norm(V.cross(V.sub(ps[ids[1]],ps[ids[0]]),V.sub(ps[ids[2]],ps[ids[0]])));for(const k of ids)vertex(out,ps[k],n,uvs[k])}}
 return createMesh(out)}
function makeRepairNormals(){
 const nf=sourceIndices.length/3, fns=[],areas=[],adj=new Map(),keys=[];
 for(let k=0;k<sourcePositions.length;k+=3){const key=[0,1,2].map(j=>Math.round(sourcePositions[k+j]*1e5)).join(',');keys.push(key);if(!adj.has(key))adj.set(key,new Set());}
 for(let f=0;f<nf;f++){const ids=Array.from(sourceIndices.subarray(f*3,f*3+3)),p=ids.map(k=>Array.from(sourcePositions.subarray(k*3,k*3+3))),cross=V.cross(V.sub(p[1],p[0]),V.sub(p[2],p[0]));fns.push(V.norm(cross));areas.push(V.len(cross)*.5);for(const k of ids)adj.get(keys[k]).add(f);}
 const out=new Float32Array(nf*9);
 for(let f=0;f<nf;f++)for(let j=0;j<3;j++){
  const k=sourceIndices[f*3+j],fn=fns[f];let n=[0,0,0];
  for(const q of adj.get(keys[k]))if(V.dot(fn,fns[q])>.72){const w=Math.pow(areas[q],.75);n=V.add(n,V.mul(fns[q],w));}
  n=V.norm(n);
  const axis=Math.abs(fn[0])>Math.abs(fn[1])?(Math.abs(fn[0])>Math.abs(fn[2])?0:2):(Math.abs(fn[1])>Math.abs(fn[2])?1:2);
  if(Math.abs(fn[axis])>.95){const pn=[0,0,0];pn[axis]=Math.sign(fn[axis]);n=V.norm(n.map((x,i)=>mix(x,pn[i],smooth(.95,.996,Math.abs(fn[axis])))));}
  out.set(n,(f*3+j)*3);
 }
 gl.bindVertexArray(mesh.vao);const nb=gl.createBuffer();mesh.repairBuffer=nb;gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,out,gl.STATIC_DRAW);gl.enableVertexAttribArray(5);gl.vertexAttribPointer(5,3,gl.FLOAT,false,12,0);gl.bindVertexArray(null);return out;
}


function applyBuildingGeometryPatches(building,positions,normals,uv,indices,bounds){
 if(!building||!building.roofCap)return{positions,normals,uv,indices,bounds};
 const opts=building.roofCap, min=bounds.min, max=bounds.max;
 const span=[max[0]-min[0],max[1]-min[1],max[2]-min[2]];
 let roofY=min[1]+span[1]*(opts.heightRatio??.6);
 const selectionMargin=opts.selectionMargin??0;
 const selected=[];
 for(let i=0;i<positions.length;i+=3)if(positions[i+1]>=roofY-selectionMargin)selected.push(i/3);
 const sample=selected.length?selected:[...Array(positions.length/3).keys()];
 let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity,u=0,v=0;
 for(const idx of sample){
  const p=idx*3,t=idx*2;
  x0=Math.min(x0,positions[p]);x1=Math.max(x1,positions[p]);
  z0=Math.min(z0,positions[p+2]);z1=Math.max(z1,positions[p+2]);
  u+=uv[t]||0;v+=uv[t+1]||0;
 }
 if(!Number.isFinite(x0)||!Number.isFinite(z0))return{positions,normals,uv,indices,bounds};
 u/=sample.length;v/=sample.length;
 if(Array.isArray(opts.uv)&&opts.uv.length>=2){u=opts.uv[0];v=opts.uv[1];}
 const hasRect=Array.isArray(opts.uvRect)&&opts.uvRect.length>=4;
 const rectUV=hasRect?[[opts.uvRect[0],opts.uvRect[1]],[opts.uvRect[2],opts.uvRect[1]],[opts.uvRect[2],opts.uvRect[3]],[opts.uvRect[0],opts.uvRect[3]]]:null;
 const insetAbsX=(opts.insetX??opts.inset??.05)*(x1-x0);
 const insetAbsZ=(opts.insetZ??opts.inset??.05)*(z1-z0);
 x0+=insetAbsX;x1-=insetAbsX;z0+=insetAbsZ;z1-=insetAbsZ;
 if(!(x1>x0&&z1>z0))return{positions,normals,uv,indices,bounds};
 const pOut=new Float32Array(positions.length+8*3), nOut=new Float32Array(normals.length+8*3), uvOut=new Float32Array(uv.length+8*2);
 pOut.set(positions);nOut.set(normals);uvOut.set(uv);
 const top=[[x0,roofY,z0],[x1,roofY,z0],[x1,roofY,z1],[x0,roofY,z1]];
 const start=positions.length/3;
 const roofUV=opts.capYellow?[-1,-1]:null;
 for(let i=0;i<4;i++){
  pOut.set(top[i],positions.length+i*3);nOut.set([0,1,0],normals.length+i*3);uvOut.set(roofUV??(hasRect?rectUV[i]:[u,v]),uv.length+i*2);
 }
 for(let i=0;i<4;i++){
  pOut.set(top[i],positions.length+(i+4)*3);nOut.set([0,-1,0],normals.length+(i+4)*3);uvOut.set(roofUV??(hasRect?rectUV[i]:[u,v]),uv.length+(i+4)*2);
 }
 const idxCtor=(indices instanceof Uint32Array)?Uint32Array:Uint32Array;
 const iOut=new idxCtor(indices.length+12);
 iOut.set(indices);
 iOut.set([start,start+1,start+2,start,start+2,start+3,start+4,start+6,start+5,start+4,start+7,start+6],indices.length);
 const b={min:[Math.min(bounds.min[0],x0),Math.min(bounds.min[1],roofY),Math.min(bounds.min[2],z0)],max:[Math.max(bounds.max[0],x1),Math.max(bounds.max[1],roofY),Math.max(bounds.max[2],z1)]};
 return{positions:pOut,normals:nOut,uv:uvOut,indices:iOut,bounds:b};
}

/* A building registry drives the selector. Add another embedded GLB and a descriptor
   to extend the catalogue; geometry, hit sites and ash footprint are rebuilt together.
   The GLB data and all texture bytes remain unmodified. */
async function loadBuildingModel(building){
 loadProgress(10,'Leyendo '+building.name+'…');
 await new Promise(resolve=>setTimeout(resolve,15));
 const dataNode=$(building.dataId);
 if(!building.glbBase64){
  if(!dataNode)throw new Error('No se encuentra el modelo embebido: '+building.dataId);
  building.glbBase64=dataNode.textContent.trim();
 }
 const binary=atob(building.glbBase64),buffer=new ArrayBuffer(binary.length),bytes=new Uint8Array(buffer);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const dv=new DataView(buffer);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2)throw new Error('GLB 2.0 no válido.');
 let json,binOffset=0;
 for(let o=12;o<buffer.byteLength;){const len=dv.getUint32(o,true),type=dv.getUint32(o+4,true);
  if(o+8+len>buffer.byteLength)throw new Error('Datos GLB incompletos.');
  if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(bytes.subarray(o+8,o+8+len)));
  if(type===0x004e4942)binOffset=o+8;o+=8+len;
 }
 if(!json||!binOffset)throw new Error('Faltan datos en el GLB.');
 function accessor(index){
  const a=json.accessors[index],v=json.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType];
  if(!Type||!components)throw new Error('Formato de atributo no compatible.');
  const size=Type.BYTES_PER_ELEMENT,offset=binOffset+(v.byteOffset||0)+(a.byteOffset||0);
  if(!v.byteStride||v.byteStride===components*size)return new Type(buffer,offset,a.count*components);
  const result=new Type(a.count*components);
  for(let i=0;i<a.count;i++)result.set(new Type(buffer,offset+i*v.byteStride,components),i*components);
  return result;
 }
 // The four supplied GLBs have one primitive and an identity scene transform.
 // Additional multi-mesh/transformed assets must first be adapted to this loader.
 if(json.meshes.length!==1||json.meshes[0].primitives.length!==1)throw new Error('Este visor necesita un GLB de una sola malla/primitiva.');
 const primitive=json.meshes[0].primitives[0];
 if(primitive.attributes.NORMAL===undefined||primitive.attributes.TEXCOORD_0===undefined||primitive.indices===undefined)throw new Error('El GLB necesita normales, UV e índices.');
 let nextPositions=new Float32Array(accessor(primitive.attributes.POSITION));
 let nextNormals=accessor(primitive.attributes.NORMAL),nextUV=accessor(primitive.attributes.TEXCOORD_0),nextIndices=accessor(primitive.indices);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<nextPositions.length;i+=3)for(let j=0;j<3;j++){min[j]=Math.min(min[j],nextPositions[i+j]);max[j]=Math.max(max[j],nextPositions[i+j]);}
 const center=[(min[0]+max[0])/2,min[1],(min[2]+max[2])/2];
 // Same rigid centring as v1.1: no deformation, remesh, welding or UV modification.
 for(let i=0;i<nextPositions.length;i+=3)for(let j=0;j<3;j++)nextPositions[i+j]-=center[j];
 let nextBounds={min:min.map((v,i)=>v-center[i]),max:max.map((v,i)=>v-center[i])};
 ({positions:nextPositions,normals:nextNormals,uv:nextUV,indices:nextIndices,bounds:nextBounds}=applyBuildingGeometryPatches(building,nextPositions,nextNormals,nextUV,nextIndices,nextBounds));
 const material=json.materials[primitive.material],pbr=material.pbrMetallicRoughness;
 async function createImageTexture(imageIndex,srgb){
  const image=json.images[imageIndex],v=json.bufferViews[image.bufferView];
  const blob=new Blob([bytes.subarray(binOffset+(v.byteOffset||0),binOffset+(v.byteOffset||0)+v.byteLength)],{type:image.mimeType});
  let img;
  try{img=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});}
  catch(error){img=await new Promise((resolve,reject)=>{const im=new Image(),url=URL.createObjectURL(blob);im.onload=()=>{URL.revokeObjectURL(url);resolve(im);};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo descodificar una textura.'));};im.src=url;});}
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,srgb?gl.SRGB8_ALPHA8:gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  if(img.close)img.close();return tex;
 }
 loadProgress(35,'Descodificando las texturas originales, sin alterarlas…');
 const nextTextures=[];
 try{
  for(const [index,srgb]of [[pbr.baseColorTexture.index,true],[material.normalTexture.index,false],[pbr.metallicRoughnessTexture.index,false]]){
   nextTextures.push(await createImageTexture(json.textures[index].source,srgb));loadProgress(35+nextTextures.length*15,'Texturas listas: '+nextTextures.length+' / 3');
  }
 }catch(error){for(const t of nextTextures)gl.deleteTexture(t);throw error;}
 // Commit only after successful decode. Old GPU resources do not accumulate on switches.
 if(mesh){gl.deleteVertexArray(mesh.vao);gl.deleteBuffer(mesh.buffer);if(mesh.repairBuffer)gl.deleteBuffer(mesh.repairBuffer);}
 if(ash){gl.deleteVertexArray(ash.vao);gl.deleteBuffer(ash.buffer);}
 for(const t of textureObjects)gl.deleteTexture(t);
 sourcePositions=nextPositions;sourceNormals=nextNormals;sourceUV=nextUV;sourceIndices=nextIndices;
 bounds=nextBounds;textureObjects=nextTextures;triangleCount=sourceIndices.length/3;
 const points=[];for(let i=0;i<sourcePositions.length;i+=3)points.push([sourcePositions[i],sourcePositions[i+2]]);hull=convexHull(points);
 const modelData=[],groups=new Map();sourceTriGroups=[];const modelRand=rng(building.seed||57021);
 for(let i=0;i<sourceIndices.length;i+=3){const c=[0,0,0];for(let j=0;j<3;j++){const k=sourceIndices[i+j]*3;for(let a=0;a<3;a++)c[a]+=sourcePositions[k+a]/3;}
  const key=c.map(x=>Math.floor(x/1.10)).join(',');if(!groups.has(key))groups.set(key,{sum:[0,0,0],count:0,seed:modelRand()});
  const g=groups.get(key);g.count++;for(let a=0;a<3;a++)g.sum[a]+=c[a];sourceTriGroups.push(g);
 }
 for(const g of groups.values())g.anchor=g.sum.map(x=>x/g.count);
 for(let i=0;i<sourceIndices.length;i++){const k=sourceIndices[i],g=sourceTriGroups[Math.floor(i/3)];vertex(modelData,Array.from(sourcePositions.subarray(k*3,k*3+3)),Array.from(sourceNormals.subarray(k*3,k*3+3)),Array.from(sourceUV.subarray(k*2,k*2+2)),g.anchor,g.seed);}
 mesh=createMesh(modelData);repairNormals=makeRepairNormals();ash=makeAsh();
 // Refit only the display ground, never the model. The wide new footprint and
 // its ash fringe must stay above the flat section instead of the outer slope.
 if(ground){gl.deleteVertexArray(ground.vao);gl.deleteBuffer(ground.buffer);}
 const plinthRadius=building.fitGround?Math.max(6.3,...hull.map(p=>Math.hypot(p[0],p[1])*1.18)):6.3;
 ground=makeGround(plinthRadius);
 $('triangles').textContent=triangleCount.toLocaleString('es-ES');stats.triangles=triangleCount;
 if(dataNode)dataNode.remove();
}
await loadBuildingModel(activeBuilding);

let shadowSize=1024,shadowFBO,shadowTexture,mainFBO,colorTexture,sceneDepth,intactFBO,intactTexture,openingTexture;
function tex2D(internal,w,h,format,type,filter=gl.NEAREST){let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,internal,w,h,0,format,type,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function makeShadow(){shadowDirty=true;if(shadowFBO){gl.deleteFramebuffer(shadowFBO);gl.deleteTexture(shadowTexture)}shadowSize=quality==='high'?2048:quality==='low'?768:1024;shadowTexture=tex2D(gl.DEPTH_COMPONENT24,shadowSize,shadowSize,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT);shadowFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFBO);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('No se pudo crear el mapa de sombras.');gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
function resize(){const rect=host.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,quality==='high'?1.8:quality==='low'?1:1.4);const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(w===width&&h===height)return;width=w;height=h;canvas.width=w;canvas.height=h;if(mainFBO){gl.deleteFramebuffer(mainFBO);gl.deleteTexture(colorTexture);gl.deleteTexture(sceneDepth);gl.deleteFramebuffer(intactFBO);gl.deleteTexture(intactTexture);gl.deleteTexture(openingTexture)}intactKey='';openingDirty=true;intactTexture=tex2D(gl.DEPTH_COMPONENT24,w,h,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT);intactFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,intactFBO);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,intactTexture,0);openingTexture=tex2D(gl.R8,w,h,gl.RED,gl.UNSIGNED_BYTE);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,openingTexture,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);gl.readBuffer(gl.COLOR_ATTACHMENT0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('No se pudo crear la máscara de aberturas del interior.');colorTexture=tex2D(gl.RGBA8,w,h,gl.RGBA,gl.UNSIGNED_BYTE,gl.LINEAR);sceneDepth=tex2D(gl.DEPTH_COMPONENT24,w,h,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT);mainFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,mainFBO);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,colorTexture,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,sceneDepth,0);gl.drawBuffers([gl.COLOR_ATTACHMENT0]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('No se pudo crear el búfer de imagen.');gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
makeShadow();resize();window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(host);
function bindTexture(unit,type,tex){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(type,tex)}
function common(pr,mode,inner=0,shadow=false){gl.useProgram(pr.p);uniform(pr,'uVP',shadow?lightVP:viewProjection);uniform(pr,'uLightVP',lightVP);uniform(pr,'uDamage',damage);uniform(pr,'uInner',inner);ui(pr,'uMode',mode);uniform(pr,'uHoles',holes);uniform(pr,'uEye',eye);uniform(pr,'uSun',sun);uniform(pr,'uRepair',activeBuilding.repairPlaster?repairStrength:0);uniform(pr,'uTime',time);uniform(pr,'uAshAge',Math.max(0,time-destructionAt));uniform(pr,'uResolution',[width,height]);uniform(pr,'uUncut',0);uniform(pr,'uShadowSize',shadowSize);uniform(pr,'uShadows',shadowsEnabled?1:0);uniform(pr,'uEmbers',embersEnabled?1:0);uniform(pr,'uQuality',quality==='low'?0:1);bindTexture(4,gl.TEXTURE_3D,noiseTex);ui(pr,'uNoise',4);if(!shadow){for(let i=0;i<3;i++)bindTexture(i,gl.TEXTURE_2D,textureObjects[i]);bindTexture(3,gl.TEXTURE_2D,shadowTexture);ui(pr,'uAlbedo',0);ui(pr,'uNormalMap',1);ui(pr,'uMR',2);ui(pr,'uShadow',3);bindTexture(7,gl.TEXTURE_2D,intactTexture);ui(pr,'uIntactDepth',7);bindTexture(8,gl.TEXTURE_2D,openingTexture);ui(pr,'uOpeningMask',8)}}
function draw(m){gl.bindVertexArray(m.vao);gl.drawArrays(gl.TRIANGLES,0,m.count);stats.drawCalls++}
function sampleNoise(p){const c=p.map(x=>fract(x)*32-.5),base=c.map(Math.floor),f=c.map(fract);let total=0;for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){const id=((base[0]+x)&31)+(((base[1]+y)&31)<<5)+(((base[2]+z)&31)<<10);total+=noiseBytes[id]/255*(x?f[0]:1-f[0])*(y?f[1]:1-f[1])*(z?f[2]:1-f[2])}return total}
function field(p){let f=100;for(let i=0;i<8;i++)if(holes[i*4+3]>.005)f=Math.min(f,V.len(V.sub(p,Array.from(holes.subarray(i*4,i*4+3))))-holes[i*4+3]);return f+(sampleNoise(p.map(v=>v*.141))-.5)*.40+(sampleNoise(p.map(v=>v*.427+.21))-.5)*.12}
// CPU picking mirrors the vertex collapse so touches keep following falling pieces.
function collapsedPoint(p,g){
 if(damage<COLLAPSE_THRESHOLD)return p;
 const c=smooth(COLLAPSE_THRESHOLD,1,damage),start=(1-clamp(g.anchor[1]/8))*.20+g.seed*.12;
 const t=clamp((c-start)/(1-start)),axis=V.norm([Math.sin(g.seed*47.8),.12,Math.cos(g.seed*32.9)]),angle=t*t*(g.seed-.5)*2.8;
 const q=V.sub(p,g.anchor),cs=Math.cos(angle),sn=Math.sin(angle);
 let out=V.add(V.add(V.mul(q,cs),V.mul(V.cross(axis,q),sn)),V.mul(axis,V.dot(axis,q)*(1-cs)));
 out=V.add(out,g.anchor);out[0]+=Math.sin(g.seed*59)*t*t*.72;out[2]+=Math.cos(g.seed*73)*t*t*.72;
 out[1]-=g.anchor[1]*t*t*1.22;out[1]=Math.max(out[1],.035+Math.abs(Math.sin(g.seed*27))*.045*t);return out;
}
function raycast(origin,dir,respectDamage=true){
 let best=Infinity,hit=null;
 for(let i=0;i<sourceIndices.length;i+=3){
  const g=sourceTriGroups[i/3];if(respectDamage&&damage>.972+g.seed*.027)continue;
  const ids=[sourceIndices[i],sourceIndices[i+1],sourceIndices[i+2]];
  const originals=ids.map(k=>[sourcePositions[k*3],sourcePositions[k*3+1],sourcePositions[k*3+2]]);
  const a=collapsedPoint(originals[0],g),b=collapsedPoint(originals[1],g),c=collapsedPoint(originals[2],g);
  const e1=V.sub(b,a),e2=V.sub(c,a),h=V.cross(dir,e2),det=V.dot(e1,h);if(Math.abs(det)<1e-8)continue;
  const inv=1/det,s=V.sub(origin,a),u=inv*V.dot(s,h);if(u<0||u>1)continue;
  const q=V.cross(s,e1),v=inv*V.dot(dir,q);if(v<0||u+v>1)continue;
  const t=inv*V.dot(e2,q);if(t<=0||t>=best)continue;
  const p=V.add(origin,V.mul(dir,t));
  const original=originals[0].map((x,k)=>x*(1-u-v)+originals[1][k]*u+originals[2][k]*v);
  if(respectDamage&&field(original)<.015)continue;
  let n=V.norm(V.cross(e1,e2));if(V.dot(n,dir)>0)n=V.mul(n,-1);
  best=t;hit={p,n,t,original};
 }
 return hit;
}

function surfaceFrom(origin,target){return raycast(origin,V.norm(V.sub(target,origin)),false)||{p:target,n:V.norm(V.sub(origin,target))}}
function resetSites(){rand=rng(seed);const siteScale=activeBuilding.fitSites?[(bounds.max[0]-bounds.min[0])/8.82395076751709,(bounds.max[1]-bounds.min[1])/8,(bounds.max[2]-bounds.min[2])/7.824930191040039]:[1,1,1];const specs=[[[1.2,2.6,11],[1.2,2.6,0]],[[10,3.4,1.6],[0,3.4,1.6]],[[-2.0,11,2.0],[-2,3,1.2]],[[-10,2.4,1],[-1,2.4,0]],[[.5,3.0,-11],[.5,3.0,0]],[[3,11,-1.9],[2,3,-1.5]],[[-2.4,2.0,-11],[-2.4,2,0]],[[-1.3,11,-2],[-1.2,2,-1.8]]];hitSites=specs.map((s,i)=>{let origin=s[0].map((v,j)=>(v+(j===1?0:(rand()-.5)*.6))*siteScale[j]),target=s[1].map((v,j)=>v*siteScale[j]);const hit=surfaceFrom(origin,target);return{p:hit.p,n:hit.n,birth:[.045,.17,.29,.40,.50,.58,.66,.72][i],maxRadius:[2.65,2.50,2.55,2.45,2.50,2.45,2.4,2.5][i],manual:false,emission:0,lastRadius:0}});updateHoles()}
function updateHoles(){openingDirty=true;let active=0;for(let i=0;i<8;i++){const s=hitSites[i];let t=clamp((damage-s.birth)/(.91-s.birth));let radius=s.maxRadius*Math.pow(t,.70);if(s.manual)radius=Math.max(radius,s.minRadius*smooth(s.birth,s.birth+.075,damage));if(damage<=.0001)radius=0;holes.set([...s.p,radius],i*4);if(radius>.06)active++;s.radius=radius}if($('foci').textContent!==String(active))$('foci').textContent=active}
resetSites();
function cameraUpdate(dt){if(autoRotate)camTheta+=dt*.12;const zoomFov=host.clientWidth<650?43:42;const minFit=host.clientWidth<600?Math.max(1,1.12/(host.clientWidth/host.clientHeight)):1;const distance=camDistance*Math.min(minFit,1.50);eye=V.add(camTarget,[Math.sin(camTheta)*Math.sin(camPhi)*distance,Math.cos(camPhi)*distance,Math.cos(camTheta)*Math.sin(camPhi)*distance]);view=M.look(eye,camTarget);projection=M.persp(zoomFov*Math.PI/180,width/height,.15,90);viewProjection=M.mul(projection,view);invVP=M.inv(viewProjection);cameraRight=[view[0],view[4],view[8]];cameraUp=[view[1],view[5],view[9]]}
// Instanced, depth-softened billboards. No downloaded particle textures.
const smokeVS=`#version 300 es
precision highp float;precision highp int;
layout(location=0)in vec2 aCorner;layout(location=1)in vec4 aPosSize;layout(location=2)in vec4 aInfo;layout(location=3)in vec3 aColor;
uniform mat4 uVP;uniform vec3 uRight;uniform vec3 uUp;
out vec2 vLocal;out vec4 vInfo;out vec3 vColor;
void main(){float c=cos(aInfo.y),s=sin(aInfo.y);vec2 q=mat2(c,s,-s,c)*aCorner;vec3 p=aPosSize.xyz+(uRight*q.x+uUp*q.y)*aPosSize.w;vLocal=aCorner;vInfo=aInfo;vColor=aColor;gl_Position=uVP*vec4(p,1.);}`;
const smokeFS=`#version 300 es
precision highp float;precision highp int;precision highp sampler3D;
in vec2 vLocal;in vec4 vInfo;in vec3 vColor;uniform highp sampler2D uDepth;uniform sampler3D uNoise;uniform vec2 uResolution;out vec4 fragColor;
float linearDepth(float z){float n=.15,f=90.;return 2.*n*f/(f+n-(2.*z-1.)*(f-n));}
void main(){float scene=texelFetch(uDepth,ivec2(gl_FragCoord.xy),0).r;float soft=clamp((linearDepth(scene)-linearDepth(gl_FragCoord.z))/.48,0.,1.);if(soft<.002)discard;
 float radius=length(vLocal);float n=texture(uNoise,vec3(vLocal*.135+.24,vInfo.w*.025)).r;float detail=texture(uNoise,vec3(vLocal*.34+.13,vInfo.w*.031+.5)).r;
 float edge=1.-smoothstep(.30,.98,radius+(n-.5)*.38+(detail-.5)*.10);float core=mix(.50,1.,n);float a=edge*core*vInfo.x*soft;
 if(vInfo.z>1.5){a=exp(-dot(vLocal,vLocal)*5.)*vInfo.x*soft;}
 if(a<.002)discard;float light=1.+vLocal.y*.1+(n-.5)*.18;
 fragColor=vec4(vColor*light,a);
}`;
const smokeProgram=program(smokeVS,smokeFS),smokeVAO=gl.createVertexArray();gl.bindVertexArray(smokeVAO);let quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);const smokeInstanceBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,smokeInstanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,512*11*4,gl.DYNAMIC_DRAW);for(const [loc,size,offset]of [[1,4,0],[2,4,4],[3,3,8]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,44,offset*4);gl.vertexAttribDivisor(loc,1)}gl.bindVertexArray(null);
const debrisVS=`#version 300 es
precision highp float;precision highp int;layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNormal;layout(location=2)in vec3 aOffset;layout(location=3)in vec3 aRotation;layout(location=4)in vec3 aScale;layout(location=5)in vec3 aColor;
uniform mat4 uVP;uniform vec3 uSun;out vec3 vColor;
vec3 rot(vec3 p){float c=cos(aRotation.x),s=sin(aRotation.x);p.yz=mat2(c,s,-s,c)*p.yz;c=cos(aRotation.y);s=sin(aRotation.y);p.xz=mat2(c,s,-s,c)*p.xz;c=cos(aRotation.z);s=sin(aRotation.z);p.xy=mat2(c,s,-s,c)*p.xy;return p;}
void main(){vec3 p=rot(aPos*aScale)+aOffset;vec3 n=normalize(rot(aNormal));vColor=aColor*(mix(vec3(.27,.26,.22),vec3(.44,.49,.52),n.y*.5+.5)+vec3(1.9,1.59,1.11)*max(dot(n,uSun),0.));gl_Position=uVP*vec4(p,1.);}`;
const debrisFS=`#version 300 es
precision highp float;precision highp int;in vec3 vColor;out vec4 fragColor;
void main(){vec3 x=max(vColor,vec3(0));x=clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);fragColor=vec4(pow(x,vec3(1./2.2)),1.);}`;
const debrisProgram=program(debrisVS,debrisFS),debrisVAO=gl.createVertexArray();gl.bindVertexArray(debrisVAO);const shape=[[-.53,-.43,-.40],[.43,-.53,-.51],[.57,.35,-.43],[-.40,.52,-.51],[-.45,-.36,.54],[.51,-.40,.42],[.38,.54,.49],[-.56,.42,.33]],debrisVerts=[];for(const ids of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[1,2,6],[1,6,5],[0,4,7],[0,7,3]]){let n=V.norm(V.cross(V.sub(shape[ids[1]],shape[ids[0]]),V.sub(shape[ids[2]],shape[ids[0]])));for(const i of ids)debrisVerts.push(...shape[i],...n)}let debrisBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,debrisBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(debrisVerts),gl.STATIC_DRAW);for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,24,i*12)}const debrisInstanceBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,debrisInstanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,650*12*4,gl.DYNAMIC_DRAW);for(let i=2;i<6;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,48,(i-2)*12);gl.vertexAttribDivisor(i,1)}gl.bindVertexArray(null);
let ashChips=[];function resetAshChips(){ashChips=[];for(let i=0;i<175;i++){const a=rand()*TAU,r=Math.sqrt(rand())*.9,rad=radiusAt(a),x=Math.cos(a)*rad*r,z=Math.sin(a)*rad*r;ashChips.push({p:[x,.035+Math.pow(1-r*r,2)*.14,z],r:[(rand()-.5)*.25,rand()*TAU,(rand()-.5)*.25],s:[.06+rand()*.19,.014+rand()*.019,.04+rand()*.14],c:(()=>{const tone=.010+rand()*.026;return[tone*1.08,tone*1.03,tone*.96]})()})}}
resetAshChips();
const finalFS=`#version 300 es
precision highp float;precision highp int;in vec2 uv;uniform sampler2D uColor;uniform vec2 uResolution;out vec4 fragColor;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec2 texel=1./uResolution;vec3 center=texture(uColor,uv).rgb,n=texture(uColor,uv+vec2(0,texel.y)).rgb,s=texture(uColor,uv-vec2(0,texel.y)).rgb,e=texture(uColor,uv+vec2(texel.x,0)).rgb,w=texture(uColor,uv-vec2(texel.x,0)).rgb;float lc=luma(center),ln=luma(n),ls=luma(s),le=luma(e),lw=luma(w);float range=max(lc,max(max(ln,ls),max(le,lw)))-min(lc,min(min(ln,ls),min(le,lw)));float blend=clamp((range-.10)*.85,0.,.25);vec3 c=mix(center,(n+s+e+w)*.25,blend);float vign=1.-smoothstep(.25,.94,length((uv-.5)*vec2(.85,1.)))*.075;fragColor=vec4(c*vign,1.);}`;
const finalProgram=program(fullscreenVS,finalFS);
function emitPuff(pos,normal=[0,1,0],kind=0,strength=1){if(!smokeEnabled)return;const limit=quality==='low'?125:quality==='high'?330:240;if(smoke.length>=limit)return;const isDust=kind===1,isSpark=kind===2;let color=isDust?[.66+rand()*.07,.64+rand()*.065,.55+rand()*.06]:[.285+rand()*.07,.292+rand()*.055,.255+rand()*.05];if(isSpark)color=[1.,.57+rand()*.23,.18];smoke.push({p:pos.map((v,i)=>v+(rand()-.5)*(isSpark?.12:.26)),v:[normal[0]*(isDust?.5:.20)+(rand()-.5)*.28,(isDust?.30:.70)+rand()*.47+normal[1]*.22,normal[2]*.26+(rand()-.5)*.27],age:0,life:isSpark?.6+rand()*.9:isDust?2.0+rand()*2.0:2.8+rand()*2.5,size:(isSpark?.018+rand()*.02:isDust?.50+rand()*.65:.28+rand()*.24)*strength,rotation:rand()*TAU,spin:(rand()-.5)*.12,alpha:isSpark?.8:isDust?.46:.45,color,kind,phase:rand()*40})}
function burst(pos,normal,strength=1,final=false){if(smokeEnabled){for(let i=0;i<(final?32:8)*smokeAmount;i++){const p=V.add(pos,[(rand()-.5)*(final?7:.8),(rand()-.5)*(final?1:.6),(rand()-.5)*(final?6:.8)]);p[1]=Math.max(.12,p[1]);emitPuff(p,normal,1,strength)}if(embersEnabled&&!final)for(let i=0;i<4;i++)emitPuff(pos,normal,2,.75)}if(debrisEnabled)for(let i=0;i<(final?35:12)*strength;i++)emitDebris(pos,normal,final)}
function emitDebris(pos,normal,final=false){if(debris.length>=340)return;const r=rand(),base=damage>.4?[.055,.036,.022]:[.18,.091,.028],size=.075+rand()*.21;debris.push({p:pos.map((v,i)=>v+(rand()-.5)*(final?2.8:.6)),v:[normal[0]*(1.2+rand()*1.8)+(rand()-.5)*3,1.8+rand()*3.5,normal[2]*(1.2+rand()*1.8)+(rand()-.5)*3],r:[rand()*TAU,rand()*TAU,rand()*TAU],spin:[(rand()-.5)*5,(rand()-.5)*5,(rand()-.5)*5],size:[size*(.6+rand()),size*(.7+rand()*2.5),size*(.5+rand())],color:base.map(v=>v*(.6+r*.8)),age:0,life:3.5+rand()*2.2,bounces:0})}
function updateEffects(dt){
 const fading=1-smooth(.88,.985,damage);
 for(const s of hitSites){if(s.radius>.14&&damage<.99){s.emission+=dt*3.4*smokeAmount*clamp(s.radius)*fading;while(s.emission>=1){s.emission--;emitPuff(V.add(s.p,V.mul(s.n,-.02)),s.n,0,.8+clamp(s.radius/3));if(embersEnabled&&rand()<.22)emitPuff(s.p,s.n,2,.9)}}}
 for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.age+=dt;if(p.age>p.life){smoke.splice(i,1);continue}p.p[0]+=p.v[0]*dt+dt*.09;p.p[1]+=p.v[1]*dt;p.p[2]+=p.v[2]*dt;p.rotation+=p.spin*dt;if(p.kind===2)p.v[1]-=dt*1.6;else p.v[1]+=dt*.08;}
 for(let i=debris.length-1;i>=0;i--){const p=debris[i];p.age+=dt;if(p.age>p.life){debris.splice(i,1);continue}p.v[1]-=dt*8;for(let j=0;j<3;j++){p.p[j]+=p.v[j]*dt;p.r[j]+=p.spin[j]*dt}const floor=.028+p.size[1]*.23;if(p.p[1]<floor){p.p[1]=floor;p.v[1]=Math.abs(p.v[1])*(p.bounces>1?0:.18);p.v[0]*=.54;p.v[2]*=.54;p.spin=p.spin.map(v=>v*.42);p.bounces++;}}
 stats.particles=smoke.length+debris.length;
}
const smokeUpload=new Float32Array(512*11),debrisUpload=new Float32Array(650*12);
function renderDebris(){let n=0;const ashScale=smooth(.83,1.,damage);if(ashScale>.001){for(const p of ashChips){debrisUpload.set([...p.p,...p.r,...p.s.map(v=>v*ashScale),...p.c],n*12);n++}}
 if(debrisEnabled)for(const p of debris){const f=1-smooth(p.life*.58,p.life,p.age);debrisUpload.set([...p.p,...p.r,...p.size.map(v=>v*f),...p.color],n*12);n++}if(!n)return;
 gl.useProgram(debrisProgram.p);uniform(debrisProgram,'uVP',viewProjection);uniform(debrisProgram,'uSun',sun);gl.bindVertexArray(debrisVAO);gl.bindBuffer(gl.ARRAY_BUFFER,debrisInstanceBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,debrisUpload.subarray(0,n*12));gl.drawArraysInstanced(gl.TRIANGLES,0,debrisVerts.length/6,n);stats.drawCalls++;
}
function renderSmoke(){if(!smokeEnabled||!smoke.length)return;smoke.sort((a,b)=>V.dot(V.sub(b.p,eye),V.sub(b.p,eye))-V.dot(V.sub(a.p,eye),V.sub(a.p,eye)));let n=0;for(const p of smoke){const t=p.age/p.life,fade=smooth(0,.12,t)*(1-smooth(.38,1.,t)),size=p.size*(p.kind===2?1:1+t*(p.kind===1?2.4:2.05));smokeUpload.set([...p.p,size,p.alpha*fade,p.rotation,p.kind,p.phase+p.age,...p.color],n*11);n++}
 gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.useProgram(smokeProgram.p);uniform(smokeProgram,'uVP',viewProjection);uniform(smokeProgram,'uRight',cameraRight);uniform(smokeProgram,'uUp',cameraUp);uniform(smokeProgram,'uResolution',[width,height]);bindTexture(5,gl.TEXTURE_2D,sceneDepth);ui(smokeProgram,'uDepth',5);bindTexture(4,gl.TEXTURE_3D,noiseTex);ui(smokeProgram,'uNoise',4);gl.bindVertexArray(smokeVAO);gl.bindBuffer(gl.ARRAY_BUFFER,smokeInstanceBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,smokeUpload.subarray(0,n*11));gl.drawArraysInstanced(gl.TRIANGLES,0,6,n);stats.drawCalls++;gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
function render(){stats.drawCalls=0;gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);
 if(shadowsEnabled&&shadowDirty){shadowDirty=false;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFBO);gl.viewport(0,0,shadowSize,shadowSize);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);if(damage<.9998){common(depthProgram,0,0,true);draw(mesh)}}
 if(interiorEnabled&&damage>.015&&damage<.9998){
  const key=Array.from(viewProjection).join(',');
  if(openingDirty||key!==intactKey){
   intactKey=key;openingDirty=false;
   // Cache a high-precision depth + binary damage mask of the nearest exterior.
   // No sampler in this pass reads either of its own framebuffer attachments.
   gl.bindFramebuffer(gl.FRAMEBUFFER,intactFBO);gl.viewport(0,0,width,height);
   gl.clearDepth(1);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   common(openingProgram,0,0,true);uniform(openingProgram,'uVP',viewProjection);draw(mesh);
  }
 }
 gl.bindFramebuffer(gl.FRAMEBUFFER,mainFBO);gl.viewport(0,0,width,height);gl.clearColor(.5,.55,.48,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.bindVertexArray(null);gl.useProgram(skyProgram.p);gl.drawArrays(gl.TRIANGLES,0,3);stats.drawCalls++;gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
 common(mainProgram,1);draw(ground);
 if(damage>.23){common(mainProgram,2);draw(ash)}
 if(damage<.9998){
  // Opaque exterior establishes real scene depth before the auxiliary interior.
  common(mainProgram,0);draw(mesh);
  if(interiorEnabled&&damage>.015){gl.depthFunc(gl.LESS);common(mainProgram,0,1);draw(mesh);gl.depthFunc(gl.LEQUAL)}
 }
 renderDebris();
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.bindVertexArray(null);gl.useProgram(finalProgram.p);bindTexture(6,gl.TEXTURE_2D,colorTexture);ui(finalProgram,'uColor',6);uniform(finalProgram,'uResolution',[width,height]);gl.drawArrays(gl.TRIANGLES,0,3);stats.drawCalls++;renderSmoke();gl.depthMask(true);gl.bindVertexArray(null);
}
function stages(){
 if(damage<.005)return['Intacto','01 / EDIFICIO INTACTO','#a3bba0'];
 if(damage<.20)return['Primeros impactos','02 / PRIMEROS IMPACTOS','#cbca9a'];
 if(damage<.52)return['Daño localizado','03 / DAÑO LOCALIZADO','#dfc27e'];
 if(damage<COLLAPSE_THRESHOLD)return['Daño severo','04 / PÉRDIDA DE ESTRUCTURA','#e7ad75'];
 if(damage<.9998)return['Colapso inevitable','05 / COLAPSO IRREVERSIBLE','#edac8c'];
 return['Cenizas','06 / DESTRUCCIÓN TOTAL','#a3ada1'];
}
function updateUI(force=false){
 const val=Math.round(damage*1000)/10;if(!force&&lastUI===val)return;lastUI=val;
 $('damageValue').textContent=Math.round(val);$('damage').value=val;$('damage').style.setProperty('--pct',val+'%');
 const s=stages();$('stateText').textContent=s[0];$('stateText').style.color=s[2];$('stageChip').textContent=s[1];
 $('hit').disabled=!ready||damage>=.9998;$('hitMobile').disabled=!ready||damage>=.9998;
 $('collapse').disabled=!ready||collapsing||damage>=.9998;
 $('damage').disabled=!ready||collapsing;$('duration').disabled=!ready||collapsing;$('newPattern').disabled=!ready||collapsing;$('reset').disabled=!ready;
 $('buildingSelect').disabled=collapsing||!ready;
 for(const b of document.querySelectorAll('[data-stage]'))b.disabled=!ready||collapsing;
 $('play').disabled=!ready||collapsing;
 $('playText').textContent=collapsing?'Colapso inevitable…':playing?'Pausar destrucción':damage>=.9998?'Volver a reproducir':'Reproducir destrucción';
 $('playIcon').textContent=collapsing?'▼':playing?'Ⅱ':'▶';$('play').setAttribute('aria-pressed',String(playing||collapsing));
 $('collapseNotice').hidden=!collapsing;
 $('damage').setAttribute('aria-valuetext',Math.round(val)+' por ciento'+(collapsing?', colapso automático en curso':''));
}
/* Low-level value update. Only the collapse clock may write to it after the latch
   fires. Slider input, taps and playback all enter through setDamage(). */
function applyDamage(value,fx=true){
 const previous=damage;damage=clamp(value);
 if(previous!==damage){shadowDirty=true;openingDirty=true;}
 if(damage<previous-.01){smoke.length=0;debris.length=0;destructionAt=-100;lastHitStage=-1;for(const s of hitSites)s.emission=0;}
 updateHoles();
 if(fx){
  const bin=Math.floor(damage/.047);
  if(damage>previous&&bin!==lastHitStage&&damage>.07&&damage<.79){lastHitStage=bin;
   const candidates=hitSites.filter(s=>s.radius>.15);
   if(candidates.length){const s=candidates[(bin*3)%candidates.length];if(smokeEnabled){emitPuff(s.p,s.n,1,.65);emitPuff(s.p,s.n,0,.8);}if(debrisEnabled)for(let i=0;i<5;i++)emitDebris(s.p,s.n);}
  }
  if(previous<.969&&damage>=.969){destructionAt=time;burst([0,.9,0],[0,1,0],1.6,true);}
 }
 if(damage>=.9998){damage=1;playing=false;}
 updateUI(true);
}
function startCollapse(announce=true){
 if(collapsing||damage>=.9998)return false;
 playing=false;collapsing=true;collapseElapsed=0;collapseSpeed=1;
 collapseFrom=Math.max(COLLAPSE_THRESHOLD,damage);
 applyDamage(collapseFrom,false);burst([0,3.3,0],[0,1,0],1.1,true);
 updateUI(true);if(announce)toast('Umbral superado: el colapso terminará automáticamente.');return true;
}
function setDamage(value,fx=true){
 value=Number(value);if(!Number.isFinite(value))return false;
 // No pause, slider rewind or subsequent attack can cancel a latched collapse.
 // Reset is the sole explicit reconstruction action while it is in progress.
 if(collapsing){updateUI(true);return false;}
 value=clamp(value);
 if(damage>=.9998&&value<.9998){reset(false);}
 if(value>=COLLAPSE_THRESHOLD&&damage<.9998){
  // Even a 0 -> 100% drag must show the collapse, not teleport to ashes.
  applyDamage(COLLAPSE_THRESHOLD,fx);startCollapse();
 }else applyDamage(value,fx);
 return true;
}
function configurePlayback(){
 timelineFrom=damage;elapsed=0;
 timelineDuration=Math.max(.10,(duration-COLLAPSE_SECONDS)*(COLLAPSE_THRESHOLD-damage)/COLLAPSE_THRESHOLD);
}
function play(){
 if(collapsing)return false;
 if(damage>=.9998)reset(false);
 if(damage>=COLLAPSE_THRESHOLD)return startCollapse();
 playing=true;configurePlayback();updateUI(true);return true;
}
function pause(){if(collapsing)return false;playing=false;updateUI(true);return true;}
function reset(show=true){
 playing=false;collapsing=false;collapseElapsed=0;collapseFrom=COLLAPSE_THRESHOLD;collapseSpeed=1;
 damage=0;elapsed=0;lastHitStage=-1;destructionAt=-100;hitPulse=0;shadowDirty=true;openingDirty=true;intactKey='';
 smoke.length=0;debris.length=0;resetSites();updateUI(true);if(show)toast(activeBuilding.name+' · reconstrucción completada');
}
function stepCollapse(dt){
 if(!collapsing)return;
 collapseElapsed+=dt*collapseSpeed;
 const progress=clamp(collapseElapsed/COLLAPSE_SECONDS);
 applyDamage(mix(collapseFrom,1,progress),true);
 if(progress>=1||damage>=.9998){
  damage=1;collapsing=false;playing=false;collapseElapsed=COLLAPSE_SECONDS;updateHoles();updateUI(true);
  toast('Destrucción total · solo quedan cenizas');
 }
}
function advanceSimulation(dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 time+=dt;
 if(collapsing)stepCollapse(dt);
 else if(playing){
  const untilCollapse=Math.max(0,timelineDuration-elapsed),used=Math.min(dt,untilCollapse);
  elapsed+=used;applyDamage(mix(timelineFrom,COLLAPSE_THRESHOLD,clamp(elapsed/Math.max(.001,timelineDuration))),true);
  if(elapsed>=timelineDuration-1e-8){startCollapse(false);stepCollapse(Math.max(0,dt-used));}
 }
 for(let remaining=dt;remaining>1e-7;){const sub=Math.min(1/30,remaining);updateEffects(sub);remaining-=sub;}
}
function manualImpact(p,n){
 if(damage>=.9998)return false;
 if(collapsing){
  // An extra tap is still accepted: it throws debris and hastens the ongoing
  // animation instead of refusing input or removing the entire mesh in one frame.
  burst(p,n,.8);hitPulse=1;collapseSpeed=Math.min(2.2,collapseSpeed+.35);
  toast('Impacto final · el edificio sigue derrumbándose');return true;
 }
 playing=false;let nearest=null,distance=Infinity;
 for(const s of hitSites){const d=V.len(V.sub(p,s.p));if(d<Math.max(.8,s.radius*.85)&&d<distance&&s.radius>.02){nearest=s;distance=d;}}
 if(nearest){nearest.maxRadius=Math.min(3.8,nearest.maxRadius+.28);nearest.birth=Math.min(nearest.birth,damage-.03);}
 else{let slot=hitSites.findIndex(s=>s.radius<.02);if(slot<0)slot=hitSites.reduce((m,s,i)=>s.radius<hitSites[m].radius?i:m,0);
  hitSites[slot]={p:[...p],n:[...n],birth:damage-.025,maxRadius:2.5,manual:true,minRadius:.45,emission:0,lastRadius:0};
 }
 setDamage(damage+.075,false);burst(p,n,1);hitPulse=1;
 if(!collapsing)toast(nearest?'Impacto: el agujero se amplía':'Impacto localizado');return true;
}
function randomImpact(){
 if(damage>=.9998)return false;
 cameraUpdate(0);const h=1-smooth(COLLAPSE_THRESHOLD,1,damage)*.78;
 for(let i=0;i<18;i++){
  const target=[(rand()-.5)*4,(1.4+rand()*4.3)*h,(rand()-.5)*3],dir=V.norm(V.sub(target,eye));
  const hit=raycast(eye,dir,true)||raycast(eye,dir,false);if(hit)return manualImpact(hit.p,hit.n);
 }
 const s=hitSites.find(s=>s.radius>.1)||hitSites[0];return manualImpact([s.p[0],s.p[1]*h,s.p[2]],s.n);
}
function refreshBuildingUI(){
 $('buildingName').textContent=activeBuilding.name;
 $('buildingThumbnail').src=activeBuilding.preview;
 $('buildingThumbnail').alt=activeBuilding.previewKind==='pending'?'Imagen pendiente de '+activeBuilding.name:'Render de referencia de '+activeBuilding.name;
 $('buildingThumbnail').title=activeBuilding.previewKind==='pending'?'Nombre e imagen definitivos pendientes':activeBuilding.name;
 $('wallRepair').disabled=!activeBuilding.repairPlaster;
 $('wallRepair').checked=activeBuilding.repairPlaster&&repairStrength>0;
 $('wallRepairHint').textContent=activeBuilding.repairPlaster?'Solo normales de iluminación. Geometría, UV y texturas originales intactas.':'Este edificio utiliza sus normales originales. La corrección de paredes está configurada para Casa Suajili.';
 $('buildingSelect').value=activeBuilding.id;
 $('buildingCount').textContent=BUILDINGS.length===1?'1 edificio disponible':BUILDINGS.length+' edificios disponibles';
 document.title='BIOMA · '+activeBuilding.name+' · Destrucción v1.5';
}
async function selectBuilding(id){
 const building=BUILDINGS.find(b=>b.id===id);
 if(!building||collapsing||!ready){$('buildingSelect').value=activeBuilding.id;return false;}
 if(building===activeBuilding){refreshBuildingUI();return true;}
 ready=false;stats.ready=false;playing=false;smoke.length=0;debris.length=0;updateUI(true);showModelLoading(building);loadProgress(0,'Cargando '+building.name+' desde este HTML…');
 try{
  await loadBuildingModel(building);activeBuilding=building;seed=building.seed||57021;
  ready=true;stats.ready=true;refreshBuildingUI();reset(false);resetAshChips();frameBuilding();cameraUpdate(0);render();lastTime=0;loadProgress(100,building.name+' listo · 0 % de daño');hideModelLoading();toast(building.name+' · listo para destruir');return true;
 }catch(error){fail(error);return false;}
}
$('play').onclick=()=>playing?pause():play();$('reset').onclick=()=>reset();
$('damage').oninput=e=>{const requested=+e.target.value/100;pause();setDamage(requested,false);};
for(const b of document.querySelectorAll('[data-stage]'))b.onclick=()=>{pause();setDamage(+b.dataset.stage/100,true);};
$('duration').oninput=e=>{duration=+e.target.value;$('durationValue').textContent=duration+' s';e.target.style.setProperty('--pct',((duration-8)/52*100)+'%');if(playing)configurePlayback();};
$('hit').onclick=randomImpact;$('hitMobile').onclick=randomImpact;
$('collapse').onclick=()=>{if(damage<.9998&&!collapsing){applyDamage(COLLAPSE_THRESHOLD,false);startCollapse();}};
$('smoke').onchange=e=>{smokeEnabled=e.target.checked;if(!smokeEnabled)smoke.length=0;};
$('debris').onchange=e=>{debrisEnabled=e.target.checked;if(!debrisEnabled)debris.length=0;};
$('interior').onchange=e=>interiorEnabled=e.target.checked;
$('shadows').onchange=e=>{shadowsEnabled=e.target.checked;shadowDirty=true;};
$('embers').onchange=e=>embersEnabled=e.target.checked;
$('wallRepair').onchange=e=>{repairStrength=e.target.checked?1:0;};
$('smokeAmount').oninput=e=>{smokeAmount=+e.target.value/100;$('smokeValue').textContent=e.target.value+' %';e.target.style.setProperty('--pct',((+e.target.value-10)/90*100)+'%');};
$('quality').onchange=e=>{quality=e.target.value;makeShadow();resize();};
$('newPattern').onclick=()=>{if(collapsing)return;seed=(seed+9719)|0;reset(false);toast('Nueva distribución preparada');};
$('buildingSelect').onchange=e=>selectBuilding(e.target.value);
function frameBuilding(){
 const sx=bounds.max[0]-bounds.min[0],sy=bounds.max[1]-bounds.min[1],sz=bounds.max[2]-bounds.min[2];
 camTheta=.61;camPhi=1.10;camDistance=19.6*Math.max(1,sx/8.82395076751709,sy/8,sz/7.824930191040039);camTarget=[0,sy*.3875,0];
}
$('home').onclick=frameBuilding;
$('rotate').onclick=()=>{autoRotate=!autoRotate;$('rotate').setAttribute('aria-pressed',String(autoRotate));$('rotate').style.color=autoRotate?'#edb96c':'';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){toast('El navegador no permite pantalla completa en esta vista.');}};
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();playing?pause():play();}if(e.code==='KeyR')reset();});
refreshBuildingUI();frameBuilding();

let pointers=new Map(),tapStart=null,gesture=null;
function pointerValues(){return Array.from(pointers.values())}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});if(pointers.size===1)tapStart={x:e.clientX,y:e.clientY,time:performance.now(),moved:false,button:e.button};if(pointers.size>1){if(tapStart)tapStart.moved=true;const p=pointerValues();gesture={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});if(tapStart&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>5)tapStart.moved=true;
 if(pointers.size>1){const p=pointerValues(),d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),x=(p[0].x+p[1].x)/2,y=(p[0].y+p[1].y)/2;if(gesture){camDistance=clamp(camDistance*gesture.distance/Math.max(d,1),7,36);const pan=camDistance*.0010;camTarget=V.add(camTarget,V.add(V.mul(cameraRight,-(x-gesture.x)*pan),V.mul(cameraUp,(y-gesture.y)*pan)));camTarget[1]=clamp(camTarget[1],.1,6)}gesture={distance:d,x,y};
 }else if(old.button===2||e.shiftKey){const pan=camDistance*.0015;camTarget=V.add(camTarget,V.add(V.mul(cameraRight,-dx*pan),V.mul(cameraUp,dy*pan)));camTarget[1]=clamp(camTarget[1],.1,7)}else{camTheta-=dx*.007;camPhi=clamp(camPhi-dy*.006,.23,1.49)}
});
function endPointer(e){
 const active=pointers.has(e.pointerId);pointers.delete(e.pointerId);
 if(active&&tapStart&&!tapStart.moved&&tapStart.button===0&&performance.now()-tapStart.time<600&&$('clickDamage').checked&&ready&&damage<.9998){
  cameraUpdate(0);const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1,y=1-(e.clientY-rect.top)/rect.height*2;
  const a=M.point(invVP,[x,y,-1]),b=M.point(invVP,[x,y,1]),dir=V.norm(V.sub(b,a));
  // A hit through an existing hole can enlarge that break; the eight focus slots
  // are reused, never used as a cap on damage or on the number of attacks.
  const hit=raycast(a,dir,true)||raycast(a,dir,false);if(hit)manualImpact(hit.p,hit.n);
 }
 if(pointers.size===0){tapStart=null;gesture=null;}else if(tapStart)tapStart.moved=true;
}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);tapStart=null;gesture=null});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();camDistance=clamp(camDistance*Math.exp(e.deltaY*.001),7,36)},{passive:false});
// Small public inspection API. advance() steps the SAME simulation as live frames.
window.BIOMA={
 get ready(){return ready;},
 get state(){return{damage,playing,collapsing,time,quality,building:activeBuilding.id,buildingName:activeBuilding.name,wallRepair:!!(repairStrength&&activeBuilding.repairPlaster),wallRepairAvailable:!!activeBuilding.repairPlaster,collapse:{threshold:COLLAPSE_THRESHOLD,duration:COLLAPSE_SECONDS,progress:clamp(collapseElapsed/COLLAPSE_SECONDS),speed:collapseSpeed},smoke:smoke.length,debris:debris.length,sites:hitSites.map(s=>({p:s.p,radius:s.radius})),bounds,stats:{...stats},camera:{theta:camTheta,phi:camPhi,distance:camDistance,target:[...camTarget]}};},
 setDamage(value,fx=false){pause();return setDamage(value,fx);},play,pause,reset,impact:randomImpact,selectBuilding,
 get buildings(){return BUILDINGS.map(({id,name})=>({id,name}));},
 setCamera(theta,phi=1.10,distance=19.6){if(![theta,phi,distance].every(Number.isFinite))return;camTheta=theta;camPhi=clamp(phi,.23,1.49);camDistance=clamp(distance,7,36);cameraUpdate(0);},
 setWallRepair(enabled){$('wallRepair').checked=!!enabled;$('wallRepair').dispatchEvent(new Event('change'));},
 setEffects(options){for(const [key,id]of Object.entries({smoke:'smoke',debris:'debris',interior:'interior',shadows:'shadows',embers:'embers'}))if(options[key]!==undefined){$(id).checked=!!options[key];$(id).dispatchEvent(new Event('change'));}},
 render(){cameraUpdate(0);render();},
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0||seconds>120)return false;for(let t=0;t<seconds;t+=1/60)advanceSimulation(Math.min(1/60,seconds-t));cameraUpdate(0);render();return true;},
 project(p){cameraUpdate(0);const q=M.point(viewProjection,p),r=canvas.getBoundingClientRect();return{x:r.left+(q[0]*.5+.5)*r.width,y:r.top+(1-(q[1]*.5+.5))*r.height};},
 getGLError(){return gl.getError();},raycast,version:'1.6.6'
};
function frame(now){try{
 const rawDt=Math.max(0,(now-(lastTime||now))/1000),dt=Math.min(1,rawDt);lastTime=now;
 if(ready){advanceSimulation(dt);cameraUpdate(dt);render();stats.frames++;fpsAcc+=rawDt;fpsFrames++;
  if(fpsAcc>.7){stats.fps=Math.round(fpsFrames/fpsAcc);$('fps').textContent=stats.fps;fpsAcc=0;fpsFrames=0;}
 }
 requestAnimationFrame(frame);
}catch(error){fail(error);}}
document.addEventListener('visibilitychange',()=>{lastTime=0});
loadProgress(96,'Preparando las sombras, los recortes y las partículas…');cameraUpdate(0);render();const error=gl.getError();if(error!==gl.NO_ERROR)console.warn('GL init code:',error);ready=true;stats.ready=true;updateUI(true);loadProgress(100,'Todo listo. Arrastra para girar o pulsa Reproducir.');requestAnimationFrame(frame);setTimeout(hideModelLoading,140);
}catch(err){fail(err)}
})();

