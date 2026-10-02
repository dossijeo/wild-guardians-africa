
'use strict';
/*
 * EXPERIMENTO AUTOCONTENIDO V8 — El guardián de la granja
 * La textura es la imagen original con el fondo blanco retirado, no un render nuevo.
 * No se descarga nada de Internet: HTML, CSS, JS, shaders e imagen están aquí.
 * EDITAR EL TUTORIAL: cambia TUTORIAL_LINES. El avance es siempre manual.
 * Reutilización: window.GuardianTutorial.start()/next()/finish()/preview(estado)/getState().
 */
const SPRITE_DATA = '/assets/5170de5cc32e7da971a861db79d090b4bdc2c6cece5b22e4b1c06fe3de59e464.webp';
const TUTORIAL_LINES = [
 {title:'Bienvenido a estas tierras',text:'Soy el guardián. Gira la cámara: mis manos te mostrarán esta granja.',emotion:'greeting',description:'Una inclinación lateral amplia que abre la bienvenida.'},
 {title:'Prepara tu primera parcela',text:'Toca esta parcela para sembrar. La mano señala el cultivo.',emotion:'speak',description:'Balanceo amplio y giros alternos mientras explica.'},
 {title:'El primer brote',text:'Bien hecho. Mantén pulsada esta parcela para seleccionarla.',emotion:'acknowledge',description:'Doble inclinación lateral breve con acercamiento y pulsos cálidos.'},
 {title:'Una semilla, un misterio',text:'Arrastra para explorar. Mi mano pasa por encima de los obstáculos.',emotion:'curious',description:'Inclina mucho la cabeza y sostiene la mirada curiosa.'},
 {title:'Escucha con atención',text:'Mira la entrada: deja paso y prepara defensas para los animales.',emotion:'warning',description:'Se acerca de forma evidente y queda vigilante.'},
 {title:'Más allá de la sabana',text:'Pellizca con dos dedos para acercarte o alejarte del poblado.',emotion:'reveal',description:'Levitación elevada, cabeza alzada y motas doradas.'},
 {title:'También hay que saber esperar',text:'Observa el carro: la mano lo sigue mientras yo espero tu toque.',emotion:'idle',description:'Balanceo continuo, con la intensidad del habla anterior.'},
 {title:'Hasta la próxima cosecha',text:'Cuida estas tierras. Nos veremos en la próxima cosecha.',emotion:'farewell',description:'Inclinación lenta y retirada serena, sin reverencia frontal.'}
];
const HAND_ASSETS = {"press": "/assets/50d4d0360f13f79647a7bdee41955d4d785df39fddb9ee7638a888567d360766.webp", "tap": "/assets/bb29d190b78bb429a12bb29c204969ed56067406d29f952d963c904ea039331c.webp", "pinch": "/assets/b965d4ec542922078ea805f6d7fc9b393ea9d40dcb9d52d715ffe3f33a726ce0.webp", "point": "/assets/4da8e967e0a888ba10695b12b4179e1cf8ac02ea241b98872de4c2ee31681538.webp", "drag": "/assets/fb6c2768a7e06cb1bdf4a99d067dfa703df0d56155d5d8872f16a3a6d6b611c8.webp", "open": "/assets/6b280de12c498d9492d0f9c4c55db20bd08e544107328972f29382ed68c34ac9.webp"};
const HAND_INFO = {"tap": {"width": 327, "heightPx": 488, "pivot": [0.295, 0.878], "height": 1.8, "rotation": 0}, "press": {"width": 265, "heightPx": 513, "pivot": [0.723, 0.022], "height": 1.72, "rotation": 3.141592653589793}, "pinch": {"width": 384, "heightPx": 472, "pivot": [0.74, 0.4], "height": 1.8, "rotation": 0}, "point": {"width": 491, "heightPx": 248, "pivot": [0.982, 0.25], "height": 0.82, "rotation": 0}, "drag": {"width": 345, "heightPx": 495, "pivot": [0.65, 0.18], "height": 1.75, "rotation": 0}, "open": {"width": 379, "heightPx": 490, "pivot": [0.5, 0.98], "height": 1.8, "rotation": 0}};
const HAND_STEPS = [{"kind": "open", "target": "plaza"}, {"kind": "tap", "target": "parcela-a"}, {"kind": "press", "target": "parcela-b"}, {"kind": "drag", "target": "plaza"}, {"kind": "point", "target": "entrada"}, {"kind": "pinch", "target": "granero"}, {"kind": "open", "target": "carro"}, {"kind": null, "target": null}];
const $ = id => document.getElementById(id);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const smoothstep = (a,b,x) => {const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion){document.body.classList.add('reduce-motion');for(const id of ['motion','magic']){$(id).value='0';$(id+'-value').textContent='0 %';}}

// ---------------------------------------------------------------------------
// Escena WebGL independiente del HUD. Manos = 4 vértices + 6 índices (2 tris).
// El render del avatar V4.2 conserva SU contexto y sus curvas, sin sustituciones.
// ---------------------------------------------------------------------------
const V3={
 add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
 sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
 mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm(a){return this.mul(a,1/(Math.hypot(...a)||1));}
};
const M4={
 perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),n=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*near*far*n,0]);},
 look(eye,target){const z=V3.norm(V3.sub(eye,target)),x=V3.norm(V3.cross([0,1,0],z)),y=V3.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V3.dot(x,eye),-V3.dot(y,eye),-V3.dot(z,eye),1]);}
};
const rgb8=hex=>{const n=parseInt(hex.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
class WorldGeometry {
 constructor(){this.data=[];}
 vertex(p,n,c){this.data.push(...p,...n,...c);}
 tri(a,b,c,color){const n=V3.norm(V3.cross(V3.sub(b,a),V3.sub(c,a)));this.vertex(a,n,color);this.vertex(b,n,color);this.vertex(c,n,color);}
 quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
 box(p,s,c){const [x,y,z]=p,[w,h,d]=s.map(v=>v/2);const a=[[x-w,y-h,z-d],[x+w,y-h,z-d],[x+w,y+h,z-d],[x-w,y+h,z-d],[x-w,y-h,z+d],[x+w,y-h,z+d],[x+w,y+h,z+d],[x-w,y+h,z+d]];
  for(const f of [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[3,7,6,2],[0,1,5,4]])this.quad(...f.map(i=>a[i]),c);
 }
 cylinder(p,r,h,c,n=24){const [x,y,z]=p;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
  const p0=[x+Math.cos(a)*r,y-h/2,z+Math.sin(a)*r],p1=[x+Math.cos(a)*r,y+h/2,z+Math.sin(a)*r],p2=[x+Math.cos(b)*r,y+h/2,z+Math.sin(b)*r],p3=[x+Math.cos(b)*r,y-h/2,z+Math.sin(b)*r];
  this.quad(p0,p1,p2,p3,c);this.tri([x,y+h/2,z],p2,p1,c);
 }}
 cone(p,r,h,c,n=32){const [x,y,z]=p;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,k=.96+.04*Math.sin(i*3.7);this.tri([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x,y+h,z],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],c.map(v=>v*k));}}
 ellipsoid(p,r,c,n=18,m=10){const at=(i,j)=>{const a=i/m*Math.PI-Math.PI/2,b=j/n*Math.PI*2,q=[Math.cos(a)*Math.cos(b),Math.sin(a),Math.cos(a)*Math.sin(b)];return {p:p.map((v,k)=>v+q[k]*r[k]),n:V3.norm(q.map((v,k)=>v/r[k]))};};
  for(let i=0;i<m;i++)for(let j=0;j<n;j++){const a=at(i,j),b=at(i+1,j),d=at(i,j+1),e=at(i+1,j+1);for(const t of [a,b,e,a,e,d])this.vertex(t.p,t.n,c);}
 }
 ring(p,r,width,c,segments=48){for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;const at=(rad,ang)=>[p[0]+Math.cos(ang)*rad,p[1],p[2]+Math.sin(ang)*rad];this.quad(at(r,a),at(r,b),at(r-width,b),at(r-width,a),c);}}
 line(a,b,c){this.vertex(a,[0,1,0],c);this.vertex(b,[0,1,0],c);}
 array(){return new Float32Array(this.data);}
}
function compileWorldProgram(gl,vs,fs,attributes){
 const make=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error('Shader del mundo: '+e);}return sh;};
 const v=make(gl.VERTEX_SHADER,vs),f=make(gl.FRAGMENT_SHADER,fs),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);attributes.forEach((name,i)=>gl.bindAttribLocation(p,i,name));gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('No se pudo enlazar el mundo WebGL: '+gl.getProgramInfoLog(p));return p;
}
// Recorta el quad 3D contra la huella XZ de un obstáculo. La Y se interpola:
// también se detectan cruces en el centro del plano, no solo en sus esquinas.
function clipQuadXZ(points,box,padding=0){
 let poly=points.map(p=>p.slice());
 for(const [axis,bound,sign] of [[0,box.min[0]-padding,1],[0,box.max[0]+padding,-1],[2,box.min[2]-padding,1],[2,box.max[2]+padding,-1]]){
  const input=poly;poly=[];if(!input.length)break;
  for(let i=0;i<input.length;i++){
   const a=input[i],b=input[(i+1)%input.length],da=(a[axis]-bound)*sign,db=(b[axis]-bound)*sign;
   if(da>=0)poly.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db);poly.push(a.map((v,k)=>v+(b[k]-v)*t));}
  }
 }
 return poly;
}
class HandHints3D {
 constructor(scene,images){this.scene=scene;this.images=images;this.kind=null;this.stepIndex=-1;this.started=0;this.extraY=0;this.size=1;this.opacity=0;this.wire=false;this.last=null;this.routeFloor=0;this.custom=null;}
 setStep(i,t){this.stepIndex=i;this.started=t;this.extraY=0;this.last=null;this.custom=null;this.kind=HAND_STEPS[i]?.kind||null;this.routeFloor=this.kind==='drag'?this.routeClearance():0;}
 route(u){return [-2.1+u*4.25,0,1.8-u*4.1];}
 routeClearance(){
  // Reserva TODO el corredor antes de animar. Nunca se interpola una altura
  // baja hacia una alta atravesando la fachada al llegar al siguiente edificio.
  let highest=.03;const radius=1.95*this.size;
  for(let i=0;i<=48;i++){const p=this.route(i/48);for(const b of this.scene.colliders){if(p[0]>=b.min[0]-radius&&p[0]<=b.max[0]+radius&&p[2]>=b.min[2]-radius&&p[2]<=b.max[2]+radius)highest=Math.max(highest,b.max[1]);}}
  return highest+.10;
 }
 configuration(){return this.custom||(HAND_STEPS[this.stepIndex]||null);}
 makePose(t,cam){
  const cfg=this.configuration();if(!cfg?.kind)return null;
  const type=cfg.kind,asset=HAND_INFO[type],obj=this.scene.objects.get(cfg.target);
  if(!asset||(!obj&&!cfg.position))return null;
  let target=cfg.position?cfg.position.slice():V3.add(obj.position,cfg.local||obj.anchor);
  const a=this.scene.handMotion?t-this.started:0;
  let root=target.slice(),r=asset.rotation||0,height=asset.height*this.size,bob=0;
  if(type==='drag'){
   const s=.5-.5*Math.cos(a*.72),p=this.route(s);target=[p[0],this.scene.surfaceAt(p[0],p[2])+.025,p[2]];
   root=[p[0],this.routeFloor+height*.82+Math.sin(a*1.7)*.035,p[2]];r=.028*Math.sin(a*1.2);
  }else if(type==='tap'){
   const p=(a%2.25)/2.25,press=smoothstep(.22,.40,p)*(1-smoothstep(.52,.79,p));bob=.18-.12*press;root[1]+=bob;r=.025*Math.sin(a*1.5);
  }else if(type==='press'){
   const p=(a%3.8)/3.8,down=smoothstep(.10,.24,p)*(1-smoothstep(.73,.91,p));root[1]+=.19-.10*down;r=Math.PI+.015*Math.sin(a*.8);
  }else if(type==='point'){root[1]+=.24+.035*Math.sin(a*1.5);r=.025*Math.sin(a*1.4);}
  else if(type==='pinch'){root[1]+=.28;bob=.04*Math.sin(a*1.5);root[1]+=bob;r=.035*Math.sin(a*1.3);height*=1+.045*Math.sin(a*1.9);}
  else{root[1]+=.25+.055*Math.sin(a*1.6);r=.035*Math.sin(a*1.1);}
  const width=height*asset.width/asset.heightPx,cr=Math.cos(r),sr=Math.sin(r),right=V3.add(V3.mul(cam.right,cr),V3.mul(cam.up,sr)),up=V3.add(V3.mul(cam.up,cr),V3.mul(cam.right,-sr));
  // Pivot UV = punto del gesto (dedo, contacto, hueco del pellizco o muñeca).
  // No se centra la textura en el suelo: esa era la causa del enterramiento.
  const [pu,pv]=asset.pivot,uv=[[0,0],[1,0],[1,1],[0,1]];
  const corners=uv.map(([u,v])=>V3.add(root,V3.add(V3.mul(right,(u-pu)*width),V3.mul(up,(pv-v)*height))));
  return {type,target,root,corners,uv,height,width,objectId:cfg.target||'coordenada',age:a};
 }
 protect(pose,dt=0){
  const floor=pose.type==='drag'?Math.max(.035,this.routeFloor):.035;
  let required=Math.max(0,floor-Math.min(...pose.corners.map(p=>p[1])));
  for(const b of this.scene.colliders){const hit=clipQuadXZ(pose.corners,b,.09);if(hit.length)required=Math.max(required,b.max[1]+.085-Math.min(...hit.map(p=>p[1])));}
  // Subida inmediata a posición segura; descenso amortiguado y SIEMPRE por
  // encima del mínimo geométrico. No esconder el fallo desactivando profundidad.
  this.extraY=Math.max(required,this.extraY*Math.exp(-Math.max(0,dt)*6));
  pose.corners=pose.corners.map(p=>[p[0],p[1]+this.extraY,p[2]]);pose.root[1]+=this.extraY;pose.lift=this.extraY;
  return pose;
 }
 intersections(pose){
  if(!pose)return [];
  const bad=[];if(Math.min(...pose.corners.map(p=>p[1]))<-.00001)bad.push('suelo');
  for(const b of this.scene.colliders){const hit=clipQuadXZ(pose.corners,b,0);if(hit.length&&Math.min(...hit.map(p=>p[1]))<b.max[1]-.00001&&Math.max(...hit.map(p=>p[1]))>b.min[1]+.00001)bad.push(b.id);}
  return bad;
 }
 update(t,dt,cam){
  const active=!['loading','closed','outro','farewell'].includes(phase),alphaTarget=active&&this.configuration()?.kind?1:0;
  this.opacity+=(alphaTarget-this.opacity)*(1-Math.exp(-dt*9));
  if(this.opacity<.002){this.last=null;return null;}
  const p=this.makePose(t,cam);this.last=p?this.protect(p,dt):null;return this.last;
 }
 getState(){const p=this.last;return {kind:p?.type||this.kind,target:p?.objectId||null,vertices:p?4:0,triangles:p?2:0,depthTest:true,depthWrite:false,alpha:this.opacity,minimumY:p?Math.min(...p.corners.map(x=>x[1])):null,targetPosition:p?.target||null,contactPosition:p?.root||null,extraLift:p?.lift||0,intersections:this.intersections(p),corners:p?.corners||null};}
}
class FarmWorld3D {
 constructor(canvas,images){
  this.canvas=canvas;this.images=images;this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});
  if(!this.gl)throw new Error('Este navegador no ha podido iniciar WebGL para la granja.');
  this.lost=false;this.objects=new Map();this.staticColliders=[];this.colliders=[];
  this.camera={yaw:.76,pitch:.67,zoom:1,auto:false};this.handMotion=!reducedMotion;this.currentTime=0;this.lastRender=-1;this.pointers=new Map();this.dragMoved=false;this.feedbackUntil=0;
  this.makeScene();this.hands=new HandHints3D(this,images);this.initGL();this.resize();this.installControls();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;$('world-notice').textContent='Reconectando WebGL…';});
  canvas.addEventListener('webglcontextrestored',()=>{try{this.initGL();this.resize();this.lost=false;$('world-notice').textContent='';}catch(e){console.error(e);$('world-notice').textContent='No se pudo restaurar WebGL. Vuelve a abrir el archivo.';}});
 }
 makeScene(){
  const g=new WorldGeometry(),C={earth:rgb8('#d9b881'),sand:rgb8('#ead4a0'),edge:rgb8('#c2a178'),path:rgb8('#f0dfb7'),soil:rgb8('#9a704c'),leaf:rgb8('#63834a'),sprout:rgb8('#86a752'),wall:rgb8('#e9bf83'),roof:rgb8('#cb864d'),trunk:rgb8('#806045'),gold:rgb8('#c7a354')};
  g.box([0,-.24,0],[11.4,.48,9.5],C.edge);g.box([0,-.06,0],[11.35,.13,9.45],C.sand);
  g.box([0,.028,0],[11.35,.026,.86],C.path);g.box([0,.028,0],[.86,.026,9.45],C.path);
  let seed=629;const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const register=(id,pos,anchor,min,max)=>{this.objects.set(id,{id,position:pos,anchor});if(min)this.staticColliders.push({id,min,max});};
  const hut=(id,x,z,s=1)=>{
   const radius=.78*s,wallH=1.45*s,roofH=.89*s;
   g.cylinder([x,wallH/2+.04,z],radius,wallH,C.wall,28);
   g.cylinder([x,wallH+.05,z],radius*1.13,.095*s,rgb8('#a47445'),28);
   g.cone([x,wallH+.07,z],radius*1.21,roofH,C.roof,36);
   g.ellipsoid([x,wallH+roofH+.065,z],[.105*s,.08*s,.105*s],C.roof,12,6);
   g.box([x,.47*s,z+radius*.986],[.32*s,.83*s,.035],rgb8('#6a513c'));
   g.ellipsoid([x,.865*s,z+radius*1.008],[.16*s,.15*s,.027],rgb8('#6a513c'),14,8);
   g.box([x+radius*.64,.82*s,z+radius*.78],[.17*s,.24*s,.06],rgb8('#987049'));
   g.cylinder([x,.065,z],radius*1.1,.105,rgb8('#ccaa73'),28);
   register(id,[x,0,z],[0,wallH+roofH+.15,0],[x-radius*1.22,.03,z-radius*1.22],[x+radius*1.22,wallH+roofH+.15,z+radius*1.22]);
  };
  hut('granero',2.15,-2.3,1.12);hut('casa',3.8,-.65,.77);hut('cabaña',-2.7,-2.35,.70);
  const plot=(id,x,z)=>{
   g.box([x,.085,z],[1.37,.17,1.9],C.soil);g.box([x,.14,z],[1.29,.065,1.82],rgb8('#ad8355'));
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const xx=x-.46+col*.31,zz=z-.66+row*.44,h=.22+rng()*.12;
    g.cylinder([xx,.20+h/2,zz],.022,h,C.leaf,6);
    g.ellipsoid([xx-.068,.24+h*.45,zz],[.13,.028,.055],C.sprout,8,4);
    g.ellipsoid([xx+.055,.28+h*.6,zz+.035],[.12,.031,.062],C.leaf,8,4);
   }
   register(id,[x,0,z],[0,.58,0],[x-.72,.04,z-.98],[x+.72,.58,z+.98]);
  };
  plot('parcela-a',-2.1,1.8);plot('parcela-b',-.5,2.8);plot('parcela-c',2.35,2.25);
  const tree=(id,x,z,s=1)=>{
   g.cylinder([x,.82*s,z],.105*s,1.64*s,C.trunk,10);
   g.ellipsoid([x-.18*s,1.79*s,z],[1.06*s,.26*s,.75*s],C.leaf,22,10);
   g.ellipsoid([x+.34*s,1.98*s,z+.12*s],[.75*s,.22*s,.55*s],rgb8('#8ea564'),20,10);
   g.ellipsoid([x-.47*s,1.96*s,z-.12*s],[.61*s,.2*s,.52*s],rgb8('#7d9b5c'),18,10);
   register(id,[x,0,z],[0,2.26*s,0],[x-1.32*s,0,z-.82*s],[x+1.21*s,2.26*s,z+.82*s]);
  };
  tree('acacia-oeste',-4.45,.05,.85);tree('acacia-norte',-.7,-3.6,.86);tree('acacia-este',4.35,3.3,.69);
  // Entrada real con dos postes y travesaño. El anclaje apunta a su parte alta.
  for(const z of [-.05,1.35]){g.cylinder([4.6,.69,z],.12,1.38,C.trunk,12);g.ellipsoid([4.6,1.41,z],[.15,.12,.15],C.gold,10,6);}
  g.box([4.6,1.18,.65],[.14,.16,1.54],C.trunk);
  register('entrada',[4.6,0,.65],[0,1.55,0],[4.42,.02,-.23],[4.78,1.55,1.53]);
  register('plaza',[0,0,0],[0,.07,0]);
  for(let i=0;i<48;i++){
   const x=rng()*10.5-5.25,z=rng()*8.7-4.35;if(Math.abs(x)<.6||Math.abs(z)<.65)continue;
   if(this.staticColliders.some(b=>x>b.min[0]-.1&&x<b.max[0]+.1&&z>b.min[2]-.1&&z<b.max[2]+.1))continue;
   const size=.05+rng()*.085;
   g.ellipsoid([x,.034,z],[size,.04,size*.7],rgb8('#c4ad79'),8,4);
  }
  this.geometry=g.array();
  const cart=new WorldGeometry();cart.box([0,.43,0],[.83,.49,.57],rgb8('#b27c45'));
  cart.box([0,.70,0],[.89,.06,.63],rgb8('#cb9756'));
  for(const x of [-.44,.44])for(const z of [-.23,.23])cart.ellipsoid([x,.22,z],[.09,.19,.19],rgb8('#6b4f32'),10,8);
  for(let i=0;i<5;i++)cart.ellipsoid([-.25+i*.12,.77,(i%2-.5)*.24],[.10,.08,.10],rgb8('#d8ac46'),10,6);
  this.cartGeometry=cart.array();this.objects.set('carro',{id:'carro',position:[.9,0,0],anchor:[0,.88,0]});
  this.updateObjects(0);
 }
 updateObjects(t){
  const cart=this.objects.get('carro');cart.position=[.45+Math.sin(t*.26)*1.40,0,0];
  this.colliders=[...this.staticColliders,{id:'carro',min:[cart.position[0]-.55,.02,-.47],max:[cart.position[0]+.55,.89,.47]}];
 }
 surfaceAt(x,z){let h=.037;for(const b of this.colliders)if(x>=b.min[0]&&x<=b.max[0]&&z>=b.min[2]&&z<=b.max[2])h=Math.max(h,b.max[1]);return h;}
 initGL(){
  const gl=this.gl;
  const vs=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uProjection;uniform mat4 uView;uniform vec3 uOffset;varying vec3 vColor;varying vec3 vNormal;varying float vHeight;void main(){vec3 p=aPosition+uOffset;vColor=aColor;vNormal=aNormal;vHeight=p.y;gl_Position=uProjection*uView*vec4(p,1.0);}`;
  const fs=`precision mediump float;varying vec3 vColor;varying vec3 vNormal;varying float vHeight;uniform float uAlpha;uniform float uUnlit;void main(){vec3 n=normalize(vNormal);float sun=max(dot(n,normalize(vec3(-0.65,1.25,0.55))),0.0);float sky=max(n.y,0.0);vec3 light=vec3(.57,.58,.55)+vec3(.43,.37,.25)*sun+vec3(.10,.11,.10)*sky;vec3 c=mix(vColor*light,vColor,uUnlit);gl_FragColor=vec4(c*uAlpha,uAlpha);}`;
  this.program=compileWorldProgram(gl,vs,fs,['aPosition','aNormal','aColor']);
  this.loc={};for(const n of ['uProjection','uView','uOffset','uAlpha','uUnlit'])this.loc[n]=gl.getUniformLocation(this.program,n);
  this.handProgram=compileWorldProgram(gl,`attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uProjection;uniform mat4 uView;varying vec2 vUV;void main(){vUV=aUV;gl_Position=uProjection*uView*vec4(aPosition,1.0);}`,`precision mediump float;varying vec2 vUV;uniform sampler2D uTexture;uniform float uAlpha;void main(){vec4 c=texture2D(uTexture,vUV);if(c.a<.025)discard;gl_FragColor=c*uAlpha;}`,['aPosition','aUV']);
  this.handLoc={};for(const n of ['uProjection','uView','uTexture','uAlpha'])this.handLoc[n]=gl.getUniformLocation(this.handProgram,n);
  const buffer=data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return b;};
  this.worldBuffer=buffer(this.geometry);this.cartBuffer=buffer(this.cartGeometry);this.effectBuffer=gl.createBuffer();this.lineBuffer=gl.createBuffer();
  this.handBuffer=gl.createBuffer();this.handIndices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.handIndices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);
  this.textures={};
  for(const [name,image] of Object.entries(this.images)){
   const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.textures[name]=tex;
  }
  gl.clearColor(0,0,0,0);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 }
 resize(){
  const dpr=Math.min(devicePixelRatio||1,1.65),w=this.canvas.clientWidth,h=this.canvas.clientHeight;
  this.canvas.width=Math.max(2,Math.round(w*dpr));this.canvas.height=Math.max(2,Math.round(h*dpr));
  const bubble=$('bubble'),pad=parseFloat(getComputedStyle(bubble).bottom)||14;
  const bottom=Math.max(bubble.offsetHeight+pad+18,Math.min(112,h*.24));
  const top=h<480?54:78;
  this.viewport={x:8,y:bottom,width:Math.max(100,w-16),height:Math.max(100,h-top-bottom),dpr};
 }
 cameraAxes(){
  const {yaw,pitch}=this.camera,back=[Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch),Math.sin(yaw)*Math.cos(pitch)],right=V3.norm(V3.cross([0,1,0],back)),up=V3.cross(back,right);
  const target=[0,1.05,0],aspect=this.viewport.width/this.viewport.height,fov=.78,tan=Math.tan(fov/2);
  // Se encuadra en el rectángulo libre, no detrás del globo inferior.
  let distance=12;
  const frame=[];
  for(const x of [-5.85,5.85])for(const y of [-.45,.05])for(const z of [-4.92,4.92])frame.push([x,y,z]);
  for(const box of this.staticColliders)for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]])frame.push([x,y,z]);
  // Espacio de manos solo donde hay objetivos; no un techo ficticio sobre
  // las cuatro esquinas del terreno, que empequeñecía mucho la isla en móvil.
  for(const cfg of HAND_STEPS){if(!cfg.kind)continue;const obj=this.objects.get(cfg.target);if(!obj)continue;const p=V3.add(obj.position,obj.anchor);p[1]+=2.05;frame.push(p,V3.add(p,V3.mul(right,1)),V3.add(p,V3.mul(right,-1)));}
  for(const point of frame){const p=V3.sub(point,target),b=V3.dot(p,back);distance=Math.max(distance,b+Math.abs(V3.dot(p,right))/(tan*aspect),b+Math.abs(V3.dot(p,up))/tan);}
  distance=(distance+.50)*this.camera.zoom;
  const eye=V3.add(target,V3.mul(back,distance));return {eye,target,right,up,back,aspect,fov,distance,projection:M4.perspective(fov,aspect,.1,100),view:M4.look(eye,target)};
 }
 bindWorld(buffer,cam,offset=[0,0,0],alpha=1,unlit=0){const gl=this.gl;gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}gl.uniformMatrix4fv(this.loc.uProjection,false,cam.projection);gl.uniformMatrix4fv(this.loc.uView,false,cam.view);gl.uniform3fv(this.loc.uOffset,offset);gl.uniform1f(this.loc.uAlpha,alpha);gl.uniform1f(this.loc.uUnlit,unlit);}
 drawEffects(p,cam){
  const gl=this.gl,a=this.hands.opacity,g=new WorldGeometry(),l=new WorldGeometry(),gold=rgb8('#ffd77c'),ivory=rgb8('#fff0b9');
  const target=p.target.slice();target[1]+=.018;
  const pulse=.5+.5*Math.sin(p.age*2.4),r=p.type==='pinch'?.70:p.type==='point'?.35:.36;
  g.ring(target,r+.045*pulse,.022,gold);g.ring(target,r*.66,.014,ivory);
  // Conexión en geometría 3D: las caras del edificio la ocluyen correctamente.
  const distance=Math.hypot(...V3.sub(p.root,target));
  if(distance>.19){for(let i=0;i<12;i++){const f=i/12,f2=Math.min(1,f+.042);l.line(target.map((v,k)=>v+(p.root[k]-v)*f),target.map((v,k)=>v+(p.root[k]-v)*f2),ivory);}}
  if(p.type==='drag'){
   const route=new WorldGeometry();for(let i=0;i<32;i++){const a=this.hands.route(i/32),b=this.hands.route((i+.45)/32);a[1]=b[1]=this.hands.routeFloor+.025;route.line(a,b,gold);}l.data.push(...route.data);
  }
  if(this.hands.wire){for(const [i,j] of [[0,1],[1,2],[2,3],[3,0],[0,2]])l.line(p.corners[i],p.corners[j],rgb8('#73e0ce'));}
  gl.enable(gl.BLEND);gl.depthMask(false);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.effectBuffer);const ar=g.array();gl.bufferData(gl.ARRAY_BUFFER,ar,gl.DYNAMIC_DRAW);this.bindWorld(this.effectBuffer,cam,[0,0,0],a*.90,1);gl.drawArrays(gl.TRIANGLES,0,ar.length/9);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.lineBuffer);const lr=l.array();gl.bufferData(gl.ARRAY_BUFFER,lr,gl.DYNAMIC_DRAW);this.bindWorld(this.lineBuffer,cam,[0,0,0],a*.70,1);gl.drawArrays(gl.LINES,0,lr.length/9);
 }
 drawHand(p,cam){
  const gl=this.gl,data=new Float32Array(p.corners.flatMap((v,i)=>[...v,...p.uv[i]]));
  gl.useProgram(this.handProgram);gl.bindBuffer(gl.ARRAY_BUFFER,this.handBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12);gl.disableVertexAttribArray(2);
  gl.uniformMatrix4fv(this.handLoc.uProjection,false,cam.projection);gl.uniformMatrix4fv(this.handLoc.uView,false,cam.view);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[p.type]);gl.uniform1i(this.handLoc.uTexture,0);gl.uniform1f(this.handLoc.uAlpha,this.hands.opacity);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.handIndices);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
  gl.depthMask(true);gl.disable(gl.BLEND);
 }
 render(t,dt){
  if(this.lost)return;this.currentTime=t;if(this.camera.auto&&!this.pointers.size)this.camera.yaw+=dt*.23;
  this.updateObjects(t);const cam=this.cameraAxes();this.lastCamera=cam;
  const p=this.hands.update(t,dt,cam),gl=this.gl,v=this.viewport;
  gl.viewport(Math.round(v.x*v.dpr),Math.round(v.y*v.dpr),Math.round(v.width*v.dpr),Math.round(v.height*v.dpr));
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  this.bindWorld(this.worldBuffer,cam);gl.drawArrays(gl.TRIANGLES,0,this.geometry.length/9);
  this.bindWorld(this.cartBuffer,cam,this.objects.get('carro').position);gl.drawArrays(gl.TRIANGLES,0,this.cartGeometry.length/9);
  if(p){this.drawEffects(p,cam);this.drawHand(p,cam);}
 }
 setStep(i){this.hands.setStep(i,this.currentTime);queueMicrotask(()=>this.resize());}
 resetCamera(){this.camera.yaw=.76;this.camera.pitch=.67;this.camera.zoom=1;this.camera.auto=false;$('orbit-button').setAttribute('aria-pressed','false');}
 installControls(){
  const c=this.canvas;
  c.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});c.setPointerCapture(e.pointerId);this.dragMoved=false;c.classList.add('dragging');});
  c.addEventListener('pointermove',e=>{
   const old=this.pointers.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;
   if(this.pointers.size===1){this.camera.yaw-=dx*.008;this.camera.pitch=clamp(this.camera.pitch+dy*.005,.30,1.27);}
   else{const other=[...this.pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other){const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>4&&after>4)this.camera.zoom=clamp(this.camera.zoom*before/after,.63,1.60);}}
   if(Math.hypot(dx,dy)>1)this.dragMoved=true;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  });
  const release=e=>{this.pointers.delete(e.pointerId);if(!this.pointers.size)c.classList.remove('dragging');};
  c.addEventListener('pointerup',release);c.addEventListener('pointercancel',release);c.addEventListener('lostpointercapture',release);
  c.addEventListener('wheel',e=>{e.preventDefault();this.camera.zoom=clamp(this.camera.zoom*Math.exp(e.deltaY*.001),.63,1.60);},{passive:false});
  c.addEventListener('contextmenu',e=>e.preventDefault());
 }
 // Anclaje externo opcional para la integración: mismo sistema de seguridad.
 showGesture(kind,targetId,options={}){
  if(!HAND_INFO[kind])throw new TypeError('Mano desconocida: '+kind);
  if(!this.objects.has(targetId)&&!options.position)throw new TypeError('Objeto no encontrado: '+targetId);
  this.hands.custom={kind,target:targetId,...options};this.hands.kind=kind;this.hands.started=this.currentTime;this.hands.extraY=0;
 }
}
let worldScene=null;
function drawWorld(){worldScene?.resize();}


class SpriteMesh {
 constructor(canvas,image){
  this.canvas=canvas;this.image=image;this.renderImage=image;this.gl=null;this.ctx=null;this.debug=false;this.lost=false;this.dirty=true;this.lastPose=[Infinity,Infinity,Infinity];
  this.pad=.06;this.scale=.88;this.overscan=.22;this.viewportSpan=1+2*this.overscan;this.pivotX=.567;this.pivotY=.624;
  try{this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power'});}catch(e){console.warn('WebGL no disponible; se usa Canvas 2D.',e);}
  this.nx=this.gl?64:24;this.ny=this.gl?76:28;
  const count=(this.nx+1)*(this.ny+1);this.base=new Float32Array(count*2);this.positions=new Float32Array(count*2);this.weights=new Float32Array(count);this.depths=new Float32Array(count);this.uvs=new Float32Array(count*2);
  for(let y=0;y<=this.ny;y++)for(let x=0;x<=this.nx;x++){
   const i=y*(this.nx+1)+x,u=x/this.nx,v=y/this.ny;
   this.base[i*2]=u;this.base[i*2+1]=v;this.uvs[i*2]=u;this.uvs[i*2+1]=v;
   // V4.1: la mandíbula completa pertenece a la cabeza. La punta del mentón
   // acaba en v≈0.600; una fila de seguridad impide que la interpolación de
   // triángulos arrastre ese borde al empezar la articulación del cuello.
   const neckT=clamp((v-.608)/(.652-.608),0,1);
   // Casi lineal: a diferencia de un smoothstep puro, no concentra toda la
   // compresión en el centro del cuello ni lo pliega en los gestos amplios.
   const neckBlend=neckT+.18*(neckT*neckT*(3-2*neckT)-neckT);
   this.weights[i]=1-neckBlend;
   // Plano facial coherente. Antes el relieve se extinguía entre boca y
   // barbilla: al asentir, cada fila viajaba una distancia distinta y el
   // mentón se aplastaba. Ahora toda la cara inferior comparte profundidad;
   // solo la frente y la nariz conservan un relieve pequeño, sin tocar labios.
   const dx=(u-.54)/.325,dy=(v-.365)/.335;
   const dome=Math.sqrt(Math.max(0,1-dx*dx-dy*dy));
   const nose=Math.exp(-((u-.565)**2/.0036+(v-.446)**2/.008));
   const upperRelief=1-smoothstep(.425,.480,v);
   this.depths[i]=.090+(.020*dome+.010*nose)*upperRelief;
  }
  const tris=[],lines=[];
  for(let y=0;y<this.ny;y++)for(let x=0;x<this.nx;x++){const a=y*(this.nx+1)+x,b=a+1,c=a+this.nx+1,d=c+1;tris.push(a,c,b,b,c,d);}
  const skip=this.gl?3:2;
  for(let y=0;y<=this.ny;y+=skip)for(let x=0;x<this.nx;x++){const a=y*(this.nx+1)+x;lines.push(a,a+1);}
  for(let x=0;x<=this.nx;x+=skip)for(let y=0;y<this.ny;y++){const a=y*(this.nx+1)+x;lines.push(a,a+this.nx+1);}
  this.indices=new Uint16Array(tris);this.lines=new Uint16Array(lines);
  if(this.gl){
   this.initGL();
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;$('engine-label').textContent='WebGL suspendido · esperando recuperación';});
   canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.initGL();this.resize();$('engine-label').textContent=this.description();});
  }else{this.ctx=canvas.getContext('2d',{alpha:true});if(!this.ctx)throw new Error('El navegador no ofrece Canvas 2D ni WebGL.');const small=document.createElement('canvas');small.width=Math.min(640,image.width);small.height=Math.round(small.width*image.height/image.width);small.getContext('2d').drawImage(image,0,0,small.width,small.height);this.renderImage=small;}
  this.resize();this.update(0,0,0);this.draw();
 }
 description(){return this.gl?`WebGL · ${this.nx} × ${this.ny} · ${this.weights.length.toLocaleString('es-ES')} vértices`:`Canvas 2D · malla de respaldo ${this.nx} × ${this.ny}`;}
 initGL(){
  const gl=this.gl;
  const vertex=`attribute vec2 aPosition;attribute vec2 aUV;attribute float aWeight;varying vec2 vUV;varying float vWeight;void main(){vUV=aUV;vWeight=aWeight;gl_Position=vec4(aPosition,0.0,1.0);}`;
  const fragment=`precision mediump float;uniform sampler2D uTexture;uniform float uDebug;varying vec2 vUV;varying float vWeight;void main(){vec4 c=texture2D(uTexture,vUV);if(uDebug>.5){if(c.a<.16)discard;vec3 col=mix(vec3(1.,.64,.20),vec3(.31,1.,.83),vWeight);gl_FragColor=vec4(col*.77,.77);}else{gl_FragColor=c;}}`;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error('No se ha podido compilar el shader: '+log);}return s;};
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('No se ha podido enlazar el shader.');gl.useProgram(this.program);
  const attr=(name,data,size,dynamic=false)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);return b;};
  this.positionBuffer=attr('aPosition',this.positions,2,true);this.uvBuffer=attr('aUV',this.uvs,2);this.weightBuffer=attr('aWeight',this.weights,1);
  this.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.indices,gl.STATIC_DRAW);this.lineBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.lineBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.lines,gl.STATIC_DRAW);
  this.texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(this.program,'uTexture'),0);this.uDebug=gl.getUniformLocation(this.program,'uDebug');gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
 }
 resize(){this.dirty=true;const dpr=Math.min(devicePixelRatio||1,this.gl?2:1.25);this.canvas.width=Math.max(2,Math.round(this.canvas.clientWidth*dpr));this.canvas.height=Math.max(2,Math.round(this.canvas.clientHeight*dpr));if(this.gl&&!this.lost)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}

 // La cabeza puede tapar casi todo el cuello, pero la malla no debe invertirse.
 // Se reserva un pequeño tramo cervical; el límite desplaza la cabeza como
 // bloque rígido y NO cambia su forma ni las curvas de los ocho gestos.
 cervicalOffset(cr,sr,cy,sy,cp,sp,headY=0){
  const top=.608,depth=.090,dy=top-this.pivotY;
  let maximumDrop=-Infinity;
  for(const u of [.465,.598]){
   const dx=u-this.pivotX,x=dx*cy+depth*sy,y=dy*cp-depth*sp;
   maximumDrop=Math.max(maximumDrop,x*sr+y*cr-dy+headY);
  }
  return headY-Math.max(0,maximumDrop-.033);
 }
 update(roll,yaw,pitch){
  const cr=Math.cos(roll),sr=Math.sin(roll),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),px=this.pivotX,py=this.pivotY;
  const headOffsetY=this.cervicalOffset(cr,sr,cy,sy,cp,sp);
  for(let i=0;i<this.weights.length;i++){
   const u=this.base[i*2],v=this.base[i*2+1],weight=this.weights[i],dx=u-px,dy=v-py,depth=this.depths[i];
   const x=dx*cy+depth*sy,y=dy*cp-depth*sp;
   const rx=x*cr-y*sr,ry=x*sr+y*cr;
   const fx=u+(rx-dx)*weight,fy=v+(ry-dy+headOffsetY)*weight;
   this.positions[i*2]=(this.overscan+this.pad+fx*this.scale)/this.viewportSpan*2-1;this.positions[i*2+1]=1-(this.overscan+this.pad+fy*this.scale)/this.viewportSpan*2;
  }
 }
 draw(){
  this.dirty=false;
  if(this.gl){if(this.lost)return;const gl=this.gl;gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.positions);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(this.uDebug,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.drawElements(gl.TRIANGLES,this.indices.length,gl.UNSIGNED_SHORT,0);if(this.debug){gl.uniform1f(this.uDebug,1);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.lineBuffer);gl.drawElements(gl.LINES,this.lines.length,gl.UNSIGNED_SHORT,0);}return;}
  // Respaldo sin WebGL: las mismas deformaciones con triángulos afines Canvas 2D.
  const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height,iw=this.renderImage.width,ih=this.renderImage.height;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
  const vertex=i=>[(this.positions[i*2]+1)*.5*w,(1-this.positions[i*2+1])*.5*h];
  for(let k=0;k<this.indices.length;k+=3){
   const i0=this.indices[k],i1=this.indices[k+1],i2=this.indices[k+2],p0=vertex(i0),p1=vertex(i1),p2=vertex(i2);
   const u0=this.uvs[i0*2]*iw,v0=this.uvs[i0*2+1]*ih,u1=this.uvs[i1*2]*iw,v1=this.uvs[i1*2+1]*ih,u2=this.uvs[i2*2]*iw,v2=this.uvs[i2*2+1]*ih;
   const du1=u1-u0,dv1=v1-v0,du2=u2-u0,dv2=v2-v0,det=du1*dv2-du2*dv1;if(Math.abs(det)<1e-6)continue;
   const a=((p1[0]-p0[0])*dv2-(p2[0]-p0[0])*dv1)/det,b=((p1[1]-p0[1])*dv2-(p2[1]-p0[1])*dv1)/det,c=((p2[0]-p0[0])*du1-(p1[0]-p0[0])*du2)/det,d=((p2[1]-p0[1])*du1-(p1[1]-p0[1])*du2)/det;
   const mx=(p0[0]+p1[0]+p2[0])/3,my=(p0[1]+p1[1]+p2[1])/3;
   ctx.save();ctx.beginPath();for(let j=0;j<3;j++){const p=[p0,p1,p2][j],len=Math.hypot(p[0]-mx,p[1]-my)||1,xx=p[0]+(p[0]-mx)*.38/len,yy=p[1]+(p[1]-my)*.38/len;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,p0[0]-a*u0-c*v0,p0[1]-b*u0-d*v0);const su=Math.max(0,Math.min(u0,u1,u2)-1),sv=Math.max(0,Math.min(v0,v1,v2)-1),sw=Math.min(iw,Math.max(u0,u1,u2)+1)-su,sh=Math.min(ih,Math.max(v0,v1,v2)+1)-sv;ctx.drawImage(this.renderImage,su,sv,sw,sh,su,sv,sw,sh);ctx.restore();
  }
  if(this.debug){ctx.lineWidth=.75;for(let k=0;k<this.lines.length;k+=2){const i=this.lines[k],j=this.lines[k+1],a=vertex(i),b=vertex(j);ctx.strokeStyle=this.weights[i]>.5?'#65ffd7bb':'#ffb248aa';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}}
 }
}

// --------------------------------------------------------------------------
// Cuatro huesos virtuales locales, sobre LA MISMA textura. No se cortan capas:
// las máscaras solo cambian pesos de vértices en los adornos y su contorno.
// Los polígonos están expresados en UV de la imagen original, no de la ventana.
// --------------------------------------------------------------------------
const ORNAMENTS = [
 {name:'Pluma flotante izquierda',anchor:[.164,.343],floating:true,phase:.3,delay:.10,
  polygon:[[.145,.309],[.184,.323],[.184,.385],[.169,.423],[.175,.479],[.152,.532],[.119,.545],[.087,.507],[.099,.437],[.127,.384]]},
 {name:'Colgante izquierdo',anchor:[.294,.535],floating:false,phase:1.7,delay:.13,
  polygon:[[.252,.540],[.288,.526],[.326,.546],[.332,.618],[.308,.654],[.301,.734],[.231,.778],[.192,.721],[.207,.636],[.245,.582]]},
 {name:'Pluma flotante derecha',anchor:[.722,.215],floating:true,phase:3.4,delay:.115,
  polygon:[[.700,.183],[.739,.184],[.755,.245],[.800,.271],[.848,.318],[.862,.386],[.815,.391],[.757,.345],[.720,.291],[.700,.252]]},
 {name:'Colgante derecho',anchor:[.720,.472],floating:false,phase:4.5,delay:.15,
  polygon:[[.704,.449],[.747,.455],[.753,.486],[.801,.498],[.850,.559],[.868,.616],[.813,.640],[.750,.603],[.719,.650],[.670,.644],[.666,.574],[.684,.522]]}
];
function polygonWeight(x,y,points){
 let inside=false,nearest=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i];
  if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
  const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
  nearest=Math.min(nearest,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t));
 }
 // El fundido de borde ocupa sobre todo píxeles transparentes, no el rostro.
 return inside?1:1-smoothstep(0,.018,nearest);
}
class GuardianMesh extends SpriteMesh {
 constructor(canvas,image){
  super(canvas,image);
  this.regions=new Array(this.weights.length);this.accessoryWeight=new Float32Array(this.weights.length);
  for(let i=0;i<this.weights.length;i++){
   const u=this.base[i*2],v=this.base[i*2+1],list=[];let sum=0;
   ORNAMENTS.forEach((o,k)=>{
    let m=polygonWeight(u,v,o.polygon);
    // Evitar que el contorno difuso de los pendientes arrastre el hombro.
    if(k===1)m*=1-smoothstep(.265,.31,u)*smoothstep(.65,.735,v);
    if(k===3)m*=1-(1-smoothstep(.705,.755,u))*smoothstep(.615,.665,v);
    if(m>.001){list.push([k,m]);sum+=m;}
   });
   this.regions[i]=list;this.accessoryWeight[i]=Math.min(1,sum);
  }
  this.rigReady=true;
 }
 update(roll,yaw,pitch,extra=null){
  if(!this.rigReady||!extra){super.update(roll,yaw,pitch);return;}
  const cr=Math.cos(roll),sr=Math.sin(roll),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const px=this.pivotX,py=this.pivotY,blend=extra.blend;
  const headOffsetY=this.cervicalOffset(cr,sr,cy,sy,cp,sp,extra.headY||0);
  const cs=extra.angles.map(Math.cos),ss=extra.angles.map(Math.sin);
  const bc=Math.cos(extra.bodyRoll||0),bs=Math.sin(extra.bodyRoll||0);
  for(let i=0;i<this.weights.length;i++){
   const u=this.base[i*2],v=this.base[i*2+1];let du=0,dv=0;
   for(const [k,m] of this.regions[i]){
    const o=ORNAMENTS[k],x=u-o.anchor[0],y=v-o.anchor[1],gain=m*blend;
    du+=(x*cs[k]-y*ss[k]-x)*gain;
    dv+=(x*ss[k]+y*cs[k]-y+extra.offsets[k])*gain;
   }
   // Los colgantes heredan la cabeza, aunque caigan por debajo del cuello.
   // El pecho sigue siendo rígido; la levitación traslada el busto entero.
   const weight=this.weights[i]+(1-this.weights[i])*this.accessoryWeight[i]*blend;
   const dx=u+du-px,dy=v+dv-py,depth=this.depths[i];
   const x=dx*cy+depth*sy,y=dy*cp-depth*sp;
   let fx=u+du+(x*cr-y*sr-dx+(extra.headX||0))*weight,fy=v+dv+(x*sr+y*cr-dy+headOffsetY)*weight;
   const bx=fx-px,by=fy-.84;
   fx=px+(bx*bc-by*bs)*(1+extra.zoom)+(extra.bodyX||0);fy=.84+(bx*bs+by*bc)*(1+extra.zoom)+extra.lift;
   this.positions[i*2]=(this.overscan+this.pad+fx*this.scale)/this.viewportSpan*2-1;this.positions[i*2+1]=1-(this.overscan+this.pad+fy*this.scale)/this.viewportSpan*2;
  }
 }
 // Interpolación sobre la malla deformada: los brillos y pivotes siguen la
 // imagen incluso con los cambios de perspectiva o la física secundaria.
 project(u,v){
  const xx=clamp(u,0,.999999)*this.nx,yy=clamp(v,0,.999999)*this.ny,x=Math.floor(xx),y=Math.floor(yy),tx=xx-x,ty=yy-y;
  const a=y*(this.nx+1)+x,b=a+1,c=a+this.nx+1,d=c+1;
  const interp=k=>(this.positions[a*2+k]*(1-tx)+this.positions[b*2+k]*tx)*(1-ty)+(this.positions[c*2+k]*(1-tx)+this.positions[d*2+k]*tx)*ty;
  return [(interp(0)+1)*.5,(1-interp(1))*.5];
 }
}
class DampedSpring {
 constructor(frequency,damping){this.omega=frequency;this.damping=damping;this.x=0;this.v=0;}
 reset(){this.x=0;this.v=0;}
 step(target,dt){
  // Integración con subpasos: no explota con una pausa o con pocos FPS.
  const n=Math.max(1,Math.ceil(dt*120)),h=dt/n,w=this.omega;
  for(let i=0;i<n;i++){this.v+=(w*w*(target-this.x)-2*this.damping*w*this.v)*h;this.x+=this.v*h;}
  return this.x;
 }
}
class OrnamentPhysics {
 constructor(){this.bones=ORNAMENTS.map((o,i)=>({angle:new DampedSpring(5.8+i*.28,.58),height:new DampedSpring(4.6+i*.19,.65)}));this.history=[];this.angles=[0,0,0,0];this.offsets=[0,0,0,0];}
 reset(){this.history.length=0;this.bones.forEach(b=>{b.angle.reset();b.height.reset();});this.angles.fill(0);this.offsets.fill(0);}
 step(t,dt,roll,yaw,reveal,amplitude,strength){
  this.history.push({t,roll,yaw});while(this.history.length>2&&this.history[1].t<t-.30)this.history.shift();
  ORNAMENTS.forEach((o,k)=>{
   const at=t-o.delay;let a=this.history[0],b=a;
   for(let i=1;i<this.history.length;i++){b=this.history[i];if(b.t>=at)break;a=b;}
   const f=clamp((at-a.t)/(b.t-a.t||1),0,1),r=a.roll+(b.roll-a.roll)*f,y=a.yaw+(b.yaw-a.yaw)*f;
   const float=o.floating,wind=(float?.034:.016)*Math.sin(t*(float?.62:.51)+o.phase)*amplitude;
   const target=r*(float?.8:.35)+y*(float?.28:.14)+wind+reveal*.047*Math.sin(o.phase);
   const rotation=this.bones[k].angle.step(target,dt);
   const rise=float?(-.0058*Math.sin(t*.69+o.phase)*amplitude-reveal*.009):0;
   this.angles[k]=clamp(rotation-roll,-.155,.155)*strength;
   this.offsets[k]=this.bones[k].height.step(rise,dt)*strength;
  });
 }
}
class GuardianMagic {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.resize();}
 resize(){const size=$('avatar').clientWidth||300,dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(size*dpr);this.canvas.height=Math.round(size*dpr);}
 draw(mesh,t,light,debug){
  const g=this.ctx;if(!g)return;const w=this.canvas.width,h=this.canvas.height;g.clearRect(0,0,w,h);
  const at=(u,v)=>{const p=mesh.project(u,v);return [p[0]*w,p[1]*h];};
  const glow=(u,v,rx,ry,power)=>{
   if(power<.001)return;power=clamp(power,0,.94);const [x,y]=at(u,v);g.save();g.translate(x,y);g.scale(rx*w/mesh.viewportSpan,ry*h/mesh.viewportSpan);
   const gradient=g.createRadialGradient(0,0,0,0,0,1);gradient.addColorStop(0,`rgba(255,233,165,${power})`);gradient.addColorStop(.32,`rgba(255,209,101,${power*.60})`);gradient.addColorStop(1,'rgba(255,185,58,0)');g.fillStyle=gradient;g.fillRect(-1,-1,2,2);g.restore();
  };
  // Sin parpadeos ni boca animada: luz cálida y lenta, localizada en ojos y sol.
  glow(.414,.431,.059,.044,light.eyes);glow(.627,.375,.045,.052,light.eyes*.9);
  glow(.625,.795,.111,.105,light.medallion);glow(.625,.795,.047,.045,light.medallion*.40);
  if(light.reveal>.001){
   glow(.57,.48,.33,.39,light.reveal*.085);
   for(let k=0;k<9;k++){
    const a=k*2.399+t*.23,side=k%2===0?-1:1;
    const u=.55+side*(.28+.025*Math.sin(a)),v=.60-.27*(.5+.5*Math.sin(a*.65+k));
    const p=at(clamp(u,.05,.93),v),r=(1.45+.4*Math.sin(a*1.2))*w/(440*mesh.viewportSpan);
    const gradient=g.createRadialGradient(p[0],p[1],0,p[0],p[1],r*4);
    gradient.addColorStop(0,`rgba(255,241,172,${clamp(light.reveal*.62,0,.95)})`);gradient.addColorStop(.28,`rgba(255,220,123,${clamp(light.reveal*.40,0,.85)})`);gradient.addColorStop(1,'rgba(255,200,74,0)');g.fillStyle=gradient;g.fillRect(p[0]-r*4,p[1]-r*4,r*8,r*8);
   }
  }
  if(debug){
   g.lineWidth=Math.max(1,w/440);g.strokeStyle='#dbb9ffb0';
   ORNAMENTS.forEach(o=>{g.beginPath();o.polygon.forEach((p,i)=>{const q=at(...p);i?g.lineTo(...q):g.moveTo(...q);});g.closePath();g.stroke();const p=at(...o.anchor);g.fillStyle='#e8baff';g.beginPath();g.arc(...p,2.7*w/440,0,Math.PI*2);g.fill();});
  }
 }
}

// --------------------------------------------------------------------------
// V4: un único modo de animación. Cada gesto tiene su propia frase de prueba.
// El selector salta a esa frase y la reinicia; no hay una previsualización que
// pause/reanude otro gesto en secreto. Tras la lectura siempre se entra en IDLE.
// Todas las transiciones usan el mismo reloj: sin temporizadores que compitan.
// --------------------------------------------------------------------------
const STATE_NAMES={enter:'Entrada',greeting:'Bienvenida',idle:'Reposo',speak:'Habla',acknowledge:'Aprobación',curious:'Curiosidad',warning:'Alerta',reveal:'Revelación',farewell:'Despedida',exit:'Salida',closed:'Hasta pronto'};
const GESTURE_MIN_SECONDS={greeting:5.8,speak:5.8,acknowledge:6.8,curious:6.8,warning:6.2,reveal:7.8,idle:7,farewell:6.8};
// Cada gesto conserva su identidad durante toda la lectura; no hay ACCENT_END.
const TRANSITION={enter:reducedMotion?.22:.82,change:reducedMotion?.12:.16,farewell:reducedMotion?0:.72,exit:reducedMotion?.24:.90};
let mesh=null,magic=null,physics=new OrnamentPhysics(),phase='loading',index=0,pendingIndex=null;
let readingStart=0,readingDuration=0,logicalTime=0,phaseStart=0,roll=0,yaw=0,pitch=0,lift=0,zoom=0,headX=0,headY=0,bodyX=0,bodyRoll=0;
let lastStamp=null,lastDraw=-1e9,lastInput=-1e9,readingUI='',rafId=0,lastVisual=null;
let intensity=Number($('motion').value)/100,secondary=Number($('secondary').value)/100,magicStrength=Number($('magic').value)/100,wpm=Number($('speed').value);
let restIntensity=Number($('rest-motion').value)/100;
let animationState='enter',lastStateLabel='',lastReadProgress=-1,selectedGesture=null;
const lights={eyes:0,medallion:0,reveal:0},dotNodes=[];
const gestureButtons=Array.from(document.querySelectorAll('[data-gesture]'));
const stepsByGesture=new Map(TUTORIAL_LINES.map((line,i)=>[line.emotion,i]));
for(let i=0;i<TUTORIAL_LINES.length;i++){const s=document.createElement('span');s.className='step';$('steps').appendChild(s);dotNodes.push(s);}
function readingSeconds(text,gesture=TUTORIAL_LINES[index].emotion){
 const words=(text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;
 const pauses=(text.match(/[.!?…]/g)||[]).length;
 return Math.max(GESTURE_MIN_SECONDS[gesture]||3.6,words*60/wpm+Math.min(pauses*.13,.65)+.45);
}
function announce(text){$('announcer').textContent=text;}
function emit(name,detail={}){document.dispatchEvent(new CustomEvent(`guardian:${name}`,{detail}));}
function selectGesture(gesture){
 selectedGesture=gesture;
 for(const button of gestureButtons)button.setAttribute('aria-pressed',String(button.dataset.gesture===gesture));
 $('gesture-selection').textContent=`Gesto de esta frase: ${STATE_NAMES[gesture]}`;
}
function setMessage(i){
 const line=TUTORIAL_LINES[i];$('topic').textContent=line.title;$('message').textContent=line.text;
 $('counter').textContent=`${String(i+1).padStart(2,'0')} / ${String(TUTORIAL_LINES.length).padStart(2,'0')}`;
 $('next-label').textContent=i===TUTORIAL_LINES.length-1?'Terminar el tutorial':(window.matchMedia('(pointer: coarse)').matches?'Toca para continuar':'Haz clic para continuar');
 dotNodes.forEach((d,j)=>d.className='step'+(j<i?' done':'')+(j===i?' current':''));
 selectGesture(line.emotion);readingDuration=readingSeconds(line.text,line.emotion);worldScene?.setStep(i);
 $('next-button').setAttribute('aria-label',i===TUTORIAL_LINES.length-1?'Terminar tutorial':'Siguiente explicación');
 $('reading-fill').style.transform='scaleX(0)';readingUI='';lastReadProgress=-1;
 $('estimate').textContent=`Lectura ≈ ${Math.round(readingDuration)} s`;
 announce(`${line.title}. ${line.text}`);
}
function beginReading(){
 readingStart=logicalTime;phase='reading';phaseStart=logicalTime;readingUI='';lastReadProgress=-1;
 $('next-button').disabled=false;refreshReadingUI();setAnimationLabel(TUTORIAL_LINES[index].emotion);
 emit('step',{index,...TUTORIAL_LINES[index]});
}
function refreshReadingUI(){
 const active=phase==='reading',rest=phase==='rest',idleScene=TUTORIAL_LINES[index].emotion==='idle';
 const key=`${phase}|${index}|${intensity>0}`;
 if(readingUI!==key){
  readingUI=key;$('bubble').classList.toggle('is-reading',active&&!idleScene);$('bubble').classList.toggle('is-resting',rest||active&&idleScene);
  $('state-label').textContent=rest?(intensity>0?'En reposo · espera tu toque':'Sin movimiento · espera tu toque'):active?(intensity<=0?'Tiempo de lectura':idleScene?'Reposo · silencio acompañado':'Te acompaña mientras lees'):phase==='intro'?'El guardián aparece…':phase==='changing'?'Un nuevo consejo…':phase==='farewell'?'El guardián se despide…':phase==='outro'?'Hasta la próxima cosecha…':'Hasta pronto';
  $('estimate').textContent=rest?'Sin avance automático':active?`Lectura ≈ ${Math.round(readingDuration)} s`:'';
 }
 const progress=rest?1:active?clamp((logicalTime-readingStart)/readingDuration,0,1):0;
 const p=Math.round(progress*1000)/1000;
 if(p!==lastReadProgress){$('reading-fill').style.transform=`scaleX(${p})`;lastReadProgress=p;}
}
function setAnimationLabel(state){
 animationState=state;
 const key=`${state}|${phase}|${index}|${intensity>0}`;
 if(key===lastStateLabel)return;lastStateLabel=key;
 $('animation-name').textContent=STATE_NAMES[state]||state;
 $('animation-prefix').textContent='Ahora';
 $('animation-tag').classList.toggle('resting',state==='idle');$('bubble').dataset.emotion=state;
 let description=TUTORIAL_LINES[index].description;
 if(phase==='rest')description='Reposo vivo: la intensidad del habla anterior. Espera tu toque.';
 else if(phase==='intro')description='El guardián y su consejo aparecen juntos.';
 else if(phase==='changing')description='Preparando la siguiente frase y su gesto.';
 else if(phase==='farewell'||phase==='outro')description='Una última inclinación lateral y una retirada suave.';
 else if(phase==='closed')description='Recorrido terminado. Puedes repetir cualquier gesto.';

 if(intensity<=0&&!['closed','intro','outro'].includes(phase))description='Movimiento desactivado en Ajustes.';
 $('animation-detail').textContent=description;
 emit('state',{state,phase,index,gesture:TUTORIAL_LINES[index].emotion});
}
function checkIndex(value){if(!Number.isInteger(value)||value<0||value>=TUTORIAL_LINES.length)throw new RangeError('La frase debe ser un índice válido del tutorial.');}
function startTutorial(firstIndex=0){
 checkIndex(firstIndex);if(!mesh)return false;
 phase='intro';phaseStart=logicalTime;index=firstIndex;pendingIndex=null;physics.reset();
 roll=yaw=pitch=lift=zoom=headX=headY=bodyX=bodyRoll=0;lights.eyes=lights.medallion=lights.reveal=0;lastVisual=null;lastInput=performance.now();
 $('end-card').classList.remove('shown');$('end-card').setAttribute('aria-hidden','true');$('replay').tabIndex=-1;
 const root=$('tutorial');root.classList.remove('visible','leaving','closed');root.setAttribute('aria-hidden','false');
 $('next-button').disabled=true;$('message-body').classList.remove('switching');setMessage(index);
 mesh.update(0,0,0);mesh.draw();magic.draw(mesh,logicalTime,lights,mesh.debug);
 refreshReadingUI();setAnimationLabel('enter');
 // Flush the hidden pose before enabling the CSS entrance transition.
 void root.offsetWidth;root.classList.add('visible');
 emit('start',{index});return true;
}
function goToStep(i){
 checkIndex(i);if(!mesh)return false;
 if(['loading','closed','farewell','outro'].includes(phase))return startTutorial(i);
 if(phase==='intro'){
  index=i;pendingIndex=null;setMessage(i);refreshReadingUI();setAnimationLabel('enter');return true;
 }
 // Selecting another gesture invalidates a pending change immediately. There
 // are no setTimeout callbacks able to restore a previously selected gesture.
 pendingIndex=i;phase='changing';phaseStart=logicalTime;selectGesture(TUTORIAL_LINES[i].emotion);
 $('message-body').classList.add('switching');$('next-button').disabled=true;
 refreshReadingUI();return true;
}
function nextMessage(){
 const now=performance.now();if(!mesh||!['reading','rest'].includes(phase)||now-lastInput<260)return false;
 lastInput=now;
 if(index>=TUTORIAL_LINES.length-1)return finishTutorial();
 return goToStep(index+1);
}
function finishTutorial(){
 if(!mesh||['farewell','outro','closed','loading'].includes(phase))return false;
 pendingIndex=null;phase='farewell';phaseStart=logicalTime;$('next-button').disabled=true;
 $('message-body').classList.remove('switching');refreshReadingUI();setAnimationLabel('farewell');return true;
}
function closeTutorial(){
 phase='closed';phaseStart=logicalTime;
 $('tutorial').classList.add('closed');$('tutorial').classList.remove('visible','leaving');$('tutorial').setAttribute('aria-hidden','true');
 $('end-card').classList.add('shown');$('end-card').setAttribute('aria-hidden','false');$('replay').tabIndex=0;
 refreshReadingUI();setAnimationLabel('closed');announce('El tutorial ha terminado. Puedes volver a empezar o elegir otro gesto en Ajustes.');
 if(document.activeElement===$('next-button'))$('replay').focus({preventScroll:true});
 emit('end');
}
function previewGesture(gesture){
 if(!stepsByGesture.has(gesture))throw new TypeError('Gesto no reconocido.');
 if(!goToStep(stepsByGesture.get(gesture)))return false;
 lastInput=performance.now();toggleSettings(false);$('settings-button').focus({preventScroll:true});
 emit('preview',{state:gesture,index:stepsByGesture.get(gesture)});return true;
}
// Pasar al reposo no cambia el texto ni el gesto seleccionado. Puede repetirse
// el mismo gesto para comparar inmediatamente, sin esperar la lectura completa.
function enterRest(){
 if(!['reading','rest'].includes(phase))return false;
 phase='rest';phaseStart=logicalTime;readingUI='';lastStateLabel='';
 refreshReadingUI();setAnimationLabel('idle');
 emit('rest',{index,gesture:TUTORIAL_LINES[index].emotion});return true;
}

// --------------------------------------------------------------------------
// V4: curvas propias, no una animación compartida multiplicada por un número.
// Todas las magnitudes son relativas a la imagen, NO a los píxeles de pantalla.
// roll/yaw/pitch en radianes. headY permite ver un asentimiento sin aplastar la
// cara; la inclinación lateral conserva la cabeza casi rígida y cede en cuello.
// --------------------------------------------------------------------------
const hump=(t,start,end)=>{const p=clamp((t-start)/(end-start),0,1);return Math.sin(Math.PI*p)**2;};
const hold=(t,a,b,c,d)=>smoothstep(a,b,t)*(1-smoothstep(c,d,t));
function livingRest(time){
 // Mismas amplitudes que el habla V3, pero continuas y sin reiniciar su fase.
 const k=restIntensity;
 return {
  roll:k*(.0035*Math.sin(time*.43)+.0018*Math.sin(time*.73)+.022*Math.sin(time*1.18+.3)+.006*Math.sin(time*2.05+.183)),
  yaw:k*(.008*Math.sin(time*.34+.8)+.043*Math.sin(time*.81+.24)+.012*Math.sin(time*1.69+.8)),
  pitch:k*(.0035*Math.sin(time*.52)+.026*Math.sin(time*1.36+.3)+.009*Math.sin(time*2.36+.3)),
  lift:k*.0015*Math.sin(time*.78),zoom:0,headX:0,headY:0,bodyX:0,bodyRoll:0,
  eyes:.031+.009*Math.sin(time*.56),medallion:.018+.006*Math.sin(time*.48+.8),reveal:0
 };
}
function enhancedPose(state,age,duration){
 const q=livingRest(logicalTime);q.state=state;
 if(state==='idle')return q;
 if(state==='enter'||state==='exit'){
  for(const key of ['roll','yaw','pitch','lift','zoom','headX','headY','bodyX','bodyRoll'])q[key]=0;
  return q;
 }
 const d=Math.max(duration,1),p=clamp(age/d,0,1);
 // El final se mezcla con el reposo antes de agotar la lectura: no hay salto.
 const envelope=smoothstep(0,.55,age)*(1-smoothstep(Math.max(.65,d-1.05),d,age));
 const pose={roll:0,yaw:0,pitch:0,lift:0,zoom:0,headX:0,headY:0,bodyX:0,bodyRoll:0};
 let eyes=0,medallion=0,reveal=0;
 if(state==='speak'){
  // Habla: alternancia rítmica ancha, no una inclinación sostenida.
  pose.roll=.145*Math.sin(age*1.43+.15)+.028*Math.sin(age*2.23+.6);
  pose.yaw=.185*Math.sin(age*.94+.55)+.032*Math.sin(age*1.57);
  pose.pitch=.102*Math.sin(age*1.68-.4);
  pose.headY=.008*Math.sin(age*1.68-.4);
  pose.lift=.004*Math.sin(age*1.10);eyes=.018;
 }else if(state==='greeting'){
  // Bienvenida: se abre en diagonal, mira al jugador y regresa al centro.
  const welcome=hump(p,0,.82),answer=hump(p,.63,.96);
  pose.roll=-.245*welcome+.085*answer;
  pose.yaw=.17*welcome-.075*answer;
  pose.pitch=-.10*hump(p,.06,.56);
  pose.headX=-.015*welcome;pose.headY=.012*welcome;
  pose.zoom=.025*welcome;medallion=.18*welcome;eyes=.05*welcome;
 }else if(state==='acknowledge'){
  // Aprobación: evita el cabeceo frontal. En su lugar hace una doble
  // inclinación corta hacia un lado, con un leve acercamiento cálido.
  const first=hold(p,0,.12,.36,1),second=hold(p,.42,.56,.80,1);
  const settle=hump(p,.74,.98);
  pose.roll=.165*first-.115*second+.04*settle;
  pose.yaw=-.09*first+.065*second-.02*settle;
  pose.pitch=.028*first+.018*second;
  pose.headX=.010*first-.008*second;
  pose.headY=-.004*(first+second);
  pose.zoom=.035*first+.026*second;
  pose.lift=-.008*first-.006*second;
  pose.bodyRoll=.028*first-.020*second;
  medallion=.42*(first+.85*second);eyes=.07*(first+.8*second);
 }else if(state==='curious'){
  // Curiosidad: inclinación muy clara (unos 18 grados), mirada sostenida.
  const lean=hold(p,0,.19,.79,1);
  pose.roll=.32*lean+.012*Math.sin(age*1.05)*lean;
  pose.yaw=-.16*lean+.026*Math.sin(age*.80)*lean;
  pose.pitch=.048*lean;pose.headX=.014*lean;
  pose.zoom=.018*lean;eyes=.045*lean;
 }else if(state==='warning'){
  // Alerta: un 15 % más cerca, cabeza erguida y quietud; nada de balanceo.
  const approach=hold(p,0,.12,.87,1);
  pose.zoom=.15*approach;pose.pitch=.10*approach;
  pose.headY=-.014*approach;pose.lift=.005*approach;
  pose.roll=-.030*hump(p,0,.27);
  eyes=.43*approach;medallion=.04*approach;
 }else if(state==='reveal'){
  // Revelación: asciende todo el busto; las otras animaciones no lo hacen.
  const rise=hold(p,0,.22,.76,1);
  pose.lift=-.112*rise;pose.zoom=.045*rise;
  pose.roll=(-.105+.030*Math.sin(age*.72))*rise;
  pose.yaw=.095*Math.sin(age*.60+.3)*rise;
  pose.pitch=.12*rise;pose.headY=-.008*rise;
  pose.bodyX=.012*Math.sin(age*.72)*rise;
  eyes=.29*rise;medallion=.48*rise;reveal=1.05*rise;
 }else if(state==='farewell'){
  // Despedida: inclinación lenta hacia un lado y retirada suave. Se evita la
  // reverencia frontal porque aplastaba la cabeza al no existir volumen 3D.
  const lean=hold(p,0,.16,.70,1),returnLook=hump(p,.70,1);
  pose.roll=-.19*lean+.060*returnLook;
  pose.yaw=-.12*lean+.055*returnLook;
  pose.pitch=.020*lean;
  pose.headX=-.010*lean+.004*returnLook;
  pose.headY=-.004*lean;
  pose.bodyRoll=-.052*lean;
  pose.zoom=-.072*lean+.010*returnLook;
  pose.lift=.030*lean;
  medallion=.16*lean;eyes=.032*lean;
 }
 // Solo se mezcla con el reposo al entrar y salir de la curva. Durante el gesto
 // se conservan sus rasgos propios, sin contaminarlo con el vaivén de habla.
 for(const key of ['roll','yaw','pitch','lift','zoom','headX','headY','bodyX','bodyRoll'])q[key]+=(pose[key]-q[key])*envelope;
 q.eyes+=eyes*envelope;q.medallion+=medallion*envelope;q.reveal=reveal*envelope;
 return q;
}

function advancePhases(){
 const age=logicalTime-phaseStart;
 if(phase==='intro'&&age>=TRANSITION.enter)beginReading();
 else if(phase==='changing'&&age>=TRANSITION.change){
  const next=pendingIndex;pendingIndex=null;
  if(next!==null){index=next;setMessage(index);$('message-body').classList.remove('switching');beginReading();}
 }
 else if(phase==='reading'&&logicalTime-readingStart>=readingDuration){
  enterRest();
 }
 else if(phase==='farewell'&&age>=TRANSITION.farewell){
  phase='outro';phaseStart=logicalTime;$('tutorial').classList.add('leaving');
 }
 else if(phase==='outro'&&age>=TRANSITION.exit)closeTutorial();
}
function animate(stamp){
 rafId=requestAnimationFrame(animate);
 if(document.hidden){lastStamp=null;return;}
 const elapsed=lastStamp===null?0:Math.max(0,(stamp-lastStamp)/1000);lastStamp=stamp;
 // Reading uses real foreground time; only physics has a capped step.
 const dt=Math.min(elapsed,.065);logicalTime+=elapsed;
 if(worldScene)worldScene.render(logicalTime,dt);
 if(!mesh||phase==='loading'||phase==='closed')return;
 advancePhases();if(phase==='closed')return;refreshReadingUI();
 const readingAge=Math.max(0,logicalTime-readingStart),phaseAge=logicalTime-phaseStart;
 let state='idle',eventAge=phaseAge,eventDuration=readingDuration;
 if(phase==='intro'){state='enter';eventDuration=TRANSITION.enter;}
 else if(phase==='farewell'){state='farewell';eventDuration=2.4;}
 else if(phase==='outro'){state='exit';eventDuration=TRANSITION.exit;}
 else if(phase==='reading'){state=TUTORIAL_LINES[index].emotion;eventAge=readingAge;}
 const q=enhancedPose(state,eventAge,eventDuration),follow=1-Math.exp(-dt*5.4);
 // Límites del experimento: ampliar el gesto no genera caras ocultas. Los
 // giros laterales son amplios; yaw/pitch se acotan para proteger el retrato.
 roll+=(clamp(q.roll*intensity,-.46,.46)-roll)*follow;
 yaw+=(clamp(q.yaw*intensity,-.34,.34)-yaw)*follow;
 pitch+=(clamp(q.pitch*intensity,-.38,.26)-pitch)*follow;
 lift+=(q.lift*intensity-lift)*follow;zoom+=(q.zoom*intensity-zoom)*follow;
 headX+=(q.headX*intensity-headX)*follow;headY+=(q.headY*intensity-headY)*follow;
 bodyX+=(q.bodyX*intensity-bodyX)*follow;bodyRoll+=(q.bodyRoll*intensity-bodyRoll)*follow;
 const lightGain=magicStrength*(intensity>0?1:0),lf=1-Math.exp(-dt*4);
 for(const key of ['eyes','medallion','reveal'])lights[key]+=(q[key]*lightGain-lights[key])*lf;
 physics.step(logicalTime,dt,roll,yaw,q.reveal*intensity,intensity,secondary*(intensity>0?1:0));
 // El indicador refleja el gesto real durante toda la frase y el reposo final.
 setAnimationLabel(state);
 const fps=mesh.gl?60:30;
 if(stamp-lastDraw>=1000/fps-.6){
  lastDraw=stamp;
  const visual=[roll,yaw,pitch,lift,zoom,headX,headY,bodyX,bodyRoll,lights.eyes,lights.medallion,lights.reveal,...physics.angles,...physics.offsets];
  const changed=!lastVisual||visual.some((v,i)=>Math.abs(v-lastVisual[i])>0.000001);
  if(!changed&&!mesh.dirty&&lights.reveal<.001)return;
  lastVisual=visual;
  mesh.update(roll,yaw,pitch,{blend:1,angles:physics.angles,offsets:physics.offsets,lift,zoom,headX,headY,bodyX,bodyRoll});
  mesh.draw();magic.draw(mesh,logicalTime,lights,mesh.debug);
  if(mesh.debug){const p=mesh.project(mesh.pivotX,mesh.pivotY);$('pivot').style.left=`${(p[0]*mesh.viewportSpan-mesh.overscan)*100}%`;$('pivot').style.top=`${(p[1]*mesh.viewportSpan-mesh.overscan)*100}%`;}
 }
}
function toggleSettings(force){
 const show=force===undefined?$('settings').hidden:force;$('settings').hidden=!show;
 $('settings-button').setAttribute('aria-expanded',String(show));$('settings-button').setAttribute('aria-label',show?'Cerrar ajustes':'Abrir ajustes');
}
$('settings-button').addEventListener('click',()=>toggleSettings());
$('settings-close').addEventListener('click',()=>{toggleSettings(false);$('settings-button').focus({preventScroll:true});});
$('mesh-toggle').addEventListener('change',e=>{if(mesh){mesh.debug=e.target.checked;mesh.dirty=true;}$('tutorial').classList.toggle('mesh-visible',e.target.checked);});
function bindSlider(id,apply){$(id).addEventListener('input',e=>{const value=Number(e.target.value);apply(value/100);$(id+'-value').textContent=`${value} %`;readingUI='';lastStateLabel='';});}
bindSlider('motion',v=>intensity=v);bindSlider('rest-motion',v=>restIntensity=v);bindSlider('secondary',v=>secondary=v);bindSlider('magic',v=>magicStrength=v);
$('speed').addEventListener('change',e=>{
 // Preserve the already-read fraction. Changing speed in rest does not make
 // the guardian start speaking again, and does not replay the selected gesture.
 const elapsed=Math.max(0,logicalTime-readingStart),fraction=clamp(elapsed/readingDuration,0,1);
 wpm=Number(e.target.value);readingDuration=readingSeconds(TUTORIAL_LINES[index].text);
 if(phase==='reading')readingStart=logicalTime-fraction*readingDuration;
 else if(phase==='rest')readingStart=logicalTime-readingDuration;
 readingUI='';refreshReadingUI();
});
for(const b of gestureButtons)b.addEventListener('click',()=>previewGesture(b.dataset.gesture));
$('repeat-gesture').addEventListener('click',()=>previewGesture(selectedGesture||TUTORIAL_LINES[index].emotion));
$('rest-now').addEventListener('click',()=>{if(enterRest()){toggleSettings(false);$('settings-button').focus({preventScroll:true});}});
$('restart').addEventListener('click',()=>{toggleSettings(false);startTutorial();});
$('replay').addEventListener('click',()=>{toggleSettings(false);startTutorial();});
$('next-button').addEventListener('click',nextMessage);
// La cámara solo responde al canvas. El avance pertenece exclusivamente al HUD.
$('bubble').addEventListener('click',e=>{if(!e.target.closest('button'))nextMessage();});
document.addEventListener('click',e=>{if(!e.target.closest('#settings,#settings-button')&&!$('settings').hidden)toggleSettings(false);});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){toggleSettings(false);return;}
 if(e.repeat||![' ','Enter','ArrowRight'].includes(e.key))return;
 if(e.target.closest('input,select,textarea,button')||!$('settings').hidden)return;
 e.preventDefault();nextMessage();
});
document.addEventListener('visibilitychange',()=>{lastStamp=null;});
let resizeTimer;window.addEventListener('resize',()=>{
 clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{drawWorld();if(mesh){mesh.resize();magic.resize();mesh.draw();magic.draw(mesh,logicalTime,lights,mesh.debug);}},90);
});
// Public integration API. The original-vs-enhanced branch is intentionally gone.
// start(index?) / goTo(index) / preview(gesture) / next() / finish() / getState().
// preview uses the same tutorial controller, rather than an overlay timer.
window.GuardianTutorial=Object.freeze({
 start:startTutorial,next:nextMessage,finish:finishTutorial,preview:previewGesture,goTo:goToStep,rest:enterRest,
 getGestures:()=>TUTORIAL_LINES.map(({emotion,description},i)=>({id:emotion,name:STATE_NAMES[emotion],description,index:i})),
 getState:()=>({version:'8.0',phase,index,total:TUTORIAL_LINES.length,emotion:TUTORIAL_LINES[index]?.emotion,selectedGesture,animation:animationState,
  readingDuration,readingElapsed:phase==='reading'?clamp(logicalTime-readingStart,0,readingDuration):phase==='rest'?readingDuration:0,
  isReading:phase==='reading',isResting:phase==='rest',restElapsed:phase==='rest'?logicalTime-phaseStart:0,autoAdvance:false,
  roll,yaw,pitch,lift,zoom,headX,headY,bodyX,bodyRoll,restIntensity,lights:{...lights},ornamentAngles:[...physics.angles],ornamentOffsets:[...physics.offsets],
  world:worldScene?{camera:{...worldScene.camera},hand:worldScene.hands.getState()}:null,engine:mesh?(mesh.gl?'webgl':'canvas2d'):null,vertices:mesh?mesh.weights.length:0,intensity,secondary,magicStrength,wpm})
});

$('focus-button').addEventListener('click',()=>worldScene?.resetCamera());
$('orbit-button').addEventListener('click',()=>{if(!worldScene)return;worldScene.camera.auto=!worldScene.camera.auto;$('orbit-button').setAttribute('aria-pressed',String(worldScene.camera.auto));});
$('hand-wire').addEventListener('change',e=>{if(worldScene)worldScene.hands.wire=e.target.checked;});
$('hand-size').addEventListener('input',e=>{const v=Number(e.target.value)/100;$('hand-size-value').textContent=Math.round(v*100)+' %';if(worldScene){worldScene.hands.size=v;worldScene.hands.routeFloor=worldScene.hands.routeClearance();}});
// API 3D: referencias a nodos del mundo, no coordenadas de pantalla.
window.GuardianWorld=Object.freeze({
 getObjects:()=>worldScene?Array.from(worldScene.objects.values()).map(o=>({id:o.id,position:o.position.slice(),anchor:o.anchor.slice()})):[],
 showGesture:(type,targetId,options={})=>worldScene?.showGesture(type,targetId,options),
 hideGesture:()=>{if(worldScene)worldScene.hands.custom={kind:null};},
 getState:()=>worldScene?{camera:{...worldScene.camera},hand:worldScene.hands.getState(),viewport:{...worldScene.viewport}}:null,
 resetCamera:()=>worldScene?.resetCamera(),
 setCamera:values=>{if(!worldScene)return;for(const k of ['yaw','pitch','zoom'])if(Number.isFinite(values[k]))worldScene.camera[k]=values[k];worldScene.camera.pitch=clamp(worldScene.camera.pitch,.30,1.27);worldScene.camera.zoom=clamp(worldScene.camera.zoom,.63,1.6);}
});
async function decodeImage(source){const image=new Image();image.decoding='async';await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('No se pudo cargar una imagen incrustada.'));image.src=source;});return image;}
(async()=>{
 try{
  const [image,handImages]=await Promise.all([decodeImage(SPRITE_DATA),Promise.all(Object.entries(HAND_ASSETS).map(async([name,src])=>[name,await decodeImage(src)]))]);
  worldScene=new FarmWorld3D($('world'),Object.fromEntries(handImages));
  mesh=new GuardianMesh($('avatar'),image);magic=new GuardianMagic($('magic-fx'));
  $('engine-label').textContent='Avatar V4.2 · '+mesh.description();$('loading').classList.add('finished');
  const observer=new ResizeObserver(()=>{worldScene.resize();mesh.resize();magic.resize();});observer.observe($('bubble'));observer.observe(document.body);
  rafId=requestAnimationFrame(animate);startTutorial();
 }catch(error){console.error(error);$('loading').textContent='No se ha podido iniciar el visor: '+error.message;}
})();
