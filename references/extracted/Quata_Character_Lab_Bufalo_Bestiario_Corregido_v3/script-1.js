

/* Quata Atelier — small dependency-free WebGL2 renderer.
   Meshy geometry is imported; accessories and additional actions are generated locally. */
'use strict';
const TAU=Math.PI*2, PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{let t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),norm:a=>{let d=Math.hypot(...a)||1;return a.map(v=>v/d)},lerp:(a,b,t)=>a.map((v,i)=>mix(v,b[i],t))};
const Q={
 euler:(x=0,y=0,z=0)=>{let a=Math.cos(x/2),b=Math.sin(x/2),c=Math.cos(y/2),d=Math.sin(y/2),e=Math.cos(z/2),f=Math.sin(z/2);return[b*c*e+a*d*f,a*d*e-b*c*f,a*c*f+b*d*e,a*c*e-b*d*f]},
 mul:(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]],
 inv:q=>[-q[0],-q[1],-q[2],q[3]],
 fromTo:(a,b)=>{let d=V.dot(a,b); if(d<-.99999){let ax=V.norm(V.cross(a,Math.abs(a[0])<.9?[1,0,0]:[0,1,0]));return[...ax,0]}let c=V.cross(a,b),s=Math.sqrt((1+d)*2);return[c[0]/s,c[1]/s,c[2]/s,s/2]},
 slerp:(a,b,t)=>{let d=a.reduce((s,v,i)=>s+v*b[i],0);if(d<0){b=b.map(v=>-v);d=-d}if(d>.9995){let q=a.map((v,i)=>mix(v,b[i],t));let n=Math.hypot(...q);return q.map(v=>v/n)}let angle=Math.acos(clamp(d,-1,1)),s=Math.sin(angle),u=Math.sin((1-t)*angle)/s,v=Math.sin(t*angle)/s;return a.map((e,i)=>e*u+b[i]*v)},
 rotate:(q,v)=>{let u=[q[0],q[1],q[2]],uv=V.cross(u,v),uuv=V.cross(u,uv);return V.add(v,V.add(V.mul(uv,2*q[3]),V.mul(uuv,2)))}
};
const M={
 id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul:(a,b)=>{let o=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)o[j*4+i]=a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3];return o},
 compose:(p,q,s=[1,1,1])=>{let[x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;return new Float32Array([(1-yy-zz)*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-xx-zz)*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-xx-yy)*s[2],0,...p,1])},
 point:(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]],
 dir:(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2],m[1]*v[0]+m[5]*v[1]+m[9]*v[2],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]],
 inv:(a)=>{let t=Array.from({length:4},(_,i)=>Array.from({length:8},(_,j)=>j<4?a[j*4+i]:(j-4===i?1:0)));for(let i=0;i<4;i++){let p=i;for(let k=i+1;k<4;k++)if(Math.abs(t[k][i])>Math.abs(t[p][i]))p=k;[t[p],t[i]]=[t[i],t[p]];let d=t[i][i]||1e-20;for(let j=0;j<8;j++)t[i][j]/=d;for(let k=0;k<4;k++)if(k!==i){let f=t[k][i];for(let j=0;j<8;j++)t[k][j]-=f*t[i][j]}}let out=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++)out[j*4+i]=t[i][j+4];return out},
 perspective:(fov,aspect,near,far)=>{let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])},
 ortho:(l,r,b,t,n,f)=>new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]),
 lookAt:(eye,tar,up=[0,1,0])=>{let z=V.norm(V.sub(eye,tar)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},
 normal:(m)=>{let a=M.inv(m);return new Float32Array([a[0],a[4],a[8],a[1],a[5],a[9],a[2],a[6],a[10]])}
};
let nodeSeq=0;
class Node{
 constructor(name,parent=null,p=[0,0,0]){this.id=nodeSeq++;this.name=name;this.parent=parent;this.t=[...p];this.q=[0,0,0,1];this.s=[1,1,1];this.children=[];this.meshes=[];this.visible=true;this.world=M.id();this.worldQ=[0,0,0,1];if(parent)parent.children.push(this)}
 rot(x=0,y=0,z=0){this.q=Q.euler(x,y,z);return this}
 update(pw=M.id(),pq=[0,0,0,1],pv=true){this.world=M.mul(pw,M.compose(this.t,this.q,this.s));this.worldQ=Q.mul(pq,this.q);this.show=pv&&this.visible;for(let c of this.children)c.update(this.world,this.worldQ,this.show)}
}
const mats={}, textures=[];
function hex(s){let h=s.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)}
function material(name,color,rough=.7,metal=0,tex=null){let m={name,color:hex(color),rough,metal,tex,alpha:1,double:false};mats[name]=m;return m}
let seed=92871;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function texCanvas(size,paint){let c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);textures.push(c);return c}
function geom(){return{p:[],n:[],uv:[],j:[],w:[],c:[],i:[]}}
function vertex(g,p,n=[0,1,0],uv=[0,0],j=[0,0,0,0],w=[1,0,0,0],c=[1,1,1]){let id=g.p.length/3;g.p.push(...p);g.n.push(...n);g.uv.push(...uv);g.j.push(...j);g.w.push(...w);g.c.push(...c);return id}
function normals(g){g.n=new Array(g.p.length).fill(0);for(let k=0;k<g.i.length;k+=3){let ia=g.i[k]*3,ib=g.i[k+1]*3,ic=g.i[k+2]*3,a=g.p.slice(ia,ia+3),b=g.p.slice(ib,ib+3),c=g.p.slice(ic,ic+3),n=V.cross(V.sub(b,a),V.sub(c,a));for(let id of[ia,ib,ic])for(let d=0;d<3;d++)g.n[id+d]+=n[d]}for(let i=0;i<g.n.length;i+=3){let n=V.norm(g.n.slice(i,i+3));g.n.splice(i,3,...n)}return g}
function surface(fn,U=32,W=18,wrapU=true){let g=geom();for(let v=0;v<=W;v++)for(let u=0;u<=U;u++){let a=u/U,b=v/W,p=fn(a,b),eps=.0001,du=V.sub(fn(a+eps,b),fn(a-eps,b)),dv=V.sub(fn(a,Math.min(1,b+eps)),fn(a,Math.max(0,b-eps))),n=V.norm(V.cross(du,dv));vertex(g,p,n,[a,b])}for(let v=0;v<W;v++)for(let u=0;u<U;u++){let a=v*(U+1)+u,b=a+1,c=a+U+1,d=c+1;g.i.push(a,b,c,b,d,c)}return g}
function sphere(U=24,W=16){return surface((u,v)=>{let a=u*TAU,b=v*PI;return[Math.cos(a)*Math.sin(b),Math.cos(b),Math.sin(a)*Math.sin(b)]},U,W)}
function loft(profile,U=32){let g=geom();for(let k=0;k<profile.length;k++){let[y,rx,rz,cz=0]=profile[k];for(let i=0;i<=U;i++){let a=i/U*TAU;vertex(g,[Math.cos(a)*rx,y,Math.sin(a)*rz+cz],[0,1,0],[i/U,k/(profile.length-1)])}}for(let j=0;j<profile.length-1;j++)for(let i=0;i<U;i++){let a=j*(U+1)+i,b=a+U+1;g.i.push(a,b,a+1,a+1,b,b+1)}normals(g); // Smooth the duplicated seam.
 for(let k=0;k<profile.length;k++){let a=k*(U+1)*3,b=(k*(U+1)+U)*3,n=V.norm(V.add(g.n.slice(a,a+3),g.n.slice(b,b+3)));g.n.splice(a,3,...n);g.n.splice(b,3,...n)}return g}
function roundedBox(w,h,d,r=.025){let g=geom(),half=[w/2,h/2,d/2];r=Math.min(r,...half);for(let axis=0;axis<3;axis++)for(let side of[-1,1]){let A=(axis+1)%3,B=(axis+2)%3,vals=axis=>{let a=half[axis];return[-a,-a+r*.293,-a+r,0,a-r,a-r*.293,a]},va=vals(A),vb=vals(B),start=g.p.length/3;for(let j=0;j<vb.length;j++)for(let i=0;i<va.length;i++){let p=[0,0,0];p[axis]=half[axis]*side;p[A]=va[i];p[B]=vb[j];let center=p.map((v,k)=>clamp(v,-half[k]+r,half[k]-r)),n=V.norm(V.sub(p,center)),pos=V.add(center,V.mul(n,r));vertex(g,pos,n,[i/(va.length-1),j/(vb.length-1)])}for(let j=0;j<vb.length-1;j++)for(let i=0;i<va.length-1;i++){let a=start+j*va.length+i,b=a+1,c=a+va.length,d=c+1;if(side>0)g.i.push(a,b,c,b,d,c);else g.i.push(a,c,b,b,c,d)}}return g}
function cylinder(rt,rb,h,n=20){return loft([[ -h/2,0,0],[-h/2,rb,rb],[h/2,rt,rt],[h/2,0,0]],n)}
function catmull(points,t){let z=clamp(t,0,.999999)*(points.length-1),i=Math.floor(z),f=z-i,p0=points[Math.max(i-1,0)],p1=points[i],p2=points[Math.min(i+1,points.length-1)],p3=points[Math.min(i+2,points.length-1)],f2=f*f,f3=f2*f;return p1.map((v,k)=>.5*((2*v)+(-p0[k]+p2[k])*f+(2*p0[k]-5*v+4*p2[k]-p3[k])*f2+(-p0[k]+3*v-3*p2[k]+p3[k])*f3))}
function tube(points,r=.01,steps=24,sides=7,closed=false){let g=geom();for(let i=0;i<=steps;i++){let t=i/steps,p=catmull(points,t),tan=V.norm(V.sub(catmull(points,Math.min(.999999,t+.001)),catmull(points,Math.max(0,t-.001)))),ref=Math.abs(tan[1])>.94?[1,0,0]:[0,1,0],a=V.norm(V.cross(tan,ref)),b=V.cross(tan,a);let radius=typeof r==='function'?r(t):r;for(let j=0;j<=sides;j++){let an=j/sides*TAU,n=V.add(V.mul(a,Math.cos(an)),V.mul(b,Math.sin(an)));vertex(g,V.add(p,V.mul(n,radius)),n,[j/sides,t])}}for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){let a=i*(sides+1)+j,b=a+sides+1;g.i.push(a,a+1,b,a+1,b+1,b)}return g}
function ring(rx,rz,y,r=.009,n=48){let ps=[];for(let i=0;i<=n+2;i++){let a=i/n*TAU;ps.push([rx*Math.cos(a),y,rz*Math.sin(a)])}return tube(ps,r,n*2,6)}
function patch(points,thick=.012){let g=geom(),N=points.length; // bevel-less polygon, used for cloth panels
 for(let z of[-thick/2,thick/2])for(let p of points)vertex(g,[p[0],p[1],p[2]+z],[0,0,z<0?-1:1],[p[0],p[1]]);
 for(let i=1;i<N-1;i++){g.i.push(0,i+1,i,N,N+i,N+i+1)}for(let i=0;i<N;i++){let j=(i+1)%N;g.i.push(i,j,N+i,j,N+j,N+i)}return normals(g)}
function transformGeom(g,m){let nmat=M.normal(m);for(let i=0;i<g.p.length;i+=3){g.p.splice(i,3,...M.point(m,g.p.slice(i,i+3)));let n=g.n.slice(i,i+3),x=nmat[0]*n[0]+nmat[3]*n[1]+nmat[6]*n[2],y=nmat[1]*n[0]+nmat[4]*n[1]+nmat[7]*n[2],z=nmat[2]*n[0]+nmat[5]*n[1]+nmat[8]*n[2];g.n.splice(i,3,...V.norm([x,y,z]))}return g}
function mergeGeoms(gs){let o=geom();for(let g of gs){let off=o.p.length/3;for(let k of['p','n','uv','j','w','c'])o[k].push(...g[k]);o.i.push(...g.i.map(v=>v+off))}return o}
const meshList=[];
function mesh(node,g,mat,p=[0,0,0],s=[1,1,1],rot=[0,0,0],skin=false){let o={node,g,mat,local:M.compose(p,Q.euler(...rot),s),skinned:skin,cast:true,receive:true,visible:true};node.meshes.push(o);meshList.push(o);return o}
function ell(node,mat,p,s,U=24,W=16){return mesh(node,sphere(U,W),mat,p,s)}
function box(node,mat,p,size,r=.025,rot=[0,0,0]){return mesh(node,roundedBox(...size,r),mat,p,[1,1,1],rot)}
function line(node,mat,pts,r=.009,steps=24,sides=7){return mesh(node,tube(pts,r,steps,sides),mat)}
function batchNode(node){ // Combine static pieces sharing a material and node transform.
 let groups=new Map;for(let o of node.meshes){if(o.skinned||o.noBatch)continue;let a=groups.get(o.mat)||[];a.push(o);groups.set(o.mat,a)}for(let[mat,arr]of groups){if(arr.length<2)continue;let g=mergeGeoms(arr.map(o=>transformGeom(o.g,o.local)));for(let o of arr){o.visible=false;o.batched=true}mesh(node,g,mat)}for(let c of node.children)batchNode(c)}
class Renderer{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.gl)throw new Error('Este navegador no ha podido activar WebGL 2. Abre el archivo en Chrome, Edge, Firefox o Safari con aceleración gráfica.');let gl=this.gl;
 const vs=`#version 300 es
 precision highp float;
 layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aUV;layout(location=3) in vec4 aJ;layout(location=4) in vec4 aW;layout(location=5) in vec3 aC;
 uniform mat4 uModel,uViewProj,uLight;uniform mat3 uNormal;uniform mat4 uBones[64];uniform bool uSkin;
 out vec3 vP,vN,vC;out vec2 vUV;out vec4 vShadow;
 void main(){vec4 p=vec4(aP,1.0);vec3 n=aN;if(uSkin){mat4 sk=uBones[int(aJ.x)]*aW.x+uBones[int(aJ.y)]*aW.y+uBones[int(aJ.z)]*aW.z+uBones[int(aJ.w)]*aW.w;p=sk*p;n=mat3(sk)*n;}else{p=uModel*p;n=uNormal*n;}vP=p.xyz;vN=normalize(n);vUV=aUV;vC=aC;vShadow=uLight*p;gl_Position=uViewProj*p;}`;
 const fs=`#version 300 es
 precision highp float;
 in vec3 vP,vN,vC;in vec2 vUV;in vec4 vShadow;out vec4 frag;
 uniform vec3 uColor,uEye;uniform vec2 uUVScale;uniform float uRough,uMetal,uAlpha;uniform sampler2D uTex,uShadow,uNormalTex,uORMTex; uniform bool uHasNormal,uHasORM; uniform float uDetail;uniform bool uShadowOn,uReceive;uniform int uMode;uniform vec3 uClear;
 const float PI=3.14159265359;
 float shadow(vec3 n){if(!uShadowOn||!uReceive)return 1.;vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.z>1.||p.z<0.||p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 1.;float bias=max(.00025*(1.-dot(n,normalize(vec3(4.,7.,5.)))),.00012),s=0.;vec2 d=1./vec2(textureSize(uShadow,0));for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)s+=p.z-bias>texture(uShadow,p.xy+vec2(float(x),float(y))*d*1.6).r?.0:1.;return s/9.;}
 vec3 shade(vec3 c,vec3 N,vec3 V,vec3 L,vec3 energy,float r,float metal){vec3 H=normalize(V+L);float nl=max(dot(N,L),0.),nv=max(dot(N,V),.001),nh=max(dot(N,H),0.),hv=max(dot(H,V),0.);float a=r*r,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(PI*den*den+.0001);float k=(r+1.)*(r+1.)/8.;float G=nl/(nl*(1.-k)+k)*nv/(nv*(1.-k)+k);vec3 f0=mix(vec3(.04),c,metal),F=f0+(1.-f0)*pow(1.-hv,5.);vec3 spec=D*G*F/(4.*nl*nv+.001);return ((1.-F)*(1.-metal)*c/PI+spec)*energy*nl;}
 vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
 void main(){vec4 t=texture(uTex,vUV*uUVScale);float alpha=t.a*uAlpha;if(alpha<.025)discard;vec3 c=pow(max(uColor*t.rgb*vC,vec3(0.)),vec3(2.2));float rough=uRough,metal=uMetal;vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;
 if(uHasORM){vec3 orm=texture(uORMTex,vUV).rgb;rough=clamp(rough*orm.g,.13,1.);metal=clamp(metal*orm.b,0.,1.);}
 if(uHasNormal && uMode==0){vec3 mapN=texture(uNormalTex,vUV).xyz*2.-1.;mapN.xy*=uDetail;vec3 dp1=dFdx(vP),dp2=dFdy(vP);vec2 duv1=dFdx(vUV),duv2=dFdy(vUV);vec3 dp2perp=cross(dp2,N),dp1perp=cross(N,dp1);vec3 T=dp2perp*duv1.x+dp1perp*duv2.x;vec3 B=dp2perp*duv1.y+dp1perp*duv2.y;float imax=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-10));N=normalize(mat3(T*imax,B*imax,N)*mapN);}

 if(uMode==1||uMode==2){c=pow(vec3(.66,.71,.63),vec3(2.2));rough=.85;metal=0.;}
 if(uMode==3){frag=vec4(.07,.19,.16,1.);return;}
 vec3 V=normalize(uEye-vP);float sh=shadow(N);vec3 ambient=mix(vec3(.28,.22,.18),vec3(.72,.78,.83),N.y*.5+.5)*c*.64;
 vec3 col=ambient+shade(c,N,V,normalize(vec3(-3.,6.,5.)),vec3(3.35,3.15,2.88)*(mix(.30,1.,sh)),rough,metal)+shade(c,N,V,normalize(vec3(4.,3.,3.)),vec3(.75,.90,1.08),rough,metal)+shade(c,N,V,normalize(vec3(1.,4.,-4.)),vec3(1.85,1.65,1.3),rough,metal);
 col=pow(aces(col),vec3(1./2.2));float fog=smoothstep(11.,30.,distance(vP,uEye));col=mix(col,uClear,fog);frag=vec4(col,alpha);}`;
 const depthVs=`#version 300 es
 precision highp float;layout(location=0) in vec3 aP;layout(location=3)in vec4 aJ;layout(location=4)in vec4 aW;uniform mat4 uModel,uViewProj;uniform mat4 uBones[64];uniform bool uSkin;void main(){vec4 p=vec4(aP,1.);if(uSkin){p=(uBones[int(aJ.x)]*aW.x+uBones[int(aJ.y)]*aW.y+uBones[int(aJ.z)]*aW.z+uBones[int(aJ.w)]*aW.w)*p;}else p=uModel*p;gl_Position=uViewProj*p;}`;
 const depthFs=`#version 300 es
 precision highp float;void main(){}`;
 this.main=this.program(vs,fs);this.depth=this.program(depthVs,depthFs);this.clear=hex('#eee9dd');this.light=M.mul(M.ortho(-4,4,-4,4,.1,18),M.lookAt([-3,7,5],[0,1.2,0]));
 this.depthTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.depthTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1024,1024,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.depthTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('El dispositivo no permite crear el mapa de sombras WebGL.');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 this.white=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.white);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);this.texMap=new Map;gl.enable(gl.DEPTH_TEST);this.calls=0;
 }
 program(vs,fs){let gl=this.gl,sh=(src,type)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s},p=gl.createProgram();gl.attachShader(p,sh(vs,gl.VERTEX_SHADER));gl.attachShader(p,sh(fs,gl.FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return{p,u:new Proxy({},{get:(o,k)=>o[k]??(o[k]=gl.getUniformLocation(p,k))})}}
 upload(g){if(g.gpu)return g.gpu;let gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);let n=g.p.length/3,a=new Float32Array(n*19);for(let i=0;i<n;i++){let off=i*19;a.set(g.p.slice(i*3,i*3+3),off);a.set(g.n.slice(i*3,i*3+3),off+3);a.set(g.uv.slice(i*2,i*2+2),off+6);a.set(g.j.slice(i*4,i*4+4),off+8);a.set(g.w.slice(i*4,i*4+4),off+12);a.set(g.c.slice(i*3,i*3+3),off+16)}let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);for(let[loc,len,off]of[[0,3,0],[1,3,3],[2,2,6],[3,4,8],[4,4,12],[5,3,16]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,len,gl.FLOAT,false,76,off*4)}let idx=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idx);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(g.i),gl.STATIC_DRAW);gl.bindVertexArray(null);g.gpu={vao,count:g.i.length,idx};return g.gpu}
 texture(canvas){if(!canvas)return this.white;if(this.texMap.has(canvas))return this.texMap.get(canvas);let gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,canvas.flipY!==false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);this.texMap.set(canvas,t);return t}
 drawObject(o,pr,wire=false){let gl=this.gl,gpu=this.upload(o.g),model=o.skinned?M.id():M.mul(o.node.world,o.local);gl.uniformMatrix4fv(pr.u.uModel,false,model);gl.uniform1i(pr.u.uSkin,o.skinned?1:0);if(pr===this.main){let m=o.mat;gl.uniformMatrix3fv(pr.u.uNormal,false,M.normal(model));gl.uniform3fv(pr.u.uColor,m.color);gl.uniform1f(pr.u.uRough,m.rough);gl.uniform1f(pr.u.uMetal,m.metal);gl.uniform1f(pr.u.uAlpha,m.alpha);gl.uniform2fv(pr.u.uUVScale,m.uvScale||[1,1]);gl.uniform1i(pr.u.uReceive,o.receive?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture(m.tex));gl.uniform1i(pr.u.uTex,0);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.texture(m.normalTex));gl.uniform1i(pr.u.uNormalTex,2);gl.uniform1i(pr.u.uHasNormal,!!m.normalTex);
 gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.texture(m.ormTex));gl.uniform1i(pr.u.uORMTex,3);gl.uniform1i(pr.u.uHasORM,!!m.ormTex);
 if(m.alpha<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}else{gl.disable(gl.BLEND);gl.depthMask(true)}}
 gl.bindVertexArray(gpu.vao);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gpu.idx);
 if(wire){if(!gpu.edge){let ids=[];for(let i=0;i<o.g.i.length;i+=3){let[a,b,c]=o.g.i.slice(i,i+3);ids.push(a,b,b,c,c,a)}gpu.edge=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gpu.edge);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(ids),gl.STATIC_DRAW);gpu.edges=ids.length}else gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gpu.edge);gl.drawElements(gl.LINES,gpu.edges,gl.UNSIGNED_INT,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gpu.idx)}else gl.drawElements(gl.TRIANGLES,gpu.count,gl.UNSIGNED_INT,0);this.calls++;
 }
 render(viewProj,eye,palette,opts={}){let gl=this.gl;this.calls=0;let list=meshList.filter(o=>o.visible&&!o.batched&&o.node.show&&(o.node.s[0]!==0));
 if(opts.shadows!==false){gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.viewport(0,0,1024,1024);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.depth.p);gl.uniformMatrix4fv(this.depth.u.uViewProj,false,this.light);gl.uniformMatrix4fv(this.depth.u['uBones[0]'],false,palette);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,2);gl.disable(gl.BLEND);gl.depthMask(true);for(let o of list)if(o.cast&&o.mat.alpha>=1)this.drawObject(o,this.depth);gl.disable(gl.POLYGON_OFFSET_FILL)}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(...this.clear,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.main.p);gl.uniformMatrix4fv(this.main.u.uViewProj,false,viewProj);gl.uniformMatrix4fv(this.main.u.uLight,false,this.light);gl.uniformMatrix4fv(this.main.u['uBones[0]'],false,palette);gl.uniform3fv(this.main.u.uEye,eye);gl.uniform3fv(this.main.u.uClear,this.clear);gl.uniform1f(this.main.u.uDetail,opts.detail??.6);gl.uniform1i(this.main.u.uShadowOn,opts.shadows!==false?1:0);gl.uniform1i(this.main.u.uMode,opts.mode==='clay'||opts.mode==='wire'?1:0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.depthTex);gl.uniform1i(this.main.u.uShadow,1);
 for(let o of list)if(o.mat.alpha>=1){gl.uniform1i(this.main.u.uMode,o.node.character&&(opts.mode==='clay'||opts.mode==='wire')?1:0);this.drawObject(o,this.main)}for(let o of list)if(o.mat.alpha<1){gl.uniform1i(this.main.u.uMode,0);this.drawObject(o,this.main)}
 if(opts.mode==='wire'){gl.uniform1i(this.main.u.uMode,3);gl.depthFunc(gl.LEQUAL);for(let o of list)if(o.node.character)this.drawObject(o,this.main,true);gl.depthFunc(gl.LESS)}gl.depthMask(true);gl.bindVertexArray(null);
 }
}


/* Minimal embedded glTF 2.0 reader. Plain GLB meshes, skins and TRS animation.
   Deliberately rejects compressed geometry rather than silently misreading it. */
const sceneRoot=new Node('Scene'), avatar=new Node('CharacterRoot',sceneRoot), env=new Node('Studio',sceneRoot);
let modelRoot=null, modelNodes=[], bones=[], importedClips={}, sourceGLB=null, sourceDoc=null, sourceBytes=null;
let basePose=new Map(), charMeshes=[];
function decodeBase64(text){const s=atob(text.trim());const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer;}
function parseGLB(buffer){const d=new DataView(buffer);if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2)throw Error('El archivo no es un GLB 2.0 válido.');let j,bin;for(let off=12;off<buffer.byteLength;){const n=d.getUint32(off,true),type=d.getUint32(off+4,true);if(type===0x4e4f534a)j=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,off+8,n)));if(type===0x004e4942)bin=buffer.slice(off+8,off+8+n);off+=8+n;}if(!j||!bin)throw Error('GLB incompleto.');return {j,bin};}
function readAccessor(j,bin,id){const a=j.accessors[id],v=j.bufferViews[a.bufferView];if(a.sparse)throw Error('Accessor sparse no admitido en este visor.');const types={5120:[Int8Array,1,'getInt8'],5121:[Uint8Array,1,'getUint8'],5122:[Int16Array,2,'getInt16'],5123:[Uint16Array,2,'getUint16'],5125:[Uint32Array,4,'getUint32'],5126:[Float32Array,4,'getFloat32']},[Type,bytes,get]=types[a.componentType],dim={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];const offset=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||dim*bytes;
 const out=new Float32Array(a.count*dim),dv=new DataView(bin);for(let i=0;i<a.count;i++)for(let k=0;k<dim;k++){let value=dv[get](offset+i*stride+k*bytes,true);if(a.normalized)value=a.componentType===5121?value/255:a.componentType===5123?value/65535:a.componentType===5120?Math.max(value/127,-1):a.componentType===5122?Math.max(value/32767,-1):value;out[i*dim+k]=value;}return out;}
function imageFromBlob(blob){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),im=new Image;im.onload=()=>{URL.revokeObjectURL(url);im.flipY=false;resolve(im)};im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo cargar una textura integrada.'))};im.src=url;});}
async function loadCharacter(buffer){const {j,bin}=parseGLB(buffer);if((j.extensionsRequired||[]).some(x=>/draco|meshopt/i.test(x)))throw Error('Este visor requiere GLB sin compresión Draco/meshopt.');
 if(!j.skins?.length||j.skins[0].joints.length>64)throw Error('Se requiere un esqueleto de entre 1 y 64 articulaciones.');
 const images=await Promise.all((j.images||[]).map(im=>{if(im.bufferView===undefined)throw Error('Las texturas deben estar dentro del GLB.');const v=j.bufferViews[im.bufferView];return imageFromBlob(new Blob([bin.slice(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)],{type:im.mimeType}));}));
 // Parse before replacing the currently loaded model.
 const temp=new Node('Meshy_Character');const nodes=j.nodes.map((nd,i)=>{if(nd.matrix)throw Error('Este importador espera nodos TRS, no matrices de nodo.');let n=new Node(nd.name||'node_'+i);n.sourceIndex=i;n.t=(nd.translation||[0,0,0]).slice();n.q=(nd.rotation||[0,0,0,1]).slice();n.s=(nd.scale||[1,1,1]).slice();n.character=true;return n;});
 for(let i=0;i<j.nodes.length;i++)for(const c of j.nodes[i].children||[]){nodes[i].children.push(nodes[c]);nodes[c].parent=nodes[i];}
 for(const n of nodes)if(!n.parent){n.parent=temp;temp.children.push(n);}
 const skin=j.skins[0],ib=readAccessor(j,bin,skin.inverseBindMatrices);const newBones=skin.joints.map((id,i)=>{const n=nodes[id];n.isBone=true;n.boneId=i;n.inverseBind=ib.slice(i*16,i*16+16);return n;});
 const matsGL=(j.materials||[]).map((gm,i)=>{const p=gm.pbrMetallicRoughness||{},c=p.baseColorFactor||[1,1,1,1],t=(slot)=>slot?images[j.textures[slot.index].source]:null;const m=material('Meshy_'+i,'#ffffff',p.roughnessFactor??1,p.metallicFactor??1,t(p.baseColorTexture));m.color=c.slice(0,3).map(x=>Math.pow(x,1/2.2));m.alpha=c[3];m.normalTex=t(gm.normalTexture);m.ormTex=t(p.metallicRoughnessTexture);return m;});
 const primitiveData=[];for(let i=0;i<j.nodes.length;i++)if(j.nodes[i].mesh!==undefined)for(const prim of j.meshes[j.nodes[i].mesh].primitives){if(prim.mode!==undefined&&prim.mode!==4)throw Error('Solo mallas triangulares.');const at=prim.attributes,g=geom();g.p=Array.from(readAccessor(j,bin,at.POSITION));g.n=at.NORMAL!==undefined?Array.from(readAccessor(j,bin,at.NORMAL)):new Array(g.p.length).fill(0);g.uv=at.TEXCOORD_0!==undefined?Array.from(readAccessor(j,bin,at.TEXCOORD_0)):new Array(g.p.length/3*2).fill(0);g.j=at.JOINTS_0!==undefined?Array.from(readAccessor(j,bin,at.JOINTS_0)):new Array(g.p.length/3*4).fill(0);g.w=at.WEIGHTS_0!==undefined?Array.from(readAccessor(j,bin,at.WEIGHTS_0)):Array.from({length:g.p.length/3*4},(_,k)=>k%4===0?1:0);g.c=new Array(g.p.length).fill(1);g.i=prim.indices!==undefined?Array.from(readAccessor(j,bin,prim.indices)):Array.from({length:g.p.length/3},(_,k)=>k);primitiveData.push({i,g,mat:matsGL[prim.material||0],skinned:j.nodes[i].skin!==undefined});}
 for(const a of j.animations||[])for(const ch of a.channels){
 const sm=a.samplers[ch.sampler],ia=j.accessors[sm.input],oa=j.accessors[sm.output],mul=sm.interpolation==='CUBICSPLINE'?3:1;
 if(!ia||!oa||oa.count!==ia.count*mul)throw Error('Pista de animación incompatible: '+a.name+' / '+ch.target.path+' (tiempos y valores no coinciden).');
 const ts=readAccessor(j,bin,sm.input),vs=readAccessor(j,bin,sm.output);
 if(!ts.length||!Array.from(ts).every(Number.isFinite)||!Array.from(vs).every(Number.isFinite))throw Error('La animación contiene valores no finitos: '+a.name);
 for(let k=1;k<ts.length;k++)if(ts[k]<=ts[k-1])throw Error('Tiempos de animación no crecientes: '+a.name);
 }
 const newClips={};for(const a of j.animations||[]){if(a.name?.endsWith('.001'))continue;const tracks=a.channels.map(ch=>{const s=a.samplers[ch.sampler];return {node:nodes[ch.target.node],nodeName:nodes[ch.target.node].name,path:ch.target.path,times:Array.from(readAccessor(j,bin,s.input)),values:readAccessor(j,bin,s.output),interpolation:s.interpolation||'LINEAR',size:ch.target.path==='rotation'?4:3};});const t0=Math.min(...tracks.map(t=>t.times[0]));let duration=0;for(const tr of tracks){tr.times=tr.times.map(x=>x-t0);duration=Math.max(duration,tr.times.at(-1));}newClips[a.name||'Animation']={name:a.name,duration,tracks};}for(const clip of Object.values(newClips)){const tr=clip.tracks.find(t=>t.path==='translation'&&/hips$/i.test(t.nodeName.replace(/^.*:/,'')));if(!tr)continue;const x0=tr.values[0],z0=tr.values[2];let maxMove=0;for(let i=0;i<tr.values.length;i+=3)maxMove=Math.max(maxMove,Math.hypot(tr.values[i]-x0,tr.values[i+2]-z0));clip.rootMotion=maxMove;if(maxMove>.04){const values=new Float32Array(tr.values);for(let i=0;i<values.length;i+=3){values[i]=x0;values[i+2]=z0;}tr.values=values;clip.inPlace=true;}else clip.inPlace=false;}
 if(modelRoot){avatar.children=avatar.children.filter(n=>n!==modelRoot);for(const m of charMeshes)m.visible=false;}
 modelRoot=temp;temp.parent=avatar;avatar.children.push(temp);modelNodes=nodes;bones=newBones;charMeshes=primitiveData.map(p=>mesh(nodes[p.i],p.g,p.mat,[0,0,0],[1,1,1],[0,0,0],p.skinned));
 sceneRoot.update();basePose=new Map(nodes.map(n=>[n,{t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}]));for(const n of nodes){n.restWorld=new Float32Array(n.world);n.restWorldQ=n.worldQ.slice();}
 importedClips=newClips;sourceGLB=buffer;sourceDoc=j;sourceBytes=bin;return {j,nodes,bones,triangles:primitiveData.reduce((s,p)=>s+p.g.i.length/3,0)};
}
function resetRig(){for(const [n,p]of basePose){n.t=p.t.slice();n.q=p.q.slice();n.s=p.s.slice();}avatar.t=[0,0,0];avatar.q=[0,0,0,1];avatar.s=[1,1,1];}
const bonePalette=new Float32Array(64*16);function palette(){for(let i=0;i<64;i++)bonePalette.set(i<bones.length?M.mul(bones[i].world,bones[i].inverseBind):M.id(),i*16);return bonePalette;}
function trackValue(tr,time){if(!Number.isFinite(time))throw Error('Tiempo de animación no válido.');const ts=tr.times;let a=0,b=ts.length-1;if(time<=ts[0])b=a=0;else if(time>=ts[b])a=b;else{while(b-a>1){const m=(a+b)>>1;if(ts[m]>time)b=m;else a=m;}}const f=a===b||tr.interpolation==='STEP'?0:(time-ts[a])/(ts[b]-ts[a]);let x=Array.from(tr.values.slice(a*tr.size,(a+1)*tr.size)),y=Array.from(tr.values.slice(b*tr.size,(b+1)*tr.size));return tr.path==='rotation'?Q.slerp(x,y,f):V.lerp(x,y,f);}
function sampleSource(clip,time,loopSmoothing=true){let t=clamp(time,0,clip.duration),seam=loopSmoothing?smooth(clip.duration-.10,clip.duration,t):0;for(const tr of clip.tracks){if(tr.interpolation==='CUBICSPLINE')continue;let v=trackValue(tr,t);if(seam>0){let start=trackValue(tr,0);v=tr.path==='rotation'?Q.slerp(v,start,seam):V.lerp(v,start,seam);}const key={translation:'t',rotation:'q',scale:'s'}[tr.path];if(key)tr.node[key]=v;}}

/* Reusable accessory definitions. Local +Y is up, local +Z is front.
   Grip points mark PALM centres; IK compensates for wrist-to-palm length. */
const propsRoot=new Node('Attachments',avatar), props={}, fxRoot=new Node('Effects',sceneRoot);
const wood=material('Madera miel','#b68042',.78),woodEdge=material('Cantos de madera','#d6ad70',.8),woodDark=material('Madera oscura','#7a552f',.84),metal=material('Acero mate','#65786e',.43,.55),canMat=material('Esmalte verde azulado','#4c948a',.34,.14),canRim=material('Borde de regadera','#afd0bd',.40,.15),sackMat=material('Lona de algodón','#bda478',.93),sackEdge=material('Costuras de lona','#927346',.92),ropeMat=material('Cuerda','#6d5136',.94),leafMat=material('Verde hoja','#4e8547',.86),redFruit=material('Tomates maduros','#d55338',.49),goldFruit=material('Naranjas','#edaa3d',.55),greenFruit=material('Manzanas verdes','#8fae4d',.58),earthMat=material('Tierra de cultivo','#70533c',.98),waterMat=material('Gotas de agua','#82c9dc',.30,.02),seedMat=material('Semillas doradas','#dfba70',.80);
const ACCESSORY_SPECS={
 can:{id:'can',label:'Regadera',attachment:'rightHand',leftSupport:false,grips:{R:[0,.23,0]},nozzle:[0,.065,.36]},
 sack:{id:'sack',label:'Saco',attachment:'spine2',grips:{},bindOffset:[0,.81,-.21]},
 crate:{id:'crate',label:'Caja de frutas',attachment:'twoHands',grips:{R:[-.215,.055,.0],L:[.215,.055,.0]}},
 hoe:{id:'hoe',label:'Azada',attachment:'twoHands',grips:{R:[-.012,.38,0],L:[.012,.19,0]},tip:[0,-.555,.08]}
};
function buildAccessories(){
 let n=props.can=new Node('Prop_WateringCan',propsRoot);n.spec=ACCESSORY_SPECS.can;
 mesh(n,loft([[-.15,0,0],[-.15,.105,.10],[-.13,.13,.105],[.035,.135,.11],[.105,.105,.09],[.11,.085,.072]],28),canMat);
 mesh(n,ring(.103,.088,.107,.007,36),canRim);
 // Upright loop handle; palm holds its highest segment.
 line(n,canRim,[[0,.10,-.077],[0,.20,-.07],[0,.235,0],[0,.20,.07],[0,.10,.077]],.012,28,8);
 line(n,canMat,[[0,-.08,.08],[0,-.05,.17],[0,.025,.26],[0,.052,.31]],t=>mix(.031,.02,t),22,10);
 let rose=new Node('Can_Nozzle',n,[0,.06,.34]);rose.rot(PI/2-.14,0,0);mesh(rose,cylinder(.052,.022,.043,20),canRim);for(let i=0;i<9;i++){let a=i*2.399,r=i===0?0:.035;ell(rose,metal,[r*Math.cos(a),.023,r*Math.sin(a)],[.0038,.001,.0038],8,5);}
 let badge=new Node('Can_badge',n,[0,-.023,.105]);ell(badge,canRim,[0,0,0],[.028,.035,.005],16,10);line(badge,leafMat,[[0,-.02,.006],[.002,.022,.006]],.002,8,4);
 n=props.crate=new Node('Prop_FruitCrate',propsRoot);n.spec=ACCESSORY_SPECS.crate;
 box(n,woodDark,[0,-.08,0],[.44,.028,.275],.008);
 for(let y of[-.055,.01,.075])for(let z of[-.145,.145])box(n,wood,[0,y,z],[.47,.050,.018],.007);
 for(let y of[-.055,.01,.075])for(let x of[-.227,.227])box(n,wood,[x,y,0],[.02,.050,.285],.006);
 for(let x of[-.213,.213])for(let z of[-.133,.133]){box(n,woodEdge,[x,.004,z],[.025,.215,.028],.005);for(let y of[-.057,.072])ell(n,metal,[x,y,z+Math.sign(z)*.016],[.006,.006,.0025],8,5);}
 for(let i=0;i<8;i++){let x=(i%4-1.5)*.093,z=(i<4?-.052:.048),y=.065+(i%3)*.012;const f=i%3===0?greenFruit:i%3===1?redFruit:goldFruit;ell(n,f,[x,y,z],[.052,.055,.05],18,12);line(n,ropeMat,[[x,y+.043,z],[x+.003,y+.066,z-.006]],.004,6,5);ell(n,leafMat,[x+.013,y+.059,z],[.018,.004,.009],10,6);}
 n=props.sack=new Node('Prop_HarvestSack',propsRoot);n.spec=ACCESSORY_SPECS.sack;
 mesh(n,surface((u,v)=>{let a=u*TAU,b=v*PI,r=Math.sin(b),lobes=1+.035*Math.cos(a*5)*Math.sin(b);return [.185*Math.cos(a)*r*lobes,.255*Math.cos(b),.145*Math.sin(a)*r*lobes];},32,22),sackMat);
 mesh(n,loft([[.19,.10,.065],[.23,.072,.055],[.27,.043,.035],[.30,.062,.043]],24),sackMat);mesh(n,ring(.05,.034,.265,.012,24),ropeMat);
 line(n,ropeMat,[[.04,.265,.005],[.10,.29,.04],[.092,.23,.065],[.045,.265,.016],[.075,.20,.045]],.008,18,6);
 for(let sign of[-1,1])line(n,sackEdge,[[sign*.01,-.249,.015],[sign*.16,-.12,.035],[sign*.18,.02,.035],[sign*.13,.17,.035],[sign*.06,.23,.035]],.004,28,5);
 // Broad straps wrap over shoulders (sack is behind torso, +Z points toward wearer).
 for(let s of[-1,1])line(n,woodDark,[[s*.10,.16,.08],[s*.13,.285,.17],[s*.16,.27,.245],[s*.18,.07,.27],[s*.13,-.15,.13]],.020,24,8);
 // Embroidered leaf symbol on the back, not fake text.
 line(n,leafMat,[[0,-.08,-.14],[0,.055,-.146]],.004,10,6);for(let s of[-1,1]){const leaf=ell(n,leafMat,[s*.024,.008,-.143],[.02,.039,.004],14,10);leaf.local=M.compose([s*.022,.008,-.143],Q.euler(0,0,-s*.6),[.02,.039,.004]);}
 n=props.hoe=new Node('Prop_Hoe',propsRoot);n.spec=ACCESSORY_SPECS.hoe;
 mesh(n,cylinder(.013,.016,1.10,16),wood);mesh(n,cylinder(.024,.024,.10,16),ropeMat,[0,.40,0]);
 box(n,metal,[0,-.52,.015],[.05,.067,.055],.008);
 box(n,metal,[0,-.547,.085],[.21,.021,.14],.01,[.13,0,0]);
 box(n,canRim,[0,-.555,.149],[.213,.013,.015],.004);
 for(const p of Object.values(props)){p.visible=false;p.character=true;batchNode(p);}
}
let plotNode,seedling,waterDrops=[],soilDrops=[],seedDrops=[],fruitDemo;
function buildEnvironment(){
 const floor=material('Fondo cálido','#eee9dd',.98),turf=material('Disco salvia','#b8c7a3',.95),rim=material('Canto del disco','#8ba77b',.92),lineMat=material('Cuadrícula tenue','#cbd5bd',.95),stoneMat=material('Piedra de jardín','#c5baa1',.99);
 box(env,floor,[0,-.085,0],[120,.1,120],.02);mesh(env,cylinder(1.58,1.58,.042,96),rim,[0,-.023,0]);mesh(env,cylinder(1.565,1.565,.012,96),turf,[0,.004,0]);
 for(let x=-1.25;x<=1.251;x+=.25){let z=Math.sqrt(1.52**2-x*x);line(env,lineMat,[[x,.012,-z],[x,.012,z]],.0014,2,4);line(env,lineMat,[[-z,.012,x],[z,.012,x]],.0014,2,4);}
 for(let k=0;k<3;k++){let p=new Node('Garden_Detail_'+k,env,[1.06+k*.075,.025,-.73+(k%2)*.11]);ell(p,stoneMat,[0,0,0],[.045+k*.012,.024,.036],14,8);}
 plotNode=new Node('Interaction_Plot',env,[0,.018,.54]);box(plotNode,earthMat,[0,0,0],[.72,.045,.48],.035);
 for(let z of[-.16,-.055,.055,.16])line(plotNode,woodDark,[[-.31,.027,z],[.31,.027,z]],.005,4,5);
 seedling=new Node('Seedling',plotNode,[.09,.025,.08]);line(seedling,leafMat,[[0,0,0],[0,.12,0]],.007,10,6);for(let s of[-1,1]){const l=ell(seedling,leafMat,[s*.037,.075,0],[.052,.009,.023],16,10);l.local=M.compose([s*.036,.075,0],Q.euler(0,0,s*.35),[.052,.009,.023]);}
 fruitDemo=new Node('Harvest_Produce',plotNode,[.04,.065,.035]);ell(fruitDemo,redFruit,[0,0,0],[.058,.054,.055],18,12);for(let i=0;i<5;i++){const a=TAU*i/5;ell(fruitDemo,leafMat,[.021*Math.cos(a),.048,.021*Math.sin(a)],[.023,.006,.01],10,6);}
 for(let i=0;i<26;i++){const n=new Node('Water_'+i,fxRoot);ell(n,waterMat,[0,0,0],[.0055,.014,.0055],8,6);n.visible=false;waterDrops.push(n);}
 for(let i=0;i<12;i++){const n=new Node('Soil_'+i,fxRoot);ell(n,earthMat,[0,0,0],[.009,.008,.007],7,5);n.visible=false;soilDrops.push(n);}
 for(let i=0;i<9;i++){const n=new Node('Seed_'+i,fxRoot);ell(n,seedMat,[0,0,0],[.004,.007,.004],8,5);n.visible=false;seedDrops.push(n);}
 batchNode(env);for(const m of meshList)if([floor,turf,rim,lineMat].includes(m.mat)){m.cast=false;if(m.mat===lineMat)m.receive=false;}plotNode.visible=false;
}
function hideEffects(){waterDrops.forEach(x=>x.visible=false);soilDrops.forEach(x=>x.visible=false);seedDrops.forEach(x=>x.visible=false);}

/* Semantic action layer. Never assumes that bone names alone guarantee retargeting.
   Source locomotion, alert and fall use this exact Meshy skeleton. New actions use measured lengths. */
let rig=null;
// Revision 004. Separate reaching from the crouch: hands go forward first and
// retract only after the torso has risen. Targets stay on their own side.
const ACTION_TUNING={
 plant:{
  reachIn:[0,.20],reachOut:[.82,1],
  L:{rest:[.285,.66,.055],work:[.285,.36,.37],axis:[.18,-.94,.25]},
  R:{rest:[-.285,.66,.055],work:[-.17,.30,.425],axis:[-.04,-.87,.49]},
  elbowPole:[.8,-.15,.35]
 },
 water:{hand:'R',canX:-.27,freeWrist:[.285,.66,.055],freeAxis:[.15,-1,.10]},
 dig:{toolX:-.045,toolZ:.36,upperGrip:.34,lowerGrip:.19,gripSlide:.10,toolLocked:true},
 // Blend from foot support to a stable hip anchor at contact. Never lift the
 // prone actor to clear the oversized head/hat; slight penetration is intended.
 fall:{contactBlend:[.60,.67],hipHeightMeters:.12,allowMeshPenetration:true}
};
const ACTIONS={
 walk:{name:'Caminar',duration:1,loop:true,origin:'Meshy · En sitio',icon:'walk',prop:'none',desc:'Clip original Walking. Si tenía desplazamiento horizontal, se ha corregido para que se mantenga quieto en el sitio.'},
 run:{name:'Correr',duration:1,loop:true,origin:'Meshy · En sitio',icon:'run',prop:'none',desc:'Clip original Running. Se mantiene fijo en el sitio para revisar la animación sin root motion.'},
 charge:{name:'Tajo ascendente cargado',short:'Tajo cargado',duration:1,loop:false,origin:'Meshy · En sitio',icon:'hit',prop:'none',desc:'Clip original Charged Upward Slash. Se reproduce en el sitio para facilitar la revisión.'},
 slash:{name:'Tajo de mano derecha',short:'Tajo derecho',duration:1,loop:false,origin:'Meshy · En sitio',icon:'wave',prop:'none',desc:'Clip original Right Hand Sword Slash, corregido para permanecer en el sitio si avanzaba.'},
 combo1:{name:'Combo de arma',short:'Combo 1',duration:1,loop:false,origin:'Meshy · En sitio',icon:'crate',prop:'none',desc:'Clip original Weapon Combo, sin desplazamiento horizontal acumulado.'},
 combo2:{name:'Combo de arma 2',short:'Combo 2',duration:1,loop:false,origin:'Meshy · En sitio',icon:'alert',prop:'none',desc:'Clip original Weapon Combo 2, corregido para quedarse quieto en el sitio.'}
};
function setupRig(){
 const find=(name)=>bones.find(n=>n.name.replace(/^.*:/,'').toLowerCase()===name.toLowerCase());
 const required=['Hips','Spine','Spine1','Spine2','Head','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'];
 const map=Object.fromEntries(required.map(n=>[n,find(n)]));const missing=required.filter(n=>!map[n]);if(missing.length)throw Error('Rig no compatible con la plantilla: faltan '+missing.join(', '));
 rig={...map,arms:{},legs:{},scale:1,palm:.066};
 for(const [tag,side,s]of[['L','Left',1],['R','Right',-1]]){
  const up=find(side+'Arm'),low=find(side+'ForeArm'),hand=find(side+'Hand');rig.arms[tag]={up,low,end:hand,s,L1:V.len(low.t),L2:V.len(hand.t)};
  const thigh=find(side+'UpLeg'),shin=find(side+'Leg'),foot=find(side+'Foot');rig.legs[tag]={up:thigh,low:shin,end:foot,s,L1:V.len(shin.t),L2:V.len(foot.t),footRest:[foot.world[12],foot.world[13],foot.world[14]]};
 }
 rig.chest=rig.Spine2;rig.hips=rig.Hips;rig.head=rig.Head;
 const findClip=(pattern,label)=>{const c=Object.values(importedClips).find(k=>pattern.test(k.name||''));if(!c)throw Error('Falta el clip '+label+' en el GLB.');return c;};
 rig.clipMap={
  walk:findClip(/^walking$/i,'Walking'),
  run:findClip(/^running$/i,'Running'),
  charge:findClip(/^charged[_ ]upward[_ ]slash$/i,'Charged_Upward_Slash'),
  slash:findClip(/^right[_ ]hand[_ ]sword[_ ]slash$/i,'Right_Hand_Sword_Slash'),
  combo1:findClip(/^weapon[_ ]combo$/i,'Weapon_Combo'),
  combo2:findClip(/^weapon[_ ]combo[_ ]2$/i,'Weapon_Combo_2')
 };
 for(const [id,clip] of Object.entries(rig.clipMap)) ACTIONS[id].duration=clip.duration;
 rig.groundSamples=[];for(const m of charMeshes)for(let i=0;i<m.g.p.length/3;i++){if(m.g.p[i*3+1]<.45 && i%2===0)rig.groundSamples.push({g:m.g,i});}
}
function pos(n){return [n.world[12],n.world[13],n.world[14]];}
function deltaBone(n,x=0,y=0,z=0){n.q=Q.mul(basePose.get(n).q,Q.euler(x,y,z));}
function currentDelta(n,x=0,y=0,z=0){n.q=Q.mul(n.q,Q.euler(x,y,z));}
function update(){sceneRoot.update();}
function aimBone(n,child,target){let a=V.norm(M.dir(n.world,child.t)),b=V.norm(V.sub(target,pos(n)));const q=Q.mul(Q.fromTo(a,b),n.worldQ);n.q=Q.mul(Q.inv(n.parent.worldQ),q);n.update(n.parent.world,n.parent.worldQ,n.parent.show);}
function solveChain(chain,target,hint){const {up,low,end,L1,L2}=chain,S=pos(up),delta=V.sub(target,S),raw=V.len(delta),d=clamp(raw,.01,L1+L2-.001),dir=V.norm(delta);let hvec=V.sub(hint,V.mul(dir,V.dot(hint,dir)));if(V.len(hvec)<.001)hvec=V.cross(dir,[1,0,0]);hvec=V.norm(hvec);const a=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-a*a)),E=V.add(S,V.add(V.mul(dir,a),V.mul(hvec,h))),T=V.add(S,V.mul(dir,d));aimBone(up,low,E);aimBone(low,end,T);return {target:T,error:Math.max(0,raw-d)};}
function handOrientation(A,axis=[0,-1,0],roll=0){const bind=A.end.restWorldQ,oldAxis=Q.rotate(bind,[0,1,0]);let q=Q.mul(Q.fromTo(V.norm(oldAxis),V.norm(axis)),bind);if(roll)q=Q.mul(q,Q.euler(0,roll,0));A.end.q=Q.mul(Q.inv(A.low.worldQ),q);A.end.update(A.low.world,A.low.worldQ,A.low.show);}
function armWrist(tag,wrist,axis=[0,-1,0],roll=0,pole=null){const A=rig.arms[tag];if(/Shoulder$/.test(A.up.parent.name)){A.up.parent.q=basePose.get(A.up.parent).q.slice();A.up.parent.update(A.up.parent.parent.world,A.up.parent.parent.worldQ,A.up.parent.parent.show);}for(const n of[A.up,A.low,A.end])n.q=basePose.get(n).q.slice();A.up.update(A.up.parent.world,A.up.parent.worldQ,A.up.parent.show);const ans=solveChain(A,wrist,pole||[A.s*.8,-.3,-.25]);handOrientation(A,axis,roll);return ans;}
function armGrip(tag,point,axis=[0,-1,0],roll=0){const wrist=V.sub(point,V.mul(V.norm(axis),rig.palm));return armWrist(tag,wrist,axis,roll);}
function handPalm(tag){const A=rig.arms[tag];return V.add(pos(A.end),Q.rotate(A.end.worldQ,[0,rig.palm,0]));}
/* Digging: tool-driven, hard two-hand contacts.
 * The hoe retains its authored TRS. Safety may change the elbows, wrist
 * orientation and the position of the grip ALONG the same shaft, never move
 * the hoe independently or leave a hand on a detached target.
 * All decisions are stateless so playback, scrubbing and baking agree.
 */
function digBodyFrame(){
 const deformation=M.mul(rig.chest.world,M.inv(rig.chest.restWorld));
 const rest=rig.restChest,hips=basePose.get(rig.hips).t;
 return {inverse:M.inv(deformation),forward:V.norm(M.dir(deformation,[0,0,1])),
  volumes:[
   {c:[rest[0],rest[1]-.025,rest[2]+.035],r:[.142,.135,.142]},
   {c:[rest[0],hips[1]+.075,rest[2]+.050],r:[.148,.130,.145]},
   {c:[rest[0],rest[1]+.10,rest[2]+.025],r:[.095,.065,.115]}
  ]};
}
function digPointDepth(point,radius,body){
 const p=M.point(body.inverse,point);let depth=0;
 for(const v of body.volumes){
  const r=v.r.map(x=>x+radius),x=(p[0]-v.c[0])/r[0],y=(p[1]-v.c[1])/r[1],d=1-x*x-y*y;
  if(d<=0)continue;
  const z=r[2]*Math.sqrt(d);
  if(p[2]>=v.c[2]-z && p[2]<v.c[2]+z)depth=Math.max(depth,v.c[2]+z-p[2]);
 }
 return depth;
}
function digArmDepth(tag,body){
 const A=rig.arms[tag],elbow=pos(A.low),wrist=pos(A.end),palm=handPalm(tag);
 // The hand mesh has no finger controls. Test its full length, not just
 // its wrist joint or an infinitesimal target point.
 const tip=V.add(wrist,V.mul(V.sub(palm,wrist),2.05));
 let forearm=0,hand=0;
 for(let i=0;i<=8;i++){
  forearm=Math.max(forearm,digPointDepth(V.lerp(elbow,wrist,i/8),.041,body));
  hand=Math.max(hand,digPointDepth(V.lerp(wrist,tip,i/8),.046,body));
 }
 return {forearm,hand,depth:Math.max(forearm,hand)};
}

/* Tool-aware safety for digging.
 * The blade keeps the exact authored position for the current frame. If the
 * shaft intersects torso/neck/head, rotate the handle FORWARD around the blade
 * contact, then solve both arms to the new grip points. This makes the hands
 * and elbows move away from the body without making the tool float.
 */
function digToolDepth(n,body){
 const head=pos(rig.head),face=rig.headFront?pos(rig.headFront):V.add(head,[0,.02,.27]),neck=rig.neck?pos(rig.neck):pos(rig.chest);
 const front=V.norm(V.sub(face,head)),up=V.norm(M.dir(rig.head.world,[0,1,0])),right=V.norm(V.cross(up,front));
 const headCenter=V.lerp(head,face,.48);
 let torso=0,headHit=0,faceHit=0,neckHit=0;
 // The authored shaft spans roughly local Y -0.34..+0.36. Sample densely.
 for(let i=0;i<=28;i++){
  const y=mix(-.34,.36,i/28),P=M.point(n.world,[0,y,0]);
  torso=Math.max(torso,digPointDepth(P,.020,body));
  // Oversized chibi head: an ellipsoidal clearance volume.
  const hp=V.sub(P,headCenter),dx=V.dot(hp,right)/.245,dy=V.dot(hp,up)/.255,dz=V.dot(hp,front)/.235,q=dx*dx+dy*dy+dz*dz;
  if(q<1)headHit=Math.max(headHit,(1-Math.sqrt(q))*.235);
  // Hard face plane: a central shaft must remain in front of nose/mouth.
  const fp=V.sub(P,face),fx=Math.abs(V.dot(fp,right)),fy=V.dot(fp,up),fz=V.dot(fp,front);
  if(fx<.19 && fy>-.23 && fy<.19 && fz<.055 && fz>-.34)faceHit=Math.max(faceHit,.055-fz);
  // Neck/beard clearance between chest and head.
  const np=V.sub(P,neck),nx=V.dot(np,right)/.15,ny=V.dot(np,up)/.14,nz=V.dot(np,front)/.15,nq=nx*nx+ny*ny+nz*nz;
  if(nq<1)neckHit=Math.max(neckHit,(1-Math.sqrt(nq))*.15);
 }
 return {torso,head:headHit,face:faceHit,neck:neckHit,depth:Math.max(torso,headHit,faceHit,neckHit)};
}
function preserveDigBladeAndSetPitch(n,pitch,roll,pivotWorld){
 const pivotLocal=n.spec.tip,localParent=M.point(M.inv(n.parent.world),pivotWorld),q=Q.euler(pitch,0,roll);
 n.q=q;n.t=V.sub(localParent,Q.rotate(q,pivotLocal));n.s=[1,1,1];update();
}
function makeDigToolSafe(n,basePitch){
 const body=digBodyFrame(),pivotWorld=M.point(n.world,n.spec.tip),roll=.04,target=.0025;
 // Preserve the exact ToolSafe v3 behaviour that already kept the shaft out
 // of the character. The only change is how the correction angle is chosen.
 //
 // v3 searched in 0.035 rad steps. That was robust, but visibly snapped from
 // one safe step to the next. Here we first find the same safe bracket and
 // then bisect inside it, giving the smallest safe angle continuously.
 const baseDetail=digToolDepth(n,body);
 if(baseDetail.depth<=target){
  rig.digToolSafety={corrected:false,extraPitch:0,...baseDetail};
  return;
 }

 let best={extra:0,depth:baseDetail.depth,t:n.t.slice(),q:n.q.slice(),detail:baseDetail};
 let unsafeExtra=0,safeExtra=null,safeDetail=null;

 // Same robust forward search as v3: locate the first safe interval.
 for(let i=1;i<=24;i++){
  const extra=i*.035;
  preserveDigBladeAndSetPitch(n,basePitch+extra,roll,pivotWorld);
  const detail=digToolDepth(n,body);
  if(detail.depth<best.depth){
   best={extra,depth:detail.depth,t:n.t.slice(),q:n.q.slice(),detail};
  }
  if(detail.depth<=target){
   safeExtra=extra;
   safeDetail=detail;
   unsafeExtra=extra-.035;
   break;
  }
 }

 if(safeExtra!==null){
  // Refine the first safe 0.035-rad interval. This preserves v3's collision
  // solution, but removes the discrete angular steps that caused the jumps.
  let lo=Math.max(0,unsafeExtra),hi=safeExtra;
  let hiT=null,hiQ=null,hiDetail=safeDetail;
  preserveDigBladeAndSetPitch(n,basePitch+hi,roll,pivotWorld);
  hiT=n.t.slice();hiQ=n.q.slice();

  for(let i=0;i<14;i++){
   const mid=(lo+hi)*.5;
   preserveDigBladeAndSetPitch(n,basePitch+mid,roll,pivotWorld);
   const detail=digToolDepth(n,body);
   if(detail.depth<=target){
    hi=mid;
    hiDetail=detail;
    hiT=n.t.slice();
    hiQ=n.q.slice();
   }else{
    lo=mid;
   }
  }

  // Tiny safety margin avoids numerical chatter exactly on the boundary while
  // remaining visually continuous (far below a single v3 step).
  const finalExtra=Math.min(safeExtra,hi+.00045);
  preserveDigBladeAndSetPitch(n,basePitch+finalExtra,roll,pivotWorld);
  const finalDetail=digToolDepth(n,body);
  rig.digToolSafety={corrected:true,extraPitch:finalExtra,...finalDetail};
  return;
 }

 // Extremely defensive fallback: if no fully safe pitch was found within the
 // same range v3 used, commit the least-penetrating v3 candidate rather than
 // changing the tool trajectory or detaching it from the hands.
 n.t=best.t.slice();n.q=best.q.slice();update();
 rig.digToolSafety={corrected:true,extraPitch:best.extra,...best.detail};
}
function solveDigArms(n,lift){
 const cfg=ACTION_TUNING.dig,body=digBodyFrame();
 const grips={},stats={toolMoved:false,corrections:0,contacts:{},penetration:{}};
 for(const tag of ['R','L']){
  const A=rig.arms[tag],S=pos(A.up),L=A.L1+A.L2-.001;
  // Sliding the hands lower during the lift keeps the upper grip below the
  // beard and both wrists within this character's short-arm reach.
  const nominal=(tag==='R'?cfg.upperGrip:cfg.lowerGrip)-cfg.gripSlide*lift;
  let h=nominal,axis,pole,wrist,goal,result,best=null;
  const evaluate=(height,forwardPush=0,polePush=0)=>{
   const gp=[tag==='R'?-.012:.012,height,0],G=M.point(n.world,gp);
   let direction=V.norm(V.sub(G,S));
   let W=V.sub(G,V.mul(direction,rig.palm));
   if(forwardPush>0){
    // Rotate the wrist around the FIXED palm contact. The wrist-to-palm
    // length is unchanged, unlike the old detached "safe wrist" fallback.
    W=V.add(G,V.mul(V.norm(V.sub(V.add(W,V.mul(body.forward,forwardPush)),G)),rig.palm));
    direction=V.norm(V.sub(G,W));
   }
   const hint=V.add([A.s*.70,-.65,.60],V.mul(body.forward,polePush));
   armWrist(tag,W,direction,0,hint);update();
   const intrusion=digArmDepth(tag,body),error=V.len(V.sub(handPalm(tag),G));
   const value={height,gp,G,W,direction,hint,intrusion,error,
    score:intrusion.depth*100+error*200+Math.abs(height-nominal)*.03+forwardPush*.01+polePush*.0002,
    q:[A.up.q.slice(),A.low.q.slice(),A.end.q.slice()]};
   if(!best||value.score<best.score)best=value;
   return value;
  };
  result=evaluate(h);
  if(result.intrusion.depth>.0002 || result.error>.0002){
   stats.corrections++;
   // First correct elbow bend: palm and wrist contacts do not move.
   for(let k=1;k<=5;k++){
    const v=evaluate(h,0,k*.24);
    if(v.intrusion.depth<.0002 && v.error<.0002)break;
   }
   // Then move the wrist forward by rotating it about its palm contact.
   // If necessary slide on the handle, preserving separation between hands.
   if(best.intrusion.depth>.0002 || best.error>.0002){
    for(let slide=0;slide<=6;slide++){
     const height=h-slide*.008;
     if(tag==='R' && height < cfg.lowerGrip-cfg.gripSlide*lift+.095)break;
     for(let k=1;k<=8;k++){
      const v=evaluate(height,k*.012,.60);
      if(v.intrusion.depth<.0002 && v.error<.0002)break;
     }
     if(best.intrusion.depth<.0002 && best.error<.0002)break;
    }
   }
   // Refine the first safe wrist correction instead of jumping in coarse steps.
   if(best.intrusion.depth<.0002 && best.error<.0002){
    const corrected=best,base=evaluate(corrected.height);
    let lo=0,hi=1;
    for(let i=0;i<10;i++){
     const f=(lo+hi)*.5,dir=V.norm(V.lerp(base.direction,corrected.direction,f));
     const W=V.sub(corrected.G,V.mul(dir,rig.palm)),hint=V.lerp(base.hint,corrected.hint,f);
     armWrist(tag,W,dir,0,hint);update();
     const d=digArmDepth(tag,body),e=V.len(V.sub(handPalm(tag),corrected.G));
     if(d.depth<.0001&&e<.0002){hi=f;best={...corrected,direction:dir,hint,W,intrusion:d,error:e,q:[A.up.q.slice(),A.low.q.slice(),A.end.q.slice()]};}else lo=f;
    }
   }
  }
  // Commit a contact-preserving pose. Never force a separate free-floating
  // hand target as a fallback and never stretch the skeleton's bone lengths.
  [A.up.q,A.low.q,A.end.q]=best.q.map(q=>q.slice());update();
  grips[tag]=best.gp;
  stats.contacts[tag]=V.len(V.sub(handPalm(tag),M.point(n.world,best.gp)));
  stats.penetration[tag]=digArmDepth(tag,body).depth;
 }
 n.currentGrips=grips;n.activeGrips=['R','L'];rig.digSafety=stats;
 update();
}
function activePropGrips(n){return n.currentGrips||n.spec.grips;}

function stabilizeFeet(){for(const B of Object.values(rig.legs)){solveChain(B,B.footRest,[0,0,1]);B.end.q=Q.mul(Q.inv(B.low.worldQ),B.end.restWorldQ);B.end.update(B.low.world,B.low.worldQ,B.low.show);}update();}
function idleArms(t){for(const tag of['L','R']){const A=rig.arms[tag];armWrist(tag,[A.s*(.285+.005*Math.sin(t*1.3)),.66+.005*Math.sin(t*1.7),.035+.012*Math.sin(t*1.2+A.s)], [A.s*.10,-1,.08]);}}
function setProp(id,p,q=[0,0,0,1]){const n=props[id];n.t=p.slice();n.q=q.slice();n.s=[1,1,1];n.visible=true;update();return n;}
function gripProp(id,tags=['R','L'],axis=[0,-1,0]){const n=props[id],handAxis=V.norm(M.dir(n.world,axis));for(const tag of tags){const gp=n.spec.grips[tag];if(gp)armGrip(tag,M.point(n.world,gp),handAxis);}update();}
let lastGripErrors={};
function evaluateAction(name,time,options={}){
 resetRig();hideEffects();Object.values(props).forEach(p=>{p.visible=false;p.s=[1,1,1];});plotNode.visible=false;seedling.visible=false;fruitDemo.visible=false;fruitDemo.held=false;
 const act=ACTIONS[name]||ACTIONS.walk,t=clamp(time,0,act.duration),clip=rig.clipMap[name]||rig.clipMap.walk;
 sampleSource(clip,t,act.loop&&options.smoothLoop!==false);
 update();
 // Keep the lowest animated foot/mesh sample above the stage without altering
 // any bone keyframes or horizontal motion. Only the outer actor root moves in Y.
 groundCharacter();
 const locomotion=name==='walk'||name==='run';
 const prop='none';
 return {prop,locomotion};
}

// Standing/locomotion floor clearance changes only the actor root.
function groundCharacter(){const pal=palette();let min=Infinity;for(const {g,i}of rig.groundSamples){const x=g.p[i*3],y=g.p[i*3+1],z=g.p[i*3+2];let Y=0;for(let k=0;k<4;k++){const w=g.w[i*4+k],o=g.j[i*4+k]*16;if(w)Y+=w*(pal[o+1]*x+pal[o+5]*y+pal[o+9]*z+pal[o+13]);}min=Math.min(min,Y);}if(min<.022){const off=.022-min;avatar.t[1]+=off;for(const d of [...waterDrops,...seedDrops])if(d.visible)d.t[1]+=off*(1-(d.flight||0)**2);if(fruitDemo.held)fruitDemo.t[1]+=off;update();}}

// A prone character is supported by its pelvis, not by the mesh's lowest vertex.
// Stateless evaluation matters: scrubbing, looping, replaying and GLB baking must
// all produce exactly the same contact pose. Imported bone keyframes and X/Z
// displacement are untouched; only the outer actor root gets a Y offset.
function groundFall(time){
 const cfg=ACTION_TUNING.fall,phase=clamp(time/rig.fall.duration,0,1),contact=smooth(...cfg.contactBlend,phase);
 if(contact<1)groundCharacter();
 const currentRootY=avatar.t[1],contactRootY=currentRootY+cfg.hipHeightMeters-pos(rig.hips)[1];
 avatar.t[1]=mix(currentRootY,contactRootY,contact);
 update();
}

/* GLB writer: reuses the user's original mesh/skin buffers and compressed textures.
   New props are real meshes. IK is baked to ordinary TRS channels at 30 fps.
   The scene, ground and transient effects are intentionally not exported. */
async function exportLibrary(only=null){if(!sourceDoc)throw Error('El modelo todavía no está listo.');baking=true;
 try{
 const accessoryMode=only?state.accessory:'auto';
 const doc=JSON.parse(JSON.stringify(sourceDoc));doc.animations=[];doc.asset.generator='Quata Character Lab 005 / Meshy source + procedural action layer';doc.asset.extras={...doc.asset.extras,template:'quata.character-template/1',revision:5,notes:'Original Meshy character and skin. Two imported locomotion clips plus the user-supplied Alert and Shot and Fall Backward clips. Fall uses a stable pelvis contact anchor; intentional head/hat ground penetration is allowed. Additional actions/IK baked at 30 fps. Props authored for this test. Ground, particles and studio lights excluded.'};
 let length=sourceBytes.byteLength;const chunks=[{offset:0,bytes:new Uint8Array(sourceBytes)}],nodeIDs=new Map(modelNodes.map(n=>[n,n.sourceIndex]));
 const avatarID=doc.nodes.push({name:'Quata_Character',translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1],children:[...(doc.scenes[doc.scene||0].nodes||[])]})-1;nodeIDs.set(avatar,avatarID);doc.scenes=[{name:'Quata Character Animation Library',nodes:[avatarID]}];doc.scene=0;
 function addView(arr,target){const bytes=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength),offset=length;chunks.push({offset,bytes:new Uint8Array(bytes)});length+=Math.ceil(bytes.byteLength/4)*4;let v={buffer:0,byteOffset:offset,byteLength:bytes.byteLength};if(target)v.target=target;return doc.bufferViews.push(v)-1;}
 function accessor(arr,size,type,ct=5126,target=null,bounds=false){let a={bufferView:addView(arr,target),componentType:ct,count:arr.length/size,type};if(bounds){a.min=Array(size).fill(Infinity);a.max=Array(size).fill(-Infinity);for(let i=0;i<arr.length;i++){a.min[i%size]=Math.min(a.min[i%size],arr[i]);a.max[i%size]=Math.max(a.max[i%size],arr[i]);}}return doc.accessors.push(a)-1;}
 const matIds=new Map,geomIds=new Map;
 function getMat(m){if(matIds.has(m))return matIds.get(m);const idx=doc.materials.push({name:m.name,pbrMetallicRoughness:{baseColorFactor:[...m.color.map(v=>Math.pow(v,2.2)),m.alpha],roughnessFactor:m.rough,metallicFactor:m.metal},doubleSided:true})-1;matIds.set(m,idx);return idx;}
 function geomData(g){if(geomIds.has(g))return geomIds.get(g);const out={attributes:{POSITION:accessor(new Float32Array(g.p),3,'VEC3',5126,34962,true),NORMAL:accessor(new Float32Array(g.n),3,'VEC3',5126,34962),TEXCOORD_0:accessor(new Float32Array(g.uv),2,'VEC2',5126,34962)},indices:accessor(new Uint32Array(g.i),1,'SCALAR',5125,34963)};geomIds.set(g,out);return out;}
 const propNodes=[];
 function addNode(n,parentID){const nd={name:n.name,translation:n.t.slice(),rotation:n.q.slice(),scale:n.visible?n.s.slice():[.00001,.00001,.00001],children:[]},id=doc.nodes.push(nd)-1;nodeIDs.set(n,id);doc.nodes[parentID].children??=[];doc.nodes[parentID].children.push(id);propNodes.push(n);
 for(const o of n.meshes)if(!o.batched){const gd=geomData(transformGeom(JSON.parse(JSON.stringify(o.g)),o.local)),meshId=doc.meshes.push({name:n.name+'_'+o.mat.name,primitives:[{...gd,material:getMat(o.mat),mode:4}]})-1,childId=doc.nodes.push({name:n.name+'_geometry_'+meshId,mesh:meshId,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]})-1;nd.children.push(childId);}
 for(const ch of n.children)addNode(ch,id);return id;}
 evaluateAction(only||'idle',0,{accessory:accessoryMode,effects:false,route:false,smoothLoop:true});addNode(propsRoot,avatarID);
 const animated=[avatar,...modelNodes,...propNodes],names={idle:'Idle',walk:'Walk_Skip',run:'Run',wave:'Wave',dig:'Dig',plant:'Plant',water:'Water',harvest:'Harvest',carry:'Carry_Crate',alert:'Alert',hit:'Hit',fall:'Fall'};
 for(const id of only?[only]:Object.keys(ACTIONS)){
  const clip=ACTIONS[id],N=Math.ceil(clip.duration*30)+1,times=new Float32Array(N),tracks=new Map(animated.map(n=>[n,{t:[],q:[],s:[]}]));
  for(let f=0;f<N;f++){const t=clip.duration*f/(N-1);times[f]=t;evaluateAction(id,t,{accessory:accessoryMode,effects:false,route:false,smoothLoop:true});
   for(const n of animated){const out=tracks.get(n);out.t.push(...n.t);let q=n.q.slice();if(out.q.length){const prev=out.q.slice(-4);if(prev.reduce((v,x,i)=>v+x*q[i],0)<0)q=q.map(x=>-x);}out.q.push(...q);out.s.push(...(n.visible?n.s:[.00001,.00001,.00001]));}
  }
  const timeID=accessor(times,1,'SCALAR',5126,null,true),shortTimeID=accessor(new Float32Array([0,clip.duration]),1,'SCALAR',5126,null,true);const a={name:(rig.clipMap?.[id]?.name||names[id]||id),samplers:[],channels:[],extras:{loop:clip.loop,source:clip.origin,defaultAccessory:clip.prop,description:clip.desc,...(id==='fall'?{grounding:{mode:'pelvis-contact',...ACTION_TUNING.fall}}:{})}};
  for(const[n,tr]of tracks)for(const[key,path,size,type]of[['t','translation',3,'VEC3'],['q','rotation',4,'VEC4'],['s','scale',3,'VEC3']]){const v=tr[key];let varying=false;for(let i=size;i<v.length;i++)if(Math.abs(v[i]-v[i%size])>1e-6){varying=true;break;}const values=new Float32Array(varying?v:[...v.slice(0,size),...v.slice(0,size)]),o=accessor(values,size,type),s=a.samplers.push({input:varying?timeID:shortTimeID,output:o,interpolation:'LINEAR'})-1;a.channels.push({sampler:s,target:{node:nodeIDs.get(n),path}});}
  doc.animations.push(a);await new Promise(resolve=>setTimeout(resolve,0));
 }
 doc.buffers=[{byteLength:length}];let json=new TextEncoder().encode(JSON.stringify(doc)),jsonLength=Math.ceil(json.byteLength/4)*4,binLength=Math.ceil(length/4)*4,total=12+8+jsonLength+8+binLength,buf=new ArrayBuffer(total),dv=new DataView(buf),out=new Uint8Array(buf);dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);dv.setUint32(12,jsonLength,true);dv.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+jsonLength);out.set(json,20);dv.setUint32(20+jsonLength,binLength,true);dv.setUint32(24+jsonLength,0x004e4942,true);for(const c of chunks)out.set(c.bytes,28+jsonLength+c.offset);return new Blob([buf],{type:'model/gltf-binary'});
 }finally{baking=false;if(rig)evaluateAction(state.clip,state.t,state);}
}

const $=id=>document.getElementById(id);
const icons={
 idle:'<path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="5"/>',
 walk:'<circle cx="13" cy="4" r="2"/><path d="m7 10 4-3 4 2 3 5m-7-7-2 7 5 2 2 5m-7-7-4 7"/>',
 run:'<circle cx="15" cy="4" r="2"/><path d="m6 9 5-2 4 4 5 1m-9-5-3 7 5 2 2 5m-7-7-3 4H1"/>',
 wave:'<path d="M8 20c-3-3-5-7-3-8l3 2V7c0-2 2-2 2 0v4-6c0-2 2-2 2 0v6-5c0-2 2-2 2 0v5-3c0-2 2-2 2 0v8c0 3-2 5-5 5H8m10-17 2 2m-3-4 3 1"/>',
 dig:'<path d="m7 3 10 16M3 5l7-3m4 18 6-4 2 3-6 4z"/>',
 plant:'<path d="M12 20v-8C4 12 3 8 4 4c6 0 9 3 8 8Zm0 3c0-7 4-10 9-10 0 6-4 10-9 10ZM3 21h18"/>',
 water:'<path d="M5 10h9v9H5zM6 10V7a3 3 0 0 1 6 0v3m2 3 5-5 3 2-7 7M3 12H1v5h4m14-3 1 3m2-2 1 3"/>',
 harvest:'<path d="M12 8c-8-5-11 5-7 11 2 3 5 2 7 1 2 1 5 2 7-1 4-6 1-16-7-11Zm0 0V4m0 1c1-3 4-3 6-3-1 3-3 4-6 3Z"/>',
 crate:'<path d="M3 9h18v12H3zM3 13h18M7 9v12m10-12v12M7 8a3 3 0 1 1 5-3 3 3 0 1 1 5 3M12 3V1"/>',
 alert:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/><path d="M7 2 4 4l3 1m10-3 3 2-3 1"/>',
 sack:'<path d="m9 6-2-4h10l-2 4m-6 0h6c0 4 6 6 6 12 0 5-18 5-18 0 0-6 6-8 6-12Zm-1 1h8M12 11v7m0-4-3-2m3 4 3-3"/>',
 hit:'<path d="m12 2 2 6 6-3-3 6 5 3-7 1 1 7-5-5-6 4 2-7-6-3 7-1z"/>',
 fall:'<circle cx="5" cy="9" r="2"/><path d="m8 12 6 3 7-2m-7 2 5 5m-8-7-2 6M2 21h20"/>',
 orbit:'<circle cx="12" cy="12" r="4"/><path d="M3 8a10 6 0 1 0 3-3M3 3v5h5"/>',
 frame:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/><circle cx="12" cy="12" r="3"/>',
 camera:'<path d="M4 6h4l2-3h4l2 3h4v14H4z"/><circle cx="12" cy="12" r="4"/>',
 play:'<path d="m8 5 11 7-11 7z" fill="currentColor"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
 repeat:'<path d="m17 2 4 4-4 4m4-4H7a4 4 0 0 0-4 4m4 12-4-4 4-4m-4 4h14a4 4 0 0 0 4-4"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',code:'<path d="m7 6-5 6 5 6m10-12 5 6-5 6m-4-16-2 20"/>',
 clip:'<path d="M7 3h10v18H7zM7 7h10M7 17h10"/>',auto:'<path d="m12 2 2 7 7 3-7 2-2 8-2-8-8-2 8-3z"/>',none:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.idle)+'</svg>';}
function refreshIcons(){document.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));}refreshIcons();
const canvas=$('view'),overlay=$('rig-overlay');let renderer=null,ready=false,contextLost=false,baking=false;
const state={clip:'walk',t:0,travel:0,play:true,loop:true,speed:1,accessory:'auto',route:false,effects:true,shadows:true,rig:false,grips:false,mode:'material',smoothLoop:true,detail:.35,cartoon:1,autoRotate:false};
let camera={yaw:.44,pitch:.11,distance:4.0,target:[0,.83,0]},eye=[0,1,4],vp=M.id(),transition=null,frameCount=0,toastTimer,restoreFocus=null;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function fail(e){console.error(e);$('error').style.display='grid';$('error-text').textContent=e.message||String(e);$('loading').style.display='none';}
window.addEventListener('error',e=>{if(!ready)fail(e.error||e.message);});
function capturePose(){return new Map([avatar,...modelNodes,...Object.values(props)].map(n=>[n,{t:n.t.slice(),q:n.q.slice(),s:n.s.slice()}]));}
function syncPlayback(){$('play').innerHTML=icon(state.play?'pause':'play');$('play').setAttribute('aria-label',state.play?'Pausar':'Reproducir');$('repeat').classList.toggle('active',state.loop);$('repeat').setAttribute('aria-pressed',state.loop);}
function setAnimation(name,animate=true){if(!ACTIONS[name]||!ready)return;transition=animate?{from:capturePose(),age:0}:null;state.clip=name;state.t=0;state.play=true;state.loop=ACTIONS[name].loop;
 // Explicit work-action choices use their normal accessory; override is always reversible.
 state.accessory='auto';syncPropButtons();document.querySelectorAll('.anim-button').forEach(b=>{const a=b.dataset.anim===name;b.classList.toggle('active',a);b.setAttribute('aria-pressed',a);});$('clip-label').textContent=ACTIONS[name].name;$('clip-note').textContent=ACTIONS[name].desc;$('clip-origin').textContent=ACTIONS[name].origin.toUpperCase();$('live-origin').textContent=ACTIONS[name].origin.toUpperCase();syncPlayback();renderFrame(0);}
function syncPropButtons(){document.querySelectorAll('.prop-btn').forEach(b=>{const on=b.dataset.prop===state.accessory;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});}
for(const [i,[id,a]]of Object.entries(Object.entries(ACTIONS))){const b=document.createElement('button');b.className='anim-button';b.dataset.anim=id;b.setAttribute('aria-pressed',id==='walk');b.innerHTML='<small>'+String(+i+1).padStart(2,'0')+'</small>'+icon(a.icon)+'<span>'+(a.short||a.name)+'</span>';b.onclick=()=>setAnimation(id);$('animation-grid').append(b);}
for(const [id,name,ic]of [['auto','Automático','auto'],['none','Ninguno','none'],['can','Regadera','water'],['sack','Saco','sack'],['crate','Frutas','crate'],['hoe','Azada','dig']]){const b=document.createElement('button');b.className='prop-btn';b.dataset.prop=id;b.innerHTML=icon(ic)+'<span>'+name+'</span>';b.onclick=()=>{state.accessory=id;transition=null;syncPropButtons();if(ready)renderFrame(0);};$('prop-grid').append(b);}syncPropButtons();
function project(p){const x=vp[0]*p[0]+vp[4]*p[1]+vp[8]*p[2]+vp[12],y=vp[1]*p[0]+vp[5]*p[1]+vp[9]*p[2]+vp[13],w=vp[3]*p[0]+vp[7]*p[1]+vp[11]*p[2]+vp[15];return[(x/w*.5+.5)*overlay.width,(-y/w*.5+.5)*overlay.height];}
function drawOverlay(){const c=overlay.getContext('2d');c.clearRect(0,0,overlay.width,overlay.height);const dpr=canvas.width/canvas.clientWidth;c.lineWidth=1.8*dpr;c.shadowBlur=3*dpr;c.shadowColor='#254132';
 if(state.rig){c.strokeStyle='#c6f394';c.fillStyle='#e9ffbc';for(const b of bones){let p=project(pos(b));if(b.parent?.isBone){let q=project(pos(b.parent));c.beginPath();c.moveTo(...q);c.lineTo(...p);c.stroke();}c.beginPath();c.arc(...p,2.6*dpr,0,TAU);c.fill();}}
 if(state.grips){for(const n of Object.values(props))if(n.visible)for(const [tag,point]of Object.entries(activePropGrips(n))){if(n.activeGrips&&!n.activeGrips.includes(tag))continue;const a=project(M.point(n.world,point)),palm=V.add(pos(rig.arms[tag].end),Q.rotate(rig.arms[tag].end.worldQ,[0,rig.palm,0])),b=project(palm);c.strokeStyle='#e9c95b';c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();c.fillStyle='#fff7bd';c.beginPath();c.arc(...a,5*dpr,0,TAU);c.fill();c.fillStyle='#194e40';c.font='bold '+(8*dpr)+'px system-ui';c.fillText(tag,a[0]+7*dpr,a[1]-7*dpr);}}
 c.shadowBlur=0;
}
function renderFrame(dt=0){if(!ready||baking||contextLost)return;const res=evaluateAction(state.clip,state.t,{...state,travelTime:state.travel});
 if(transition){transition.age+=dt;const a=smooth(0,.18,transition.age);for(const[n,old]of transition.from){if(state.clip==='dig'&&n===props.hoe)continue;n.t=V.lerp(old.t,n.t,a);n.q=Q.slerp(old.q,n.q,a);n.s=V.lerp(old.s,n.s,a);}if(a>=1)transition=null;update();if(state.clip==='dig'&&props.hoe.visible){const p=clamp(state.t/ACTIONS.dig.duration,0,1),lift=smooth(.06,.43,p)*(1-smooth(.54,.67,p));solveDigArms(props.hoe,lift);if(Math.max(...Object.values(rig.digSafety.contacts))>.001||Math.max(...Object.values(rig.digSafety.penetration))>.001){transition=null;evaluateAction('dig',state.t,{...state,travelTime:state.travel});}lastGripErrors={...rig.digSafety.contacts};}}
 if(state.autoRotate)camera.yaw+=dt*.17;
 const mobile=canvas.clientWidth<600,ct=camera.target.slice(),fallFollow=state.clip==='fall'?smooth(0,.75,state.t/ACTIONS.fall.duration):0,cd=camera.distance*(mobile?1.16:1)*(1+.06*fallFollow);
 // Follow the imported backward displacement so the head remains in frame,
 // including the side view. This never changes the model's animation/root motion.
 if(fallFollow){ct[0]+=rig.hips.t[0]*fallFollow;ct[2]+=(rig.hips.t[2]-.35*fallFollow)*fallFollow;ct[1]-=.22*fallFollow;}
 if(mobile)ct[1]+=.12;const cp=Math.cos(camera.pitch);eye=V.add(ct,[cd*cp*Math.sin(camera.yaw),cd*Math.sin(camera.pitch),cd*cp*Math.cos(camera.yaw)]);vp=M.mul(M.perspective(34*PI/180,canvas.width/canvas.height,.035,130),M.lookAt(eye,ct));renderer.render(vp,eye,palette(),state);drawOverlay();
 $('time').textContent=state.t.toFixed(2)+' / '+ACTIONS[state.clip].duration.toFixed(2)+' s';$('timeline').value=String(Math.round(state.t/ACTIONS[state.clip].duration*1000));$('live-prop').textContent=res.prop==='none'?'Sin accesorio':(ACCESSORY_SPECS[res.prop]?.label||'Sin accesorio');
 if(state.grips){$('grip-status').textContent=Object.entries(lastGripErrors).map(([tag,e])=>(tag==='R'?'Derecha':'Izquierda')+': '+(e*100).toFixed(1)+' cm al agarre').join(' · ');}else $('grip-status').textContent='';frameCount++;
}
function seek(t){state.t=clamp(t,0,ACTIONS[state.clip].duration);state.play=false;transition=null;syncPlayback();renderFrame(0);}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.65);canvas.width=Math.max(2,Math.round(r.width*d));canvas.height=Math.max(2,Math.round(r.height*d));overlay.width=canvas.width;overlay.height=canvas.height;if(ready)renderFrame(0);}
new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);
$('play').onclick=()=>{if(!ready)return;if(state.t>=ACTIONS[state.clip].duration&&!state.play)state.t=0;state.play=!state.play;syncPlayback();};
$('repeat').onclick=()=>{state.loop=!state.loop;syncPlayback();};
$('timeline').oninput=e=>seek(+e.target.value/1000*ACTIONS[state.clip].duration);
$('speed').oninput=e=>{state.speed=+e.target.value;$('speed-value').value=state.speed.toFixed(2)+'×';};
for(const[id,key]of [['route','route'],['effects','effects'],['rig-check','rig'],['grips-check','grips'],['shadows','shadows'],['smooth-loop','smoothLoop']])$(id).onchange=e=>{state[key]=e.target.checked;transition=null;renderFrame(0);};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));renderFrame(0);});
function markView(v){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));}
function setCameraView(v){const views={three:[.44,.11,4.0,[0,.83,0]],front:[0,.07,4.0,[0,.83,0]],side:[PI/2,.09,4.0,[0,.83,0]],back:[PI,.11,4.0,[0,.83,0]],game:[.7,.64,5.0,[0,.68,0]]};const a=views[v]||views.three;camera={yaw:a[0],pitch:a[1],distance:a[2],target:a[3].slice()};markView(v);renderFrame(0);}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setCameraView(b.dataset.view));$('reset-camera').onclick=()=>setCameraView('three');$('rotate').onclick=()=>{state.autoRotate=!state.autoRotate;$('rotate').classList.toggle('active',state.autoRotate);};
const pointers=new Map;let drag=null,pinch=null;canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);if(pointers.size===1)drag=[e.clientX,e.clientY];if(pointers.size===2){let a=[...pointers.values()];pinch=V.len([a[0][0]-a[1][0],a[0][1]-a[1][1],0]);}canvas.style.cursor='grabbing';});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1&&drag){camera.yaw-=(e.clientX-drag[0])*.007;camera.pitch=clamp(camera.pitch+(e.clientY-drag[1])*.005,-.22,1.25);drag=[e.clientX,e.clientY];markView('');}else if(pointers.size===2){let a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pinch)camera.distance=clamp(camera.distance*pinch/d,2.0,8.5);pinch=d;drag=null;}renderFrame(0);});const up=e=>{pointers.delete(e.pointerId);if(!pointers.size){drag=pinch=null;canvas.style.cursor='grab';}else{drag=[...pointers.values()][0];pinch=null;}};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',e=>{e.preventDefault();camera.distance=clamp(camera.distance*Math.exp(e.deltaY*.001),2,8.5);renderFrame(0);},{passive:false});
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}
$('screenshot').onclick=()=>{renderFrame(0);canvas.toBlob(b=>{if(b)download(b,'Quata_'+state.clip+'.png');},'image/png');};
function openModal(id){restoreFocus=document.activeElement;$(id).classList.add('open');$(id).querySelector('button').focus();}function closeModals(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'));restoreFocus?.focus();}
$('reference-btn').onclick=()=>openModal('ref-modal');$('help-btn').onclick=()=>openModal('help-modal');document.querySelectorAll('.modal').forEach(m=>{m.querySelector('.close').onclick=closeModals;m.onclick=e=>{if(e.target===m)closeModals();};});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModals();return;}if(document.querySelector('.modal.open'))return;if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('play').click();}if(e.key.toLowerCase()==='r')setCameraView('three');if(/^[1-9]$/.test(e.key))setAnimation(Object.keys(ACTIONS)[+e.key-1]);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;toast('El navegador ha perdido el contexto gráfico. Recarga el HTML para recuperarlo.');});canvas.addEventListener('webglcontextrestored',()=>location.reload());
function templateData(){return {schema:'quata.character-template',version:1,revision:5,units:'meters',up:'+Y',forward:'+Z',character:{name:'Sunhorn Chieftain / Búfalo',source:'User-provided Meshy GLB · Sunhorn Chieftain with transferred bestiary clips',bones:bones.length,triangles:charMeshes.reduce((n,m)=>n+m.g.i.length/3,0)},boneMap:Object.fromEntries(['Hips','Spine','Spine1','Spine2','Head','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'].map(n=>[n,rig[n].name])),clips:Object.fromEntries(Object.entries(ACTIONS).map(([id,a])=>[id,{name:a.name,duration:a.duration,loop:a.loop,source:a.origin,defaultAccessory:a.prop}])),accessories:ACCESSORY_SPECS,actionTuning:ACTION_TUNING,ik:{method:'analytical two-bone IK',wristToPalmMeters:rig.palm,arms:Object.fromEntries(Object.entries(rig.arms).map(([k,a])=>[k,{upperArm:a.up.name,forearm:a.low.name,hand:a.end.name,lengths:[a.L1,a.L2]}]))},retargeting:{automatic:false,calibration:sourceDoc.asset.extras.retargeting,notes:'Base v4. Transferencia calibrada sobre la carrera común; cada pista conserva sus tiempos y su número de muestras.'},export:{fps:30,includes:['mesh','materials','skin','animation clips','accessories'],excludes:['stage','lighting','particles']},limitations:['Sin rig facial ni dedos individuales','Acciones de granja procedurales de validación','Verificar pies y deformaciones en el motor de destino','La caída admite intersección de cabeza/sombrero con el suelo; pelvis anclada tras el impacto']};}
$('export-template').onclick=()=>download(new Blob([JSON.stringify(templateData(),null,2)],{type:'application/json'}),'Quata_Bufalo_Plantilla.json');
async function doExport(only){const btns=[$('export-all'),$('export-clip')];btns.forEach(b=>b.disabled=true);const playing=state.play;state.play=false;transition=null;toast('Horneando poses, agarres y accesorios a 30 fps…');try{await new Promise(r=>setTimeout(r,50));const blob=await exportLibrary(only);download(blob,only?'Quata_'+only+'.glb':'Quata_Bufalo_Bestiario_Corregido_v3.glb');toast('GLB preparado. Incluye el modelo real, el rig y las acciones seleccionadas.');}catch(e){console.error(e);toast('No se pudo exportar: '+e.message);}finally{baking=false;state.play=playing;btns.forEach(b=>b.disabled=false);syncPlayback();renderFrame(0);}}
$('export-all').onclick=()=>doExport(null);$('export-clip').onclick=()=>doExport(state.clip);
async function init(){try{renderer=new Renderer(canvas);resize();await loadCharacter(decodeBase64($('model-data').textContent));setupRig();buildAccessories();buildEnvironment();update();ready=true;setAnimation('walk',false);$('mesh-stats').textContent=new Intl.NumberFormat('es-ES').format(charMeshes.reduce((s,m)=>s+m.g.i.length/3,0))+' tri';$('bone-stats').textContent=bones.length+' huesos';$('loading').style.display='none';window.__quata={get digSafety(){return rig.digSafety;},get digToolSafety(){return rig.digToolSafety;},state,clips:ACTIONS,bones,modelNodes,props,rig,renderer,meshList,avatar,sourceDoc,setAnimation,seek,render:()=>renderFrame(0),setCameraView,setAccessory(id){state.accessory=id;syncPropButtons();transition=null;renderFrame(0);},get gripErrors(){return lastGripErrors;},get frameCount(){return frameCount;},exportLibrary,templateData,validation:{source:'Original v4 + Kofi / Kofi joven',matchedAnimationTracks:true,terminalKeysRetained:true},get bounds(){let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];const pal=palette();for(const m of charMeshes){const g=m.g;for(let i=0;i<g.p.length/3;i+=13){let p=[0,0,0],v=g.p.slice(i*3,i*3+3);for(let k=0;k<4;k++){let w=g.w[i*4+k];if(w)p=V.add(p,V.mul(M.point(pal.slice(g.j[i*4+k]*16,g.j[i*4+k]*16+16),v),w));}for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}}}return {min,max};}};window.__quataReady=true;
 let last=performance.now(),fpsTime=last,frames=0;function loop(now){const dt=clamp((now-last)/1000,0,.05);last=now;if(!document.hidden&&!baking&&!contextLost){const wasPlaying=state.play;if(state.play){state.t+=dt*state.speed;state.travel+=dt*state.speed;const d=ACTIONS[state.clip].duration;if(state.t>=d){if(state.loop)state.t%=d;else{state.t=d;state.play=false;syncPlayback();}}}if(wasPlaying||state.play||transition||state.autoRotate){renderFrame(dt);frames++;}if(now-fpsTime>1500){$('fps').textContent=frames?Math.round(frames*1000/(now-fpsTime))+' FPS':'PAUSA';frames=0;fpsTime=now;}}requestAnimationFrame(loop);}requestAnimationFrame(loop);
 }catch(e){fail(e);}}
init();
