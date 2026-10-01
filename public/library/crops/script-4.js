/* BIOMA / Cultivos LAB v3.0 · self-contained, no remote requests.
 * Unchanged original geometry and anchored V1 growth outside stage transitions.
 * Only former dither intervals use a short-lived, opaque regional geometry bridge.
 * No claim of botanical vertex correspondence. Original GLB payload is bit-identical.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const SPECIES=[
 {id:'maiz',name:'Maíz',duration:90,kind:'Cereal'}, {id:'algodon',name:'Algodón',duration:120,kind:'Fibra'},
 {id:'girasol',name:'Girasol',duration:80,kind:'Semilla'}, {id:'platano',name:'Plátano',duration:150,kind:'Fruto'},
 {id:'sorgo',name:'Sorgo',duration:85,kind:'Cereal'}, {id:'mijo',name:'Mijo',duration:70,kind:'Cereal'},
 {id:'yuca',name:'Yuca',duration:130,kind:'Raíz'}, {id:'batata',name:'Batata',duration:100,kind:'Raíz'}
];
const STAGES=['Brote','Planta joven','Planta adulta','Desarrollo','Maduro'];
const STAGE_SHORT=['Brote','Joven','Adulto','Desarrollo','Maduro'];
const MARKS=[.065,.27,.53,.78,1],MAX_PLANTS=240,STORE='bioma.cultivos.lab.v3-local';
const THUMBS=JSON.parse($('thumbnailData').textContent);
const state={cycleSeconds:0,morphSeconds:2,plants:[],nextId:1,selected:null,crop:0,speed:1,paused:false,clock:0,harvested:0,view:'farm',mode:'plant',snap:false,labels:true,autoSave:true,wind:true,grid:true,quality:innerWidth<800?'medium':'high'};
let renderer,scene,camera,sun,field,fieldGrid,baseSlab,selectionRing,ripeRings,placementRing,particlesMesh;
let bridges=[],bridgeCounts=new Int16Array(32);
let models=[],counts=new Int16Array(40),loaded=false,lastFrame=0,lastUI=0,lastSave=0,frameCounter=0,fpsClock=0,fps=0;
let toastTimer,needSave=false,scrubbing=false,dragging=false,pointerWorld=null,pointerScreen=null,particles=[];
const uniforms={clock:{value:0},wind:{value:1}};
const tmpObj=new THREE.Object3D(),tmpVec=new THREE.Vector3(),tmpQuat=new THREE.Quaternion(),raycaster=new THREE.Raycaster(),rayPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),pickBox=new THREE.Box3();
const pointerNDC=new THREE.Vector2();const labelEls=new Map();let catalogLabels=[];
const orbit={theta:.48,phi:.91,radius:15.6,target:new THREE.Vector3(.1,.45,0)};
const gesture={pointers:new Map(),down:null,moved:false,two:false,previousDistance:0,previousCenter:null};
const particlesPosition=new Float32Array(512*3),particlesColor=new Float32Array(512*3);
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function formatTime(t){t=Math.max(0,Math.floor(t));const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;return(h?h.toString().padStart(2,'0')+':':'')+m.toString().padStart(2,'0')+':'+s.toString().padStart(2,'0');}
function notifyError(e){console.error(e);window.CultivosLabError=String(e?.stack||e);$('loading').classList.remove('hidden');$('loadingMessage').textContent='No se ha podido iniciar el visor: '+(e?.message||e)+'. Abre el archivo completo en un navegador con WebGL y descompresión gzip (Chrome, Edge, Firefox o Safari recientes).';$('loadBar').style.background='#dc947c';}
function loadProgress(percent,message){$('loadBar').style.width=percent+'%';if(message)$('loadingMessage').textContent=message;}
function setCrop(index){state.crop=clamp(index|0,0,7);document.querySelectorAll('.crop-card').forEach((e,i)=>e.classList.toggle('active',i===state.crop));updateSceneTag();if(state.view==='catalog'){removeWorldLabels();createCatalogLabels();}needSave=true;}
function updateSceneTag(){$('sceneTag').textContent=state.view==='catalog'?SPECIES[state.crop].name.toUpperCase()+' · CINCO GEOMETRÍAS ORIGINALES · TIEMPO DETENIDO':(state.mode==='plant'?'PARCELA LIBRE · PLANTAR: ':'PARCELA · SELECCIONAR CULTIVO · ')+SPECIES[state.crop].name.toUpperCase();}
function setMode(mode){state.mode=mode==='select'?'select':'plant';$('plantMode').classList.toggle('active',state.mode==='plant');$('selectMode').classList.toggle('active',state.mode==='select');updateSceneTag();}
function buildUI(){
 $('cropGrid').innerHTML=SPECIES.map((c,i)=>`<button class="crop-card ${i===0?'active':''}" data-crop="${i}" title="Plantar ${c.name} · ciclo de demostración de ${c.duration} s"><div class="thumb"><img src="${THUMBS[c.id]}" alt="${c.name} maduro" draggable="false"></div><div class="info"><strong>${c.name}</strong><small>${c.kind} · ${c.duration} s</small></div></button>`).join('');
 $('cropGrid').addEventListener('click',e=>{const b=e.target.closest('[data-crop]');if(b)setCrop(+b.dataset.crop);});
 $('plantMode').onclick=()=>setMode('plant');$('selectMode').onclick=()=>setMode('select');
 $('viewToggle').onclick=()=>setView(state.view==='farm'?'catalog':'farm');
 $('pauseBtn').onclick=()=>{state.paused=!state.paused;updateUI(true);needSave=true;};
 $('speeds').onclick=e=>{if(e.target.dataset.speed){state.speed=+e.target.dataset.speed;document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===state.speed));needSave=true;}};
 $('homeBtn').onclick=()=>homeCamera();$('topBtn').onclick=()=>{orbit.phi=1.49;updateCamera();};
 $('gridBtn').onclick=()=>{state.grid=!state.grid;fieldGrid.visible=state.grid;$('gridBtn').classList.toggle('active',state.grid);};
 $('windBtn').onclick=()=>{state.wind=!state.wind;uniforms.wind.value=state.wind?1:0;$('windBtn').classList.toggle('active',state.wind);};
 $('quality').value=state.quality;$('quality').onchange=()=>setQuality($('quality').value);
 ['low','medium','high'].forEach(q=>$(q+'Btn').onclick=()=>{setQuality(q);toast('Calidad gráfica: '+({low:'baja',medium:'media',high:'alta'}[q]));});
 $('closeInspector').onclick=()=>selectPlant(null);$('harvestBtn').onclick=()=>harvest(state.selected);$('harvestAll').onclick=harvestAll;
 $('growthScrub').addEventListener('pointerdown',()=>scrubbing=true);
 const endScrub=()=>{scrubbing=false;needSave=true;};window.addEventListener('pointerup',endScrub);window.addEventListener('pointercancel',endScrub);
 $('growthScrub').oninput=()=>{const p=findPlant(state.selected);if(p){p.growth=+$('growthScrub').value/1000;updateUI(true);needSave=true;}};
 ['helpBtn','settingsBtn'].forEach(id=>$(id).onclick=()=>$(id==='helpBtn'?'helpModal':'settingsModal').classList.remove('hidden'));
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).classList.add('hidden'));
 document.querySelectorAll('.modal-shade').forEach(e=>e.addEventListener('click',ev=>{if(ev.target===e)e.classList.add('hidden');}));
 const askClear=()=>{if(state.view==='catalog')setView('farm');if(state.plants.length)$('confirmModal').classList.remove('hidden');else toast('La parcela ya está vacía.');};
 $('clearBtn').onclick=askClear;$('mobileClear').onclick=askClear;$('confirmClear').onclick=()=>{clearFarm();$('confirmModal').classList.add('hidden');toast('Parcela vacía. Lista para empezar.');};
 $('demoBtn').onclick=addDemo;$('mobileDemo').onclick=addDemo;
 $('perfInput').onchange=()=>$('perf').classList.toggle('hidden',!$('perfInput').checked);
 $('snapInput').onchange=()=>{state.snap=$('snapInput').checked;needSave=true;};$('labelsInput').onchange=()=>{state.labels=$('labelsInput').checked;needSave=true;};$('autoSaveInput').onchange=()=>{state.autoSave=$('autoSaveInput').checked;needSave=true;};
 $('cycleDuration').onchange=()=>setGrowthSettings(+$('cycleDuration').value,state.morphSeconds);$('morphDuration').onchange=()=>setGrowthSettings(state.cycleSeconds,+$('morphDuration').value);syncGrowthSettings();
 $('saveBtn').onclick=exportState;$('loadBtn').onclick=()=>$('loadInput').click();$('loadInput').onchange=importFile;
 $('resetSaveBtn').onclick=()=>{try{localStorage.removeItem(STORE);state.autoSave=false;$('autoSaveInput').checked=false;toast('Guardado local borrado. La parcela abierta no cambia.');}catch{toast('El navegador no permite acceder al guardado local.');}};
 window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();state.paused=!state.paused;updateUI(true);}if(e.key==='Escape'){document.querySelectorAll('.modal-shade').forEach(el=>el.classList.add('hidden'));selectPlant(null);}if(e.key.toLowerCase()==='h')harvest(state.selected);if(e.key.toLowerCase()==='f')homeCamera();if(/^[1-8]$/.test(e.key))setCrop(+e.key-1);});
}
function makeGroundTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(256,256);let seed=32917;
 for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=((seed>>>24)/255-.5)*18;im.data[i]=156+noise;im.data[i+1]=118+noise;im.data[i+2]=76+noise;im.data[i+3]=255;}
 ctx.putImageData(im,0,0);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(10,8);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;return tex;
}
function initScene(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xd9ceb9);$('scene').appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0xd9ceb9);scene.fog=new THREE.Fog(0xd9ceb9,29,62);camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,100);
 scene.add(new THREE.HemisphereLight(0xf5f7e6,0x71634e,.95));sun=new THREE.DirectionalLight(0xffecd4,1.65);sun.position.set(-7,13,7);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:1,far:38});sun.shadow.bias=-.00025;sun.shadow.normalBias=.018;scene.add(sun);scene.add(sun.target);
 const fill=new THREE.DirectionalLight(0xd5e1f3,.2);fill.position.set(8,5,-8);scene.add(fill);
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:0xbfb293,roughness:1}));backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.48;backdrop.receiveShadow=true;scene.add(backdrop);
 field=new THREE.Group();scene.add(field);
 baseSlab=new THREE.Mesh(new THREE.BoxGeometry(14,.35,11),new THREE.MeshStandardMaterial({color:0x6d4c32,roughness:1}));baseSlab.position.y=-.19;baseSlab.castShadow=true;baseSlab.receiveShadow=true;field.add(baseSlab);
 const rim=new THREE.Mesh(new THREE.BoxGeometry(14.04,.065,11.04),new THREE.MeshStandardMaterial({color:0x936a42,roughness:1}));rim.position.y=-.045;rim.receiveShadow=true;field.add(rim);
 const top=new THREE.Mesh(new THREE.PlaneGeometry(14,11),new THREE.MeshStandardMaterial({map:makeGroundTexture(),roughness:1,color:0xf3dcc2}));top.rotation.x=-Math.PI/2;top.position.y=-.01;top.receiveShadow=true;field.add(top);
 const lines=[];for(let x=-6.25;x<=6.26;x+=1.25)lines.push(x,.002,-5.5,x,.002,5.5);for(let z=-5;z<=5.01;z+=1.25)lines.push(-7,.002,z,7,.002,z);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));fieldGrid=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x594a31,transparent:true,opacity:.15,depthWrite:false}));field.add(fieldGrid);
 selectionRing=new THREE.Mesh(new THREE.RingGeometry(.56,.585,64),new THREE.MeshBasicMaterial({color:0xffd881,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));selectionRing.rotation.x=-Math.PI/2;selectionRing.position.y=.034;selectionRing.visible=false;scene.add(selectionRing);
 placementRing=new THREE.Group();const gr=new THREE.Mesh(new THREE.RingGeometry(.50,.52,48),new THREE.MeshBasicMaterial({color:0xf7ecc8,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));gr.rotation.x=-Math.PI/2;placementRing.add(gr);const cross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.08,.004,0),new THREE.Vector3(.08,.004,0),new THREE.Vector3(0,.004,-.08),new THREE.Vector3(0,.004,.08)]),new THREE.LineBasicMaterial({color:0xf7ecc8}));placementRing.add(cross);placementRing.position.y=.035;placementRing.visible=false;scene.add(placementRing);
 ripeRings=new THREE.InstancedMesh(new THREE.RingGeometry(.535,.554,40),new THREE.MeshBasicMaterial({color:0xd9e9a9,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}),MAX_PLANTS);ripeRings.count=0;ripeRings.frustumCulled=false;scene.add(ripeRings);
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(particlesPosition,3).setUsage(THREE.DynamicDrawUsage));pg.setAttribute('color',new THREE.BufferAttribute(particlesColor,3).setUsage(THREE.DynamicDrawUsage));pg.setDrawRange(0,0);particlesMesh=new THREE.Points(pg,new THREE.PointsMaterial({size:.065,vertexColors:true,transparent:true,opacity:.85,depthWrite:false}));particlesMesh.frustumCulled=false;scene.add(particlesMesh);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();state.paused=true;toast('Se ha perdido el contexto gráfico. Guarda la parcela y vuelve a abrir el visor.');});
 window.addEventListener('resize',resize);attachControls();setQuality(state.quality);homeCamera();
}
const GROWTH_DECL=`attribute vec4 iGrowth; uniform float uGround; uniform float uHeight; uniform float uClock; uniform float uWind;`;
const GROWTH_POSITION=`
 float plantMask=smoothstep(uGround,uGround+0.12,position.y);
 float above=max(0.0,position.y-uGround);
 float sy=mix(1.0,iGrowth.x,plantMask);
 float sr=mix(1.0,iGrowth.y,plantMask);
 transformed.y=position.y+above*(sy-1.0);
 transformed.xz=position.xz*sr;
 float leafMask=plantMask*smoothstep(0.035,0.22,length(position.xz));
 float folded=1.0-iGrowth.z;
 transformed.xz*=1.0-leafMask*folded*0.16;
 transformed.y+=leafMask*folded*(0.10+above*0.12);
 float h=clamp(above/max(0.15,uHeight-uGround),0.0,1.0);
 float breeze=(sin(uClock*1.55+iGrowth.w)*0.017+sin(uClock*2.71+iGrowth.w*1.7)*0.009)*pow(h,1.7)*uWind*plantMask;
 transformed.x+=breeze; transformed.z+=breeze*0.47;
`;
function patchGrowth(material,meta,depth=false){
 material.onBeforeCompile=shader=>{
  shader.uniforms.uGround={value:.10};shader.uniforms.uHeight={value:meta.height};shader.uniforms.uClock=uniforms.clock;shader.uniforms.uWind=uniforms.wind;
  shader.vertexShader=GROWTH_DECL+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+GROWTH_POSITION);
  if(!depth)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>\nfloat nm=smoothstep(uGround,uGround+0.12,position.y);objectNormal=normalize(objectNormal/vec3(mix(1.0,iGrowth.y,nm),mix(1.0,iGrowth.x,nm),mix(1.0,iGrowth.y,nm)));`);
  material.userData.shader=shader;
 };
 material.customProgramCacheKey=()=>depth?'bioma-growth-depth-v3-opaque':'bioma-growth-pbr-v3-opaque';
}
function prepareModels(gltf){
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;const meta=o.userData;if(!Number.isInteger(meta.cropIndex)||!meta.stage)throw new Error('Falta la clasificación de un modelo');
  const i=meta.cropIndex*5+meta.stage-1,geo=o.geometry;
  geo.setAttribute('iGrowth',new THREE.InstancedBufferAttribute(new Float32Array(MAX_PLANTS*4),4).setUsage(THREE.DynamicDrawUsage));
  const material=o.material.clone();material.metalness=0;material.roughness=.91;material.metalnessMap=null;material.roughnessMap=null;if(material.normalScale)material.normalScale.set(.48,.48);material.side=THREE.DoubleSide;material.shadowSide=THREE.DoubleSide;
  if(material.map)material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  patchGrowth(material,meta);const mesh=new THREE.InstancedMesh(geo,material,MAX_PLANTS);mesh.name=o.name;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});patchGrowth(depth,meta,true);mesh.customDepthMaterial=depth;
  models[i]={mesh,meta,geo,material,growthAttr:geo.getAttribute('iGrowth')};scene.add(mesh);
 });
 if(models.filter(Boolean).length!==40)throw new Error('Se esperaban 40 geometrías y no se han podido leer todas');
}
/* Short-lived, opaque dual-topology bridge. Original A and B are NEVER modified.
 * Every triangle gets one regional driver. At the A endpoint, all B leaf faces
 * have zero area; at B the inverse holds. The ground is exchanged below the soil
 * plane. This gives exact visible endpoints without texture alpha or coverage noise.
 * Region labels / pairings were precomputed from the original geometry. They are
 * geometric approximations, not a manually authored botanical rig.
 */
const BRIDGE_DECL=`
attribute vec3 aRoot;
attribute vec3 aPeerRoot;
attribute vec4 aSpin;
attribute vec4 aPart;
attribute vec4 iBridge;
uniform vec2 uHeights;
uniform vec2 uRadii;
uniform float uClock;
uniform float uWind;
float bridgeEase(float x){x=clamp(x,0.0,1.0);return x*x*x*(x*(x*6.0-15.0)+10.0);}
vec4 bridgeQuat(vec4 q,float t){
 float a=acos(clamp(q.w,-1.0,1.0));float sn=sin(a);
 if(abs(sn)<0.0001)return vec4(0.0,0.0,0.0,1.0);
 return vec4(q.xyz*(sin(t*a)/sn),cos(t*a));
}
vec3 bridgeRotate(vec3 v,vec4 q){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
vec3 bridgeBase(vec3 p,float role){
 float ownH=mix(uHeights.x,uHeights.y,role),ownR=mix(uRadii.x,uRadii.y,role);
 float H=mix(uHeights.x,uHeights.y,iBridge.y),R=mix(uRadii.x,uRadii.y,iBridge.y);
 float sy=(H-0.1)/max(0.12,ownH-0.1),sr=clamp(R/max(0.08,ownR),0.25,2.8);
 float pm=smoothstep(0.1,0.22,p.y),above=max(0.0,p.y-0.1);
 vec3 v=p;v.y+=above*(mix(1.0,sy,pm)-1.0);v.xz*=mix(1.0,sr,pm);
 float lm=pm*smoothstep(0.035,0.22,length(p.xz));float folded=role*(1.0-mix(0.70,1.0,iBridge.y));
 v.xz*=1.0-lm*folded*0.16;v.y+=lm*folded*(0.10+above*0.12);
 float h=clamp(above/max(0.15,ownH-0.1),0.0,1.0);
 float breeze=(sin(uClock*1.55+iBridge.z)*0.017+sin(uClock*2.71+iBridge.z*1.7)*0.009)*pow(h,1.7)*uWind*pm;
 v.x+=breeze;v.z+=breeze*0.47;return v;
}
vec3 bridgeBaseNormal(vec3 p,vec3 n,float role){
 float ownH=mix(uHeights.x,uHeights.y,role),ownR=mix(uRadii.x,uRadii.y,role);
 float H=mix(uHeights.x,uHeights.y,iBridge.y),R=mix(uRadii.x,uRadii.y,iBridge.y);
 float sy=(H-0.1)/max(0.12,ownH-0.1),sr=clamp(R/max(0.08,ownR),0.25,2.8);
 float pm=smoothstep(0.1,0.22,p.y);return normalize(n/vec3(mix(1.0,sr,pm),mix(1.0,sy,pm),mix(1.0,sr,pm)));
}
float bridgePartTime(){
 // A tiny phase offset staggers organs, but is zero at both endpoints.
 float t=clamp(iBridge.x,0.0,1.0);t+=aPart.z*sin(3.14159265359*t)*0.055;
 return bridgeEase(t);
}
vec3 bridgePosition(vec3 p){
 float role=aPart.x,kind=aPart.y,t=bridgePartTime();
 vec3 v=bridgeBase(p,role);
 if(kind<0.5){
  // Both bases keep their shape; the hidden one remains inside the soil slab.
  float away=mix(t,1.0-t,role);v.y-=0.75*pow(away,6.0);return v;
 }
 float weight=mix(1.0-t,t,role),scale=sqrt(max(0.0,weight));
 vec3 root=bridgeBase(aRoot,role),peer=bridgeBase(aPeerRoot,1.0-role);
 float away=mix(t,1.0-t,role);vec3 pivot=mix(root,peer,away);
 if(kind<1.5){
  // Collapse the core in radius only: never squash the stem vertically.
  v.xz=mix(pivot.xz,v.xz,scale);return v;
 }
 vec4 q=bridgeQuat(aSpin,away);
 return pivot+bridgeRotate(v-root,q)*scale;
}
vec3 bridgeNormal(vec3 p,vec3 n){
 float role=aPart.x,kind=aPart.y,t=bridgePartTime();vec3 v=bridgeBaseNormal(p,n,role);
 if(kind<0.5)return v;
 float away=mix(t,1.0-t,role);
 if(kind<1.5){float s=max(0.001,sqrt(max(0.0,1.0-away)));return normalize(v/vec3(s,1.0,s));}
 return normalize(bridgeRotate(v,bridgeQuat(aSpin,away)));
}
`;
function patchBridge(material,a,b,depth=false){
 material.onBeforeCompile=shader=>{
  shader.uniforms.uHeights={value:new THREE.Vector2(a.height,b.height)};
  shader.uniforms.uRadii={value:new THREE.Vector2(a.foliageRadius,b.foliageRadius)};
  shader.uniforms.uClock=uniforms.clock;shader.uniforms.uWind=uniforms.wind;
  shader.vertexShader=BRIDGE_DECL+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=bridgePosition(position);');
  if(!depth)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=bridgeNormal(position,objectNormal);');
  material.userData.shader=shader;
 };
 material.customProgramCacheKey=()=>depth?'bioma-local-bridge-depth-v3':'bioma-local-bridge-pbr-v3';
}
function prepareBridges(data){
 if(!data||data.models?.length!==40||data.pairs?.length!==32)throw new Error('Datos de transición incompletos');
 const v1=new THREE.Vector3(),v2=new THREE.Vector3(),q=new THREE.Quaternion();
 for(const pair of data.pairs){
  const A=models[pair.a],B=models[pair.b];
  if(!A||!B)throw new Error('Correspondencia de transición no válida');
  const total=A.geo.index.count+B.geo.index.count;
  const pos=new Float32Array(total*3),norm=new Float32Array(total*3),uv=new Float32Array(total*2);
  const roots=new Float32Array(total*3),peers=new Float32Array(total*3),spins=new Float32Array(total*4),parts=new Float32Array(total*4);
  let cursor=0;
  for(let role=0;role<2;role++){
   const own=role?B:A,other=role?A:B,rd=data.models[role?pair.b:pair.a],pd=data.models[role?pair.a:pair.b],mapping=role?pair.b2a:pair.a2b;
   const pg=own.geo.getAttribute('position'),ng=own.geo.getAttribute('normal'),ug=own.geo.getAttribute('uv'),ix=own.geo.index.array;
   if(rd.vertices!==pg.count||rd.faces*3!==ix.length||rd.faceLabels.length!==rd.faces)throw new Error('La transición no coincide con la malla original');
   const drivers=rd.regions.map((r,k)=>{
    const match=mapping[k],pr=match>=0?pd.regions[match]:null;
    let peer,spin=[0,0,0,1];
    if(pr){
     peer=pr.root;
     if(k>=2){
      v1.fromArray(r.direction).normalize();v2.fromArray(pr.direction).normalize();q.setFromUnitVectors(v1,v2).normalize();
      if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);spin=q.toArray();
     }
    }else{
     // Unmatched organs emerge from / retire toward an attachment on the other
     // plant, instead of nearest-vertex interpolation across unrelated leaves.
     const yh=clamp((r.root[1]-.10)/Math.max(.2,own.meta.height-.10),.03,.94);
     peer=[r.root[0]*.16,.10+yh*(other.meta.height-.10),r.root[2]*.16];
    }
    // Phase depends on location, so nearby matched regions evolve together.
    const phase=k<2?0:Math.sin((r.root[1]/Math.max(.2,own.meta.height))*5.0)*.65;
    return{root:r.root,peer,spin,kind:k<2?k:2,phase};
   });
   for(let face=0;face<rd.faces;face++){
    const d=drivers[rd.faceLabels[face]];if(!d)throw new Error('Región de transición desconocida');
    for(let j=0;j<3;j++,cursor++){
     const vi=ix[face*3+j];pos.set([pg.getX(vi),pg.getY(vi),pg.getZ(vi)],cursor*3);
     norm.set([ng.getX(vi),ng.getY(vi),ng.getZ(vi)],cursor*3);uv.set([ug.getX(vi),ug.getY(vi)],cursor*2);
     roots.set(d.root,cursor*3);peers.set(d.peer,cursor*3);spins.set(d.spin,cursor*4);parts.set([role,d.kind,d.phase,0],cursor*4);
    }
   }
  }
  const geo=new THREE.BufferGeometry();
  for(const [name,array,size] of [['position',pos,3],['normal',norm,3],['uv',uv,2],['aRoot',roots,3],['aPeerRoot',peers,3],['aSpin',spins,4],['aPart',parts,4]])geo.setAttribute(name,new THREE.BufferAttribute(array,size));
  const attr=new THREE.InstancedBufferAttribute(new Float32Array(MAX_PLANTS*4),4).setUsage(THREE.DynamicDrawUsage);geo.setAttribute('iBridge',attr);
  geo.computeBoundingSphere();
  const material=A.material.clone();material.transparent=false;material.opacity=1;material.depthWrite=true;material.alphaTest=0;patchBridge(material,A.meta,B.meta);
  const mesh=new THREE.InstancedMesh(geo,material,MAX_PLANTS);mesh.name=`puente_${A.meta.crop}_${A.meta.stage}_${B.meta.stage}`;
  mesh.count=0;mesh.visible=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});patchBridge(depth,A.meta,B.meta,true);mesh.customDepthMaterial=depth;
  const index=A.meta.cropIndex*4+A.meta.stage-1;bridges[index]={mesh,geo,attr,a:pair.a,b:pair.b};scene.add(mesh);
 }
}
function cycleDuration(crop){return state.cycleSeconds>0?state.cycleSeconds:SPECIES[crop].duration;}
function transitionWindow(crop,stage){
 const intervalSeconds=(MARKS[stage+1]-MARKS[stage])*cycleDuration(crop);
 // The bridge is always INSIDE the former .64–.98 coverage transition.
 // A fixed simulated duration keeps long crop cycles free from long deformations.
 const width=state.morphSeconds>0?Math.min(.34,state.morphSeconds/intervalSeconds):.34;
 return{start:.81-width*.5,end:.81+width*.5,seconds:width*intervalSeconds};
}
function syncGrowthSettings(){
 $('cycleDuration').value=String(state.cycleSeconds);$('morphDuration').value=String(state.morphSeconds);
 document.querySelectorAll('.crop-card').forEach((el,i)=>{const c=SPECIES[i],d=cycleDuration(i);el.title=`Plantar ${c.name} · ciclo de ${d} s`;el.querySelector('small').textContent=`${c.kind} · ${d>=300?Math.round(d/60)+' min':d+' s'}`;});
 $('growthSettingsInfo').textContent=(state.cycleSeconds?'Todos los cultivos: '+formatTime(state.cycleSeconds)+'.':'Ritmo V1: ciclos de 70–150 segundos, según la especie.')+' '+(state.morphSeconds?'El morph ocupa como máximo '+state.morphSeconds+' s simulados y nunca sale del antiguo intervalo de transición.':'El morph ocupa el intervalo completo donde la V1 utilizaba dithering.');
}
function setGrowthSettings(cycleSeconds,morphSeconds){
 if([0,60,120,600,1800,3600].includes(cycleSeconds))state.cycleSeconds=cycleSeconds;
 if([0,.8,2,4,8].includes(morphSeconds))state.morphSeconds=morphSeconds;
 needSave=true;syncGrowthSettings();updateUI(true);
}
function writeBridge(index,plant,part){
 const b=bridges[index],slot=bridgeCounts[index]++;if(slot>=MAX_PLANTS)return;
 tmpObj.position.set(plant.x,0,plant.z);tmpObj.rotation.set(0,plant.rotation||0,0);tmpObj.scale.setScalar(1);tmpObj.updateMatrix();b.mesh.setMatrixAt(slot,tmpObj.matrix);
 b.attr.setXYZW(slot,part.t,part.e,plant.seed||0,0);
}

function stageSample(crop,growth){
 const offset=crop*5,first=models[offset].meta;
 if(growth<MARKS[0]){const t=smooth(growth/MARKS[0]),sy=mix(.045,1,t),sr=mix(.30,1,t);return{height:.10+(first.height-.10)*sy,stage:0,phase:'original',items:[{index:offset,sy,sr,open:mix(.45,1,t)}]};}
 if(growth>=1)return{height:models[offset+4].meta.height,stage:4,phase:'original',items:[{index:offset+4,sy:1,sr:1,open:1}]};
 let a=0;while(a<3&&growth>=MARKS[a+1])a++;
 const local=clamp((growth-MARKS[a])/(MARKS[a+1]-MARKS[a]),0,1),e=smooth(local);
 const am=models[offset+a].meta,bm=models[offset+a+1].meta;
 const height=mix(am.height,bm.height,e),radius=mix(am.foliageRadius,bm.foliageRadius,e),w=transitionWindow(crop,a);
 if(local>w.start&&local<w.end){
  const t=clamp((local-w.start)/(w.end-w.start),0,1);
  return{height,stage:t>=.5?a+1:a,phase:'morph',from:a,to:a+1,t,seconds:w.seconds,items:[],bridge:{index:crop*4+a,t,e}};
 }
 const incoming=local>=w.end,meta=incoming?bm:am;
 return{height,stage:a+(incoming?1:0),phase:'original',items:[{index:offset+a+(incoming?1:0),sy:(height-.1)/Math.max(.12,meta.height-.1),sr:clamp(radius/Math.max(.08,meta.foliageRadius),.25,2.8),open:incoming?mix(.70,1,e):1}]};
}
function writeInstance(modelIndex,plant,part){
 const item=models[modelIndex],slot=counts[modelIndex]++;if(slot>=MAX_PLANTS)return;
 tmpObj.position.set(plant.x,0,plant.z);tmpObj.rotation.set(0,plant.rotation||0,0);tmpObj.scale.setScalar(1);tmpObj.updateMatrix();item.mesh.setMatrixAt(slot,tmpObj.matrix);
 item.growthAttr.setXYZW(slot,part.sy,part.sr,part.open,plant.seed||0);
}
function buildInstances(){
 counts.fill(0);bridgeCounts.fill(0);let ripeCount=0;
 if(state.view==='catalog'){
  for(let s=0;s<5;s++){const plant={x:(s-2)*1.85,z:0,rotation:0,seed:s*2};writeInstance(state.crop*5+s,plant,{sy:1,sr:1,open:1,cut:1,role:1});}
 }else{
  for(const p of state.plants){const sample=stageSample(p.crop,p.growth);p.height=sample.height;p.stage=sample.stage;for(const part of sample.items)writeInstance(part.index,p,part);if(sample.bridge)writeBridge(sample.bridge.index,p,sample.bridge);
   if(p.growth>=1){tmpObj.position.set(p.x,.029,p.z);tmpObj.rotation.set(-Math.PI/2,0,0);tmpObj.scale.setScalar(1);tmpObj.updateMatrix();ripeRings.setMatrixAt(ripeCount++,tmpObj.matrix);}
  }
 }
 for(let i=0;i<40;i++){const m=models[i];m.mesh.count=counts[i];m.mesh.visible=counts[i]>0;if(counts[i]){m.mesh.instanceMatrix.needsUpdate=true;m.growthAttr.needsUpdate=true;}}
 for(let i=0;i<bridges.length;i++){const b=bridges[i];b.mesh.count=bridgeCounts[i];b.mesh.visible=bridgeCounts[i]>0;if(bridgeCounts[i]){b.mesh.instanceMatrix.needsUpdate=true;b.attr.needsUpdate=true;}}
 ripeRings.count=ripeCount;if(ripeCount)ripeRings.instanceMatrix.needsUpdate=true;
 const selected=findPlant(state.selected);selectionRing.visible=!!selected&&state.view==='farm';if(selectionRing.visible)selectionRing.position.set(selected.x,.035,selected.z);
}
function findPlant(id){return state.plants.find(p=>p.id===id);}
function canPlant(x,z){return Math.abs(x)<6.3&&Math.abs(z)<4.75&&state.plants.every(p=>(p.x-x)**2+(p.z-z)**2>=1.02**2);}
function plantAt(crop,x,z,growth=0,options={}){
 if(!loaded||!Number.isFinite(x)||!Number.isFinite(z))return null;
 if(state.plants.length>=MAX_PLANTS){toast('La parcela admite hasta 240 cultivos. Recolecta o retira alguno.');return null;}
 crop=clamp(Number(crop)|0,0,7);if(!options.ignoreCollision&&!canPlant(x,z))return null;
 const p={id:state.nextId++,crop,x,z,growth:clamp(Number(growth)||0,0,1),rotation:options.rotation??((Math.random()-.5)*.24),seed:Math.random()*80,height:.1,stage:0};state.plants.push(p);needSave=true;updateUI(true);return p.id;
}
function selectPlant(id){state.selected=findPlant(id)?id:null;updateUI(true);}
function clearFarm(){state.plants.length=0;state.selected=null;particles.length=0;removeWorldLabels();needSave=true;updateUI(true);}
function addDemo(){
 if(state.view!=='farm')setView('farm');let added=0;
 const spots=[[-3,-1.45],[-1,-1.45],[1,-1.45],[3,-1.45],[-3,1],[ -1,1],[1,1],[3,1]];
 for(let i=0;i<8;i++){let [x,z]=spots[i];if(!canPlant(x,z)){let found=false;for(let zz=-3.8;zz<=3.9&&!found;zz+=1.4)for(let xx=-5.4;xx<=5.5;xx+=1.4){if(canPlant(xx,zz)){x=xx;z=zz;found=true;break;}}if(!found)continue;}
  const age=[.04,.12,.20,.08,.34,.26,.16,.10][i];if(plantAt(i,x,z,age)!==null)added++;
 }
 if(added){toast(`${added} cultivos de muestra plantados. Prueba la velocidad ×5.`);homeCamera();}else toast('No queda espacio libre para la muestra.');
}
function harvest(id,quiet=false){
 if(state.view!=='farm')return false;const index=state.plants.findIndex(p=>p.id===id);if(index<0)return false;const p=state.plants[index];if(p.growth<1){if(!quiet)toast('Este cultivo todavía está creciendo.');return false;}
 state.plants.splice(index,1);state.harvested++;if(state.selected===id)state.selected=null;spawnParticles(p);labelEls.get(id)?.remove();labelEls.delete(id);needSave=true;updateUI(true);if(!quiet)toast(SPECIES[p.crop].name+' recolectado. La tierra vuelve a estar libre.');return true;
}
function harvestAll(){const ids=state.plants.filter(p=>p.growth>=1).map(p=>p.id);let n=0;for(const id of ids)if(harvest(id,true))n++;if(n)toast(`${n} ${n===1?'cultivo recolectado':'cultivos recolectados'}.`);}
function advance(seconds){if(state.view!=='farm'||!Number.isFinite(seconds)||seconds<0)return;state.clock+=seconds;for(const p of state.plants){if(scrubbing&&p.id===state.selected)continue;p.growth=Math.min(1,p.growth+seconds/cycleDuration(p.crop));}needSave=true;}
function spawnParticles(p){for(let j=0;j<15&&particles.length<512;j++){const a=Math.random()*Math.PI*2;particles.push({x:p.x+(Math.random()-.5)*.4,y:.18+Math.random()*p.height*.7,z:p.z+(Math.random()-.5)*.4,vx:Math.cos(a)*.65,vy:.7+Math.random()*.6,vz:Math.sin(a)*.65,life:.75+Math.random()*.35});}}
function updateParticles(dt){
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=1.3*dt;}
 for(let i=0;i<particles.length;i++){const p=particles[i];particlesPosition.set([p.x,p.y,p.z],i*3);const f=clamp(p.life*1.5,0,1);particlesColor.set([f,f*.78,f*.35],i*3);}
 particlesMesh.geometry.setDrawRange(0,particles.length);particlesMesh.geometry.attributes.position.needsUpdate=true;particlesMesh.geometry.attributes.color.needsUpdate=true;
}
function setView(view){
 if(!loaded)return;state.view=view==='catalog'?'catalog':'farm';state.selected=null;pointerWorld=null;placementRing.visible=false;$('placementHint').style.display='none';removeWorldLabels();
 $('viewToggle').textContent=state.view==='catalog'?'Volver a la parcela':'Ver etapas';$('viewToggle').classList.toggle('active',state.view==='catalog');
 field.scale.set(1,1,state.view==='catalog'?.55:1);if(state.view==='catalog')createCatalogLabels();updateSceneTag();homeCamera();updateUI(true);
}
function homeCamera(){
 if(state.view==='catalog'){orbit.theta=.14;orbit.phi=.64;orbit.radius=innerWidth<800?17:13.5;orbit.target.set(0,.6,0);}
 else{orbit.theta=.44;orbit.phi=.90;orbit.radius=innerWidth<800?18.5:15.6;orbit.target.set(.1,.45,0);}
 updateCamera();
}
function updateCamera(){const c=Math.cos(orbit.phi);camera.position.set(orbit.target.x+Math.sin(orbit.theta)*c*orbit.radius,orbit.target.y+Math.sin(orbit.phi)*orbit.radius,orbit.target.z+Math.cos(orbit.theta)*c*orbit.radius);camera.lookAt(orbit.target);camera.updateMatrixWorld();}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;const mobile=innerWidth<=800;camera.setViewOffset(innerWidth,innerHeight,mobile?0:-100,mobile?75:0,innerWidth,innerHeight);camera.updateProjectionMatrix();updateCamera();}
function setQuality(value){
 state.quality=['high','medium','low'].includes(value)?value:'medium';$('quality').value=state.quality;const high=state.quality==='high',low=state.quality==='low';renderer.setPixelRatio(Math.min(devicePixelRatio||1,high?1.6:low?1:1.25));renderer.shadowMap.enabled=!low;sun.castShadow=!low;sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}models.forEach(m=>{if(m)m.material.needsUpdate=true;});bridges.forEach(b=>b.mesh.material.needsUpdate=true);resize();needSave=true;
}
function worldAt(clientX,clientY){const rect=renderer.domElement.getBoundingClientRect();pointerNDC.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointerNDC,camera);const hit=raycaster.ray.intersectPlane(rayPlane,new THREE.Vector3());return hit;}
function pickPlant(clientX,clientY){
 worldAt(clientX,clientY);let best=null,bestDistance=Infinity;const point=new THREE.Vector3();for(const p of state.plants){const h=p.height||stageSample(p.crop,p.growth).height;const rad=p.crop===3?.52:.43;pickBox.min.set(p.x-rad,.015,p.z-rad);pickBox.max.set(p.x+rad,Math.max(.18,h),p.z+rad);if(raycaster.ray.intersectBox(pickBox,point)){const d=point.distanceToSquared(raycaster.ray.origin);if(d<bestDistance){best=p;bestDistance=d;}}}return best;
}
function tap(x,y){
 if(!loaded||state.view!=='farm')return;const p=pickPlant(x,y);if(p){selectPlant(p.id);return;}
 const hit=worldAt(x,y);if(!hit)return;let px=hit.x,pz=hit.z;if(state.snap){px=Math.round(px/1.25)*1.25;pz=Math.round(pz/1.25)*1.25;}
 if(state.mode==='select'){selectPlant(null);return;}
 if(Math.abs(px)>6.3||Math.abs(pz)>4.75){toast('Planta dentro de la superficie de tierra.');return;}
 if(!canPlant(px,pz)){toast('Deja un poco de espacio entre las bases de los cultivos.');return;}
 const id=plantAt(state.crop,px,pz);if(id!==null){selectPlant(id);toast(SPECIES[state.crop].name+' plantado.');}
}
function panCamera(dx,dy){const s=orbit.radius*.0017,right=new THREE.Vector3(Math.cos(orbit.theta),0,-Math.sin(orbit.theta)),front=new THREE.Vector3(Math.sin(orbit.theta),0,Math.cos(orbit.theta));orbit.target.addScaledVector(right,-dx*s).addScaledVector(front,-dy*s);orbit.target.x=clamp(orbit.target.x,-9,9);orbit.target.z=clamp(orbit.target.z,-8,8);updateCamera();}
function updateHover(x,y){
 pointerScreen={x,y};if(state.view!=='farm'||state.mode!=='plant'||dragging){pointerWorld=null;return;}const hit=worldAt(x,y);if(!hit){pointerWorld=null;return;}if(state.snap){hit.x=Math.round(hit.x/1.25)*1.25;hit.z=Math.round(hit.z/1.25)*1.25;}pointerWorld=hit;
}
function attachControls(){
 const canvas=renderer.domElement;canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{if(!loaded)return;canvas.setPointerCapture(e.pointerId);gesture.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gesture.pointers.size===1){gesture.down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,shift:e.shiftKey};gesture.moved=false;gesture.two=false;}else{gesture.two=true;gesture.moved=true;gesture.previousDistance=0;}dragging=false;});
 canvas.addEventListener('pointermove',e=>{
  if(!loaded)return;if(!gesture.pointers.has(e.pointerId)){updateHover(e.clientX,e.clientY);return;}
  gesture.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(gesture.pointers.size>=2){const a=[...gesture.pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),c={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};if(gesture.previousDistance>0){orbit.radius=clamp(orbit.radius*gesture.previousDistance/Math.max(5,d),4,40);if(gesture.previousCenter)panCamera(c.x-gesture.previousCenter.x,c.y-gesture.previousCenter.y);updateCamera();}gesture.previousDistance=d;gesture.previousCenter=c;gesture.moved=true;dragging=true;return;}
  const down=gesture.down;if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)gesture.moved=true;
  if(gesture.moved){dragging=true;if(down.button===2||down.button===1||down.shift)panCamera(dx,dy);else{orbit.theta-=dx*.0055;orbit.phi=clamp(orbit.phi+dy*.004, .20,1.49);updateCamera();}}
  down.lastX=e.clientX;down.lastY=e.clientY;
 });
 const end=e=>{const wasClick=!gesture.moved&&!gesture.two&&gesture.down&&gesture.down.button===0;gesture.pointers.delete(e.pointerId);try{canvas.releasePointerCapture(e.pointerId);}catch{}if(wasClick&&e.type==='pointerup')tap(e.clientX,e.clientY);if(gesture.pointers.size===0){gesture.down=null;dragging=false;gesture.previousDistance=0;gesture.previousCenter=null;pointerWorld=null;}else gesture.moved=true;};
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',()=>{pointerWorld=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.radius=clamp(orbit.radius*Math.exp(e.deltaY*.0012),4,40);updateCamera();},{passive:false});
}
function updatePlacement(){
 const valid=pointerWorld&&state.view==='farm'&&state.mode==='plant'&&!dragging&&Math.abs(pointerWorld.x)<6.3&&Math.abs(pointerWorld.z)<4.75;
 placementRing.visible=!!valid;if(!valid){$('placementHint').style.display='none';return;}
 placementRing.position.set(pointerWorld.x,.035,pointerWorld.z);const can=canPlant(pointerWorld.x,pointerWorld.z);placementRing.children[0].material.color.set(can?0xece5bf:0xc68663);$('placementHint').style.display='block';$('placementHint').textContent=can?'＋ Plantar '+SPECIES[state.crop].name:'Espacio ocupado';$('placementHint').style.left=Math.min(innerWidth-170,pointerScreen.x+15)+'px';$('placementHint').style.top=Math.max(70,pointerScreen.y-32)+'px';
}
function project(x,y,z){tmpVec.set(x,y,z).project(camera);return{x:(tmpVec.x*.5+.5)*innerWidth,y:(-.5*tmpVec.y+.5)*innerHeight,visible:tmpVec.z<1&&tmpVec.z>-1};}
function placeLabel(el,x,y,z){const p=project(x,y,z);el.style.display=p.visible?'block':'none';el.style.transform=`translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`;}
function removeWorldLabels(){for(const el of labelEls.values())el.remove();labelEls.clear();for(const el of catalogLabels)el.remove();catalogLabels=[];}
function createCatalogLabels(){if(!loaded)return;for(const el of catalogLabels)el.remove();catalogLabels=[];for(let s=0;s<5;s++){const m=models[state.crop*5+s],el=document.createElement('div');el.className='world-label stage';el.innerHTML=`${s+1}. ${STAGE_SHORT[s]}<small>${(m.geo.index.count/3).toLocaleString('es-ES')} triángulos</small>`;$('worldLabels').appendChild(el);catalogLabels.push(el);}}
function updateLabels(){
 if(state.view==='catalog'){catalogLabels.forEach((el,s)=>placeLabel(el,(s-2)*1.85,.03,.91));return;}
 const wanted=new Set();let n=0;for(const p of state.plants){const selected=p.id===state.selected;if(!selected&&!(state.labels&&p.growth>=1&&n<22))continue;n++;wanted.add(p.id);let el=labelEls.get(p.id);if(!el){el=document.createElement('div');el.className='world-label';$('worldLabels').appendChild(el);labelEls.set(p.id,el);}el.classList.toggle('ripe',p.growth>=1);el.classList.toggle('crop-selected',selected&&p.growth<1);const text=p.growth>=1?'✓ '+SPECIES[p.crop].name+' · listo':SPECIES[p.crop].name+' · '+Math.floor(p.growth*100)+' %';if(el.textContent!==text)el.textContent=text;placeLabel(el,p.x,p.height+.15,p.z);}
 for(const[id,el]of labelEls)if(!wanted.has(id)){el.remove();labelEls.delete(id);}
}
function updateUI(force=false){
 if(!force&&performance.now()-lastUI<130)return;lastUI=performance.now();const ripe=state.plants.reduce((n,p)=>n+(p.growth>=1),0);$('countPlants').textContent=state.plants.length;$('countRipe').textContent=ripe;$('countHarvest').textContent=state.harvested;$('clockText').textContent=formatTime(state.clock);$('harvestAll').textContent='Recolectar maduros · '+ripe;$('harvestAll').disabled=ripe===0||state.view!=='farm';
 $('pauseBtn').textContent=state.paused?'▶':'Ⅱ';$('pauseBtn').title=state.paused?'Reanudar el tiempo':'Pausar el tiempo';$('pauseBtn').setAttribute('aria-label',$('pauseBtn').title);$('pauseBtn').classList.toggle('active',state.paused);$('pauseBtn').disabled=state.view==='catalog';
 $('emptyHint').classList.toggle('hidden',state.plants.length>0||state.view!=='farm');
 const p=findPlant(state.selected);$('inspector').classList.toggle('hidden',!p||state.view!=='farm');if(!p)return;const c=SPECIES[p.crop];const sample=loaded?stageSample(p.crop,p.growth):{stage:0};
 $('selectedName').textContent=c.name;$('selectedId').textContent='CULTIVO #'+String(p.id).padStart(3,'0');if($('selectedThumb').dataset.crop!==c.id){$('selectedThumb').src=THUMBS[c.id];$('selectedThumb').dataset.crop=c.id;}
 $('progressBar').style.width=(p.growth*100)+'%';$('percentText').textContent=Math.floor(p.growth*100)+' %';$('stageText').textContent=p.growth>=1?'Listo para recolectar':STAGES[sample.stage];$('remainingText').textContent=p.growth>=1?'La planta permanece hasta su recolección.':`Cosecha en ${Math.ceil((1-p.growth)*cycleDuration(p.crop))} s simulados · ciclo de ${cycleDuration(p.crop)} s`;
 $('transitionStatus').textContent=sample.phase==='morph'?`Morph E${sample.from+1} → E${sample.to+1} · ${Math.round(sample.t*100)} %`:'Modelo original · crecimiento V1';$('transitionStatus').classList.toggle('morphing',sample.phase==='morph');
 [...$('stageDots').children].forEach((el,i)=>el.classList.toggle('done',i<=sample.stage));if(!scrubbing)$('growthScrub').value=Math.round(p.growth*1000);
 $('harvestBtn').disabled=p.growth<1;$('harvestBtn').textContent=p.growth>=1?'✓ Recolectar '+c.name:'En crecimiento…';
}
function serializeState(){return{format:'BIOMA_CULTIVOS',version:1,savedAt:new Date().toISOString(),clock:state.clock,harvested:state.harvested,nextId:state.nextId,selectedCrop:state.crop,speed:state.speed,paused:state.paused,settings:{snap:state.snap,labels:state.labels,autoSave:state.autoSave,cycleSeconds:state.cycleSeconds,morphSeconds:state.morphSeconds},plants:state.plants.map(({id,crop,x,z,growth,rotation,seed})=>({id,crop,x,z,growth,rotation,seed}))};}
function restore(data){
 if(!data||data.format!=='BIOMA_CULTIVOS'||data.version!==1||!Array.isArray(data.plants)||data.plants.length>MAX_PLANTS)throw new Error('No es un archivo de parcela compatible');
 const ids=new Set();const plants=data.plants.map((p,i)=>{
  if(!Number.isInteger(p.crop)||p.crop<0||p.crop>7||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>6.4||Math.abs(p.z)>4.9||!Number.isFinite(p.growth)||p.growth<0||p.growth>1)throw new Error('Hay una posición o un cultivo no válido en el archivo');
  let id=Number.isSafeInteger(p.id)&&p.id>0?p.id:i+1;while(ids.has(id))id++;ids.add(id);return{id,crop:p.crop,x:p.x,z:p.z,growth:p.growth,rotation:Number.isFinite(p.rotation)?p.rotation:0,seed:Number.isFinite(p.seed)?p.seed:i*7,height:.1,stage:0};
 });
 state.plants=plants;state.nextId=Math.max(0,...ids)+1;state.clock=Number.isFinite(data.clock)&&data.clock>=0?Math.min(data.clock,1e10):0;state.harvested=Number.isSafeInteger(data.harvested)&&data.harvested>=0?data.harvested:0;state.speed=[1,2,5,10,25].includes(data.speed)?data.speed:1;state.paused=!!data.paused;state.selected=null;
 state.cycleSeconds=0;state.morphSeconds=2;
 if(data.settings){if([0,60,120,600,1800,3600].includes(data.settings.cycleSeconds))state.cycleSeconds=data.settings.cycleSeconds;if([0,.8,2,4,8].includes(data.settings.morphSeconds))state.morphSeconds=data.settings.morphSeconds;state.snap=!!data.settings.snap;state.labels=data.settings.labels!==false;state.autoSave=data.settings.autoSave!==false;}
 $('snapInput').checked=state.snap;$('labelsInput').checked=state.labels;$('autoSaveInput').checked=state.autoSave;document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===state.speed));setCrop(Number.isInteger(data.selectedCrop)?data.selectedCrop:0);syncGrowthSettings();removeWorldLabels();updateUI(true);
}
function autoSave(){if(!state.autoSave||!needSave)return;try{localStorage.setItem(STORE,JSON.stringify(serializeState()));needSave=false;}catch{/* Some file:// or private browsing modes do not permit storage. JSON export remains available. */}}
function exportState(){const b=new Blob([JSON.stringify(serializeState(),null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='Bioma_Cultivos_Parcela.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Parcela exportada: posiciones y progreso.');}
async function importFile(){const file=$('loadInput').files[0];if(!file)return;try{if(file.size>2e6)throw new Error('El archivo supera 2 MB');const data=JSON.parse(await file.text());restore(data);setView('farm');needSave=true;$('settingsModal').classList.add('hidden');toast('Parcela recuperada.');}catch(e){toast('No se pudo cargar: '+e.message);}$('loadInput').value='';}
function renderFrame(time){
 requestAnimationFrame(renderFrame);if(!loaded)return;const dt=lastFrame?Math.min(1,Math.max(0,(time-lastFrame)/1000)):0;lastFrame=time;
 if(document.hidden)return;const modalOpen=!!document.querySelector('.modal-shade:not(.hidden)');
 if(!state.paused&&!modalOpen)advance(dt*state.speed);uniforms.clock.value=time*.001;buildInstances();updateParticles(dt);updatePlacement();updateLabels();updateUI();renderer.render(scene,camera);
 frameCounter++;if(time-fpsClock>700){fps=frameCounter*1000/Math.max(1,time-fpsClock);fpsClock=time;frameCounter=0;$('perf').textContent=`${Math.round(fps)} fps · ${renderer.info.render.calls} dibujados · ${(renderer.info.render.triangles/1000).toFixed(0)}k triángulos`;}
 if(time-lastSave>2500){autoSave();lastSave=time;}
}
function exposeAPI(){
 window.CultivosLab={version:'3.0-local-morph',transitionMode:'opaque-regional-bridge',ready:true,assetCount:models.length,uniqueTriangles:models.reduce((n,m)=>n+m.geo.index.count/3,0),
  getState:()=>JSON.parse(JSON.stringify(serializeState())),getStats:()=>({plants:state.plants.length,ripe:state.plants.filter(p=>p.growth>=1).length,harvested:state.harvested,view:state.view,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fps,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,transitioning:state.view==='farm'?state.plants.filter(p=>stageSample(p.crop,p.growth).phase==='morph').length:0,bridgeCount:bridges.length}),
   plantAt,harvest,harvestAll,clear:clearFarm,advance,setView,setCrop,select:selectPlant,setQuality,setGrowthSettings,
   sampleGrowth:(crop,g)=>loaded&&Number.isInteger(crop)&&crop>=0&&crop<8&&Number.isFinite(g)?stageSample(crop,clamp(g,0,1)):null,
   getTransitionWindows:crop=>Number.isInteger(crop)&&crop>=0&&crop<8?Array.from({length:4},(_,stage)=>{const w=transitionWindow(crop,stage);return{from:stage+1,to:stage+2,start:MARKS[stage]+w.start*(MARKS[stage+1]-MARKS[stage]),end:MARKS[stage]+w.end*(MARKS[stage+1]-MARKS[stage]),seconds:w.seconds};}):[],
  setGrowth:(id,g)=>{const p=findPlant(id);if(p&&Number.isFinite(g)){p.growth=clamp(g,0,1);needSave=true;updateUI(true);return true;}return false;},
  pause:v=>{state.paused=!!v;updateUI(true);},setSpeed:v=>{if([1,2,5,10,25].includes(v)){state.speed=v;document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===v));}},
  project:(x,y,z)=>project(x,y,z),plantScreen:id=>{const p=findPlant(id);return p?project(p.x,Math.max(.16,p.height*.4),p.z):null;},
  getAssetCatalog:()=>models.map(m=>({name:m.mesh.name,crop:m.meta.crop,stage:m.meta.stage,vertices:m.geo.attributes.position.count,triangles:m.geo.index.count/3,height:m.meta.height})),
  restore,render:()=>{buildInstances();updateLabels();updateUI(true);renderer.render(scene,camera);},
  setCamera:(theta,phi,radius,target)=>{if(Number.isFinite(theta))orbit.theta=theta;if(Number.isFinite(phi))orbit.phi=clamp(phi,.20,1.49);if(Number.isFinite(radius))orbit.radius=clamp(radius,4,40);if(target&&target.length===3&&target.every(Number.isFinite))orbit.target.set(...target);updateCamera();},
  setWind:v=>{state.wind=!!v;uniforms.wind.value=v?1:0;},getCamera:()=>({theta:orbit.theta,phi:orbit.phi,radius:orbit.radius,target:orbit.target.toArray()})
 };
}
async function boot(){
 try{
  buildUI();loadProgress(10,'Preparando la superficie y la iluminación…');initScene();await new Promise(r=>setTimeout(r,25));
  loadProgress(22,'Descomprimiendo las geometrías integradas…');if(typeof DecompressionStream==='undefined')throw new Error('Este navegador no admite DecompressionStream');
  const encoded=$('assetData').textContent.trim(),binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();loadProgress(52,'Cargando materiales y clasificando los 40 estados…');
  const gltf=await new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(raw,'',resolve,reject));prepareModels(gltf);loadProgress(76,'Preparando 32 puentes geométricos locales…');
   const bridgeText=atob($('bridgeData').textContent.trim()),bridgeBytes=new Uint8Array(bridgeText.length);for(let i=0;i<bridgeText.length;i++)bridgeBytes[i]=bridgeText.charCodeAt(i);
   const bridgeRaw=await new Response(new Blob([bridgeBytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();prepareBridges(JSON.parse(bridgeRaw));loadProgress(90,'Preparando los shaders opacos y sus sombras…');
  loaded=true;let restored=false;try{const saved=localStorage.getItem(STORE);if(saved){restore(JSON.parse(saved));restored=true;}}catch{}
  setCrop(state.crop);setQuality(state.quality);buildInstances();renderer.render(scene,camera);updateUI(true);exposeAPI();loadProgress(100,'La parcela está lista.');
  // Release the large textual payload in the live DOM. Geometry and textures stay in memory.
  $('assetData').textContent='';$('thumbnailData').textContent='';$('bridgeData').textContent='';
  await new Promise(r=>setTimeout(r,150));$('loading').classList.add('hidden');if(restored)toast('Parcela recuperada del guardado local.');requestAnimationFrame(renderFrame);
  window.addEventListener('beforeunload',autoSave);document.addEventListener('visibilitychange',()=>{lastFrame=0;if(document.hidden)autoSave();});
 }catch(e){notifyError(e);}
}
boot();
})();
