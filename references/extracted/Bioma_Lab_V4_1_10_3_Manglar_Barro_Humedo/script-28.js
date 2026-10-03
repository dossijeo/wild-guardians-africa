
'use strict';
(()=>{
const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}, TAU=Math.PI*2;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], norm=a=>mul(a,1/(Math.hypot(...a)||1));
const hex=s=>[parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255];
const cmix=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t)), shade=(c,k)=>c.map(v=>clamp(v*k,0,1));
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
function avalanche(h){h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return(h^(h>>>16))>>>0}
function hashCell(s,x,z,k=0){return avalanche(s^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca77)^Math.imul(k|0,0xc2b2ae3d))}
function rand(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296}}
function noise(x,z,s){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;const q=t=>t*t*t*(t*(t*6-15)+10);const u=q(fx),v=q(fz);return mix(mix(hashCell(s,ix,iz)/4294967296,hashCell(s,ix+1,iz)/4294967296,u),mix(hashCell(s,ix,iz+1)/4294967296,hashCell(s,ix+1,iz+1)/4294967296,u),v)}
function fbm(x,z,s){return noise(x,z,s)*.58+noise(x*2.03,z*2.03,s^9271)*.28+noise(x*4.13,z*4.13,s^29714)*.14}
const GROUPS=[{key:'trees',name:'Árboles',short:'Árboles',n:4,cell:13.5},{key:'shrubs',name:'Matorrales',short:'Matorral',n:3,cell:7},{key:'plants',name:'Vegetación baja',short:'Plantas',n:3,cell:2.8},{key:'rocks',name:'Rocas',short:'Rocas',n:3,cell:9},{key:'debris',name:'Restos naturales',short:'Restos',n:4,cell:10},{key:'special',name:'Elementos singulares',short:'Singulares',n:3,cell:32}];
const SLOTS=[
{id:'tree_01',g:0,r:3.8,desc:'Copa dominante. Define la silueta del paisaje y necesita separación respecto a otros árboles.'},
{id:'tree_02',g:0,r:3.1,desc:'Segunda silueta arbórea, de ramificación asimétrica. Introduce variedad sin cambiar las reglas del generador.'},
{id:'tree_03',g:0,r:3.0,desc:'Árbol de acento, menos frecuente. Mayor presencia visual y distribución ponderada.'},
{id:'tree_04',g:0,r:1.7,desc:'Árbol sin hojas. Contrasta con las copas vivas y deja ver el terreno entre sus ramas.'},
{id:'shrub_01',g:1,r:1.1,desc:'Matorral medio de estructura abierta. Se coloca en manchas, no con una densidad uniforme.'},
{id:'shrub_02',g:1,r:.9,desc:'Matorral bajo. Rellena el estrato intermedio sin ocultar el relieve.'},
{id:'shrub_03',g:1,r:1.4,desc:'Masa arbustiva densa. Refuerza visualmente las zonas con mayor cobertura vegetal.'},
{id:'plant_01',g:2,r:.45,desc:'Vegetación baja alta y ligera. Una única geometría se dibuja muchas veces mediante instanciado GPU.'},
{id:'plant_02',g:2,r:.35,desc:'Cobertura corta. Densidad elevada, coste geométrico reducido y pequeñas variaciones de escala.'},
{id:'plant_03',g:2,r:.5,desc:'Macolla o planta de acento. El perfil del bioma cambia su forma y sus colores.'},
{id:'rock_01',g:3,r:1.2,desc:'Roca individual de volumen redondeado y caras planas. Admite giro y escala no uniforme.'},
{id:'rock_02',g:3,r:1.7,desc:'Roca alargada o erosionada. Rompe la repetición de bloques redondeados.'},
{id:'rock_03',g:3,r:1.2,desc:'Conjunto de piedras pequeñas tratado como un solo asset reutilizable.'},
{id:'debris_01',g:4,r:1.8,desc:'Tronco caído con corte visible y una rama secundaria. Se excluyen pendientes fuertes.'},
{id:'debris_02',g:4,r:1.3,desc:'Ramas dispersas agrupadas en una pieza ligera. Añaden detalle sin alterar la topografía.'},
{id:'debris_03',g:4,r:1.0,desc:'Restos óseos estilizados. Baja frecuencia para que funcionen como detalle, no como cobertura.'},
{id:'debris_04',g:4,r:.9,desc:'Tocón con raíces y sección de madera expuesta. Punto de origen apoyado en el terreno.'},
{id:'special_01',g:5,r:1.7,desc:'Hito pequeño característico del bioma. Se distribuye con menor frecuencia que las rocas.'},
{id:'special_02',g:5,r:4.0,desc:'Grupo de grandes bloques. Se reserva espacio a su alrededor para reducir solapes entre elementos grandes.'},
{id:'special_03',g:5,r:5.0,desc:'Asset estructural: primero crea una depresión en el campo de alturas; después coloca orilla y agua. No es un disco sobre terreno sin adaptar.'}
];
const BIOMES=Object.create(null); // Built-in biome profiles only; all meshes come from supplied GLBs.
const state={seed:'SABANA-847291',biome:'savanna',n:2,relief:1,density:1,river:true,cx:0,cz:0,palette:{},layers:[true,true,true,true,true,true],grid:false,wire:false,shadows:true,autorotate:false,night:0,nightLight:1.12,autoHide:true,hideDistance:7,autoCycle:false,cycleSeconds:180,waterSpeed:.65,waterScale:.55,skyYaw:0,quality:matchMedia('(max-width:700px)').matches?'eco':'normal',assetLOD:true,lighting:'illustrated',exposure:1.0,batching:true,contact:true,groundSurface:true,groundStrength:1,groundMicro:true,groundScale:1,groundNormal:1,groundRelief:true,groundDebug:0};
const GROUND417_BIOME_TILES=Object.freeze({"savanna": {"name": "Grass Medium 01 · seco (tapiz adaptado)", "scale": 0.155, "blend": 1, "normalBoost": 1.2, "relief": 0.075, "base": "ground-embedded-savanna-base", "normal": "ground-embedded-savanna-normal", "arh": "ground-embedded-savanna-arh"}, "grand_river": {"name": "Grass Medium 01 · verde (tapiz adaptado)", "scale": 0.155, "blend": 1, "normalBoost": 1.15, "relief": 0.075, "base": "ground-embedded-grand_river-base", "normal": "ground-embedded-grand_river-normal", "arh": "ground-embedded-grand_river-arh"}, "mangrove": {"name": "Moss002 + Ground050 · musgo y barro alternados", "scale": 0.115, "blend": 1, "normalBoost": 1.3, "relief": 0.18, "base": "ground-embedded-mangrove-base", "normal": "ground-embedded-mangrove-normal", "arh": "ground-embedded-mangrove-arh"}, "volcanoes": {"name": "Rock035 · roca volcánica", "scale": 0.12, "blend": 1, "normalBoost": 1.05, "relief": 0.22, "base": "ground-embedded-volcanoes-base", "normal": "ground-embedded-volcanoes-normal", "arh": "ground-embedded-volcanoes-arh"}, "canyons": {"name": "Ground079S · tierra y grava", "scale": 0.2, "blend": 1, "normalBoost": 1.35, "relief": 0.1, "base": "ground-embedded-canyons-base", "normal": "ground-embedded-canyons-normal", "arh": "ground-embedded-canyons-arh"}, "desert": {"name": "Arena anterior · sin cambios", "scale": 0.1, "blend": 0.58, "normalBoost": 1, "jitter": 0.16, "relief": 0, "base": "ground-embedded-desert-base", "normal": "ground-embedded-desert-normal"}});

let mode='terrain',selected=-1,selectionInstance=null,world=null,gallery=null,prototypes=[],generationMs=0,pending=false,rerun=false,genSerial=0,toastTimer=0;
const currentBiome=()=>{const b=BIOMES[state.biome];return{...b,colors:{...b.colors,...(state.palette[state.biome]||{})}}};
function snapshot(){return{...state,palette:JSON.parse(JSON.stringify(state.palette)),layers:[...state.layers]}}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000)}
const format=n=>n.toLocaleString('es-ES'), num=v=>Number(v.toFixed(4));

// === GEOMETRÍA LOCAL: primitivas con normales planas y color por vértice. ===
class Geometry{
 constructor(){this.v=[];this.min=[Infinity,Infinity,Infinity];this.max=[-Infinity,-Infinity,-Infinity]}
 tri(a,b,c,color,colors=null){const n=norm(cross(sub(b,a),sub(c,a)));for(let j=0;j<3;j++){const p=[a,b,c][j],co=colors?colors[j]:color;this.v.push(...p,...n,...co);for(let k=0;k<3;k++){this.min[k]=Math.min(this.min[k],p[k]);this.max[k]=Math.max(this.max[k],p[k])}}}
 line(a,b,color){for(const p of[a,b]){this.v.push(...p,0,1,0,...color);for(let k=0;k<3;k++){this.min[k]=Math.min(this.min[k],p[k]);this.max[k]=Math.max(this.max[k],p[k])}}}
 merge(g,offset=[0,0,0],scale=[1,1,1],yaw=0){const si=Math.sin(yaw),co=Math.cos(yaw);for(let k=0;k<g.v.length;k+=27){const ps=[];const cs=[];for(let j=0;j<3;j++){const i=k+j*9,x=g.v[i]*scale[0],y=g.v[i+1]*scale[1],z=g.v[i+2]*scale[2];ps.push([x*co+z*si+offset[0],y+offset[1],-x*si+z*co+offset[2]]);cs.push(g.v.slice(i+6,i+9))}this.tri(...ps,cs[0],cs)}return this}
}
function branch(g,a,b,r0,r1,color,sides=7,seed=7){const w=norm(sub(b,a)),u=norm(cross(w,Math.abs(w[1])>.92?[1,0,0]:[0,1,0])),v=cross(w,u),rr=rand(seed);const at=(p,r,t)=>add(p,add(mul(u,Math.cos(t)*r),mul(v,Math.sin(t)*r)));for(let i=0;i<sides;i++){const t=i/sides*TAU,nt=(i+1)/sides*TAU,p=at(a,r0,t),q=at(a,r0,nt),r=at(b,r1,nt),s=at(b,r1,t),co=shade(color,.87+rr()*.23);g.tri(p,q,r,co);g.tri(p,r,s,co);if(r0>0)g.tri(a,q,p,shade(color,.8));if(r1>0)g.tri(b,s,r,shade(color,1.12))}}
// === BIOME ASSET PACKS v1: static geometry, textures and LODs; independent of terrain. ===
// New biomes are integrated here during development. No external importer UI or network loader.
const AssetPacks=new Map();

const VILLAGE_GEOM_DATA={"v":{"url":"/assets/44c1499d2e75fd1709558abf635487a73c21b099345a4e83268f294aea47d91c.bin","encoding":"external-binary"},"uv":{"url":"/assets/d4d90c41fb2f08a6ae7fcc98c4df64680d134c03a8a9541957b54654013f32d5.bin","encoding":"external-binary"},"i":{"url":"/assets/104af0e5f50376060e28669b1b5991b32c366910664a78b962269071e86d83c7.bin","encoding":"external-binary"},"vertexCount":113906,"triCount":88419,"min":[-0.9476815462112427,0.0,-0.9016300439834595],"max":[0.9476815462112427,0.31428098678588867,0.9016300439834595],"sourceOffset":[-0.0024074912071228027,-0.16143299639225006,0.003012031316757202]};

let settlementGeometry=null,settlementMaterial=null;
function decodeArray64(text,T){const bytes=decode64(text);return new T(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));}
async function loadEmbeddedImage410(id){
 const node=$(id);if(!node)throw Error('Falta imagen integrada: '+id);
 const im=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('No se puede decodificar '+id));im.src='data:'+node.dataset.mime+';base64,'+node.textContent.trim();});node.remove();return im;
}
function uploadMap410(im,unit){
 const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.generateMipmap(gl.TEXTURE_2D);
 const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
 gl.activeTexture(gl.TEXTURE0);return tex;
}
async function loadSettlement410(){
 const images=[];for(const role of ['base','normal','orm'])images.push(await loadEmbeddedImage410('village-'+role+'-410'));
 settlementMaterial={baseColorFactor:[1,1,1,1],normalScale:.65,roughnessFactor:1,metallicFactor:1,textures:images.map((im,i)=>uploadMap410(im,2+i)),images,gpuBytes:images.reduce((s,im)=>s+Math.ceil(im.naturalWidth*im.naturalHeight*16/3),0),source:'Sunfire Village · GLB original · UV original'};
}
function ensureSettlementGeometry(){
 if(settlementGeometry)return settlementGeometry;
 if(!settlementMaterial)throw Error('Material del poblado no preparado.');
 const d=VILLAGE_GEOM_DATA,v=decodeArray64(d.v,Float32Array),uv=decodeArray64(d.uv,Float32Array),index=decodeArray64(d.i,Uint32Array);
 const p=new Float32Array(d.vertexCount*3),n=new Float32Array(d.vertexCount*3);
 for(let k=0;k<d.vertexCount;k++){p.set(v.subarray(k*9,k*9+3),k*3);n.set(v.subarray(k*9+3,k*9+6),k*3);}
 settlementGeometry={v,uv,index,tangent:computeTangents(p,n,uv,index),min:d.min,max:d.max,sourceVertexCount:d.vertexCount,triangles:d.triCount,material:settlementMaterial};
 return settlementGeometry;
}
function settlementBlend410(s,x,z){
 const dx=x-s.x,dz=z-s.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);
 const xx=dx*c-dz*n,zz=dx*n+dz*c;
 const edge=Math.max(Math.abs(xx)-(s.hx||14),Math.abs(zz)-(s.hz||14));
 return 1-smooth(0,6,edge);
}
function findSettlementSite(field,b){
 if(field.c.settlementSite)return field.__settlementSite=field.c.settlementSite;
 if(field.__settlementSite)return field.__settlementSite;
 const scale=13.4,hx=.947682*scale+1.25,hz=.901631*scale+1.25;
 let best=null,scoreBest=Infinity;
 for(let iz=-6;iz<=6;iz++)for(let ix=-6;ix<=6;ix++){
  let z=iz*8,x=ix*8,yaw=.35;
  if(field.riverActive){x=field.riverX(z)+(ix<0?-1:1)*(30+Math.abs(ix)*5);yaw=ix<0?.42:-.42;}
  const co=Math.cos(yaw),si=Math.sin(yaw),heights=[];let invalid=false;
  for(const oz of [-hz,0,hz])for(const ox of [-hx,0,hx]){
   const px=x+ox*co+oz*si,pz=z-ox*si+oz*co;
   const water=field.waterInfo(px,pz);if(water.inside)invalid=true;
   heights.push(field.surface(px,pz));
  }
  if(invalid)continue;
  heights.sort((a,b)=>a-b);const span=heights[8]-heights[0];
  const score=span*30+Math.hypot(x,z)*.07+field.slope(x,z)*10;
  if(score<scoreBest){scoreBest=score;best={x,z,y:heights[4],yaw,scale,hx,hz,clearRadius:19,softRadius:25,haloRadius:32,span};}
 }
 // On a particularly narrow wetland island, reserve a small dry platform locally.
 if(!best){const x=field.riverActive?field.riverX(0)+50:30,z=0;best={x,z,y:field.surface(x,z),yaw:.35,scale,hx,hz,clearRadius:19,softRadius:25,haloRadius:32,span:0};}
 return field.__settlementSite=best;
}
function settlementInfluence(field,b,x,z,group,slot,radius){
 const s=findSettlementSite(field,b),dx=x-s.x,dz=z-s.z,d=Math.hypot(dx,dz);
 let probability=1,blocked=false;
 if(d<s.clearRadius+radius*.7)return{site:s,d,probability:0,blocked:true};
 const hard=s.clearRadius+(group===0?radius*1.0:group===5?radius*.8:group===3?radius*.55:radius*.35);
 const soft=s.softRadius+radius*.35,halo=s.haloRadius+radius*.3;
 if(d<hard){
  if(group===0||group===4||group===5)blocked=true;
  probability*=group===2?.05:group===1?.04:group===3?.10:.03;
 }else if(d<soft){
  probability*=group===0?.16:group===1?.28:group===2?.42:group===3?.48:group===4?.32:.38;
 }else if(d<halo){
  const t=1-smooth(soft,halo,d);
  if(group===0)probability*=1.05+t*.14;
  if(group===1||group===2)probability*=1.08+t*.18;
 }
 const road=Math.min(Math.abs(dx),Math.abs(dz)),roadWidth=2.3+radius*.35;
 if(d<halo&&road<roadWidth){
  probability*=group===0?.30:group===1?.16:group===2?.18:group===3?.28:group===4?.42:.34;
  if((group===0||group===4)&&road<1.45+radius*.2&&d<soft+4)blocked=true;
 }
 return{site:s,d,probability,blocked};
}
function installSettlement(){
 if(!world||mode!=='terrain')return;
 const site=findSettlementSite(world.field,world.biome),geom=ensureSettlementGeometry();
 renderer.makeBatch(geom,[{id:'settlement:'+world.config.biome,x:site.x,y:site.y+.008,z:site.z,yaw:site.yaw,sx:site.scale,sy:site.scale,sz:site.scale,tint:1}],{group:-1,shadow:true,settlement:true});
 world.settlement={...site,baseY:site.y+.008};
}

function slotGroup(i){return currentBiome().assetGroups?.[i]??SLOTS[i].g;}

function decode64(text){const raw=atob(text),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a;}
function computeTangents(p,n,uv,index){
 const count=p.length/3,t=new Float32Array(count*3),b=new Float32Array(count*3),out=new Float32Array(count*4);
 for(let k=0;k<index.length;k+=3){const a=index[k],c=index[k+1],d=index[k+2],a3=a*3,c3=c*3,d3=d*3;
  const ex=p[c3]-p[a3],ey=p[c3+1]-p[a3+1],ez=p[c3+2]-p[a3+2],fx=p[d3]-p[a3],fy=p[d3+1]-p[a3+1],fz=p[d3+2]-p[a3+2];
  const s1=uv[c*2]-uv[a*2],s2=uv[d*2]-uv[a*2],t1=uv[c*2+1]-uv[a*2+1],t2=uv[d*2+1]-uv[a*2+1],det=s1*t2-s2*t1;if(Math.abs(det)<1e-10)continue;
  const r=1/det,tx=(ex*t2-fx*t1)*r,ty=(ey*t2-fy*t1)*r,tz=(ez*t2-fz*t1)*r,bx=(fx*s1-ex*s2)*r,by=(fy*s1-ey*s2)*r,bz=(fz*s1-ez*s2)*r;
  for(const j of[a3,c3,d3]){t[j]+=tx;t[j+1]+=ty;t[j+2]+=tz;b[j]+=bx;b[j+1]+=by;b[j+2]+=bz;}
 }
 for(let i=0;i<count;i++){const j=i*3,k=i*4,nn=norm([n[j],n[j+1],n[j+2]]),tt=[t[j],t[j+1],t[j+2]],tangent=norm(sub(tt,mul(nn,dot(nn,tt))));
  if(Math.hypot(...tangent)<.01)tangent.splice(0,3,...norm(cross(Math.abs(nn[1])>.9?[1,0,0]:[0,1,0],nn)));
  out[k]=tangent[0];out[k+1]=tangent[1];out[k+2]=tangent[2];out[k+3]=dot(cross(nn,tangent),[b[j],b[j+1],b[j+2]])<0?-1:1;
 }return out;
}
function assetScaleIssues(prototypes){
 const issues=[];
 for(let i=0;i<prototypes.length;i++){
  const p=prototypes[i],h=p.size[1],span=Math.max(...p.size),g=p.group??SLOTS[i].g;
  const limits=p.role==='formation'?[2,70]:g===0?[2,35]:g===1?[.25,8]:g===2?[.05,4]:[.25,22];
  const value=g<3?h:span;
  if(!Number.isFinite(value)||value<limits[0]||value>limits[1])issues.push(SLOTS[i].id+' ('+p.name+'): '+value.toFixed(3)+' m');
 }
 return issues;
}
function validateAssetProfile(profile){
 if(!profile||typeof profile.name!=='string'||profile.name.length>80)throw Error('El paquete necesita un nombre de bioma válido.');
 for(const key of['soil','grass','foliage','rock','water'])if(!/^#[0-9a-f]{6}$/i.test(profile.colors?.[key]||''))throw Error('Falta el color '+key);
 if(!Array.isArray(profile.dens)||profile.dens.length!==GROUPS.length)throw Error('Perfil de '+profile.name+': se necesitan seis densidades entre 0 y 1; recibidas '+(Array.isArray(profile.dens)?profile.dens.length:'datos no válidos')+'.');
 for(let i=0;i<GROUPS.length;i++){
  const v=profile.dens[i];
  if(!Number.isFinite(v)||v<0||v>1)throw Error('Perfil de '+profile.name+' · '+GROUPS[i].name+': densidad '+String(v)+' no válida. Debe ser un número finito entre 0 y 1.');
 }
 if(!Array.isArray(profile.weights)||profile.weights.length!==GROUPS.length)throw Error('Perfil de '+profile.name+': se necesitan seis grupos de pesos para los veinte slots.');
 for(let i=0;i<GROUPS.length;i++){
  const row=profile.weights[i],group=GROUPS[i];
  if(!Array.isArray(row)||row.length!==group.n)throw Error('Perfil de '+profile.name+' · '+group.name+': se esperaban '+group.n+' pesos y se recibieron '+(Array.isArray(row)?row.length:'datos no válidos')+'.');
  if(row.some(v=>!Number.isFinite(v)||v<0)||!Number.isFinite(row.reduce((a,b)=>a+b,0))||row.reduce((a,b)=>a+b,0)<=0)throw Error('Perfil de '+profile.name+' · '+group.name+': los pesos deben ser números finitos no negativos y su suma debe ser mayor que cero.');
 }
 if(![0,1,2].includes(profile.style)||!Number.isFinite(profile.scale)||profile.scale<=0||profile.scale>5)throw Error('Estilo o escala de perfil no válidos.');
 for(const key of['bark','dry','bg'])if(!/^#[0-9a-f]{6}$/i.test(profile[key]||''))throw Error('Color del perfil inválido: '+key);
}
async function registerEmbeddedBiome(pack){
 if(!pack||pack.format!=='bioma-asset-pack'||pack.version!==1)throw Error('Formato de paquete no compatible. Esperado: bioma-asset-pack, versión 1.');
 const id=pack.biomeId;if(typeof id!=='string'||!/^[a-z][a-z0-9_-]{0,39}$/.test(id)||['__proto__','constructor','prototype'].includes(id))throw Error('Identificador de bioma no válido.');
 if(AssetPacks.has(id))throw Error('Ya hay un paquete registrado con el identificador '+id+'. Usa otro biomeId.');
 validateAssetProfile(pack.profile);
 if(!Array.isArray(pack.assets)||pack.assets.length!==20)throw Error('El paquete debe contener exactamente 20 assets.');
 const slots=new Map(pack.assets.map(a=>[a.slot,a]));if(slots.size!==20||SLOTS.some(a=>!slots.has(a.id)))throw Error('Los identificadores de slot deben coincidir con tree_01…special_03.');
 if(typeof pack.binary!=='string'||pack.binary.length>256*1024*1024)throw Error('Datos geométricos no válidos o demasiado grandes.');
 if(!Array.isArray(pack.textures)||pack.textures.length!==3)throw Error('Se requieren los atlas de color, normales y metal/rugosidad.');
 const bytes=decode64(pack.binary),buf=bytes.buffer;
 const array=desc=>{const T={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array}[desc?.type];if(!T||!Number.isInteger(desc.offset)||!Number.isInteger(desc.count)||desc.count<=0||desc.offset<0||desc.offset%T.BYTES_PER_ELEMENT||desc.offset+desc.count*T.BYTES_PER_ELEMENT>buf.byteLength)throw Error('Rango binario fuera del paquete.');return new T(buf,desc.offset,desc.count);};
 const material={...pack.material,textures:[],images:[],gpuBytes:0,source:id};
 const prototypes=SLOTS.map((s,i)=>{
  const a=slots.get(s.id);if(typeof a.name!=='string'||a.name.length>100||!Array.isArray(a.lods)||!a.lods.length||a.lods.length>3)throw Error('Nombre o niveles de detalle no válidos en '+s.id);
  const levels=a.lods.map((d,level)=>{
   const p=array(d.position),n=array(d.normal),uv=array(d.uv),index=array(d.index),count=p.length/3;
   if(!(p instanceof Float32Array)||!(n instanceof Float32Array)||!(uv instanceof Float32Array)||p.length%3||n.length!==p.length||uv.length!==count*2||index.length%3||count>2000000)throw Error('Atributos incompatibles en '+s.id);
   for(const j of index)if(j>=count)throw Error('Índice fuera de la malla: '+s.id);
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],v=new Float32Array(count*9);
   for(let k=0;k<count;k++){for(let c=0;c<3;c++){const value=p[k*3+c];if(!Number.isFinite(value)||Math.abs(value)>1000||!Number.isFinite(n[k*3+c]))throw Error('Coordenadas inválidas en '+s.id);v[k*9+c]=value;v[k*9+3+c]=n[k*3+c];v[k*9+6+c]=1;min[c]=Math.min(min[c],value);max[c]=Math.max(max[c],value);}if(!Number.isFinite(uv[k*2])||!Number.isFinite(uv[k*2+1]))throw Error('UV no válidas.');}
   return {v,uv,index,tangent:computeTangents(p,n,uv,index),min,max,material,level};
  });
  const g=levels[0];g.levels=levels;const min=[...g.min],max=[...g.max],size=max.map((x,j)=>x-min[j]),water=new Geometry();
  if(a.water){if(i!==19||!Array.isArray(a.water.outline)||a.water.outline.length<3||a.water.outline.length>256||!Number.isFinite(a.water.level))throw Error('Contorno de agua no válido.');
   const pts=a.water.outline;if(pts.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>100)))throw Error('Contorno de charca fuera de rango.');
   const center=pts.reduce((q,p)=>[q[0]+p[0]/pts.length,q[1]+p[1]/pts.length],[0,0]),y=a.water.level;
   for(let j=0;j<pts.length;j++){const p=pts[j],q=pts[(j+1)%pts.length];water.tri([center[0],y,center[1]],[p[0],y,p[1]],[q[0],y,q[1]],[.2,.6,.65]);}
  }
  return {g,water,index:i,group:pack.profile.assetGroups?.[i]??s.g,role:a.role||'prop',name:a.name,min,max,size,triangles:g.index.length/3+water.v.length/27,lodTriangles:levels.map(l=>l.index.length/3),radius:Math.max(size[0],size[2])*.5,centerY:(min[1]+max[1])*.5,imported:true,source:id,sourceComponents:a.sourceComponents||[],description:a.description||s.desc};
 });
 const scaleIssues=assetScaleIssues(prototypes);
 if(scaleIssues.length)throw Error('Escala de assets no válida en '+id+': '+scaleIssues.join('; '));
 // Decode all images before registering anything. On failure the previous world survives.
 try{
  for(const role of['baseColor','normal','metallicRoughness']){const d=pack.textures.find(t=>t.role===role);if(!d||!['image/webp','image/png','image/jpeg'].includes(d.mime)||typeof d.base64!=='string'||d.base64.length>64*1024*1024)throw Error('Atlas inválido: '+role);
   const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('No se pudo decodificar el atlas '+role));im.src='data:'+d.mime+';base64,'+d.base64;});
   if(image.naturalWidth>8192||image.naturalHeight>8192||image.naturalWidth<1)throw Error('Dimensiones de atlas no admitidas.');material.images.push(image);
  }
 }catch(e){material.images.length=0;throw e;}
 const profile={...pack.profile,colors:{...pack.profile.colors},names:prototypes.map(p=>p.name),assetPack:id,pondFootprint:Math.max(5,...prototypes[19].min.filter((_,i)=>i!==1).map(Math.abs),...prototypes[19].max.filter((_,i)=>i!==1).map(Math.abs))/4+.06};
 const record={id,title:pack.title||profile.name,profile,prototypes,material,source:pack.source||'Paquete local',notes:pack.notes||[],binaryBytes:buf.byteLength,sourceTriangles:prototypes.reduce((n,p)=>n+p.lodTriangles[0],0)};
 AssetPacks.set(id,record);BIOMES[id]=profile;refreshBiomeButtons();return {id,assets:20,triangles:record.sourceTriangles};
}
function activateAssetTextures(id){
 // Only the active biome owns GPU atlases. Geometry buffers are independently ref-counted.
 for(const [key,pack]of AssetPacks){const m=pack.material;if(key!==id&&m.textures.length){for(const tex of m.textures)gl.deleteTexture(tex);m.textures=[];m.gpuBytes=0;}}
 const rec=AssetPacks.get(id);if(!rec)return;
 const m=rec.material;if(m.textures.length)return;
 const ext=gl.getExtension('EXT_texture_filter_anisotropic');
 for(const im of m.images){const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.generateMipmap(gl.TEXTURE_2D);if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));m.textures.push(tex);m.gpuBytes+=Math.ceil(im.naturalWidth*im.naturalHeight*4*4/3);}
 gl.activeTexture(gl.TEXTURE0);
}
function choosePrototype(i,b){const pack=AssetPacks.get(b.assetPack);if(!pack?.prototypes[i])throw Error('Falta el modelo '+SLOTS[i].id+' del bioma '+b.name);return pack.prototypes[i];}
function refreshBiomeButtons(){
 const host=$('biomes');host.replaceChildren();
 for(const [id,b]of Object.entries(BIOMES)){const el=document.createElement('button');el.className='biome';el.dataset.biome=id;el.setAttribute('aria-pressed',String(state.biome===id));const sw=document.createElement('span');sw.className='swatch';sw.style.background='linear-gradient(145deg,'+b.colors.grass+' 0 48%,'+b.colors.soil+' 49%)';const title=document.createElement('span');title.textContent=b.name;const small=document.createElement('small');small.textContent=b.description||'20 modelos 3D texturizados · integrados';title.append(small);const check=document.createElement('span');check.className='check';check.textContent='✓';el.append(sw,title,check);el.onclick=()=>{state.biome=id;generate();};host.append(el);}
}
function syncAssetUI(){
 $('assetLOD').checked=state.assetLOD;const pack=AssetPacks.get(currentBiome().assetPack);
 $('assetPackInfo').textContent=pack?'20 assets 3D · '+format(pack.sourceTriangles)+' triángulos HD · atlas compartidos':'Preparando los modelos integrados…';
 const lava=currentBiome().fluid==='lava',dry=currentBiome().fluid==='none';
 $('river').disabled=dry;$('river').checked=dry?false:state.river;
 $('river').title=dry?'Desierto no genera ríos ni lagunas.':'Cauce continuo';
 $('waterSpeed').disabled=dry;$('waterScale').disabled=dry;
 $('fluidTitle').textContent=dry?'Desierto sin agua':lava?'Lava ilustrada':'Agua ilustrada';
 $('fluidHelp').textContent=dry?'Dunas, arena y cubetas secas. No se crean ríos, lagunas ni superficies líquidas en este bioma.':lava?'Coladas lentas y grietas incandescentes. El cauce y las pozas comparten coordenadas y tiempo.':'Cuatro tintas mates y crestas onduladas. Mismo patrón, coordenadas y tiempo en todos los chunks.';
}


// Manglar 3.6: archipiélago de agua interconectada; Cañones mantiene un río continuo entre paredes.
// All functions use world coordinates, never chunk coordinates or camera position.
function canyonFrame(field,z,side=1){
 const s=field.seed;
 return {waterHalf:5.8+noise(z*.009,14,s^5901)*1.8,
  wallStart:17.8+noise(z*.014,side*17,s^2803)*5.5,
  height:(23+noise(z*.012,side*37,s^1483)*13)*(.56+.44*field.c.relief)};
}
function canyonHeight(field,x,z){
 const dx=x-field.riverX(z),d=Math.abs(dx),side=dx<0?-1:1,f=canyonFrame(field,z,side),level=field.riverLevel;
 const micro=(noise(x*.13,z*.13,field.seed^9513)-.5)*.18*field.c.relief;
 if(d<=f.waterHalf+.6)return mix(level-.92,level+.13,smooth(1.7,f.waterHalf+.6,d));
 const floor=level+.13+smooth(f.waterHalf+.6,f.wallStart,d)*.68+micro;
 const flute=(noise(z*.095,side*9,field.seed^6721)-.5)*2.0+(noise(z*.034,side*13,field.seed^6517)-.5)*1.8;
 const edge=f.wallStart+flute;
 const rise=.54*smooth(edge,edge+4.3,d)+.32*smooth(edge+6.2,edge+9.7,d)+.14*smooth(edge+12,edge+16,d);
 const top=(noise(x*.027,z*.027,field.seed^8432)-.5)*1.8*field.c.relief*smooth(edge+15,edge+30,d);
 return floor+rise*f.height+top;
}
function canyonGroundColor(field,b,x,z){
 const y=field.height(x,z),dx=x-field.riverX(z),d=Math.abs(dx),cf=canyonFrame(field,z,dx<0?-1:1),h=y-field.riverLevel;
 const coarse=noise(x*.045,z*.045,field.seed^1930),grain=noise(x*.21,z*.21,field.seed^3001);
 let col=cmix(hex(b.colors.soil),hex('#dfad6d'),.20+coarse*.22);
 // Narrow the sand-to-wall blend so the join does not paint wide ring-like bands.
 const wall=smooth(cf.wallStart+.35,cf.wallStart+2.35,d);
 const undulation=noise(x*.015,z*.022,field.seed^664)*1.5;
 const stripe=(h+undulation)%5.5;
 const band=smooth(3.65,3.95,stripe)*(1-smooth(4.6,4.95,stripe));
 const red=cmix(hex(b.colors.rock),hex('#89432e'),.14+.15*coarse);
 const rock=cmix(red,hex('#edbb80'),band*.58);
 col=cmix(col,rock,wall);
 const wet=(1-smooth(cf.waterHalf,cf.waterHalf+2.4,d));
 col=cmix(col,cmix(hex('#876f45'),hex(b.colors.grass),.18),wet*.32);
 return shade(col,.94+grain*.11);
}
function scatterCanyon(c,b,field,reverse=false){
 const bo=boundsFor(c),out=Array.from({length:20},()=>[]),seed=field.seed;
 const owned=(x,z)=>x>=bo.minX&&x<bo.maxX&&z>=bo.minZ&&z<bo.maxZ;
 function place(id,slot,x,z,yaw,sx,sy,sz,tint=1,burial=.08){
  if(!owned(x,z))return;
  const pb=b.bounds[slot];let y=field.surface(x,z)-pb.min[1]*sy-burial;
  if(slot===2||slot===3||slot===4||slot===18){
   // Set the base at its inner footprint, so the walls blend into the ground.
   const radius=pb.radius*Math.max(sx,sz),side=x<field.riverX(z)?-1:1;
   y=Math.min(y,field.surface(x-side*radius*.67,z)-.34);
  }
  const radius=pb.radius*Math.max(sx,sz),site=findSettlementSite(field,b);
  if(Math.hypot(x-site.x,z-site.z)<site.clearRadius+radius+8)return;
  out[slot].push({id,slot,x,z,y,yaw,scale:Math.sqrt(sx*sz),sx,sy,sz,tint,radius,priority:0});
 }
 // Geological landmarks are placed on BOTH sides of the gorge independently of
 // prop density. Their real footprint cannot encroach on the river corridor.
 for(let station=Math.floor((bo.minZ-10)/31);station<=Math.ceil((bo.maxZ+10)/31);station++){
  for(const side of[-1,1]){
   const r=rand(hashCell(seed,station,side,8123));
   const z=station*31+6+r()*15,cf=canyonFrame(field,z,side);
   const slot=weighted([.54,.34,.12],r())+2; // mesa / needle / arch
   const scale=.80+r()*.40,yaw=r()*TAU;
   const pb=b.bounds[slot],co=Math.cos(yaw),si=Math.sin(yaw);
   const halfX=(Math.abs(co)*(pb.max[0]-pb.min[0])+Math.abs(si)*(pb.max[2]-pb.min[2]))*.5*scale;
   const halfZ=(Math.abs(si)*(pb.max[0]-pb.min[0])+Math.abs(co)*(pb.max[2]-pb.min[2]))*.5*scale;
   const center=field.riverX(z);
   let bankLimit=0;
   for(const zz of[z-halfZ,z,z+halfZ])bankLimit=Math.max(bankLimit,side*(field.riverX(zz)-center)+canyonFrame(field,zz,side).waterHalf+3.0+halfX);
   const offset=Math.max(bankLimit,cf.wallStart+halfX*.38+1.5+r()*4.0);
   const x=center+side*offset;
   place('canyon:wall:'+station+':'+side,slot,x,z,yaw,scale,scale*(.93+r()*.18),scale,.96+r()*.09,.4);
  }
 }
 // Upper mesas: sparse, larger silhouettes, not small props repeated everywhere.
 for(let station=Math.floor((bo.minZ-16)/97);station<=Math.ceil((bo.maxZ+16)/97);station++)for(const side of[-1,1]){
  const r=rand(hashCell(seed,station,side,8807)),z=station*97+15+r()*53,x=field.riverX(z)+side*(57+r()*20),sc=1.03+r()*.24;
  place('canyon:mesa:'+station+':'+side,2,x,z,r()*TAU,sc,sc*.92,sc,.94+r()*.08,.6);
 }
 // No far-reaching displacement of candidates: membership is chunk-independent.
 const groups=[{cell:13,slots:[0,1],p:.46},{cell:5.2,slots:[5,6],p:.47},{cell:3.5,slots:[7,8,9],p:.38},{cell:9,slots:[10,11,12,13,14],p:.42},{cell:19,slots:[15,16],p:.25},{cell:37,slots:[17,18],p:.33}];
 for(let gi=0;gi<groups.length;gi++){
  const q=groups[gi],coords=[];
  for(let iz=Math.floor(bo.minZ/q.cell);iz<=Math.floor(bo.maxZ/q.cell);iz++)for(let ix=Math.floor(bo.minX/q.cell);ix<=Math.floor(bo.maxX/q.cell);ix++)coords.push([ix,iz]);
  if(reverse)coords.reverse();
  for(const[ix,iz]of coords){
   const r=rand(hashCell(seed,ix,iz,9317+gi*77));
   const x=(ix+.12+r()*.76)*q.cell,z=(iz+.12+r()*.76)*q.cell;
   if(!owned(x,z))continue;
   const side=x<field.riverX(z)?-1:1,d=Math.abs(x-field.riverX(z)),cf=canyonFrame(field,z,side);
   if(d<cf.waterHalf+1.0)continue;
   const onBank=d<cf.wallStart-1.1,plateau=d>cf.wallStart+18;
   const patch=smooth(.33,.70,noise(x*.065,z*.065,seed^6364));
   let p=q.p*c.density*(.28+patch*1.12),slot=q.slots[Math.floor(r()*q.slots.length)];
   if(gi===0){if(!onBank||d<cf.waterHalf+3.2)continue;p*=1.05;}
   else if(gi===1||gi===2){if(!onBank&&!plateau)continue;p*=onBank?1.2:.28;}
   else if(gi===3){p*=onBank?1.20:plateau?.40:.28;}
   else if(gi===4){if(!onBank&&!plateau)continue;p*=onBank?1:.12;}
   else {if(!onBank&&!plateau)continue;p*=onBank?.70:.4;}
   if(r()>p)continue;
   const slope=field.slope(x,z);if(slope>(gi===3?1.7:.36))continue;
   const sc=(gi===1||gi===2?.90:.76)+r()*(gi===1||gi===2?.48:.40),yaw=r()*TAU;
   const sx=sc*(.94+r()*.12),sy=sc*(.97+r()*.10),sz=sc*(.94+r()*.12);
   const pb=b.bounds[slot],radius=pb.radius*Math.max(sx,sz);
   const settle=settlementInfluence(field,b,x,z,gi,slot,radius);
   if(settle.blocked||Math.hypot(x-settle.site.x,z-settle.site.z)<settle.site.clearRadius+radius+4)continue;
   if(d-radius<cf.waterHalf+.3)continue;
   place('canyon:prop:'+gi+':'+ix+':'+iz,slot,x,z,yaw,sx,sy,sz,.95+r()*.10,gi===1||gi===2?-.018:gi===3?.14:.08);
  }
 }
 for(const a of out)a.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 return {instances:out,bounds:bo};
}

// === CAMPO GLOBAL: terrain strategy is selected by biome. ===
// Desert 3.7: dry aeolian terrain. The fields below never sample the river or pond system.
// Deterministic functions in WORLD coordinates, also serialized into the chunk worker.
function desertSample(field,x,z){
 const s=field.seed,a=field.desertWind,co=Math.cos(a),si=Math.sin(a);
 const u=x*co+z*si,v=-x*si+z*co;
 const bend=11*Math.sin(v*.024+field.phase)+5*Math.sin(v*.057+field.phase*.41)
  +(noise(u*.007,v*.013,s^7101)-.5)*15;
 const phase=(u+bend)/74+(noise(u*.004,v*.006,s^7103)-.5)*.42;
 const q=phase-Math.floor(phase),crest=.70;
 const dune=q<crest?Math.pow(smooth(0,crest,q),1.12):Math.pow(1-smooth(crest,1,q),.96);
 const pocket=smooth(.48,.76,noise(u*.010+31,v*.012-17,s^7111));
 const swale=1-smooth(.06,.55,dune);
 const gravel=pocket*swale;
 const amplitude=8.8+noise(u*.006,v*.009,s^7121)*4.2;
 const secondary=Math.pow(.5+.5*Math.sin(u*.054+v*.011+field.phase),3)*2.0;
 const height=4+field.c.relief*(noise(x*.003,z*.003,s^7127)*2.2+dune*amplitude*(1-gravel*.3)+secondary);
 return {height,dune,swale,gravel,pocket,u,v};
}
function desertHeight(field,x,z){return desertSample(field,x,z).height;}
function desertGroundColor(field,b,x,z){
 const q=desertSample(field,x,z),fine=noise(x*.057,z*.057,field.seed^7139);
 let sand=cmix(hex(b.colors.soil),hex(b.colors.grass),.27+q.dune*.37+fine*.14);
 sand=cmix(sand,cmix(hex(b.colors.rock),hex(b.colors.soil),.55),q.gravel*.44);
 return shade(sand,.96+noise(x*.15,z*.15,field.seed^7151)*.055);
}
function scatterDesert(c,b,field,reverse=false){
 const bounds=boundsFor(c),out=Array.from({length:20},()=>[]),cache=new Map();
 const cells=[19,11,4.6,15,23,54];
 const choices=[[0,1,2,3],[4,5],[6,7,8,9],[10,11,12,13,14],[15,16],[17,18,19]];
 const weights=[[.16,.12,.41,.31],[.38,.62],[.57,.11,.22,.10],[.23,.15,.35,.17,.10],[.43,.57],[.35,.30,.35]];
 function candidate(group,ix,iz){
  const id='desert:'+group+':'+ix+':'+iz;if(cache.has(id))return cache.get(id);
  const r=rand(hashCell(field.seed,ix,iz,7201+group*97)),cell=cells[group];
  let x=(ix+.24+r()*.52)*cell,z=(iz+.24+r()*.52)*cell;
  const index=choices[group][weighted(weights[group],r())],trial=r();
  // Sparse large props seek flat interdune floors, without changing the dunes around them.
  if(group===0||group===5){
   let best=null,score=Infinity;
   for(let k=0;k<7;k++){
    const a=r()*TAU,rad=cell*.18*r(),px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;
    const q=desertSample(field,px,pz),slope=field.slope(px,pz);
    const cost=slope*2.6+q.dune*.7-q.pocket*.15;
    if(cost<score){score=cost;best=[px,pz];}
   }
   [x,z]=best;
  }
  const q=desertSample(field,x,z),slope=field.slope(x,z);
  const shelter=noise(x*.038,z*.038,field.seed^7229);
  const patch=smooth(.40,.70,shelter)*q.swale;
  let p=b.dens[group]*c.density;
  if(group===0)p*=.12+patch*2.2+q.gravel*.8;
  if(group===1)p*=.12+patch*2.6+q.gravel*.50;
  if(group===2)p*=.055+patch*2.9+q.gravel*.45;
  if(group===3)p*=.13+q.gravel*3.0;
  if(group===4)p*=.30+q.swale*.65;
  if(group===5)p*=1.15+q.swale*1.7+q.gravel;
  let sx=.82+r()*.40,sy=.85+r()*.30,sz=.82+r()*.40;
  if(group===2){sx*=.8+r()*.4;sz*=.8+r()*.4;sy*=.78+r()*.40;}
  if(group===3){sy*=.78+r()*.25;sx*=.9+r()*.35;}
  if(group===5){const scale=.80+r()*.45;sx*=scale;sy*=scale;sz*=scale;}
  const yaw=r()*TAU,tint=.94+r()*.10,priority=r(),bb=b.bounds[index],radius=bb.radius*Math.max(sx,sz);
  const settle=settlementInfluence(field,b,x,z,group,index,radius);
  p*=settle.probability;
  const limits=[.30,.38,.48,.60,.30,.35];
  let item=null;
  if(!settle.blocked&&trial<Math.min(.9,p)&&slope<limits[group]){
   const foot=radius*(group===0?.25:group===2?.45:.65);
   let low=field.surface(x,z),hi=low;
   for(let i=0;i<8;i++){const a=i*TAU/8,h=field.surface(x+Math.cos(a)*foot,z+Math.sin(a)*foot);low=Math.min(low,h);hi=Math.max(hi,h);}
   if(group!==5||hi-low<(index===19?.65:2.8)){
    const surface=field.surface(x,z),sink=group===3?.07:group===5?.10:group===4?.025:.008;
    const y=(group===2?mix(surface,low,.5):low)-sink;
    item={id,slot:index,x,y,z,yaw,scale:Math.max(sx,sy,sz),sx,sy,sz,tint,radius,priority};
   }
  }
  cache.set(id,item);return item;
 }
 function accepted(g,ix,iz){
  const a=candidate(g,ix,iz);if(!a)return null;
  if(g===0||g===5){
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dz)continue;const b=candidate(g,ix+dx,iz+dz);
    if(b&&b.priority<a.priority&&Math.hypot(a.x-b.x,a.z-b.z)<(a.radius+b.radius)*.95)return null;
   }
  }
  return a;
 }
 for(let g=0;g<6;g++){
  const cell=cells[g],coords=[];
  // A symmetric halo keeps candidates crossing a border identical to a combined-region build.
  for(let iz=Math.floor(bounds.minZ/cell)-1;iz<=Math.floor(bounds.maxZ/cell)+1;iz++)
   for(let ix=Math.floor(bounds.minX/cell)-1;ix<=Math.floor(bounds.maxX/cell)+1;ix++)coords.push([ix,iz]);
  if(reverse)coords.reverse();
  for(const[ix,iz]of coords){const a=accepted(g,ix,iz);if(a&&a.x>=bounds.minX&&a.x<bounds.maxX&&a.z>=bounds.minZ&&a.z<bounds.maxZ)out[a.slot].push(a);}
 }
 for(const list of out)list.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 return {instances:out,bounds};
}

function desertSmoothNormals(field,vertices,ox,oz){
 const normals=new Map();
 for(let i=0;i<vertices.length;i+=9){
  const x=ox+vertices[i],z=oz+vertices[i+2],key=x+','+z;let n=normals.get(key);
  if(!n){n=norm([field.height(x-.5,z)-field.height(x+.5,z),1,field.height(x,z-.5)-field.height(x,z+.5)]);normals.set(key,n);}
  vertices[i+3]=n[0];vertices[i+4]=n[1];vertices[i+5]=n[2];
 }
}

class TerrainField{
 constructor(config){
  this.settlementSite=config.settlementSite||null;this.c=config;this.seed=hashString(config.seed);this.phase=(hashCell(this.seed,9,7,63)/4294967296)*TAU;
  this.pondCache=new Map();this.heightCache=new Map();
  this.wetland=config.biome==='mangrove';
  this.desert=config.biome==='desert';this.desertWind=(hashCell(this.seed,3,9,7193)/4294967296-.5)*1.30;
  this.canyon=config.biome==='canyons';
  this.riverLevel=this.wetland?3.32:this.canyon?3.28:3.6;
  this.featureCell=this.wetland?78:this.canyon?160:144;
  this.riverActive=!!config.river&&!this.wetland&&!this.desert;
  this.pondsActive=!this.wetland&&!this.canyon&&!this.desert;
 }
 riverX(z){if(this.canyon)return -20+Math.sin(z*.012+this.phase)*22+Math.sin(z*.027+this.phase*.71)*8;return -20+Math.sin(z*.035+this.phase)*17+Math.sin(z*.060+this.phase*.71)*4}
 raw(x,z){
  if(this.desert)return desertHeight(this,x,z);
  const s=this.seed;
  if(this.wetland)return 4.05+this.c.relief*(fbm(x*.0075,z*.0075,s)*5.0+noise(x*.026,z*.026,s^883)*1.2+noise(x*.0050,z*.0050,s^1711)*1.45+noise(x*.014,z*.014,s^3771)*.55);
  if(this.canyon){
   const broad=fbm(x*.0062,z*.0062,s)*7.0;
   const ridged=(1-Math.abs(noise(x*.018,z*.018,s^883)*2-1))*8.5;
   const mesas=(1-Math.abs(noise(x*.011,z*.011,s^1711)*2-1))*4.2;
   return 5.9+this.c.relief*(broad+ridged+mesas*0.7+noise(x*.045,z*.045,s^3771)*0.95);
  }
  return 2.4+this.c.relief*(fbm(x*.012,z*.012,s)*12+noise(x*.050,z*.050,s^883)*2.2)
 }
 riverBase(x,z){
  if(this.desert)return desertHeight(this,x,z);
  if(this.canyon)return canyonHeight(this,x,z);
  const base=this.raw(x,z);if(!this.riverActive)return base;
  const d=Math.abs(x-this.riverX(z));
  if(this.canyon){
   const floor=d<5.6?mix(this.riverLevel-.78,this.riverLevel+.10,smooth(1.25,5.6,d)):this.riverLevel+.10;
   const wall=floor+smooth(5.6,10.5,d)*4.8+smooth(10.5,19,d)*3.0;
   const plateau=Math.max(wall,base-.4);
   return d<30?mix(plateau,base,smooth(17,30,d)):base;
  }
  const bank=this.riverLevel+.055+Math.max(0,d-6)*.006;
  const channel=d<6?mix(this.riverLevel-.62,this.riverLevel+.055,smooth(1.8,6,d)):bank;
  return mix(channel,base,smooth(25,100,d));
 }
 pond(tx,tz){
  if(this.desert)return null;
  const key=tx+','+tz;if(this.pondCache.has(key))return this.pondCache.get(key);
  const r=rand(hashCell(this.seed,tx,tz,714));
  const cell=this.featureCell;
  let x=tx*cell+(r()-.5)*(this.wetland?cell*.72:58),z=tz*cell+(r()-.5)*(this.wetland?cell*.72:62);
  if(this.riverActive&&Math.abs(x-this.riverX(z))<24)x+=31;
  let p;
  if(this.wetland){
   const radius=18+r()*16,stretch=.82+r()*.68,angle=r()*TAU;
   const radiusX=radius*stretch,radiusZ=radius/Math.max(.65,stretch);
   const level=Math.min(this.raw(x,z)-.38,this.riverLevel-.05+(r()-.5)*.10);
   p={x,z,radius,level,id:'pond:'+tx+':'+tz,radiusX,radiusZ,angle,l1:2+Math.floor(r()*3),l2:4+Math.floor(r()*4),phase1:r()*TAU,phase2:r()*TAU,shore:1.8+r()*.45,mud:9+r()*7};
  }else{
   const radius=5.2+r()*2.5,level=this.riverBase(x,z)-.35;
   p={x,z,radius,level,id:'pond:'+tx+':'+tz,radiusX:radius,radiusZ:radius,angle:0,l1:0,l2:0,phase1:0,phase2:0,shore:1.23,mud:3.5};
  }
  if(this.pondCache.size>=256)this.pondCache.delete(this.pondCache.keys().next().value);this.pondCache.set(key,p);return p;
 }
 pondMetric(x,z,p){
  let dx=x-p.x,dz=z-p.z;
  const a=p.angle||0,co=Math.cos(a),si=Math.sin(a);
  const lx=(dx*co+dz*si)/Math.max(.01,p.radiusX||p.radius),lz=(-dx*si+dz*co)/Math.max(.01,p.radiusZ||p.radius);
  return Math.hypot(lx,lz)
 }
 nearbyPonds(x,z){
  if(this.wetland)return [];
  if(!this.pondsActive)return [];
  const cell=this.featureCell,tx=Math.round(x/cell),tz=Math.round(z/cell),span=1,a=[];
  for(let zc=tz-span;zc<=tz+span;zc++)for(let xc=tx-span;xc<=tx+span;xc++)a.push(this.pond(xc,zc));
  return a;
 }
 wetlandMask(x,z){const w=this.naturalWetlandMask(x,z),s=this.settlementSite;return s?w*(1-settlementBlend410(s,x,z)):w;}
 naturalWetlandMask(x,z){
  const wx=x+(noise(x*.0062,z*.0062,this.seed^9201)-.5)*26+(noise(x*.015,z*.015,this.seed^9203)-.5)*8;
  const wz=z+(noise(x*.0062,z*.0062,this.seed^9205)-.5)*26+(noise(x*.015,z*.015,this.seed^9207)-.5)*8;
  const chA=1-smooth(.024,.086,Math.abs(noise(wx*.018,wz*.018,this.seed^9211)-.5)*2);
  const chB=1-smooth(.028,.095,Math.abs(noise((wx+118)*.0142,(wz-76)*.0142,this.seed^9217)-.5)*2);
  const chC=1-smooth(.031,.102,Math.abs(noise((wx-wz)*.0102,(wx+wz)*.0102,this.seed^9221)-.5)*2);
  const network=Math.max(chA,chB,chC);
  const confluence=Math.max(chA*chB,chB*chC,chA*chC)*1.45;
  const basin=smooth(.62,.83,fbm(wx*.0046,wz*.0046,this.seed^9227))*smooth(.58,.82,noise(wx*.0066,wz*.0066,this.seed^9233));
  const lake=clamp(basin*.92+confluence*.95,0,1);
  const water=Math.max(network*.95,lake);
  return clamp(water,0,1);
 }
 wetlandLevel(x,z){return this.riverLevel+.02}
 wetlandShore(mask){return Math.min(42,Math.abs(mask-.59)*52)}
 wetlandCluster(x,z){return smooth(.40,.74,fbm(x*.020+19,z*.020-13,this.seed^9263)*.64+noise(x*.041,z*.041,this.seed^9269)*.36)}
 wetlandPatch(x,z){return smooth(.42,.72,noise(x*.017+47,z*.017-29,this.seed^9273)*.55+fbm(x*.0105-8,z*.0105+12,this.seed^9279)*.45)}
 height(x,z){const base=this.naturalHeight(x,z),s=this.settlementSite;return s?mix(base,s.y,settlementBlend410(s,x,z)):base;}
 naturalHeight(x,z){
  if(this.desert)return desertHeight(this,x,z);
  if(this.canyon)return canyonHeight(this,x,z);
  const base=this.raw(x,z);let h=this.riverBase(x,z);
  if(this.wetland){
   return this.riverLevel;
  }
  for(const p of this.nearbyPonds(x,z)){
   const d=this.pondMetric(x,z,p);
   if(d<1.8){
    let target;if(d<.78)target=p.level-.48;else if(d<1.0)target=mix(p.level-.48,p.level-.055,smooth(.78,1,d));else target=p.level-.035;
    h=mix(target,h,smooth(1.20,1.80,d));
   }
  }
  if(this.canyon){
   const d=Math.abs(x-this.riverX(z));
   h+= (1-smooth(24,46,d))*noise(x*.075,z*.075,this.seed^8812)*0.46;
  }
  return h
 }
 lattice(x,z){const k=x+','+z;let h=this.heightCache.get(k);if(h===undefined){h=this.height(x,z);if(this.heightCache.size>=12000)this.heightCache.delete(this.heightCache.keys().next().value);this.heightCache.set(k,h)}return h}
 surface(x,z){const step=1,x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step,fx=(x-x0)/step,fz=(z-z0)/step,a=this.lattice(x0,z0),b=this.lattice(x0+step,z0),d=this.lattice(x0,z0+step),c=this.lattice(x0+step,z0+step);return fx+fz<=1?a+(b-a)*fx+(d-a)*fz:c+(d-c)*(1-fx)+(b-c)*(1-fz)}
 slope(x,z){return Math.hypot(this.surface(x+.8,z)-this.surface(x-.8,z),this.surface(x,z+.8)-this.surface(x,z-.8))/1.6}
 waterInfo(x,z){
  if(this.desert)return {shore:Infinity,inside:false,level:null};
  if(this.canyon){const d=Math.abs(x-this.riverX(z)),f=canyonFrame(this,z),h=this.surface(x,z),inside=this.riverActive&&h<this.riverLevel-.005;return {shore:Math.abs(d-f.waterHalf),inside,level:inside?this.riverLevel:null};}
  if(this.wetland){const mask=this.wetlandMask(x,z),inside=mask>.61,level=inside?this.wetlandLevel(x,z):null;return {shore:this.wetlandShore(mask),inside,level,mask};}
  let shore=this.riverActive?Math.abs(Math.abs(x-this.riverX(z))-(this.canyon?5.6:6.1)):Infinity,inside=false,level=null;
  if(this.riverActive&&Math.abs(x-this.riverX(z))<(this.canyon?5.6:6.1)&&this.surface(x,z)<this.riverLevel-.02){inside=true;level=this.riverLevel;}
  for(const p of this.nearbyPonds(x,z)){
   const d=this.pondMetric(x,z,p),span=Math.max(p.radiusX||p.radius,p.radiusZ||p.radius);
   shore=Math.min(shore,Math.abs(d-1)*span);
   if(d<1.0&&this.surface(x,z)<p.level+.22){inside=true;level=level===null?p.level:Math.max(level,p.level);}
  }
  return {shore,inside,level};
 }
 moisture(x,z){
  if(this.desert)return 0;
  if(this.wetland){const info=this.waterInfo(x,z),cluster=this.wetlandCluster(x,z),patch=this.wetlandPatch(x,z);return clamp(.54+cluster*.16+patch*.10+(1-smooth(0,18,info.shore))*.48+(info.inside?.10:0),0,1)}
  const d=this.riverActive?Math.abs(x-this.riverX(z)):200;
  if(this.canyon)return clamp(.07+fbm(x*.025,z*.025,this.seed^4916)*.18+(1-smooth(5,18,d))*.42,0,1);
  return clamp(.2+fbm(x*.027,z*.027,this.seed^4916)*.55+(1-smooth(6,23,d))*.35,0,1)
 }
 blocked(x,z,margin=0){
  if(this.desert)return false;
  if(this.canyon)return this.riverActive&&Math.abs(x-this.riverX(z))<canyonFrame(this,z).waterHalf+.6+margin;
  if(this.wetland)return this.wetlandMask(x,z)>.61-margin*.016;
  if(this.riverActive&&Math.abs(x-this.riverX(z))<(this.canyon?5.8:6.3)+margin)return true;
  for(const p of this.nearbyPonds(x,z))if(this.pondMetric(x,z,p)<1+margin/Math.max(1,p.radius))return true;
  return false
 }
}
function boundsFor(c){if(c.bounds)return c.bounds;const minX=(c.cx-Math.floor(c.n/2))*48-24,minZ=(c.cz-Math.floor(c.n/2))*48-24,size=c.n*48;return{minX,minZ,maxX:minX+size,maxZ:minZ+size,size,centerX:minX+size/2,centerZ:minZ+size/2}}
function weighted(weights,t){const sum=weights.reduce((a,b)=>a+b,0);let v=t*sum;for(let i=0;i<weights.length;i++){v-=weights[i];if(v<=0)return i}return weights.length-1}
function scatterWorld(c,b,field,reverse=false){if(field.desert)return scatterDesert(c,b,field,reverse);if(field.canyon)return scatterCanyon(c,b,field,reverse);const bounds=boundsFor(c),out=Array.from({length:20},()=>[]),cache=new Map(),gOffset=[0,4,7,10,13,17];
 function nearestPond(x,z){let best=null,metric=1e9;for(const p of field.nearbyPonds(x,z)){const m=field.pondMetric(x,z,p);if(m<metric){metric=m;best=p;}}return{pond:best,metric}}
 function ringPoint(p,x,z,target){if(!p)return[x,z];let dx=x-p.x,dz=z-p.z;const a=p.angle||0,co=Math.cos(a),si=Math.sin(a),rx=p.radiusX||p.radius,rz=p.radiusZ||p.radius;let lx=(dx*co+dz*si)/Math.max(.01,rx),lz=(-dx*si+dz*co)/Math.max(.01,rz),len=Math.hypot(lx,lz);if(len<1e-4){const ang=(hashCell(field.seed,Math.floor(x),Math.floor(z),991)/4294967296)*TAU;lx=Math.cos(ang);lz=Math.sin(ang);len=1;}lx*=target/len;lz*=target/len;return[p.x+lx*rx*co-lz*rz*si,p.z+lx*rx*si+lz*rz*co]}
 function seekWetBand(x,z,target,radius,tries,preferLand=false){let best=[x,z],bestScore=1e9;for(let i=0;i<tries;i++){const ang=((i/tries)+(hashCell(field.seed,Math.floor(x*2)+i,Math.floor(z*2)-i,771)/4294967296))*TAU,rad=(.18+((i*0.61803398875)%1)*.82)*radius,sx=x+Math.cos(ang)*rad,sz=z+Math.sin(ang)*rad,info=field.waterInfo(sx,sz),mask=info.mask??(info.inside?1:0),shore=info.shore,cluster=field.wetlandCluster(sx,sz),patch=field.wetlandPatch?field.wetlandPatch(sx,sz):.5;let score=Math.abs(mask-target)*1.7+Math.abs(shore-(target>.58?2.0:6.0))*.05-cluster*.30;if(preferLand&&info.inside)score+=1.4;if(preferLand)score-=patch*.22;else score+=patch*.08;if(!preferLand&&target>.58&&!info.inside)score+=.18;if(score<bestScore){bestScore=score;best=[sx,sz];}}return best}
 function candidate(group,ix,iz){
  const key=group+':'+ix+':'+iz;if(cache.has(key))return cache.get(key);
  const r=rand(hashCell(field.seed,ix,iz,301+group*71)),cell=GROUPS[group].cell;let x=(ix+.14+r()*.72)*cell,z=(iz+.14+r()*.72)*cell;
  const trial=r();let idx=gOffset[group]+weighted(b.weights[group],r()),scale=(.78+r()*.43)*(group===0?b.scale:1),yaw=r()*TAU,tint=.90+r()*.19,priority=r();
  const habitat=b.habitats?.[SLOTS[idx].id]||'land';
  if((group===1||group===3)&&field.riverActive){const pull=clamp(field.moisture(x,z)*1.08-.38,0,.75),edge=field.canyon?8.7+r()*2.1:10.4+r()*2.7,sign=r()<.5?-1:1;x+=clamp((field.riverX(z)+sign*edge-x)*pull,-cell*.8,cell*.8);} 
  if(field.canyon&&(group===0||group===5)){
   const sign=r()<.5?-1:1,edge=(group===0?11.5+r()*7.5:13+r()*8.5),pull=group===0?.95:.82;
   x+=clamp((field.riverX(z)+sign*edge-x)*pull,-cell*.95,cell*.95);
  }
  if(field.wetland){
   if(habitat==='mangrove'){[x,z]=seekWetBand(x,z,.64,cell*.96,12,false);} 
   else if(group===0){[x,z]=seekWetBand(x,z,.26,cell*.88,10,true);} 
   else if(group===1){[x,z]=seekWetBand(x,z,.24,cell*.92,12,true);} 
   else if(group===2){[x,z]=seekWetBand(x,z,.20,cell*1.02,14,true);} 
   else if(group===3||group===4){[x,z]=seekWetBand(x,z,.34,cell*.68,10,true);} 
   else if(group===5){[x,z]=seekWetBand(x,z,habitat==='bank'?.34:.42,cell*.96,10,habitat==='bank');} 
  }
  let slope=field.slope(x,z),wet=field.moisture(x,z),patch=noise(x*.045,z*.045,field.seed^((group+1)*7781));
  let probability=b.dens[group]*c.density*(.43+patch*.95);
  // Coverage gain is a placement multiplier, not a base probability (>1 is invalid in the profile).
  if(field.wetland&&group===2)probability*=1.08;
  if(group===0||group===1)probability*=.65+wet*.53;if(group===2)probability*=.6+wet*.45;
  if(field.canyon){
   if(group===0)probability*=.9+(1-smooth(6,24,Math.abs(x-field.riverX(z))))*1.45;
   if(group===5)probability*=.62+(1-smooth(8,28,Math.abs(x-field.riverX(z))))*.88;
   if(group===1||group===2||group===4)probability*=Math.max(.12,(1-smooth(5,18,Math.abs(x-field.riverX(z))))*1.22);
   if(group===3)probability*=.82;
  }
  let yBias=field.wetland?(group===1?.065:group===2?.075:-.005):field.canyon?(group===0?-.055:group===5?-.02:-.01):-.015;
  let sx=scale*(.90+r()*.18),sy=scale*(.91+r()*.18),sz=scale*(.90+r()*.18);
  if(group===1){const spread=.50+r()*1.00;sx*=spread;sy*=.58+r()*.92;sz*=spread*(.90+r()*.20);if(field.wetland){sx*=1.14;sy*=1.28;sz*=1.14;yBias+=.025;}} 
  if(group===2){const spread=.55+r()*1.00;sx*=spread;sy*=.55+r()*.75;sz*=spread*(.88+r()*.24);if(field.wetland){sx*=1.18;sy*=1.36;sz*=1.18;yBias+=.03;}} 
  if(group===3){const spread=.72+r()*.78;sx*=spread*(.92+r()*.18);sy*=spread*(.70+r()*.40);sz*=spread*(.92+r()*.18);yBias-=Math.min(sy,.55+spread*.35)*(idx===11?.28:idx===10?.18:.14);} 
  if(idx===(b.monumentSlot??2)&&group===0&&r()<.18){const monument=2.4+r()*.9;sx*=monument;sy*=monument;sz*=monument;tint*=1.02;yBias-=.08*monument;} 
  const radius=SLOTS[idx].r*Math.max(sx,sz);
  const settle=settlementInfluence(field,b,x,z,group,idx,radius);
  probability*=settle.probability;
  const maxSlope=field.canyon?(group===0?3.2:group===5?2.4:group===4?.45:group===3?1.9:1.15):(group===0?.73:group===4?.28:group===5?.40:group===3?1.4:1.0);
  const margin=group===0?1.2:group===5?radius*.7:group===3?.06:group===1?.02:.1;
  let allowed=!field.blocked(x,z,margin)&&!settle.blocked,y=field.surface(x,z)+yBias;
  const waterInfo=field.waterInfo(x,z),shore=waterInfo.shore;
  if(field.wetland){
   const cluster=field.wetlandCluster(x,z),mask=waterInfo.mask??(waterInfo.inside?1:0),bankBand=(1-smooth(1.0,16,shore)),patch=field.wetlandPatch(x,z),lowPatch=1-patch;
   if(group===0){
    if(habitat==='mangrove')probability*=.70+bankBand*1.12+(waterInfo.inside?.44:0);
    else probability*=.20+patch*1.58+bankBand*.18;
   }
   if(group===1){
    probability*=Math.max(.18,.26+lowPatch*1.04+bankBand*.48+cluster*.16);
    if(waterInfo.inside)allowed=false;
   }
   if(group===2){
    probability*=Math.max(.34,.56+lowPatch*1.34+bankBand*.86+cluster*.18+(1-mask)*.18);
    if(waterInfo.inside)allowed=false;
   }
   if(group===3)probability*=.44+lowPatch*.28+bankBand*.42;
   if(group===4)probability*=.36+lowPatch*.24+bankBand*.56;
   if(group===5)probability*=.46+cluster*.26+(habitat==='bank'?bankBand*.78:patch*.32);
  }
  if(habitat==='floating'){
   allowed=false;let level=0;
   if(field.wetland){const info=field.waterInfo(x,z);if(info.inside){allowed=true;level=(info.level??field.riverLevel)-.02;}}
   if(field.riverActive&&Math.abs(x-field.riverX(z))<Math.max(1,3.5-radius)&&field.surface(x,z)<field.riverLevel-.14){allowed=true;level=field.riverLevel;}
   if(!allowed)for(const pond of field.nearbyPonds(x,z)){if(field.pondMetric(x,z,pond)<.56&&field.surface(x,z)<pond.level-.10){allowed=true;level=pond.level-.035;break;}}
   if(allowed){y=level-.055*sy;slope=0;}
  }else if(habitat==='mangrove'){
   const info=field.waterInfo(x,z),mask=info.mask??(info.inside?1:0);
   if(info.inside||mask>.56){allowed=true;y=(info.level??field.wetlandLevel(x,z))-.002*sy;slope=0;probability*=1.32;}
   else allowed=allowed&&shore<4.8;
  }else if(habitat==='bank'){
   allowed=allowed&&shore<(group===5?(field.wetland?14:9):(field.wetland?10:5));
   if(field.wetland&&waterInfo.inside)allowed=false;
  }
  const ok=trial<clamp(probability,0,.98)&&slope<maxSlope&&allowed;
  const item=ok?{id:key,slot:idx,x,z,y,yaw,scale,sx,sy,sz,tint,radius,priority}:null;cache.set(key,item);return item
 }
 function accepted(group,ix,iz){const a=candidate(group,ix,iz);if(!a)return null;if(group===0||group===5){for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const b=candidate(group,ix+dx,iz+dz);if(b&&b.priority<a.priority&&Math.hypot(a.x-b.x,a.z-b.z)<(a.radius+b.radius)*1.02)return null}if(group===0){const cell=GROUPS[5].cell,cx=Math.floor(a.x/cell),cz=Math.floor(a.z/cell);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const s=candidate(5,cx+dx,cz+dz);if(s&&Math.hypot(a.x-s.x,a.z-s.z)<a.radius*.65+s.radius)return null}}}return a}
 for(let group=0;group<6;group++){
  const cell=GROUPS[group].cell,coords=[],halo=(group===1||group===3||field.wetland&&group===2)?2:0;
  for(let z=Math.floor(bounds.minZ/cell);z<=Math.floor(bounds.maxZ/cell);z++)for(let x=Math.floor(bounds.minX/cell)-halo;x<=Math.floor(bounds.maxX/cell)+halo;x++)coords.push([x,z]);
  if(reverse)coords.reverse();for(const[ix,iz]of coords){const a=accepted(group,ix,iz);if(a&&a.x>=bounds.minX&&a.x<bounds.maxX&&a.z>=bounds.minZ&&a.z<bounds.maxZ)out[a.slot].push(a)}
 }
 if(!field.wetland&&!field.canyon)for(let z=Math.floor(bounds.minZ/field.featureCell)-1;z<=Math.ceil(bounds.maxZ/field.featureCell)+1;z++)for(let x=Math.floor(bounds.minX/field.featureCell)-1;x<=Math.ceil(bounds.maxX/field.featureCell)+1;x++){
  const p=field.pond(x,z),site=findSettlementSite(field,b),pd=Math.hypot(p.x-site.x,p.z-site.z);if(pd>site.clearRadius+11&&p.x+p.radius*(b.pondFootprint||1.25)>=bounds.minX&&p.x-p.radius*(b.pondFootprint||1.25)<bounds.maxX&&p.z+p.radius*(b.pondFootprint||1.25)>=bounds.minZ&&p.z-p.radius*(b.pondFootprint||1.25)<bounds.maxZ){const s=p.radius/4;out[19].push({id:p.id,slot:19,x:p.x,z:p.z,y:p.level,yaw:0,scale:s,sx:s,sy:1,sz:s,tint:1,radius:p.radius})}
 }
 for(const a of out)a.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);return{instances:out,bounds};
}
function fingerprint(instances){let h=2166136261;for(const list of instances)for(const a of list){const s=[a.id,a.slot,num(a.x),num(a.y),num(a.z),num(a.yaw),num(a.sx),num(a.sy),num(a.sz),num(a.tint)].join('|');h=hashString(h+';'+s)}return(h>>>0).toString(16).padStart(8,'0').toUpperCase()}
function terrainFingerprint(field,bounds){let h=2166136261;for(let z=bounds.minZ;z<=bounds.maxZ;z+=8)for(let x=bounds.minX;x<=bounds.maxX;x+=8)h=hashString(h+':'+field.height(x,z).toFixed(5));return h.toString(16).padStart(8,'0').toUpperCase()}


function mm(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function lookAt(eye,target,up=[0,1,0]){const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1])}
function transform4(m,p){const[x,y,z]=p;return[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]]}

const WATER_CORE="\nuniform float uTime;          // Tiempo de animación integrado; no multiplicar otra vez por velocidad.\nuniform float uAmplitude;     // Curvatura de las bandas, 0 .. 1.8.\nuniform float uStrokeWidth;   // Grosor de los trazos, 0.25 .. 2.\nuniform float uHandmade;      // Irregularidad del dibujo, 0 .. 1.\nuniform float uPigment;       // 0 = cuatro tintas planas. >0 añade variación sutil.\nuniform float uMotifs;        // 0 / 1: pequeños motivos concéntricos opcionales.\nuniform vec2 uSeedOffset;     // Igual en TODOS los chunks del mismo cuerpo de agua.\nuniform vec3 uInk0;\nuniform vec3 uInk1;\nuniform vec3 uInk2;\nuniform vec3 uInk3;\n\nconst float TAU = 6.28318530718;\n\n// Hash sin sin() ni grandes constantes: evita desbordamientos en mediump.\nfloat waterHash(vec2 p) {\n    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));\n    q += dot(q, q.yzx + 19.19);\n    return fract((q.x + q.y) * q.z);\n}\n\nfloat waterAA(float d, float pixelWorld) {\n#ifdef WATER_DERIVATIVES\n    // Limitar el AA evita líneas fantasma en discontinuidades de fract/mod.\n    float px = max(pixelWorld, 0.00015);\n    return clamp(fwidth(d) * 0.75, px * 0.50, px * 1.75);\n#else\n    return max(pixelWorld * 1.4, 0.0006);\n#endif\n}\n\nfloat waterFill(float signedDistance, float pixelWorld) {\n    float aa = waterAA(signedDistance, pixelWorld);\n    return 1.0 - smoothstep(-aa, aa, signedDistance);\n}\n\n// Cápsula horizontal con extremos redondeados; dy puede seguir una curva.\nfloat waterStroke(float x, float dy, float halfLength, float radius, float px) {\n    vec2 q = vec2(max(abs(x) - halfLength, 0.0), dy);\n    return waterFill(length(q) - radius, px);\n}\n\nvec3 paintedWater(vec2 worldXZ, float pixelWorld) {\n#ifdef WATER_DERIVATIVES\n    // Medir ANTES de fract/mod: estable también en una malla en perspectiva.\n    pixelWorld = max(length(dFdx(worldXZ)), length(dFdy(worldXZ)));\n#endif\n    vec2 p = worldXZ + uSeedOffset;\n    float t = uTime;\n    // Movimiento en +X, con una segunda oscilación que deforma la curva.\n    // No se traslada una textura: se evalúan las bandas de nuevo en cada píxel.\n    float x = p.x - t * 0.19;\n    float sway = 0.18 * sin(x * 2.35 + 0.28 * sin(p.y * 0.79))\n               + 0.072 * sin(x * 4.70 + p.y * 0.72 + t * 0.23 + 0.9);\n    float brush = uHandmade * (0.009 * sin(x * 25.0 + p.y * 1.9)\n                            + 0.005 * sin(x * 42.0 - p.y * 2.3));\n    float bandY = p.y + uAmplitude * sway + brush;\n    float row = floor(bandY);\n    float f = fract(bandY);\n    // Estas variaciones sólo afectan a formas alejadas de f=0/1.\n    // Por eso floor() no introduce cortes visibles entre las filas.\n    float h = waterHash(vec2(row, 7.0));\n    float wide = 0.024 * sin(x * 1.19 + row * 1.7);\n    float low = 0.115 + wide;\n    float high = 0.765 + 0.033 * sin(x * 1.65 + row * 1.4);\n    float ribbon = waterFill(max(low - f, f - high), pixelWorld);\n    vec3 col = mix(uInk0, uInk1, ribbon);\n\n    // Lenguas largas de una tercera tinta, con una silueta cerrada y plana.\n    float patchX = mod(x * 0.82 + h * 5.8 + row * 0.53, 5.3) - 2.65;\n    float taper = clamp(1.0 - abs(patchX) / 2.30, 0.0, 1.0);\n    float patchCenter = 0.39 + 0.028 * sin(x * 3.1 + row * 2.4);\n    float patchHalf = 0.145 * taper;\n    float patchD = max(abs(f - patchCenter) - patchHalf, abs(patchX) - 2.30);\n    col = mix(col, uInk2, waterFill(patchD, pixelWorld));\n\n    // Crestas de marfil: discontinuas y más largas que las ondas pequeñas.\n    // La cápsula conserva extremos suaves SIN desenfocar el interior del color.\n    float period = 3.9;\n    float sx = mod(p.x - t * 0.115 + h * period + row * 0.61, period) - period * 0.5;\n    float center = 0.705 + 0.027 * sin(x * 3.3 + h * TAU);\n    float radius = 0.0195 * uStrokeWidth * (1.0 + uHandmade * 0.19 * sin(x * 15.0 + row));\n    float line = waterStroke(sx, f - center, 0.72 + h * 0.18, radius, pixelWorld);\n    col = mix(col, uInk3, line);\n\n    // Un trazo compañero corto en algunas filas. Todo sigue siendo tinta plana.\n    float sx2 = mod(p.x - t * 0.14 + h * 6.5 + 1.5, 6.5) - 3.25;\n    float tiny = waterStroke(sx2, f - 0.855, 0.28 + h * 0.13,\n                            0.012 * uStrokeWidth, pixelWorld);\n    col = mix(col, uInk2, tiny * step(0.25, h));\n\n    // Motivo opcional: anillos elípticos, no una simulación de ondas físicas.\n    if (uMotifs > 0.5) {\n        vec2 cellSize = vec2(5.8, 3.9);\n        vec2 cp = p + vec2(t * -0.08, 0.0);\n        vec2 cell = floor(cp / cellSize);\n        vec2 q = mod(cp, cellSize) - cellSize * 0.5;\n        float rnd = waterHash(cell + 13.0);\n        q -= vec2((rnd - 0.5) * 1.5, (waterHash(cell + 3.0) - 0.5) * 0.6);\n        q.y *= 2.0;\n        float r = length(q);\n        float pulse = 0.017 * sin(t * 0.8 + rnd * TAU);\n        float rd = min(abs(r - (0.25 + pulse)), abs(r - (0.45 + pulse)));\n        rd = min(rd, abs(r - (0.65 + pulse)));\n        float rings = waterFill(rd - 0.012 * uStrokeWidth, pixelWorld * 2.0);\n        // Interrupción del contorno para que parezca un signo pintado.\n        rings *= step(0.64, rnd) * (1.0 - step(0.06, q.x) * step(-0.08, q.y));\n        col = mix(col, uInk3, rings);\n    }\n\n    // Desactivado por defecto: no es necesario para conseguir el efecto.\n    if (uPigment > 0.001) {\n        float grain = waterHash(floor(p * 72.0));\n        col *= 1.0 + (grain - 0.5) * uPigment * 0.12;\n    }\n    return col;\n}\n";


// === Camera obstruction, independent from generation and from chunk residency. ===
// Coverage is per instance (not per material), so one tree can fade without its neighbours.
function obstructionRecord(p,prototype){
 const lo=prototype.min,hi=prototype.max,sx=p.sx??1,sy=p.sy??1,sz=p.sz??1;
 return {id:p.id,x:p.x,y:p.y,z:p.z,cos:Math.cos(p.yaw||0),sin:Math.sin(p.yaw||0),
  center:[(lo[0]+hi[0])*.5*sx,(lo[1]+hi[1])*.5*sy,(lo[2]+hi[2])*.5*sz],
  half:[(hi[0]-lo[0])*.5*sx,(hi[1]-lo[1])*.5*sy,(hi[2]-lo[2])*.5*sz]};
}
function obstructionFrame(eye,target,fov,aspect,distance){
 const forward=norm(sub(target,eye)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
 return {eye,forward,right,up,tan:Math.tan(fov*.5),aspect,distance};
}
function obstructionVisibility(rec,frame,offsetX=0,offsetZ=0){
 const dx=frame.eye[0]-offsetX-rec.x,dz=frame.eye[2]-offsetZ-rec.z;
 const ex=dx*rec.cos-dz*rec.sin-rec.center[0],ey=frame.eye[1]-rec.y-rec.center[1],ez=dx*rec.sin+dz*rec.cos-rec.center[2],h=rec.half;
 const distance=Math.hypot(Math.max(Math.abs(ex)-h[0],0),Math.max(Math.abs(ey)-h[1],0),Math.max(Math.abs(ez)-h[2],0));
 if(distance>=frame.distance)return 1;
 // A camera inside the volume must never be surrounded by opaque canopy triangles.
 if(distance<.18)return 0;
 const centerDelta=[-rec.cos*ex-rec.sin*ez,-ey,rec.sin*ex-rec.cos*ez];
 const support=axis=>Math.abs(axis[0]*rec.cos-axis[2]*rec.sin)*h[0]+Math.abs(axis[1])*h[1]+Math.abs(axis[0]*rec.sin+axis[2]*rec.cos)*h[2];
 const depth=dot(centerDelta,frame.forward);
 if(depth+support(frame.forward)<.15)return 1; // entirely behind the camera
 // Protect a broad central viewing corridor. Nearby props off to the side stay visible.
 const focalDepth=Math.max(.5,depth),pad=.45;
 if(Math.abs(dot(centerDelta,frame.right))>support(frame.right)+focalDepth*frame.tan*frame.aspect*.82+pad)return 1;
 if(Math.abs(dot(centerDelta,frame.up))>support(frame.up)+focalDepth*frame.tan*.82+pad)return 1;
 return smooth(frame.distance*.45,frame.distance,distance);
}
function syncVisibilityControls(){
 $('autoHide').checked=state.autoHide;$('hideDistance').value=state.hideDistance;
 $('hideDistanceVal').textContent=state.hideDistance.toLocaleString('es-ES')+' m';
 $('hideDistance').disabled=!state.autoHide;
}
function setObstruction(enabled,distance=state.hideDistance){
 if(typeof enabled!=='boolean'||!Number.isFinite(distance)||distance<3||distance>12)throw Error('Ajustes de visibilidad no válidos.');
 state.autoHide=enabled;state.hideDistance=distance;syncVisibilityControls();
}

// ===== Renderer: shared asset buffers, chunk-local vertices and floating origin. =====
const VS=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;layout(location=2)in vec3 aColor;
layout(location=8)in vec2 aUV;layout(location=9)in vec4 aTangent;
layout(location=3)in vec3 iPosition;layout(location=4)in float iYaw;layout(location=5)in vec3 iScale;layout(location=6)in float iTint;layout(location=7)in float iVisibility;
uniform vec3 uLocalMin,uLocalSize;uniform float uCrownY,uEnhanced,uSurfaceType;out vec3 vCanopyNormal;out float vRelativeHeight;
uniform mat4 uVP,uLightVP;uniform vec3 uChunkOffset;out vec3 vNormal,vColor,vWorld;out vec3 vLocal;out vec4 vLight;out vec2 vUV;out vec4 vTangent;flat out float vVisibility;
void main(){float s=sin(iYaw),c=cos(iYaw);mat3 R=mat3(c,0.,-s,0.,1.,0.,s,0.,c);vec3 world=R*(aPosition*iScale)+iPosition+uChunkOffset;vWorld=world;vLocal=aPosition;vNormal=normalize(R*(aNormal/iScale));vCanopyNormal=vNormal;vRelativeHeight=0.;
 if(uEnhanced>2.5&&uSurfaceType>.5&&uSurfaceType<1.5){
  vec3 rel=(aPosition-uLocalMin)/max(uLocalSize,vec3(.01));vRelativeHeight=clamp(rel.y,0.,1.);
  vec3 envelope=vec3((rel.x-.5)*1.8,(rel.y-uCrownY)*2.5+.13,(rel.z-.5)*1.8);
  vCanopyNormal=normalize(R*(normalize(envelope+vec3(0.,.0001,0.))/iScale));
 }
 vColor=aColor*iTint;vUV=aUV;vTangent=vec4(R*(aTangent.xyz*iScale),aTangent.w);vLight=uLightVP*vec4(world,1.);vVisibility=iVisibility;gl_Position=iVisibility<.002?vec4(2.,2.,2.,1.):uVP*vec4(world,1.);}`;
const SKY_EXPOSURES=Object.freeze([1.33,.62]);
const SKY_CORE=`
uniform highp sampler2D uPanorama;
uniform float uSkyYaw,uSkyExposure,uSkyOpacity,uSkySaturation,uSkyKind;
vec3 rgbe(vec4 t){if(t.a<=0.)return vec3(0.);return t.rgb*exp2(t.a*255.0-128.0)*(255.0/256.0);}
// Filter decoded radiance, never RGBE exponents. High precision matters on mobile.
vec3 readHDR(vec2 uv){
 ivec2 size=textureSize(uPanorama,0);vec2 q=uv*vec2(size)-.5;ivec2 p=ivec2(floor(q));vec2 f=fract(q);
 int x0=((p.x%size.x)+size.x)%size.x,x1=(x0+1)%size.x;
 int y0=clamp(p.y,0,size.y-1),y1=clamp(p.y+1,0,size.y-1);
 vec3 a=rgbe(texelFetch(uPanorama,ivec2(x0,y0),0)),b=rgbe(texelFetch(uPanorama,ivec2(x1,y0),0));
 vec3 c=rgbe(texelFetch(uPanorama,ivec2(x0,y1),0)),d=rgbe(texelFetch(uPanorama,ivec2(x1,y1),0));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float skyHash(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));q+=dot(q,q.yzx+19.19);return fract((q.x+q.y)*q.z);}
float starLayer(vec2 uv,vec2 scale,float threshold){
 vec2 p=uv*scale,cell=floor(p),f=fract(p)-.5;
 float h=skyHash(cell),on=step(threshold,h);
 vec2 shift=(vec2(skyHash(cell+17.3),skyHash(cell+43.7))-.5)*.34;
 float d=length((f-shift)*vec2(1.0,.82));
 float core=1.0-smoothstep(0.0,.16,d);
 float glow=(1.0-smoothstep(0.0,.36,d))*.45;
 return on*(core+glow)*pow(max(0.,(h-threshold)/max(1e-4,1.-threshold)),3.0);
}
vec3 applySaturation(vec3 color,float sat){float l=dot(color,vec3(.2126,.7152,.0722));return mix(vec3(l),color,sat);} 
vec3 skyColor(vec3 direction){
 vec3 d=normalize(direction);vec2 uv=vec2(atan(d.z,d.x)/6.28318530718+.5+uSkyYaw,acos(clamp(d.y,-1.,1.))/3.14159265359);
 vec3 base=pow(max(1.-exp(-max(readHDR(uv),vec3(0.))*uSkyExposure),vec3(0.)),vec3(1./2.2));
 base=applySaturation(base,uSkySaturation);
 if(uSkyKind>.5){
  float mask=1.0-smoothstep(.58,.94,uv.y);
  float twinkle=.92+.08*sin((uv.x*1731.0+uv.y*947.0)*6.28318530718);
  float stars=starLayer(uv+vec2(.07,.0),vec2(420.,210.),.9885)+starLayer(uv*vec2(1.07,1.21)+13.7,vec2(760.,380.),.9952)*1.15;
  base+=vec3(.58,.70,1.0)*stars*mask*twinkle;
 }
 return clamp(base,0.,1.);
}
`;
const LAVA_CORE=`
// Slow molten flow in world coordinates. Same phase in neighbouring chunks.
vec3 paintedLava(vec2 p){
 vec2 flow=p*.64+uSeedOffset+vec2(-uTime*.018,uTime*.008);
 flow+=vec2(sin(flow.y*.91+uTime*.034),sin(flow.x*.72-uTime*.029))*.19*uAmplitude;
 vec2 cell=floor(flow),q=fract(flow);float first=10.,second=10.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 o=vec2(float(x),float(y));
  vec2 jitter=vec2(waterHash(cell+o+7.1),waterHash(cell+o+31.7));
  vec2 d=o+.18+jitter*.64-q;float dist=dot(d,d);
  if(dist<first){second=first;first=dist;}else second=min(second,dist);
 }
 float gap=sqrt(second)-sqrt(first);
 float aa=max(fwidth(gap),.008);
 float edge=1.-smoothstep(.07-aa,.22+aa,gap);
 float core=1.-smoothstep(.016-aa*.35,.055+aa*.35,gap);
 float heat=.5+.5*sin(p.x*.38+p.y*.53-uTime*.08);
 vec3 crust=mix(uInk0,uInk1,.40+heat*.25);
 vec3 liquid=mix(crust,uInk2,edge*.90);
 liquid=mix(liquid,uInk3,core*.75);
 return clamp(liquid*(.96+.04*sin(uTime*.6+p.x*.21)),0.,1.);
}
`;

const FS_LEGACY=`#version 300 es
precision highp float;in vec3 vNormal,vColor,vWorld;in vec4 vLight;in vec2 vUV;in vec4 vTangent;flat in float vVisibility;
uniform sampler2D uBaseMap,uNormalMap,uORMMap;uniform float uTextured,uNormalStrength,uRoughnessFactor,uMetallicFactor;uniform vec4 uBaseFactor;uniform vec3 uCamera;
uniform sampler2D uShadow;uniform vec3 uLightDir,uBackground;
uniform float uShadowOn,uTexel,uKind,uHighlight,uUnlit,uClip,uWaterScale,uNight,uNightLight,uSurfaceLava,uVolcanicGlow,uCanyon,uDesert;
uniform vec2 uDesertWind;
uniform vec4 uBounds;uniform vec2 uWorldOrigin;
out vec4 frag;
`+`
#define WATER_DERIVATIVES
`+WATER_CORE+LAVA_CORE+`
float shadow(vec3 N){
 vec3 p=vLight.xyz/vLight.w*.5+.5;
 if(uShadowOn<.5||p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 0.;
 float bias=max(.00022,.0009*(1.-dot(N,uLightDir))),s=0.;
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
  float d=texture(uShadow,p.xy+vec2(float(x),float(y))*uTexel).r;s+=(p.z-bias>d)?1.:0.;
 }return s/9.;
}
// Stable screen-space coverage, shared by all faces of an instance. This avoids
// transparency sorting, material clones and seeing the back of a hollow canopy.
float coverageThreshold(vec2 pixel){
 ivec2 p=ivec2(pixel)&7;int n=0;
 for(int bit=0;bit<3;bit++){int x=(p.x>>bit)&1,y=(p.y>>bit)&1;n=n*4+(2*(x^y)+y);} 
 return (float(n)+.5)/64.;
}
void main(){
 if(vVisibility<.999){if(vVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vVisibility)discard;}
 if(uClip>.5){bool within=vWorld.x>=uBounds.x&&vWorld.z>=uBounds.y&&vWorld.x<uBounds.z&&vWorld.z<uBounds.w;if((uClip<1.5&&!within)||(uClip>1.5&&within))discard;}
 vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
 vec4 texel=vec4(1.);float roughness=.9,metal=0.;
 if(uTextured>.5){
  texel=texture(uBaseMap,vUV)*uBaseFactor;if(texel.a<.35)discard;
  vec3 T=normalize(vTangent.xyz-N*dot(N,vTangent.xyz)),B=cross(N,T)*vTangent.w;
  vec3 mapN=texture(uNormalMap,vUV).rgb*2.-1.;mapN.xy*=uNormalStrength;
  N=normalize(mat3(T,B,N)*normalize(mapN));vec3 orm=texture(uORMMap,vUV).rgb;roughness=clamp(orm.g*uRoughnessFactor,.25,1.);metal=clamp(orm.b*uMetallicFactor,0.,1.);
 }
 float d=max(dot(N,uLightDir),0.),sh=shadow(N)*mix(1.,.56,uNight);
 vec3 surfaceColor=vColor*texel.rgb;
 if(uCanyon>.5&&uTextured<.5&&uKind<.5&&uUnlit<.5){
  vec2 worldXZ=vWorld.xz+uWorldOrigin;
  float height=vWorld.y-3.28+sin(worldXZ.y*.024)*.55;
  float phase=mod(height,5.6);
  float pale=smoothstep(3.85,4.05,phase)*(1.-smoothstep(4.7,4.92,phase));
  float thin=smoothstep(1.7,1.82,phase)*(1.-smoothstep(1.97,2.06,phase));
  float wall=smoothstep(1.4,4.0,height);
  vec3 sandstone=mix(vec3(.67,.29,.16),vec3(.84,.48,.27),.40+.07*sin(height*1.1));
  sandstone=mix(sandstone,vec3(.91,.66,.40),pale*.72+thin*.32);
  surfaceColor=mix(surfaceColor,sandstone,wall*.90);
 }
 if(uDesert>.5&&uTextured<.5&&uKind<.5&&uUnlit<.5){
  vec2 worldXZ=vWorld.xz+uWorldOrigin;
  float u=dot(worldXZ,uDesertWind),v=dot(worldXZ,vec2(-uDesertWind.y,uDesertWind.x));
  float phase=u*11.7+.82*sin(v*.24)+.36*sin(v*.69+u*.11);
  float aa=1.-smoothstep(.55,3.2,fwidth(phase));
  float ripple=sin(phase)*aa;
  surfaceColor*=1.+ripple*.024;
 }
 vec3 albedo=pow(clamp(surfaceColor,0.,1.),vec3(2.2));
 vec3 ambient=mix(vec3(.39,.31,.24),vec3(.83,.87,.72),N.y*.5+.5)*.54;
 vec3 warmSun=vec3(1.32,1.08,.72),coolShadow=vec3(.72,.77,.92);
 vec3 lit=albedo*(ambient+warmSun*d);
 lit*=mix(vec3(1.),coolShadow,sh*.52);
 lit+=albedo*vec3(.03,.035,.055)*sh;
 if(uTextured>.5){vec3 H=normalize(normalize(uCamera-vWorld)+uLightDir);float spec=pow(max(dot(N,H),0.),mix(48.,5.,roughness))*pow(1.-roughness,2.)*.15;lit+=mix(vec3(.04),albedo,metal)*spec*(1.-sh); }
 vec3 col=pow(max(lit,vec3(0.)),vec3(1./2.2));
 if(uKind>.5&&uKind<1.5){
  // Broader, calmer bands: slightly stretched mapping and softer palette.
  vec2 wp=(vWorld.zx+uWorldOrigin.yx)*vec2(.22,.45)*uWaterScale;
  col=uSurfaceLava>.5?paintedLava(wp*4.):paintedWater(wp,.001);
  if(uSurfaceLava<.5)col=mix(col,col*coolShadow+vec3(.018,.035,.05),sh*.18);
 }
 if(uHighlight>.5)col=mix(col,vec3(.8,.94,.32),.26);
 if(uUnlit>.5)col=vColor;
 if(uKind>1.5)col=uBackground*(1.-sh*.18);
 // Slightly brighter, bluer night grading for the landscape only.
 float luminance=dot(col,vec3(.2126,.7152,.0722));
 vec3 moonBase=mix(col,vec3(luminance),.36);
 vec3 moonColor=(moonBase*vec3(.46,.65,1.08)+vec3(.03,.055,.11))*uNightLight;
 if(!(uSurfaceLava>.5&&uKind>.5&&uKind<1.5))col=mix(col,clamp(moonColor,0.,1.),uNight*.92);
 // Optical emission on bright orange texels only; foliage and dark basalt stay lit normally.
 if(uVolcanicGlow>.5&&uTextured>.5&&uKind<.5){
  float hot=smoothstep(.65,.93,texel.r)*smoothstep(.12,.34,texel.r-texel.g)*(1.-smoothstep(.18,.35,texel.b));
  vec3 ember=clamp(texel.rgb*vec3(1.08,1.10,.95)*(1.+.06*sin(uTime*.7+vWorld.y*.4)),0.,1.);
  col=mix(col,ember,hot*.86);
 }
 frag=vec4(col,1.);
}`;
// V4 forward lighting: shared by terrain, imported objects and liquids.
// Linear-light GGX direct lighting; low-resolution mip-filtered sky reflections.
// The original shader remains available for an in-view A/B comparison.
const FS = FS_LEGACY.replace('void main(){', 'void legacyMain(){') + `
uniform float uEnhanced,uExposure,uBiome,uSurfaceType,uDetail,uContactOn,uEnvYaw;
uniform vec4 uSurfaceParams,uContactBounds;
uniform vec3 uLocalMin,uLocalSize;
uniform sampler2D uEnvDay,uEnvNight,uContactMap;
uniform highp sampler2DShadow uShadowFiltered;
in vec3 vLocal;
// Material-only experiment V4.1.8. World-locked biome tiles plus normal maps.
// Texture data is LINEAR (not sRGB). No geometry, no wind, no screen-space noise.
uniform float uGroundOn,uGroundStrength,uGroundMicro,uGroundMapped;
uniform sampler2D uGroundMask,uGroundDetail,uGroundNormal;
uniform vec4 uGroundRect; // local-space chunk min X/Z, step=1.5 m, size=35
uniform vec2 uGroundUVOrigin; // rotated floating origin / tile scale + seed, modulo 1
uniform vec4 uGroundParams; // x tile scale, y blend boost, z normal boost, w UV jitter
uniform vec3 uGroundSoil,uGroundGrass;
float materialNoise(vec3 p);
void groundMaterialLegacy419(vec3 worldP,vec3 Ng,inout vec3 color,inout vec3 N,inout float rough,inout float wet){
 bool mangrove=uBiome>1.5&&uBiome<2.5;
 bool volcano=uBiome>2.5&&uBiome<3.5;
 bool canyon=uCanyon>.5,desert=uDesert>.5;
 bool river=uBiome>.5&&uBiome<1.5;
 vec2 contextUV=((vWorld.xz-uGroundRect.xy)/uGroundRect.z+1.5)/uGroundRect.w;
 vec4 ctx=texture(uGroundMask,contextUV);
 if(uGroundMapped<.5)ctx=vec4(0.,.5,0.,0.);
 float up=smoothstep(.45,.90,Ng.y);
 float meso=ctx.g,wear=ctx.a*up;
 float grass=ctx.r*up*(1.-wear);
 float pixelSpan=max(length(dFdx(vWorld)),length(dFdy(vWorld)));
 float fineFade=1.-smoothstep(.055,.19,pixelSpan);
 float grainFade=1.-smoothstep(.018,.075,pixelSpan);
 vec2 uv=mat2(.8,-.6,.6,.8)*vWorld.xz*uGroundParams.x+uGroundUVOrigin;
 uv+=vec2(ctx.g-.5,ctx.r-.5)*uGroundParams.w;
 vec2 du=dFdx(uv),dv=dFdy(uv);
 float needDetail=(desert||canyon)?grainFade:fineFade;
 vec3 tile=vec3(.5);
 vec3 tileN=vec3(.5,.5,1.0);
 if(needDetail>.001){
  tile=textureGrad(uGroundDetail,uv,du,dv).rgb;
  if(uGroundMicro>.001)tileN=textureGrad(uGroundNormal,uv,du,dv).rgb;
 }
 float tileLum=dot(tile,vec3(.299,.587,.114));
 float fibre=tileLum-.5;
 float grit=(max(max(tile.r,tile.g),tile.b)-min(min(tile.r,tile.g),tile.b))-.08;
 vec2 grad=mat2(.8,.6,-.6,.8)*(tileN.xy*2.-1.);
 float amount=uGroundStrength;
 vec3 original=color,paint=color,baseNormal=Ng;
 float normalAmount=0.;
 if(mangrove){
  float greenery=smoothstep(.008,.10,color.g-color.r*.92);
  paint*=mix(vec3(.47,.43,.36),vec3(.52,.67,.38),greenery*.65);
  float coarse=materialNoise(worldP*.32),fine=materialNoise(worldP*2.6);
  float mudAA=1.-smoothstep(.2,1.,pixelSpan);
  paint*=.94+.10*coarse+.05*(fine-.5)*mudAA;
  paint*=mix(vec3(1.),clamp(tile*1.24,vec3(.78),vec3(1.20)),.40);
  vec3 moss=mix(paint,vec3(.135,.176,.070),.22);
  paint=mix(paint,moss,grass);
  wet=.72*(1.-greenery*.35);rough=clamp(mix(.56,.36,coarse)+grass*.05,.30,.67);
  paint*=1.+grit*.034*grainFade+fibre*.032*grass*fineFade;
  if(uDetail>.5){
   vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld),R1=cross(dp2,Ng),R2=cross(Ng,dp1);
   float det=dot(dp1,R1);vec3 g=sign(det)*(dFdx(fine)*R1+dFdy(fine)*R2);
   if(abs(det)>.00000001)baseNormal=normalize(abs(det)*Ng-g*.018*mudAA);
  }
  normalAmount=(.010+grass*.048)*up;
  paint*=1.-wear*.045;
 }else if(desert){
  paint*=mix(vec3(1.),clamp(vec3(tileLum*1.20),vec3(.94),vec3(1.10)),.30);
  paint*=1.+(meso-.5)*.035+grit*.028*grainFade;
  paint=mix(paint,paint*vec3(.99,.975,.955),wear*.25);
  rough=.98;normalAmount=.010*up;
 }else if(canyon){
  float h=vWorld.y-3.28+sin(worldP.z*.024)*.55,phase=mod(h,5.6);
  float pale=smoothstep(3.85,4.05,phase)*(1.-smoothstep(4.7,4.92,phase));
  float thin=smoothstep(1.7,1.82,phase)*(1.-smoothstep(1.97,2.06,phase));
  vec3 stone=mix(vec3(.67,.29,.16),vec3(.84,.48,.27),.40+.07*sin(h*1.1));
  stone=mix(stone,vec3(.91,.66,.40),pale*.72+thin*.32);
  paint=mix(paint,stone,smoothstep(1.4,4.,h)*.90);
  paint*=mix(vec3(1.),clamp(tile*1.18,vec3(.86),vec3(1.14)),.32);
  paint*=1.+((meso-.5)*.08+grit*.042*grainFade)*up;
  rough=.93;normalAmount=.010*up;
 }else if(volcano){
  paint*=mix(vec3(1.),clamp(tile*1.20,vec3(.84),vec3(1.16)),.38);
  paint*=1.+(meso-.5)*.13+grit*.06*grainFade;
  paint=mix(paint,mix(paint,uGroundGrass,.23),grass);
  paint=mix(paint,paint*.93,wear*.55);rough=.96;
  normalAmount=(.018+grass*.08)*up;
 }else{
  float turfMix=smoothstep(.26,.75,grass+(meso-.5)*.27);
  vec3 turf=mix(uGroundGrass,uGroundSoil,river?.14:.25);
  vec3 soil=mix(uGroundSoil,original,.38);
  vec3 mixed=mix(soil,turf,turfMix);
  paint=mix(original,mixed,river?.48:.54);
  paint*=mix(vec3(1.),clamp(tile*1.28,vec3(.80),vec3(1.18)),river?.52:.46);
  paint*=1.+(meso-.5)*.15;
  paint*=1.+fibre*grass*.20*fineFade+grit*.060*grainFade;
  vec3 trampled=mix(uGroundSoil,vec3(.76,.57,.34),river?.14:.28);
  trampled*=.98+(meso-.5)*.06;
  paint=mix(paint,trampled,wear*.66);
  rough=mix(.89,.97,grass);rough=mix(rough,.91,wear);
  wet=river?.20*(1.-grass*.65)*(1.-wear*.3):0.;
  normalAmount=(.010+grass*(river?.19:.14))*(1.-wear*.87)*up;
 }
 normalAmount*=amount*uGroundMicro*uGroundParams.z*mix(.60,1.,uDetail)*fineFade;
 vec3 slope=vec3(grad.x,0.,grad.y);slope-=Ng*dot(Ng,slope);
 N=normalize(baseNormal-slope*normalAmount);
 float microLight=clamp(dot(N,uLightDir)-dot(Ng,uLightDir),-.14,.14);
 if(!mangrove&&!desert&&!canyon)paint*=1.+microLight*.34;
 if(mangrove||canyon)color=mix(original,paint,min(1.,amount*uGroundParams.y));else color=mix(original,paint,min(1.,amount*uGroundParams.y));
 color=clamp(color,0.,1.);
}


// V4.1.10. Real ground albedo + OpenGL normal + AO/roughness/height.
// Texture atlases are world-locked. Mipmaps, NOT an early constant-color cutoff.
uniform sampler2D uGroundARH;
uniform float uGroundDebug,uGroundRelief;
float materialAO410=1.0;
float materialCover410=1.0;
vec3 sampleTurfN410(vec3 Ng,vec3 mapN,float strength){
 vec3 T=vec3(.8,0.,.6);T=normalize(T-Ng*dot(T,Ng));
 vec3 B=normalize(cross(Ng,T));
 mapN.xy*=strength;
 return normalize(T*mapN.x+B*mapN.y+Ng*max(mapN.z,.08));
}
void groundMaterial417(vec3 worldP,vec3 Ng,inout vec3 color,inout vec3 N,inout float rough,inout float wet){
 if(uDesert>.5){groundMaterialLegacy419(worldP,Ng,color,N,rough,wet);return;}
 bool river=uBiome>.5&&uBiome<1.5;
 bool moss=uBiome>1.5&&uBiome<2.5;
 bool rock=uBiome>2.5&&uBiome<3.5;
 bool canyon=uCanyon>.5;
 vec2 contextUV=((vWorld.xz-uGroundRect.xy)/uGroundRect.z+1.5)/uGroundRect.w;
 vec4 ctx=texture(uGroundMask,contextUV);
 if(uGroundMapped<.5)ctx=vec4(.5,.5,.65,0.);
 vec3 original=color;
 float up=smoothstep(.3,.82,Ng.y);
 // In the canyon, keep the detail material on the flat floor only so the wall-foot intersection
 // does not inherit projected sand rings, normals or parallax from the ground layer.
 float canyonFlat=smoothstep(.74,.96,Ng.y);
 if(canyon)ctx=vec4(1.,.5,.65,0.);
 float wear=ctx.a*up;
 vec2 uv=mat2(.8,-.6,.6,.8)*vWorld.xz*uGroundParams.x+uGroundUVOrigin;
 vec2 dx=dFdx(uv),dy=dFdy(uv);
 float footprint=max(length(dFdx(vWorld)),length(dFdy(vWorld)));
 float reliefFade=1.-smoothstep(.065,.20,footprint);
 float reliefMask=canyon?canyonFlat:up;
 // Limited parallax for the near field, no geometry displacement or false silhouette.
 if(uGroundRelief>.5&&reliefFade>.01&&reliefMask>.01){
  vec3 V=normalize(uCamera-vWorld);
  vec3 T=normalize(vec3(.8,0.,.6)-Ng*dot(Ng,vec3(.8,0.,.6)));
  vec3 B=normalize(cross(Ng,T));
  float nv=max(abs(dot(V,Ng)),.36);
  vec2 ray=vec2(dot(V,T),-dot(V,B))/nv*uGroundParams.w*uGroundParams.x*reliefFade*reliefMask;
  vec2 p=uv+ray*.45,stepUV=ray/8.;
  float depth=0.;
  for(int k=0;k<8;k++){
   float h=textureGrad(uGroundARH,p,dx,dy).b;
   if(depth>=1.-h)break;
   p-=stepUV;depth+=.125;
  }
  uv=p;
 }
 vec3 tex=textureGrad(uGroundDetail,uv,dx,dy).rgb;
 vec3 mapN=textureGrad(uGroundNormal,uv,dx,dy).rgb*2.-1.;
 vec3 arh=textureGrad(uGroundARH,uv,dx,dy).rgb;
 float cover=1.;
 float mudWet=0.;
 float puddle=0.;
 if(moss){
  // Moss covers most islands, but some mud bands remain exposed and can stay visibly wetter.
  cover=mix(.58,.98,smoothstep(.28,.65,ctx.g+ctx.r*.35));
  cover*=1.-wear*.72;
  float mudOpen=clamp(1.-cover,0.,1.);
  float organic=materialNoise(vec3(worldP.x*.095,0.,worldP.z*.095));
  float broad=materialNoise(vec3(worldP.x*.028+19.7,0.,worldP.z*.028-11.4));
  float shoreMoist=smoothstep(.34,.82,ctx.b);
  float wetField=shoreMoist*.58+broad*.22+organic*.20;
  mudWet=smoothstep(.46,.84,wetField+mudOpen*.24)*mudOpen;
  puddle=smoothstep(.74,.96,wetField+organic*.08+(1.-wear)*.06)*mudOpen*smoothstep(.55,.92,shoreMoist);
 }else if(!rock&&!canyon){
  cover=mix(river?.70:.58,1.,smoothstep(.15,.64,ctx.r));
  cover*=1.-wear*.91;
 }
 if(canyon)cover=canyonFlat;
 float amount=clamp(uGroundStrength*uGroundParams.y*cover,0.,1.);
 materialCover410=amount;
 // Use the actual sRGB base color, not a clamped modulation of the old yellow paint.
 if(rock)tex=pow(max(tex,vec3(.001)),vec3(.91));
 else if(moss)tex*=vec3(1.0,1.03,.96);
 else if(canyon)tex=mix(tex,tex*vec3(1.13,.94,.80),.25);
 else tex*=river?vec3(1.14,1.18,1.05):vec3(1.14,1.09,.97);
 if(canyon)tex*=1.; else tex*=.94+.12*ctx.g;
 if(moss){
  original*=mix(vec3(.47,.43,.36),vec3(.52,.67,.38),.15);
  vec3 dampMud=mix(tex*vec3(.76,.72,.66),vec3(.29,.26,.22),.30);
  vec3 pooledMud=mix(dampMud,vec3(.20,.18,.16),.42);
  tex=mix(tex,dampMud,mudWet*.60);
  tex=mix(tex,pooledMud,puddle*.55);
  original=mix(original,original*vec3(.72,.68,.62),mudWet*.34+puddle*.18);
 }
 if(canyon){
  float h=vWorld.y-3.28+sin(worldP.z*.024)*.55,phase=mod(h,5.6);
  float pale=smoothstep(3.85,4.05,phase)*(1.-smoothstep(4.7,4.92,phase));
  float thin=smoothstep(1.7,1.82,phase)*(1.-smoothstep(1.97,2.06,phase));
  vec3 stone=mix(vec3(.67,.29,.16),vec3(.84,.48,.27),.40+.07*sin(h*1.1));
  stone=mix(stone,vec3(.91,.66,.40),pale*.72+thin*.32);
  original=mix(original,stone,smoothstep(1.4,4.,h)*.90);
 }
 color=clamp(mix(original,tex,amount),0.,1.);
 float normalFade=1.-smoothstep(.12,.60,footprint);
 N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*amount*normalFade);
 float baseRough=mix(moss?.36:.92,clamp(arh.g,.26,.99),amount);
 rough=baseRough;
 wet=0.;
 if(moss){
  float wetMix=clamp(mudWet*.82+puddle*.88,0.,1.);
  wet=clamp(.18+mudWet*.52+puddle*.34,0.,1.)*(1.-cover*.52);
  rough=mix(baseRough,mix(.24,.09,puddle),wetMix);
 }else{
  wet=0.;
 }
 materialAO410=mix(1.,mix(.45,1.,arh.r),amount);
 if(uGroundDebug>.5){
  if(uGroundDebug<1.5)color=tex;
  else if(uGroundDebug<2.5)color=N*.5+.5;
  else color=vec3(arh.g);
 }
}

const float PI4=3.14159265359;
float detailHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float materialNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(detailHash(i),detailHash(i+vec3(1,0,0)),f.x),mix(detailHash(i+vec3(0,1,0)),detailHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(detailHash(i+vec3(0,0,1)),detailHash(i+vec3(1,0,1)),f.x),mix(detailHash(i+vec3(0,1,1)),detailHash(i+vec3(1)),f.x),f.y),f.z);}
vec3 toLinear4(vec3 c){return pow(max(c,vec3(0.)),vec3(2.2));}
vec3 filmic4(vec3 c){c=max(c*uExposure,vec3(0.));return pow(clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.),vec3(1./2.2));}
vec3 fresnel4(float cosine,vec3 f0){return f0+(1.-f0)*pow(1.-clamp(cosine,0.,1.),5.);}
vec3 environment4(vec3 d,float rough){d=normalize(d);vec2 uv=vec2(atan(d.z,d.x)/(2.*PI4)+.5+uEnvYaw,acos(clamp(d.y,-1.,1.))/PI4);
 vec3 day=textureLod(uEnvDay,uv,rough*7.).rgb*4.;
 vec3 night=textureLod(uEnvNight,uv,rough*7.).rgb*4.;
 return mix(day,night+vec3(.025,.045,.10),uNight);}
vec3 brdf4(vec3 N,vec3 V,vec3 L,vec3 base,float rough,float metal){
 vec3 H=normalize(V+L);float nv=max(dot(N,V),.015),nl=max(dot(N,L),0.),nh=max(dot(N,H),0.);
 float a=max(.045,rough*rough),a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/max(PI4*den*den,.0001);
 float k=(rough+1.)*(rough+1.)*.125;float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
 vec3 F=fresnel4(max(dot(H,V),0.),mix(vec3(.04),base,metal));
 return ((1.-F)*(1.-metal)*base/PI4+F*D*G/max(4.*nv*max(nl,.001),.001))*nl;
}
float contact4(){if(uContactOn<.5)return 1.;vec2 uv=(vWorld.xz+uWorldOrigin-uContactBounds.xy)/max(uContactBounds.zw,vec2(1.));
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return 1.;return texture(uContactMap,uv).r;}
float filteredShadow4(vec3 normal){
 vec3 p=vLight.xyz/vLight.w*.5+.5;
 if(uShadowOn<.5||p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.||p.z<0.)return 0.;
 vec2 ux=dFdx(p.xy),uy=dFdy(p.xy);float zx=dFdx(p.z),zy=dFdy(p.z),det=ux.x*uy.y-ux.y*uy.x;
 vec2 slope=abs(det)>.00000000001?vec2(uy.y*zx-ux.y*zy,ux.x*zy-uy.x*zx)/det:vec2(0.);
 slope=clamp(slope,vec2(-4.),vec2(4.));
 float bias=max(.00017,.0004*(1.-dot(normal,uLightDir)))+dot(abs(slope),vec2(uTexel))*.65,v=0.;
 // Receiver-plane depth compensation prevents the PCF kernel shadowing the ground itself.
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 o=vec2(float(x),float(y))*uTexel*1.15;v+=texture(uShadowFiltered,vec3(p.xy+o,p.z+dot(slope,o)-bias));}
 // Fade the shadow map edges to avoid a rectangular boundary in the distance.
 float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));return (1.-v/9.)*smoothstep(.005,.045,edge);
}

// V4.1.6: tres masas tonales; sombreado de copas separado de la microtextura.
// No postproceso de pantalla, no blur, sin luz amarilla aplicada a todo por igual.
uniform vec3 uArtSun,uArtShade,uArtFoliage;
uniform vec4 uArtParams; // recolor follaje, exposición suelo, fuerza sombra, saturación
uniform vec4 uArtShape;  // normal de copa, suavidad bandas, luz superior, borde objetos
in vec3 vCanopyNormal;
in float vRelativeHeight;
float artStep416(float edge,float x,float width){
 float aa=max(width,min(fwidth(x)*.8,.13));
 return smoothstep(edge-aa,edge+aa,x);
}
vec3 artLighting416(vec3 baseColor,vec3 geometricNormal,vec3 lightNormal,vec3 view,
                    float leaf,float rough,float ao,float shadowCoverage){
 bool ground=uTextured<.5&&uSurfaceType<.5;
 float leafMix=clamp(leaf,0.,1.);
 float lum=dot(baseColor,vec3(.2126,.7152,.0722));
 // Conserva textura/UV: comprime sólo parte del contraste fino del follaje.
 vec3 botanical=uArtFoliage*clamp(.83+(lum-.30)*.55,.72,1.17);
 vec3 base=mix(baseColor,botanical,leafMix*uArtParams.x);
 vec3 N=normalize(lightNormal);
 float up=clamp(N.y,0.,1.);
 float lightDrive=clamp(dot(N,uLightDir)+leafMix*up*uArtShape.z,0.,1.);
 float middle=artStep416(.27,lightDrive,uArtShape.y);
 float high=artStep416(ground?.52:.66,lightDrive,ground?.10:uArtShape.y*.90);
 vec3 shade=mix(uArtShade,vec3(.065,.105,.19)*uNightLight,uNight);
 vec3 mid=mix(ground?vec3(.90,.87,.67):vec3(.70,.77,.71),vec3(.14,.235,.42)*uNightLight,uNight);
 vec3 sun=mix(uArtSun,vec3(.31,.48,.78)*uNightLight,uNight);
 vec3 illumination=mix(shade,mid,middle);
 illumination=mix(illumination,sun,high);
 if(ground)illumination=mix(illumination,mix(shade,sun,smoothstep(0.,1.,lightDrive)),.16);
 // La sombra proyectada es UNA mancha: no pasa de nuevo por el cuantizador.
 float shadow=smoothstep(.16,.79,shadowCoverage)*uArtParams.z;
 illumination=mix(illumination,shade,shadow);
 float contact=mix(1.,clamp(ao,0.,1.),ground?.92:.52);
 vec3 lit=toLinear4(clamp(base,0.,1.))*illumination*contact;
 // Las copas se oscurecen hacia su base, no hoja por hoja.
 lit*=mix(1.,.83+.17*smoothstep(.26,.91,vRelativeHeight),leafMix);
 if(ground)lit*=uArtParams.y;
 // Emisión sólo en los texeles incandescentes, no en rocas o plantas normales.
 if(uVolcanicGlow>.5&&uTextured>.5){
  float hot=smoothstep(.65,.93,baseColor.r)*smoothstep(.12,.34,baseColor.r-baseColor.g)*(1.-smoothstep(.18,.35,baseColor.b));
  lit+=toLinear4(baseColor)*hot*1.65;
 }
 vec3 result=filmic4(lit);
 float gray=dot(result,vec3(.2126,.7152,.0722));
 result=mix(vec3(gray),result,uArtParams.w);
 // Sólo contorno geométrico tenue; sin derivadas de color que ensucien las hojas.
 if(!ground){
  float nv=abs(dot(normalize(geometricNormal),view));
  float ink=(1.-smoothstep(.015,.10,nv))*uArtShape.w*(1.-leafMix*.86);
  result=mix(result,result*vec3(.48,.53,.53),ink);
 }
 if(uHighlight>.5)result=mix(result,vec3(.8,.94,.32),.18);
 return clamp(result,0.,1.);
}

float toonRamp4(float x,float levels){x=clamp(x,0.,1.);return floor(x*(levels-.0001))/max(levels-1.,1.);}
vec3 saturateGrade4(vec3 c,float amt){float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,amt);}
vec3 africanToon4(vec3 lit,vec3 albedo,vec3 N,vec3 V,vec3 sun,vec3 reflected,float rough,float visibility,float leaf,float wet,float metal,float nv,vec3 worldP){
 if(uKind>.5&&uKind<1.5){
  vec3 outC=filmic4(lit);
  outC=saturateGrade4(outC*vec3(.99,1.03,1.07),1.02);
  return outC;
 }
 if(uKind<.5&&uSurfaceType<.5&&wet>.60){
  vec3 outC=filmic4(lit);
  outC=saturateGrade4(outC*vec3(1.00,1.00,.99),1.01);
  return outC;
 }
 float nl=max(dot(N,uLightDir),0.);
 float band=toonRamp4(nl*visibility,4.);
 float fill=toonRamp4(clamp(N.y*.5+.5,0.,1.),3.);
 float spec=pow(max(dot(reflect(-uLightDir,N),V),0.),mix(18.,34.,1.-rough));
 float specBand=smoothstep(.62,.88,spec)*(1.-rough*.40);
 vec3 warmSun=mix(vec3(1.42,1.06,.62),vec3(.28,.36,.58)*uNightLight,uNight);
 vec3 coolShade=mix(vec3(.46,.36,.22),vec3(.10,.14,.24)*uNightLight,uNight);
 vec3 base=mix(coolShade*.46,warmSun,.24+.76*band);
 vec3 toon=albedo*base*(.76+.24*fill);
 toon+=albedo*leaf*warmSun*(.13+.28*band);
 toon+=reflected*(.03+.05*(1.-rough)+wet*.18);
 toon+=vec3(specBand)*mix(vec3(.92,.78,.46),vec3(.70,.78,.96),uNight)*(.16+.14*(1.-metal)+wet*.28);
 float wetSheen=smoothstep(.15,.75,wet)*(1.-rough*.35);
 toon+=reflected*wetSheen*.22;
 toon+=vec3(spec)*wetSheen*mix(vec3(.40,.28,.16),vec3(.26,.30,.38),uNight)*.18;
 float rim=smoothstep(.18,.72,1.-nv)*(.08+.12*(1.-rough));
 toon+=albedo*rim*mix(vec3(.44,.24,.10),vec3(.10,.16,.26),uNight);
 float edge=max(1.-smoothstep(.10,.36,nv),smoothstep(.26,.58,length(fwidth(N))*2.0));
 edge=max(edge,smoothstep(.30,.62,length(fwidth(albedo))*4.0)*.35);
 float brush=materialNoise(worldP*.85)*.42+materialNoise(worldP*2.2)*.22;
 vec3 pigment=mix(vec3(.98,.96,.92),vec3(1.03,.99,.92),brush*.30);
 toon*=pigment;
 vec3 outC=filmic4(toon);
 outC=saturateGrade4(outC,1.12);
 outC=mix(outC,vec3(.84,.76,.58),.025*brush);
 vec3 ink=mix(vec3(.28,.18,.07),vec3(.08,.09,.13),uNight);
 outC=mix(outC,ink,clamp(edge*.38,0.,.55));
 return outC;
}
void main(){
 if(uEnhanced<.5){legacyMain();return;}
 if(vVisibility<.999){if(vVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vVisibility)discard;}
 if(uClip>.5){bool inside=vWorld.x>=uBounds.x&&vWorld.z>=uBounds.y&&vWorld.x<uBounds.z&&vWorld.z<uBounds.w;if((uClip<1.5&&!inside)||(uClip>1.5&&inside))discard;}
 if(uUnlit>.5){frag=vec4(vColor,1.);return;}
 vec3 worldP=vec3(vWorld.x+uWorldOrigin.x,vWorld.y,vWorld.z+uWorldOrigin.y);
 vec3 Ng=normalize(vNormal);if(!gl_FrontFacing)Ng=-Ng;vec3 N=Ng;
 vec4 texel=vec4(1.);float rough=uSurfaceParams.x,metal=0.,leaf=0.,wet=uSurfaceParams.w;
 vec3 color=vColor;float objAO=1.;
 bool wetlandGround=uBiome>1.5&&uBiome<2.5&&uTextured<.5&&uKind<.5&&uSurfaceType<.5;
 bool artSolid=uEnhanced>2.5&&uKind<.5&&!wetlandGround;
 if(uTextured>.5){
  float leafTextureBias=artSolid&&uSurfaceParams.z>.5?.65:0.;
  texel=texture(uBaseMap,vUV,leafTextureBias)*uBaseFactor;if(texel.a<.35)discard;color*=texel.rgb;
  vec3 tv=vTangent.xyz-N*dot(N,vTangent.xyz);vec3 T=dot(tv,tv)>.00001?normalize(tv):normalize(cross(N,abs(N.y)<.9?vec3(0,1,0):vec3(1,0,0)));
  vec3 B=cross(N,T)*vTangent.w;vec3 mapN=texture(uNormalMap,vUV).rgb*2.-1.;mapN.xy*=uNormalStrength;
  N=normalize(mat3(T,B,N)*normalize(mapN));vec3 mr=texture(uORMMap,vUV).rgb;
  rough=clamp(mix(rough,mr.g,.26),.24,.98);metal=clamp(mr.b*uSurfaceParams.y,0.,1.);
  leaf=smoothstep(.018,.13,texel.g-texel.r*.87)*smoothstep(.06,.20,texel.g)*uSurfaceParams.z;
  if(artSolid){
   leaf=smoothstep(.013,.115,texel.g-texel.r*.85)*smoothstep(.028,.12,texel.g-texel.b*.85)*uSurfaceParams.z;
   N=normalize(mix(Ng,N,mix(.68,.10,leaf)));
   N=normalize(mix(N,normalize(vCanopyNormal),leaf*uArtShape.x));
  }
  rough=mix(rough,.54,leaf);float relH=clamp((vLocal.y-uLocalMin.y)/max(uLocalSize.y,.05),0.,1.);
  objAO=mix(.80,1.,smoothstep(0.,.22,relH));
  wet*=1.-smoothstep(.04,.3,relH);rough=mix(rough,.38,wet*.68);color*=mix(vec3(1.),vec3(.63,.66,.54),wet*(1.-leaf*.5));
 }else if(uGroundOn>.5){
  groundMaterial417(worldP,Ng,color,N,rough,wet);objAO=contact4()*materialAO410;
 }else if(uKind<.5&&!(artSolid&&uSurfaceType>4.5)){
  float greenery=smoothstep(.008,.10,color.g-color.r*.92);
  float coarse=materialNoise(worldP*.32),fine=materialNoise(worldP*2.6);
  float footprint=max(length(dFdx(worldP)),length(dFdy(worldP)));float detailAA=1.-smoothstep(.2,1.0,footprint);
  color*=artSolid?(.985+.030*(coarse-.5)):(.94+.10*coarse+.05*(fine-.5)*detailAA);
  rough=mix(.88,.97,greenery);
  if(uBiome>1.5&&uBiome<2.5){wet=.72*(1.-greenery*.35);rough=mix(.56,.36,coarse);color*=mix(vec3(.47,.43,.36),vec3(.52,.67,.38),greenery*.65);}
  else if(uBiome>.5&&uBiome<1.5){wet=.25*(1.-greenery);rough=mix(rough,.59,wet);}
  if(uCanyon>.5){
   float h=vWorld.y-3.28+sin(worldP.z*.024)*.55,phase=mod(h,5.6);
   float pale=smoothstep(3.85,4.05,phase)*(1.-smoothstep(4.7,4.92,phase)),thin=smoothstep(1.7,1.82,phase)*(1.-smoothstep(1.97,2.06,phase));
   vec3 stone=mix(vec3(.67,.29,.16),vec3(.84,.48,.27),.40+.07*sin(h*1.1));
   stone=mix(stone,vec3(.91,.66,.40),pale*.72+thin*.32);
   color=mix(color,stone,smoothstep(1.4,4.,h)*.90);rough=.91;
  }
  if(uDetail>.5&&!artSolid){
   // Derivative normal perturbation: follows vertical cliffs as well as flat ground.
   vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld),R1=cross(dp2,N),R2=cross(N,dp1);
   float det=dot(dp1,R1);vec3 grad=sign(det)*(dFdx(fine)*R1+dFdy(fine)*R2);
   N=normalize(abs(det)*N-grad*.018*detailAA);
  }
  if(uDesert>.5){
   // Arena limpia: las dunas grandes ya las define la geometría. Evitamos el patrón
   // sinusoidal de micro-ripples (caro y repetitivo) y reutilizamos el ruido ya calculado.
   float sandGrain=(coarse-.5)*.018+(fine-.5)*.006*detailAA;
   color*=1.+sandGrain;
   rough=.97;
  }
  objAO=contact4();
 }
 vec3 V=normalize(uCamera-vWorld);float nv=max(dot(N,V),0.);
 float shadeFraction=filteredShadow4(Ng);float visibility=1.-shadeFraction*.93;
 if(uGroundOn>.5&&uDesert<.5){
  if(uGroundDebug>.5){frag=vec4(clamp(color,0.,1.),1.);return;}
  vec3 base=toLinear4(clamp(color,0.,1.));
  vec3 sun=mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66)*uNightLight,uNight);
  vec3 amb=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);
  vec3 direct=brdf4(N,V,uLightDir,base,rough,0.)*sun*visibility;
  vec3 reflected=environment4(reflect(-V,N),rough);
  vec3 spec=reflected*fresnel4(max(dot(N,V),0.),vec3(.04))*(1.-rough*.72)*.48;
  vec3 lit=direct*mix(.48,1.,materialAO410)+base*amb*objAO*(.76+.24*clamp(N.y,0.,1.))+spec*objAO;
  vec3 outC=filmic4(lit);frag=vec4(clamp(outC,0.,1.),1.);return;
 }
 if(artSolid){frag=vec4(artLighting416(color,Ng,N,V,leaf,rough,objAO,shadeFraction),1.);return;}
 vec3 albedo=toLinear4(clamp(color,0.,1.));
 vec3 sun=mix(vec3(3.35,2.90,2.28),vec3(.26,.40,.72)*uNightLight,uNight);
 vec3 skyFill=mix(vec3(.50,.64,.82),vec3(.11,.19,.36)*uNightLight,uNight);
 vec3 groundFill=mix(vec3(.24,.21,.16),vec3(.055,.08,.14)*uNightLight,uNight);
 vec3 ambient=mix(groundFill,skyFill,clamp(N.y*.5+.5,0.,1.));
 vec3 direct=brdf4(N,V,uLightDir,albedo,rough,metal)*sun*visibility;
 vec3 reflected=environment4(reflect(-V,N),rough);
 vec3 specAmbient=reflected*fresnel4(nv,mix(vec3(.04),albedo,metal))*(1.-rough*.65)*.55;
 vec3 lit=direct+albedo*ambient*objAO*(1.-metal)+specAmbient*objAO;
 float back=pow(max(dot(-uLightDir,V),0.),3.)*.32+max(dot(-N,uLightDir),0.)*.13;
 lit+=albedo*leaf*sun*back*.24*(.45+.55*visibility);
 if(uKind>.5&&uKind<1.5){
  vec2 wp=(vWorld.zx+uWorldOrigin.yx)*vec2(.22,.45)*uWaterScale;
  if(uSurfaceLava>.5){lit=toLinear4(paintedLava(wp*4.))*2.15;}
  else{
   vec3 wn=normalize(vec3(.040*sin(worldP.x*.43+worldP.z*.18+uTime*.40),1.,.040*cos(worldP.z*.37-worldP.x*.16-uTime*.32)));
   float f=.022+.978*pow(1.-max(dot(wn,V),0.),5.);
   vec3 reflection=environment4(reflect(-V,wn),.22);
   vec3 paint=paintedWater(wp,.001);vec3 base=mix(uInk1,paint,.42)*.72;
   lit=toLinear4(base)*mix(vec3(.82,.90,.92),vec3(.12,.22,.43)*uNightLight,uNight)*(.70+.30*visibility);
   lit=mix(lit,reflection*.75,clamp(f*.78,.03,.75));
   lit+=brdf4(wn,V,uLightDir,vec3(.004),.22,0.)*sun*visibility*.55;
  }
 }
 if(uVolcanicGlow>.5&&uTextured>.5&&uKind<.5){
  float hot=smoothstep(.65,.93,texel.r)*smoothstep(.12,.34,texel.r-texel.g)*(1.-smoothstep(.18,.35,texel.b));
  lit+=toLinear4(texel.rgb)*hot*1.65;
 }
 if(uKind>1.5)lit=toLinear4(uBackground)*(.55+.40*max(dot(N,uLightDir),0.))*(1.-shadeFraction*.45);
 vec3 outColor=(uEnhanced>2.5&&wetlandGround)?filmic4(lit):uEnhanced>1.5?africanToon4(lit,albedo,N,V,sun,reflected,rough,visibility,leaf,wet,metal,nv,worldP):filmic4(lit);
 if(uHighlight>.5)outColor=mix(outColor,vec3(.8,.94,.32),uEnhanced>1.5?.18:.26);
 frag=vec4(outColor,1.);
}`;

const DVS=`#version 300 es
precision highp float;layout(location=0)in vec3 aPosition;layout(location=3)in vec3 iPosition;layout(location=4)in float iYaw;layout(location=5)in vec3 iScale;
uniform mat4 uLightVP;uniform vec3 uChunkOffset;
void main(){float s=sin(iYaw),c=cos(iYaw);vec3 p=aPosition*iScale;vec3 w=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z)+iPosition+uChunkOffset;gl_Position=uLightVP*vec4(w,1.);}`;
const DFS=`#version 300 es
precision highp float;void main(){}`;
const SKY_VS=`#version 300 es
precision highp float;out vec2 vScreen;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vScreen=p*2.-1.;gl_Position=vec4(vScreen,1.,1.);}`;
const SKY_FS=`#version 300 es
precision highp float;in vec2 vScreen;uniform vec3 uForward,uRight,uUp;uniform vec2 uViewScale;out vec4 frag;
`+SKY_CORE+`
void main(){vec3 ray=normalize(uForward+vScreen.x*uViewScale.x*uRight+vScreen.y*uViewScale.y*uUp);frag=vec4(skyColor(ray),uSkyOpacity);}`;
const canvas=$('glcanvas');let gl=null,renderer=null;

function decodeRadiance(encoded){
 const raw=atob(encoded.trim()),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 let pos=0;function line(){let s='';while(pos<bytes.length){const c=bytes[pos++];if(c===10)break;if(c!==13)s+=String.fromCharCode(c);}return s;}
 const magic=line();if(!magic.startsWith('#?'))throw Error('Cabecera HDR no válida.');
 let s,format='';while((s=line())!==''){if(s.startsWith('FORMAT='))format=s.slice(7);if(pos>=bytes.length)throw Error('HDR truncado.');}
 if(format!=='32-bit_rle_rgbe')throw Error('El cielo requiere Radiance RGBE.');
 const res=line().match(/^([+-])Y\s+(\d+)\s+([+-])X\s+(\d+)$/);if(!res)throw Error('Orientación HDR no admitida.');
 const h=Number(res[2]),w=Number(res[4]);if(w<8||w>32767||w*h>16777216)throw Error('Dimensiones HDR fuera de rango.');
 const pixels=new Uint8Array(w*h*4),row=new Uint8Array(w*4);
 for(let y=0;y<h;y++){
  if(bytes[pos++]!==2||bytes[pos++]!==2)throw Error('Fila RGBE no válida.');
  const width=(bytes[pos++]<<8)|bytes[pos++];if(width!==w)throw Error('Anchura RGBE incoherente.');
  for(let c=0;c<4;c++){
   let x=0;while(x<w){if(pos>=bytes.length)throw Error('HDR incompleto.');const code=bytes[pos++];
    if(code>128){const count=code-128,value=bytes[pos++];if(x+count>w)throw Error('RLE inválido.');for(let i=0;i<count;i++)row[(x++)*4+c]=value;}
    else{if(!code||x+code>w||pos+code>bytes.length)throw Error('RLE inválido.');for(let i=0;i<code;i++)row[(x++)*4+c]=bytes[pos++];}
   }
  }
  const yy=res[1]==='-'?y:h-y-1;
  if(res[3]==='+')pixels.set(row,yy*w*4);else for(let x=0;x<w;x++)pixels.set(row.subarray(x*4,x*4+4),(yy*w+w-x-1)*4);
 }
 return {width:w,height:h,pixels};
}

// These surface recipes complement the original GLB color / normal / MR atlas.
// No texture replacement, geometry splitting, or guessed ambient-occlusion channel.
// Recetas artísticas V4.1.6: mismos materiales y mallas, distinta calibración.
const ART416_PROFILES=Object.freeze({"savanna":{"sun":[1.85,1.78,1.32],"shade":[0.17,0.28,0.34],"foliage":[0.47,0.59,0.18],"params":[0.46,0.9,0.91,1.035],"shape":[0.6,0.054,0.15,0.15]},"grand_river":{"sun":[1.77,1.79,1.42],"shade":[0.14,0.26,0.32],"foliage":[0.3,0.52,0.2],"params":[0.47,0.92,0.88,1.025],"shape":[0.6,0.07,0.14,0.13]},"mangrove":{"sun":[1.61,1.76,1.48],"shade":[0.14,0.25,0.28],"foliage":[0.27,0.47,0.22],"params":[0.43,0.95,0.83,1.015],"shape":[0.53,0.09,0.12,0.1]},"volcanoes":{"sun":[1.74,1.58,1.31],"shade":[0.22,0.26,0.33],"foliage":[0.33,0.43,0.2],"params":[0.3,0.96,0.81,1.02],"shape":[0.55,0.064,0.14,0.15]},"canyons":{"sun":[1.68,1.57,1.36],"shade":[0.22,0.27,0.36],"foliage":[0.4,0.49,0.18],"params":[0.3,0.94,0.88,1.015],"shape":[0.54,0.062,0.13,0.15]},"desert":{"sun":[1.69,1.61,1.36],"shade":[0.26,0.29,0.34],"foliage":[0.45,0.47,0.19],"params":[0.2,0.93,0.86,1.01],"shape":[0.38,0.08,0.1,0.12]}});
function describeSurface(p,kind,biome){
 if(kind===1)return{name:biome==='volcanoes'?'Lava emisiva':'Agua con Fresnel',type:8,params:[.22,0,0,1]};
 if(!p){const names={savanna:'Tierra seca y hierba',grand_river:'Limo y suelo de ribera',mangrove:'Musgo y barro alternados',volcanoes:'Basalto y ceniza',canyons:'Arenisca estratificada',desert:'Arena mate con microondulaciones'};return{name:names[biome]||'Suelo',type:0,params:[.9,0,0,biome==='mangrove'?.7:0]};}
 const group=p.group,name=p.name.toLowerCase(),wet=biome==='mangrove'?.52:biome==='grand_river'?.20:0;
 if(/hues|óse|ose|cráneo|concha/.test(name))return{name:'Hueso / concha mate',type:4,params:[.69,0,0,wet]};
 if(group<=2)return{name:group===0?'Corteza y hojas':group===1?'Follaje arbustivo':'Hierba y hojas bajas',type:1,params:[group===0?.87:.76,0,1,wet]};
 if(group===3||p.role==='formation'||/roca|piedra|mesa|aguja|arco|termitero/.test(name))return{name:biome==='volcanoes'?'Roca volcánica':'Piedra natural',type:2,params:[.88,0,0,wet]};
 if(group===4||/madera|pilote|refugio|embarcadero|barca/.test(name))return{name:'Madera y restos orgánicos',type:3,params:[.86,0,0,wet]};
 return{name:'Piedra y construcción',type:5,params:[.87,0,.35,wet]};
}
function smoothTerrainLighting(field,data,ox,oz){
 if(field.canyon||field.desert)return;const normals=new Map();
 for(let k=0;k<data.length;k+=9){const x=data[k]+ox,z=data[k+2]+oz,key=x+','+z;let n=normals.get(key);
  if(!n){const dx=field.height(x+.5,z)-field.height(x-.5,z),dz=field.height(x,z+.5)-field.height(x,z-.5);n=norm([-dx,1,-dz]);normals.set(key,n);}
  data[k+3]=n[0];data[k+4]=n[1];data[k+5]=n[2];
 }
}
function compactStaticMesh(geometry){
 const a=geometry.v||geometry;if(!(a instanceof Float32Array)||a.length<108||geometry.index||geometry.uv)return geometry;
 // Exact bitwise welding: only identical positions, normals and colors share a vertex.
 const bits=new Uint32Array(a.buffer,a.byteOffset,a.length),map=new Map(),unique=[],indices=[];
 for(let k=0;k<a.length;k+=9){let key='';for(let j=0;j<9;j++)key+=bits[k+j]+',';let idx=map.get(key);
  if(idx===undefined){idx=unique.length/9;map.set(key,idx);for(let j=0;j<9;j++)unique.push(a[k+j]);}indices.push(idx);
 }
 if(unique.length>a.length*.85)return geometry;
 return {v:new Float32Array(unique),index:unique.length/9<=65535?new Uint16Array(indices):new Uint32Array(indices),sourceVertexCount:a.length/9};
}
function buildWetlandWater(field,bo,b,water){
 const step=.75,n=64,mask=new Uint8Array(n*n),color=hex(b.colors.water);
 for(let z=0;z<n;z++)for(let x=0;x<n;x++)mask[z*n+x]=field.waterInfo(bo.minX+(x+.5)*step,bo.minZ+(z+.5)*step).inside?1:0;
 // Lossless greedy rectangles over the existing occupancy cells; no altered coastline.
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){
  if(!mask[z*n+x])continue;let w=1;while(x+w<n&&mask[z*n+x+w])w++;
  let h=1,expand=true;while(z+h<n&&expand){for(let dx=0;dx<w;dx++)if(!mask[(z+h)*n+x+dx]){expand=false;break;}if(expand)h++;}
  for(let dz=0;dz<h;dz++)for(let dx=0;dx<w;dx++)mask[(z+dz)*n+x+dx]=0;
  const x0=-24+x*step,z0=-24+z*step,y=field.wetlandLevel(bo.minX+x*step,bo.minZ+z*step);
  const a=[x0,y,z0],bb=[x0+w*step,y,z0],c=[x0+w*step,y,z0+h*step],d=[x0,y,z0+h*step];water.tri(a,d,bb,color);water.tri(bb,d,c,color);
 }
}

// Obsolete V4.1.7 noise atlas removed.
// V4.1.8: material-only ground experiment. Does NOT modify placement or height.
// RGBA context texture: vegetation, meso variation, moisture, wear. World-aligned
// 1.5 m sampling with one texel halo; shared edges are identical across chunks.
function groundWear417(field,b,x,z,meso){
 const s=findSettlementSite(field,b),dx=x-s.x,dz=z-s.z,d=Math.hypot(dx,dz);
 if(d>s.haloRadius+4)return 0;
 const angle=s.yaw||0,cs=Math.cos(angle),sn=Math.sin(angle);
 const xx=dx*cs+dz*sn,zz=-dx*sn+dz*cs;
 const core=1-smooth(s.clearRadius*.48,s.clearRadius+2.3+(meso-.5)*3,d);
 // Short worn corridors, aligned to the existing cleared X/Z approaches.
 // Only a material mask: no road meshes, no clearing additional vegetation.
 const warp=(noise(x*.055,z*.055,field.seed^97137)-.5)*1.05;
 const line=Math.min(Math.abs(dx+warp),Math.abs(dz-warp));
 const path=(1-smooth(1.05,3.1,line))*(1-smooth(s.softRadius-2,s.haloRadius+1,d));
 const yard=.81+.19*meso;
 return clamp(Math.max(core*yard,path*.74),0,1);
}
function groundSample417(field,b,x,z){
 const s=field.seed;
 const vegetation=noise(x*.045,z*.045,s^(3*7781)); // same field as group 2 scatter
 const meso=clamp(noise(x*.030,z*.030,s^97103)*.64+noise(x*.115,z*.115,s^97109)*.36,0,1);
 let moisture=0,cover=0;
 if(!field.canyon&&!field.desert){
  moisture=field.moisture(x,z);
  if(field.wetland){
   // Moss, NOT lawn. Most mud keeps its original wet/PBR material.
   cover=smooth(.45,.80,field.wetlandCluster(x,z)*.62+meso*.38)*.42;
  }else{
   const patch=vegetation*.57+meso*.28+moisture*.15;
   cover=field.c.biome==='grand_river'?.22+.78*smooth(.26,.70,patch):
         field.c.biome==='volcanoes'?.14*smooth(.60,.82,patch):smooth(.28,.72,patch)*.96;
  }
 }
 const wear=groundWear417(field,b,x,z,meso);
 return [clamp(cover,0,1),meso,clamp(moisture,0,1),wear];
}
function buildGroundMask417(config,b,field,bo){
 const n=35,step=1.5,bytes=new Uint8Array(n*n*4);
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const x=bo.minX+(ix-1)*step,z=bo.minZ+(iz-1)*step,c=groundSample417(field,b,x,z),at=(iz*n+ix)*4;
  for(let k=0;k<4;k++)bytes[at+k]=Math.round(c[k]*255);
 }
 return bytes;
}
function setGround417(settings){
 if(typeof settings==='boolean')settings={enabled:settings};
 if(!settings||typeof settings!=='object')throw Error('Ajustes del suelo no válidos.');
 const enabled=settings.enabled??state.groundSurface,micro=settings.micro??state.groundMicro,strength=settings.strength??state.groundStrength;
 if(typeof enabled!=='boolean'||typeof micro!=='boolean'||!Number.isFinite(strength)||strength<0||strength>1)throw Error('Suelo: activación booleana e intensidad entre 0 y 1.');
 state.groundSurface=enabled;state.groundMicro=micro;state.groundStrength=strength;
 for(const [k,min,max] of [['scale',.35,2],['normal',0,2.5],['debug',0,3]])if(settings[k]!==undefined){if(!Number.isFinite(settings[k])||settings[k]<min||settings[k]>max)throw Error('Parámetro de suelo fuera de rango: '+k);state['ground'+k[0].toUpperCase()+k.slice(1)]=settings[k];}
 if(settings.relief!==undefined)state.groundRelief=!!settings.relief;
 syncGround417UI();
}
function syncGround417UI(){
 if($('groundName410'))$('groundName410').textContent=GROUND417_BIOME_TILES[state.biome]?.name||'';
 if(!$('groundSurface417'))return;
 $('groundSurface417').checked=state.groundSurface;$('groundMicro417').checked=state.groundMicro;
 $('groundStrength417').value=state.groundStrength;$('groundStrength417Val').textContent=Math.round(state.groundStrength*100)+' %';
 $('groundStrength417').disabled=!state.groundSurface;$('groundMicro417').disabled=!state.groundSurface;
 $('groundNote417').textContent=state.lighting==='classic'?'El modo Original V3.7 conserva su shader sin este experimento.':
  state.groundSurface?'B · Suelo texturizado. Misma geometría, modelos, agua y posición.':'A · Suelo de V4.1.6, sin regenerar el mundo.';
}
function setupGround417UI(){
 $('groundSurface417').onchange=()=>setGround417({enabled:$('groundSurface417').checked});
 $('groundMicro417').onchange=()=>setGround417({micro:$('groundMicro417').checked});
 $('groundStrength417').oninput=()=>setGround417({strength:Number($('groundStrength417').value)});
 $('groundScale410').oninput=()=>setGround417({scale:Number($('groundScale410').value)});
 $('groundNormal410').oninput=()=>setGround417({normal:Number($('groundNormal410').value)});
 $('groundRelief410').onchange=()=>setGround417({relief:$('groundRelief410').checked});
 $('groundDebug410').onchange=()=>setGround417({debug:Number($('groundDebug410').value)});
 syncGround417UI();
}

class Renderer{
 initGround417(){
  this.groundMapBytes=0;this.groundMapCount=0;this.groundTextureBytes=0;this.groundBiomeTextures=Object.create(null);
  const neutral=gl.createTexture();gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,neutral);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,128,0,0]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.groundNeutralTexture=neutral;this.groundTextureBytes+=4;
  const baseFallback=gl.createTexture();gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,baseFallback);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  this.groundDetailTexture=baseFallback;this.groundTextureBytes+=4;
  const normalFallback=gl.createTexture();gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,normalFallback);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  this.groundNormalTexture=normalFallback;this.groundTextureBytes+=4;gl.activeTexture(gl.TEXTURE0);
 }
 async loadGroundBiomeTextures417(){
  for(const [id,info] of Object.entries(GROUND417_BIOME_TILES)){
   const images=[];for(const role of ['base','normal','arh'])if(info[role])images.push(await loadEmbeddedImage410(info[role]));
   this.groundBiomeTextures[id]={...info,images,baseTexture:null,normalTexture:null,arhTexture:null,width:images[0].naturalWidth,height:images[0].naturalHeight,normalWidth:images[1].naturalWidth,normalHeight:images[1].naturalHeight};
  }
  this.groundARHFallback=gl.createTexture();gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,this.groundARHFallback);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,230,128,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.activeTexture(gl.TEXTURE0);this.activeGround410=null;
 }
 activateGround410(){
  if(this.activeGround410===state.biome)return;
  for(const q of Object.values(this.groundBiomeTextures))for(const role of ['baseTexture','normalTexture','arhTexture'])if(q[role]){gl.deleteTexture(q[role]);q[role]=null;}
  const q=this.groundBiomeTextures[state.biome];if(!q)return;
  for(let i=0;i<q.images.length;i++)q[['baseTexture','normalTexture','arhTexture'][i]]=uploadMap410(q.images[i],10+i);
  this.groundTextureBytes=16+q.images.reduce((n,im)=>n+Math.ceil(im.naturalWidth*im.naturalHeight*16/3),0);
  this.activeGround410=state.biome;
 }
 attachGround417(batch,bytes){
  if(!batch||!bytes||bytes.length!==35*35*4)return;
  const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,35,35,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  batch.groundTexture=tex;batch.groundBytes=bytes.length;this.groundMapBytes+=bytes.length;this.groundMapCount++;
  gl.activeTexture(gl.TEXTURE0);
 }
 groundUniforms417(b){
  const active=state.groundSurface&&state.groundStrength>.0001&&state.lighting!=='classic'&&mode==='terrain'&&
    b.kind===0&&!b.material&&!b.settlement&&!b.lines&&!b.unlit&&(!!b.chunk||!!b.horizon);
  const u=this.u;gl.uniform1f(u.uGroundOn,active?1:0);
  if(!active)return;
  const off=this.offset(b);gl.uniform4f(u.uGroundRect,off[0]-24,off[2]-24,1.5,35);
  gl.uniform1f(u.uGroundMapped,b.groundTexture?1:0);
  gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,b.groundTexture||this.groundNeutralTexture);gl.activeTexture(gl.TEXTURE0);
 }
 setGroundUniforms417(){
  this.activateGround410();
  const u=this.u,b=currentBiome(),seed=world?.field.seed||0,tile=this.groundBiomeTextures[state.biome];
  gl.uniform1f(u.uGroundStrength,state.groundStrength);gl.uniform1f(u.uGroundMicro,state.groundMicro?1:0);
  gl.uniform3fv(u.uGroundSoil,hex(b.colors.soil));
  const turf=cmix(hex(b.colors.grass),hex(b.colors.foliage),state.biome==='grand_river'?.32:.20);
  gl.uniform3fv(u.uGroundGrass,turf);
  gl.uniform4f(u.uGroundParams,(tile?.scale??.25)*(state.biome==='desert'?1:state.groundScale),tile?.blend??1,(tile?.normalBoost??1)*(state.biome==='desert'?1:state.groundNormal),state.biome==='desert'?(tile?.jitter??.16):(tile?.relief??0));gl.uniform1f(u.uGroundDebug,state.groundDebug);gl.uniform1f(u.uGroundRelief,state.groundRelief?1:0);
  const ox=this.origin[0],oz=this.origin[1],frac=v=>v-Math.floor(v),scale=(tile?.scale??.25)*(state.biome==='desert'?1:state.groundScale);
  gl.uniform2f(u.uGroundUVOrigin,frac((.8*ox+.6*oz)*scale+hashCell(seed,0,1,417)/4294967296),frac((-.6*ox+.8*oz)*scale+hashCell(seed,1,0,417)/4294967296));
  gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,this.groundNeutralTexture);gl.uniform1i(u.uGroundMask,9);
  gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,tile?.baseTexture||this.groundDetailTexture);gl.uniform1i(u.uGroundDetail,10);
  gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,tile?.normalTexture||this.groundNormalTexture);gl.uniform1i(u.uGroundNormal,11);gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,tile?.arhTexture||this.groundARHFallback);gl.uniform1i(u.uGroundARH,12);
  gl.activeTexture(gl.TEXTURE0);
 }


 // Frame batches concatenate only instance attributes; source meshes stay shared.
 // Chunk ownership and original IDs are retained for streaming, picking and occlusion.
 initV4(){
  this.batchSerial=0;this.renderGroups=new Map();this.groupBytes=0;this.groupUploads=0;
  this.envTextures=[];this.environmentBytes=0;this.contactKey='';this.contactBytes=256*256;this.contactBounds=[0,0,1,1];
  this.contactTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.contactTexture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,256,256,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array(256*256).fill(255));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.shadowSampler=gl.createSampler();gl.samplerParameteri(this.shadowSampler,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.samplerParameteri(this.shadowSampler,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.samplerParameteri(this.shadowSampler,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.samplerParameteri(this.shadowSampler,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.samplerParameteri(this.shadowSampler,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.samplerParameteri(this.shadowSampler,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  this.performance={rawDraws:0,mainDraws:0,shadowDraws:0,groups:0,uploads:0,cpuMs:0};this.initGround417();
 }
 installEnvironment(data,index){
  // Linear radiance compressed into a bounded RGBA8 representation, then mipmapped.
  // This is a roughness approximation, not a costly offline GGX convolution.
  const w=256,h=128,bytes=new Uint8Array(w*h*4),sx=data.width/w,sy=data.height/h,src=data.pixels;
  const expo=SKY_EXPOSURES[index];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   let r=0,g=0,b=0,n=0;
   for(let dy=0;dy<sy;dy+=2)for(let dx=0;dx<sx;dx+=2){
    const k=((Math.floor(y*sy+dy))*data.width+Math.floor(x*sx+dx))*4;
    const s=src[k+3]?Math.pow(2,src[k+3]-128)/256:0;r+=src[k]*s;g+=src[k+1]*s;b+=src[k+2]*s;n++;
   }
   const at=(y*w+x)*4;
   for(const[c,v]of[[0,r],[1,g],[2,b]]){const l=v/n*expo;bytes[at+c]=Math.round(clamp(l/(1+l*.45)/4,0,1)*255);}bytes[at+3]=255;
  }
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
  this.envTextures.push(t);this.environmentBytes+=Math.ceil(w*h*4*4/3);
 }
 prepareContacts(){
  if(mode!=='terrain'||!world)return;
  const mgr=world.manager,bo=mgr.nearBounds;if(!bo)return;
  const key=world.config.biome+':'+mgr.created+':'+mgr.released+':'+bo.join(',')+':'+state.layers.join(',');if(this.contactKey===key)return;
  this.contactKey=key;const size=256,bytes=new Uint8Array(size*size).fill(255),width=bo[2]-bo[0],height=bo[3]-bo[1];
  this.contactBounds=[bo[0],bo[1],width,height];
  for(let slot=0;slot<20;slot++){
   const p=prototypes[slot],group=p.group;if(!state.layers[group]||group===2)continue;
   const weight=group===0?.26:group===3?.34:group===1?.18:.24;
   for(const a of world.instances[slot]){
    const radius=clamp(p.radius*Math.max(a.sx,a.sz)*(group===0?.35:.55),.5,9);
    const px=(a.x-bo[0])/width*size,pz=(a.z-bo[1])/height*size,rx=radius/width*size,rz=radius/height*size;
    const minX=Math.max(0,Math.floor(px-rx)),maxX=Math.min(size-1,Math.ceil(px+rx)),minZ=Math.max(0,Math.floor(pz-rz)),maxZ=Math.min(size-1,Math.ceil(pz+rz));
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
     const d=((x+.5-px)/rx)**2+((z+.5-pz)/rz)**2;if(d>=1)continue;const value=Math.round(255*(1-weight*(1-d)**2));
     const at=z*size+x;bytes[at]=Math.min(bytes[at],value);
    }
   }
  }
  gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,this.contactTexture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,size,size,gl.RED,gl.UNSIGNED_BYTE,bytes);gl.activeTexture(gl.TEXTURE0);
 }
 discardGroups(){
  if(!this.renderGroups)return;
  for(const pair of this.renderGroups.values())for(const g of pair.values())this.deleteGroup(g);
  this.renderGroups.clear();
 }
 deleteGroup(g){gl.deleteBuffer(g.buffer);gl.deleteVertexArray(g.vao);this.gpuBytes-=g.bytes;this.groupBytes-=g.bytes;this.liveBuffers--;this.liveVAOs--;}
 releaseResourceGroups(resource){
  const pair=this.renderGroups?.get(resource);if(!pair)return;
  for(const g of pair.values())this.deleteGroup(g);this.renderGroups.delete(resource);
 }
 mergedGroups(shadow=false){
  const groups=new Map(),pass=shadow?'shadow':'main';
  for(const b of this.batches){
   if(!this.visible(b,shadow)||!b.material||b.clip||b.lines||(shadow&&!b.shadow))continue;
   const slices=shadow?[{level:b.variants.length-1,start:0,count:b.activeCount}]:b.drawSlices;
   for(const slice of slices){if(!slice.count)continue;const r=b.variants[slice.level].resource;
    let g=groups.get(r);if(!g){g={resource:r,entries:[],count:0,slot:b.slot,material:b.material,group:b.group,kind:b.kind,settlement:!!b.settlement};groups.set(r,g);}
    g.entries.push({batch:b,slice});g.count+=slice.count;
   }
  }
  const result=[];
  for(const[r,info]of groups){
   let pair=this.renderGroups.get(r);if(!pair){pair=new Map();this.renderGroups.set(r,pair);}let g=pair.get(pass);
   if(!g){
    const buffer=gl.createBuffer(),vao=gl.createVertexArray();this.liveBuffers++;this.liveVAOs++;g={...info,buffer,vao,bytes:0,stamp:'',capacity:0,data:null};pair.set(pass,g);
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,r.vb);
    for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}
    for(const[loc,n,buf]of[[8,2,r.uv],[9,4,r.tangent]])if(buf){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0);}
    if(r.index)gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,r.index);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const[loc,n,off]of[[3,3,0],[4,1,12],[5,3,16],[6,1,28],[7,1,32]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,36,off);gl.vertexAttribDivisor(loc,1);}
    gl.bindVertexArray(null);
   }
   const stamp=this.origin.join(',')+'|'+info.entries.map(e=>e.batch.uid+':'+e.slice.start+':'+e.slice.count+':'+e.batch.dataRevision+':'+(shadow?0:e.batch.fadeRevision)).join('|');
   g.count=info.count;g.entries=info.entries;
   if(stamp!==g.stamp){
    g.stamp=stamp;gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);
    const required=2**Math.ceil(Math.log2(Math.max(8,g.count)));if(g.capacity!==required){const capacity=required,bytes=capacity*36;
     this.gpuBytes+=bytes-g.bytes;this.groupBytes+=bytes-g.bytes;g.bytes=bytes;g.capacity=capacity;g.data=new Float32Array(capacity*9);gl.bufferData(gl.ARRAY_BUFFER,bytes,gl.DYNAMIC_DRAW);}
    let k=0;for(const e of info.entries){const b=e.batch,off=this.offset(b);
     for(let j=e.slice.start;j<e.slice.start+e.slice.count;j++){
      const index=b.order[j],at=index*8,src=b.baseData;
      g.data[k++]=src[at]+off[0];g.data[k++]=src[at+1]+off[1];g.data[k++]=src[at+2]+off[2];
      for(let v=3;v<8;v++)g.data[k++]=src[at+v];g.data[k++]=shadow?1:b.fade?b.fade.values[index]:1;
     }
    }
    gl.bufferSubData(gl.ARRAY_BUFFER,0,g.data.subarray(0,k));this.groupUploads++;
   }
   result.push(g);
  }
  // Retire invisible render groups for this pass; logical chunk data remains untouched.
  for(const[r,pair]of this.renderGroups){if(!groups.has(r)&&pair.has(pass)){this.deleteGroup(pair.get(pass));pair.delete(pass);if(!pair.size)this.renderGroups.delete(r);}}
  return result;
 }
 drawMerged(g){
  const r=g.resource;gl.bindVertexArray(g.vao);
  if(r.index)gl.drawElementsInstanced(gl.TRIANGLES,r.indexCount,r.indexType,0,g.count);else gl.drawArraysInstanced(gl.TRIANGLES,0,r.vertexCount,g.count);
  return (r.indexCount||r.vertexCount)/3*g.count;
 }
 surfaceUniforms(b){
  this.groundUniforms417(b);
  if(state.lighting==='classic')return;
  const p=prototypes[b.slot],material=b.settlement?{type:5,params:[.86,1,0,0]}:describeSurface(p,b.kind,currentBiome().assetPack),u=this.u;
  gl.uniform4fv(u.uSurfaceParams,material.params);gl.uniform1f(u.uSurfaceType,material.type);
  gl.uniform3fv(u.uLocalMin,p?p.min:b.settlement?VILLAGE_GEOM_DATA.min:[0,0,0]);gl.uniform3fv(u.uLocalSize,p?p.size:b.settlement?VILLAGE_GEOM_DATA.max.map((v,i)=>v-VILLAGE_GEOM_DATA.min[i]):[1,1,1]);gl.uniform1f(u.uCrownY,p?.group===0?.68:.43);
 }
 setV4Uniforms(){
  this.setGroundUniforms417();
  const u=this.u;gl.uniform1f(u.uEnhanced,state.lighting==='classic'?0:state.lighting==='illustrated'?3:state.lighting==='african'?2:1);gl.uniform1f(u.uExposure,state.exposure);
  gl.uniform1f(u.uDetail,state.quality==='eco'?0:1);gl.uniform1f(u.uBiome,['savanna','grand_river','mangrove','volcanoes','canyons','desert'].indexOf(state.biome));
  gl.uniform1f(u.uContactOn,mode==='terrain'&&state.contact?1:0);gl.uniform4fv(u.uContactBounds,this.contactBounds);
  const art=ART416_PROFILES[state.biome]||ART416_PROFILES.savanna;
  gl.uniform3fv(u.uArtSun,art.sun);gl.uniform3fv(u.uArtShade,art.shade);gl.uniform3fv(u.uArtFoliage,art.foliage);
  gl.uniform4fv(u.uArtParams,art.params);gl.uniform4fv(u.uArtShape,art.shape);
  gl.uniform1f(u.uEnvYaw,state.skyYaw/360);
  for(const[unit,name,t]of[[5,'uEnvDay',this.envTextures[0]],[6,'uEnvNight',this.envTextures[1]],[7,'uContactMap',this.contactTexture]]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(u[name],unit);}
  gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.bindSampler(8,this.shadowSampler);gl.uniform1i(u.uShadowFiltered,8);
  gl.activeTexture(gl.TEXTURE0);
 }
 drawSceneV4(){
  let raw=0;const simple=[];
  for(const b of this.batches){if(!this.visible(b))continue;raw+=b.drawSlices.length;
   if(state.batching&&b.material&&!b.clip&&!b.lines)continue;simple.push(b);
  }
  // State sorting reduces texture binds: terrain, objects, liquids, debug lines.
  simple.sort((a,b)=>((a.lines?4:a.material?1:a.kind===1?2:0)-(b.lines?4:b.material?1:b.kind===1?2:0))||a.slot-b.slot);
  for(const b of simple){
   const off=this.offset(b);gl.uniform3fv(this.u.uChunkOffset,off);gl.uniform1f(this.u.uKind,b.kind);gl.uniform1f(this.u.uHighlight,b.slot===selected&&selected>=0?1:0);gl.uniform1f(this.u.uUnlit,b.unlit?1:0);
   gl.uniform1f(this.u.uClip,b.horizon?(b.noHorizonClip?0:2):b.clip?1:0);
   gl.uniform4fv(this.u.uBounds,b.horizon?world.manager.nearBounds.map((v,i)=>v-this.origin[i%2]):b.chunk?[off[0]-24,off[2]-24,off[0]+24,off[2]+24]:[-1e8,-1e8,1e8,1e8]);
   this.applyMaterial(b);this.surfaceUniforms(b);const d=this.drawBatch(b);this.draws+=d.draws;this.triangles+=d.triangles;
  }
  const merged=state.batching?this.mergedGroups(false):[];
  gl.uniform3f(this.u.uChunkOffset,0,0,0);gl.uniform1f(this.u.uClip,0);gl.uniform1f(this.u.uUnlit,0);
  for(const g of merged){gl.uniform1f(this.u.uKind,g.kind);gl.uniform1f(this.u.uHighlight,g.slot===selected&&selected>=0?1:0);this.applyMaterial(g);this.surfaceUniforms(g);this.triangles+=this.drawMerged(g);this.draws++;}
  this.performance.rawDraws=raw+this.skyPasses.length;this.performance.mainDraws=this.draws;this.performance.groups=merged.length;
 }
 drawShadowV4(){
  let count=0;
  for(const b of this.batches){if(!this.visible(b,true)||!b.shadow||b.lines)continue;
   if(state.batching&&b.material&&!b.clip)continue;
   gl.uniform3fv(this.dOffset,this.offset(b));count+=this.drawBatch(b,true).draws;
  }
  if(state.batching){gl.uniform3f(this.dOffset,0,0,0);for(const g of this.mergedGroups(true)){this.drawMerged(g);count++;}}
  this.performance.shadowDraws=count;
 }

 constructor(gl){
  this.gl=gl;this.batches=[];this.geometryCache=new WeakMap();this.gpuBytes=0;this.liveBuffers=0;this.liveVAOs=0;
  this.shadowDirty=true;this.shadowSize=1024;this.main=this.program(VS,FS);this.depth=this.program(DVS,DFS);this.sky=this.program(SKY_VS,SKY_FS);
  this.u={};for(const n of['uVP','uLightVP','uChunkOffset','uShadow','uLightDir','uBackground','uShadowOn','uTexel','uTime','uKind','uHighlight','uUnlit','uClip','uBounds','uWorldOrigin','uWaterScale','uNight','uNightLight','uAmplitude','uStrokeWidth','uHandmade','uPigment','uMotifs','uSeedOffset','uInk0','uInk1','uInk2','uInk3','uSurfaceLava','uVolcanicGlow','uCanyon','uDesert','uDesertWind','uBaseMap','uNormalMap','uORMMap','uTextured','uNormalStrength','uBaseFactor','uRoughnessFactor','uMetallicFactor','uCamera','uEnhanced','uExposure','uBiome','uSurfaceType','uSurfaceParams','uLocalMin','uLocalSize','uDetail','uEnvDay','uEnvNight','uEnvYaw','uContactMap','uContactBounds','uContactOn','uShadowFiltered','uCrownY','uArtSun','uArtShade','uArtFoliage','uArtParams','uArtShape','uGroundOn','uGroundStrength','uGroundMicro','uGroundMapped','uGroundMask','uGroundDetail','uGroundNormal','uGroundRect','uGroundUVOrigin','uGroundParams','uGroundARH','uGroundDebug','uGroundRelief','uGroundSoil','uGroundGrass'])this.u[n]=gl.getUniformLocation(this.main,n);
  this.du=gl.getUniformLocation(this.depth,'uLightVP');this.dOffset=gl.getUniformLocation(this.depth,'uChunkOffset');this.su={};for(const n of['uPanorama','uSkyYaw','uSkyExposure','uSkyOpacity','uSkySaturation','uSkyKind','uForward','uRight','uUp','uViewScale'])this.su[n]=gl.getUniformLocation(this.sky,n);
  this.skyVAO=gl.createVertexArray();this.lightDir=norm([-.82,.52,.31]);this.bg=hex('#ccd5bf');this.origin=[0,0];this.skyTextures=[];this.textureBytes=0;this.skyInfo=[];
  this.initShadow();gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);this.view={x:0,y:0,w:1,h:1};this.vp=null;this.draws=0;this.triangles=0;this.lastShadowFocus=null;this.obstructionStats={hidden:0,fading:0,affected:0};this.instanceVisibility=new Map();this.lastVisibilityTime=0;this.skyPasses=[];
  this.initV4();this.defaultTextures=[];for(const c of[[255,255,255,255],[128,128,255,255],[255,220,0,255]]){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(c));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);this.defaultTextures.push(t);}
 }
 shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const err=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('Error de shader: '+err);}return s;}
 program(v,f){const p=gl.createProgram(),vs=this.shader(gl.VERTEX_SHADER,v),fs=this.shader(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const err=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error('Error de programa WebGL: '+err);}return p;}
 loadSkies(){
  for(const id of['sky-day-data','sky-night-data']){const node=$(id),data=decodeRadiance(node.textContent),tex=gl.createTexture();this.installEnvironment(data,this.skyTextures.length);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,data.width,data.height,0,gl.RGBA,gl.UNSIGNED_BYTE,data.pixels);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.skyTextures.push(tex);this.textureBytes+=data.pixels.byteLength;this.skyInfo.push({name:node.dataset.name,width:data.width,height:data.height,encoding:'RGBE8, filtrado en radiancia',exposure:SKY_EXPOSURES[this.skyInfo.length],unlit:true});node.remove();}
 }
 initShadow(){
  if(this.shadowTex)gl.deleteTexture(this.shadowTex);if(this.shadowFbo)gl.deleteFramebuffer(this.shadowFbo);
  this.shadowTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.shadowFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);this.shadowOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.shadowDirty=true;
 }
 acquireGeometry(geometry){
  let r=this.geometryCache.get(geometry);if(r){r.refs++;return r;}
  const source=geometry.v||geometry,data=source instanceof Float32Array?source:new Float32Array(source);
  const buffers=[],upload=(target,data)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);buffers.push(b);this.liveBuffers++;this.gpuBytes+=data.byteLength;return b;};
  r={vb:upload(gl.ARRAY_BUFFER,data),uv:null,tangent:null,index:null,bytes:data.byteLength,vertexCount:data.length/9,indexCount:0,indexType:gl.UNSIGNED_SHORT,refs:1,geometry,buffers,material:geometry.material||null};
  if(geometry.uv){r.uv=upload(gl.ARRAY_BUFFER,geometry.uv);r.bytes+=geometry.uv.byteLength;}
  if(geometry.tangent){r.tangent=upload(gl.ARRAY_BUFFER,geometry.tangent);r.bytes+=geometry.tangent.byteLength;}
  if(geometry.index){r.index=upload(gl.ELEMENT_ARRAY_BUFFER,geometry.index);r.bytes+=geometry.index.byteLength;r.indexCount=geometry.index.length;r.indexType=geometry.index instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;}
  this.geometryCache.set(geometry,r);return r;
 }
 releaseGeometry(r){if(--r.refs===0){this.releaseResourceGroups(r);for(const buffer of r.buffers){gl.deleteBuffer(buffer);this.liveBuffers--;}this.gpuBytes-=r.bytes;this.geometryCache.delete(r.geometry);r.geometry=null;}}
 makeBatch(geometry,instances=[{x:0,y:0,z:0,yaw:0,sx:1,sy:1,sz:1,tint:1}],opts={}){
  if(!opts.lines&&!geometry.material)geometry=compactStaticMesh(geometry);
  const arr=geometry.v||geometry;if(!arr.length||!instances.length)return null;
  const data=new Float32Array(instances.length*8);let k=0;
  for(const p of instances){data[k++]=p.x;data[k++]=p.y;data[k++]=p.z;data[k++]=p.yaw||0;data[k++]=p.sx??1;data[k++]=p.sy??1;data[k++]=p.sz??1;data[k++]=p.tint??1;}
  const ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ib);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);this.gpuBytes+=data.byteLength;this.liveBuffers++;
  const b={uid:++this.batchSerial,dataRevision:0,fadeRevision:0,ib,instanceBytes:data.byteLength,visibilityBytes:0,count:instances.length,activeCount:instances.length,slot:-1,group:-1,kind:0,shadow:true,unlit:false,lines:false,only:null,chunk:null,fade:null,variants:[],instances,baseData:data,orderedData:new Float32Array(data.length),order:Uint32Array.from(instances,(_,i)=>i),drawSlices:[{level:0,start:0,count:instances.length}],lodKey:null,...opts};
  const p=prototypes[b.slot];
  if(p&&b.slot!==19&&b.kind===0&&!b.lines&&(p.group??SLOTS[b.slot].g)!==2&&p.size[1]>.72){
   const values=new Float32Array(instances.length).fill(1),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.DYNAMIC_DRAW);b.fade={values,buffer,records:instances.map(a=>obstructionRecord(a,p)),upload:new Float32Array(values.length),fresh:true};b.visibilityBytes=values.byteLength;this.gpuBytes+=values.byteLength;this.liveBuffers++;
  }
  const levels=geometry.levels||[geometry];
  for(const g of levels){gl.bindVertexArray(null);const resource=this.acquireGeometry(g),vao=gl.createVertexArray();this.liveVAOs++;gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,resource.vb);
   for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}
   for(const[loc,size,buffer]of[[8,2,resource.uv],[9,4,resource.tangent]]){if(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);}else{gl.disableVertexAttribArray(loc);if(loc===8)gl.vertexAttrib2f(loc,0,0);else gl.vertexAttrib4f(loc,1,0,0,1);}}
   if(resource.index)gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,resource.index);
   b.variants.push({resource,vao});
  }
  b.resource=b.variants[0].resource;b.vao=b.variants[0].vao;b.vertexCount=b.resource.indexCount||b.resource.vertexCount;b.material=b.resource.material;
  if(b.material&&b.group===2)b.shadow=false;
  gl.bindVertexArray(null);this.batches.push(b);return b;
 }
 disposeBatch(b){
  if(!b||b.disposed)return;b.disposed=true;
  if(b.groundTexture){gl.deleteTexture(b.groundTexture);this.groundMapBytes-=b.groundBytes;this.groundMapCount--;b.groundTexture=null;}
  if(b.fade){gl.deleteBuffer(b.fade.buffer);this.gpuBytes-=b.visibilityBytes;this.liveBuffers--;for(const r of b.fade.records)this.instanceVisibility.delete(r.id);b.fade=null;}
  gl.deleteBuffer(b.ib);this.gpuBytes-=b.instanceBytes;this.liveBuffers--;
  for(const v of b.variants){gl.deleteVertexArray(v.vao);this.liveVAOs--;this.releaseGeometry(v.resource);}b.variants.length=0;b.instances=null;b.baseData=null;b.orderedData=null;b.order=null;
 }
 updateAssetLods(cam){
  const key=Math.round(cam.eye[0]/1.5)+','+Math.round(cam.eye[1]/1.5)+','+Math.round(cam.eye[2]/1.5)+':'+state.quality+':'+state.assetLOD+':'+mode;
  for(const b of this.batches){
   if(b.disposed||b.variants.length<2)continue;
   const stamp=key+':'+(b.chunk?.visible!==false);if(b.lodKey===stamp)continue;b.lodKey=stamp;
   const bins=[[],[],[]],offX=b.chunk?b.chunk.cx*48:0,offZ=b.chunk?b.chunk.cz*48:0,p=prototypes[b.slot],q=state.quality==='eco'?.80:state.quality==='high'?1.25:1;
   for(let i=0;i<b.instances.length;i++){
    const a=b.instances[i];let level=0;
    if(mode==='terrain'&&state.assetLOD){
     const radius=Math.max(p.size[0]*a.sx,p.size[2]*a.sz)*.25;
     const d=Math.max(0,Math.hypot(a.x+offX-cam.eye[0],a.y+p.centerY*a.sy-cam.eye[1],a.z+offZ-cam.eye[2])-radius);
     const ranges=p.role==='formation'?[50,105,10000]:b.group===2?[10,25,64]:b.group===1?[16,38,95]:b.group===4?[17,42,110]:b.group===0?[38,85,10000]:b.group===5?[35,75,10000]:[24,55,160];
     if(d>ranges[2]*q)continue;level=d<ranges[0]*q?0:d<ranges[1]*q?1:2;
    }
    bins[Math.min(level,b.variants.length-1)].push(i);
   }
   const order=bins.flat(),slices=[];let start=0;for(let level=0;level<3;level++){if(bins[level].length)slices.push({level:Math.min(level,b.variants.length-1),start,count:bins[level].length});start+=bins[level].length;}
   let changed=b.activeCount!==order.length||b.drawSlices.length!==slices.length||slices.some((s,i)=>b.drawSlices[i]?.count!==s.count||b.drawSlices[i]?.level!==s.level);
   if(!changed)for(let i=0;i<order.length;i++)if(b.order[i]!==order[i]){changed=true;break;}
   if(!changed)continue;
   b.activeCount=order.length;b.drawSlices=slices;
   for(let i=0;i<order.length;i++){b.order[i]=order[i];b.orderedData.set(b.baseData.subarray(order[i]*8,order[i]*8+8),i*8);}
   gl.bindBuffer(gl.ARRAY_BUFFER,b.ib);if(order.length)gl.bufferSubData(gl.ARRAY_BUFFER,0,b.orderedData.subarray(0,order.length*8));
   b.dataRevision++;b.orderChanged=true;this.shadowDirty=true;
  }
 }
 bindInstances(b,start){
  gl.bindBuffer(gl.ARRAY_BUFFER,b.ib);
  for(const[loc,size,off]of[[3,3,0],[4,1,12],[5,3,16],[6,1,28]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,start*32+off);gl.vertexAttribDivisor(loc,1);}
  if(b.fade){gl.bindBuffer(gl.ARRAY_BUFFER,b.fade.buffer);gl.enableVertexAttribArray(7);gl.vertexAttribPointer(7,1,gl.FLOAT,false,4,start*4);gl.vertexAttribDivisor(7,1);}else{gl.disableVertexAttribArray(7);gl.vertexAttrib1f(7,1);gl.vertexAttribDivisor(7,0);}
 }
 drawBatch(b,shadow=false){
  let draws=0,triangles=0;
  const slices=shadow&&b.variants.length>1?[{level:b.variants.length-1,start:0,count:b.activeCount}]:b.drawSlices;
  for(const s of slices){if(!s.count)continue;const v=b.variants[s.level],r=v.resource;gl.bindVertexArray(v.vao);this.bindInstances(b,s.start);
   if(r.index)gl.drawElementsInstanced(gl.TRIANGLES,r.indexCount,r.indexType,0,s.count);else gl.drawArraysInstanced(b.lines?gl.LINES:gl.TRIANGLES,0,r.vertexCount,s.count);
   draws++;if(!b.lines)triangles+=(r.indexCount||r.vertexCount)/3*s.count;
  }return{draws,triangles};
 }
 applyMaterial(b){
  const m=b.material||null;if(this.boundAssetMaterial===m)return;this.boundAssetMaterial=m;
  gl.uniform1f(this.u.uVolcanicGlow,m?.volcanicGlow||0);gl.uniform1f(this.u.uTextured,m?1:0);gl.uniform1f(this.u.uNormalStrength,m?m.normalScale??.6:0);gl.uniform1f(this.u.uMetallicFactor,m?m.metallicFactor??1:0);gl.uniform1f(this.u.uRoughnessFactor,m?m.roughnessFactor??1:1);
  if(m){gl.uniform4fv(this.u.uBaseFactor,m.baseColorFactor||[1,1,1,1]);for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE2+i);gl.bindTexture(gl.TEXTURE_2D,m.textures[i]);}gl.activeTexture(gl.TEXTURE0);}
 }

 compact(){this.batches=this.batches.filter(b=>!b.disposed);this.shadowDirty=true;}
 clear(){this.discardGroups();this.contactKey='';for(const b of this.batches)this.disposeBatch(b);this.batches=[];this.instanceVisibility.clear();this.obstructionStats={hidden:0,fading:0,affected:0};this.shadowDirty=true;}
 visible(b,shadows=false){if(b.disposed)return false;if(b.group>=0&&!state.layers[b.group])return false;if(b.only==='grid'&&!state.grid)return false;if(b.only==='wire'&&!state.wire)return false;if(b.chunk&&!shadows&&!b.chunk.visible)return false;return true;}
 offset(b){return b.chunk?[b.chunk.cx*48-this.origin[0],0,b.chunk.cz*48-this.origin[1]]:[-this.origin[0],0,-this.origin[1]];}
 updateLight(size=130,target=[0,0,0]){const r=size*.5,e=add(target,mul(this.lightDir,size*1.6));this.lightVP=mm(ortho(-r,r,-r,r,.1,size*3.6),lookAt(e,target));this.shadowDirty=true;}

 resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,state.quality==='eco'?1:state.quality==='normal'?1.5:2),cap=Math.min(1,Math.sqrt(2600000/Math.max(1,rect.width*rect.height*dpr*dpr))),actual=dpr*cap,w=Math.max(1,Math.round(rect.width*actual)),h=Math.max(1,Math.round(rect.height*actual));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}let vw=w,vh=h,vy=0;if(mode==='catalog'){if(rect.width>700)vw=Math.round((rect.width-250)*actual);else if(rect.width>440)vw=Math.round((rect.width-218)*actual);else{vy=Math.round(170*actual);vh=h-vy;}}this.view={x:0,y:vy,w:Math.max(1,vw),h:Math.max(1,vh),dpr:actual,cssW:rect.width,cssH:rect.height};return this.view;}
 updateObstructions(camera,snap=false){
  const now=performance.now(),dt=this.lastVisibilityTime?clamp((now-this.lastVisibilityTime)/1000,0,.12):.016;this.lastVisibilityTime=now;
  const enabled=state.autoHide&&mode==='terrain',v=this.view;
  const frame=obstructionFrame(camera.eye,camera.target,camera.fov,v.w/v.h,state.hideDistance);
  const stats={hidden:0,fading:0,affected:0};this.instanceVisibility.clear();
  for(const b of this.batches){
   if(b.disposed||!b.fade)continue;const fade=b.fade;
   const visible=this.visible(b),ox=b.chunk?b.chunk.cx*48:0,oz=b.chunk?b.chunk.cz*48:0;let dirty=false;
   for(let i=0;i<fade.records.length;i++){
    const desired=enabled&&visible?obstructionVisibility(fade.records[i],frame,ox,oz):1;
    const old=fade.values[i],rate=desired<old?16:7;
    let value=(snap||fade.fresh||!visible||mode==='catalog')?desired:mix(old,desired,1-Math.exp(-dt*rate));
    if(Math.abs(value-desired)<.008)value=desired;if(value<.002)value=0;if(value>.998)value=1;
    if(Math.abs(value-old)>.0001){fade.values[i]=value;dirty=true;}
    if(visible&&value<.999){stats.affected++;if(value<.002)stats.hidden++;else stats.fading++;this.instanceVisibility.set(fade.records[i].id,value);}
   }
   fade.fresh=false;
   if(dirty||b.orderChanged){b.fadeRevision++;for(let i=0;i<b.activeCount;i++)fade.upload[i]=fade.values[b.order[i]];gl.bindBuffer(gl.ARRAY_BUFFER,fade.buffer);if(b.activeCount)gl.bufferSubData(gl.ARRAY_BUFFER,0,fade.upload.subarray(0,b.activeCount));b.orderChanged=false;}
  }
  this.obstructionStats=stats;
 }
 drawSky(camera,v){
  gl.useProgram(this.sky);
  const f=norm(sub(camera.target,camera.eye)),r=norm(cross(f,[0,1,0])),up=cross(r,f),u=this.su;
  gl.uniform3fv(u.uForward,f);gl.uniform3fv(u.uRight,r);gl.uniform3fv(u.uUp,up);
  const tan=Math.tan(camera.fov/2);gl.uniform2f(u.uViewScale,tan*v.w/v.h,tan);
  gl.uniform1f(u.uSkyYaw,state.skyYaw/360);gl.uniform1i(u.uPanorama,1);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.BLEND);gl.bindVertexArray(this.skyVAO);
  const t=clamp(atmosphere.night,0,1);this.skyPasses=[];
  const draw=(index,opacity)=>{
   // Explicit bind immediately before each draw. Only one sky sampler exists.
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.skyTextures[index]);
   gl.uniform1f(u.uSkyExposure,SKY_EXPOSURES[index]);gl.uniform1f(u.uSkyOpacity,opacity);gl.uniform1f(u.uSkySaturation,index===0?1.28:1.10);gl.uniform1f(u.uSkyKind,index);
   gl.drawArrays(gl.TRIANGLES,0,3);this.skyPasses.push({panorama:index===0?'day':'night',opacity});
  };
  if(t<1)draw(0,1);
  if(t>0){
   if(t<1){gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}
   draw(1,t===1?1:t);
  }
  gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.activeTexture(gl.TEXTURE0);
  return this.skyPasses.length;
 }
 render(camera,time){
  const renderStarted=performance.now();this.groupUploads=0;const v=this.resize();if(this.skyTextures.length!==2)return;
  const terrain=mode==='terrain';this.origin=terrain&&world?world.manager.origin:[0,0];
  const eye=[camera.eye[0]-this.origin[0],camera.eye[1],camera.eye[2]-this.origin[1]],target=[camera.target[0]-this.origin[0],camera.target[1],camera.target[2]-this.origin[1]];
  const lightFocus=terrain?[Math.round(target[0]/8)*8,0,Math.round(target[2]/8)*8]:[0,0,0];
  const key=lightFocus.join(',')+':'+this.origin.join(',')+':'+mode;
  if(this.lastShadowFocus!==key){this.lastShadowFocus=key;this.updateLight(terrain?150:195,lightFocus);}
  const proj=perspective(camera.fov,v.w/v.h,.15,terrain?500:2500);this.vp=mm(proj,lookAt(eye,target));
  if(terrain&&world)world.manager.cull(this.vp,this.origin);
  this.updateAssetLods(camera);this.updateObstructions(camera);if(state.lighting!=='classic'&&state.contact)this.prepareContacts();
  const doShadow=state.shadows&&this.shadowOK;
  if(this.shadowDirty&&doShadow){gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFbo);gl.viewport(0,0,this.shadowSize,this.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.depth);gl.uniformMatrix4fv(this.du,false,this.lightVP);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);this.drawShadowV4();gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.shadowDirty=false;}
  gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(...this.bg,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.viewport(v.x,v.y,v.w,v.h);
  const skyDraws=this.drawSky(camera,v);
  gl.useProgram(this.main);this.boundAssetMaterial=undefined;this.setV4Uniforms();
  for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE2+i);gl.bindTexture(gl.TEXTURE_2D,this.defaultTextures[i]);}gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(this.u.uBaseMap,2);gl.uniform1i(this.u.uNormalMap,3);gl.uniform1i(this.u.uORMMap,4);gl.uniform3fv(this.u.uCamera,eye);
  gl.uniform1f(this.u.uNight,atmosphere.night);gl.uniform1f(this.u.uNightLight,state.nightLight);gl.uniformMatrix4fv(this.u.uVP,false,this.vp);gl.uniformMatrix4fv(this.u.uLightVP,false,this.lightVP);gl.uniform3fv(this.u.uLightDir,this.lightDir);gl.uniform3fv(this.u.uBackground,this.bg);gl.uniform1f(this.u.uShadowOn,doShadow?1:0);gl.uniform1f(this.u.uTexel,1/this.shadowSize);gl.uniform1f(this.u.uTime,time);gl.uniform2f(this.u.uWorldOrigin,this.origin[0],this.origin[1]);
  gl.uniform1f(this.u.uCanyon,currentBiome().assetPack==='canyons'?1:0);gl.uniform1f(this.u.uDesert,currentBiome().assetPack==='desert'?1:0);const desertAngle=world?.field.desertWind||0;gl.uniform2f(this.u.uDesertWind,Math.cos(desertAngle),Math.sin(desertAngle));gl.uniform1f(this.u.uSurfaceLava,currentBiome().fluid==='lava'?1:0);gl.uniform1f(this.u.uWaterScale,state.waterScale);gl.uniform1f(this.u.uAmplitude,.72);gl.uniform1f(this.u.uStrokeWidth,1.08);gl.uniform1f(this.u.uHandmade,.52);gl.uniform1f(this.u.uPigment,0);gl.uniform1f(this.u.uMotifs,0);const seed=world?.field.seed||42;gl.uniform2f(this.u.uSeedOffset,(seed%1031)*.031,((seed>>>12)%937)*.037);
  const water=hex(currentBiome().colors.water),deep=cmix(water,hex('#157986'),.28),mid=cmix(water,hex('#38bcc5'),.42),light=cmix(mid,hex('#7fe3d6'),.36),foam=cmix(light,hex('#f0f2d7'),.58),inks=currentBiome().fluid==='lava'?[hex('#421d16'),hex('#b43d0b'),water,hex('#ffe284')]:[deep,mid,light,foam];for(let i=0;i<4;i++)gl.uniform3fv(this.u['uInk'+i],inks[i]);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.uniform1i(this.u.uShadow,0);this.draws=skyDraws;this.triangles=skyDraws;
  this.drawSceneV4();this.performance.uploads=this.groupUploads;this.performance.cpuMs=performance.now()-renderStarted;
  gl.bindVertexArray(null);
 }
 project(p){if(!this.vp)return null;const q=[p[0]-this.origin[0],p[1],p[2]-this.origin[1]],a=transform4(this.vp,q);if(a[3]<=0)return null;const v=this.view;return{x:(v.x+(a[0]/a[3]*.5+.5)*v.w)/v.dpr,y:(canvas.height-v.y-(a[1]/a[3]*.5+.5)*v.h)/v.dpr,z:a[2]/a[3]};}
}

// ===== Infinite, deterministic chunk construction. No finite diorama walls/floor. =====
function biomeFrom(c){const b=BIOMES[c.biome];return{...b,colors:{...b.colors,...(c.palette[c.biome]||{})}};}
function chunkBounds(cx,cz){return{minX:cx*48-24,minZ:cz*48-24,maxX:cx*48+24,maxZ:cz*48+24,size:48,centerX:cx*48,centerZ:cz*48};}
function groundColor(field,b,x,z){
 if(field.desert)return desertGroundColor(field,b,x,z);
 if(field.canyon)return canyonGroundColor(field,b,x,z);
 const soil=hex(b.colors.soil),grass=hex(b.colors.grass),rock=hex(b.colors.rock),p=fbm(x*.041,z*.041,field.seed^8913),s=field.slope(x,z);
 let t=smooth(.28,.72,p);if(b.style===1)t=clamp(t*.75+.25,0,1);if(b.style===2)t*=.48;
 let col=cmix(soil,grass,t);if(s>.42)col=cmix(col,rock,smooth(.42,1.4,s)*.62);
 if(field.riverActive){const d=Math.abs(x-field.riverX(z));col=cmix(col,cmix(soil,hex(b.fluid==='lava'?'#4f3932':'#d2ba87'),.34),(1-smooth(6,10,d))*.58);col=cmix(col,cmix(hex(b.colors.water),hex(b.fluid==='lava'?'#51443b':'#c8cb93'),.76),(1-smooth(9,13,d))*.18);}
 if(field.wetland){const info=field.waterInfo(x,z),wetMud=cmix(soil,hex('#2b241f'),.74),peat=cmix(wetMud,hex('#43563a'),.28),moss=cmix(peat,grass,.18);col=cmix(col,wetMud,(1-smooth(0,24,info.shore))*.84);col=cmix(col,moss,(1-smooth(0,11,info.shore))*.46);if(info.inside)col=cmix(col,cmix(wetMud,hex(b.colors.water),.14),.52);} 
 if(field.canyon){const d=Math.abs(x-field.riverX(z));const warm=cmix(soil,rock,.46),shadow=cmix(rock,hex('#6c3d27'),.34),riparian=cmix(soil,grass,.28);col=cmix(col,warm,(1-smooth(8,22,d))*.58);col=cmix(col,shadow,smooth(.55,1.9,s)*.55);col=cmix(col,riparian,(1-smooth(4,11,d))*clamp(field.moisture(x,z)*1.18,0,.55));}
 return shade(col,.94+noise(x*.11,z*.11,field.seed^1181)*.12);
}
function buildChunkData(config,b,cx,cz){
 const started=performance.now(),field=new TerrainField(config),bo=chunkBounds(cx,cz),g=new Geometry(),grid=new Geometry(),wire=new Geometry(),water=new Geometry();
 const points=[],colors=[];
 for(let iz=0;iz<=48;iz++)for(let ix=0;ix<=48;ix++){
  const x=bo.minX+ix,z=bo.minZ+iz;points.push([ix-24,field.lattice(x,z),iz-24]);colors.push(groundColor(field,b,x,z));
 }
 const wireColor=hex('#3e5141');
 for(let iz=0;iz<48;iz++)for(let ix=0;ix<48;ix++){
  const a=iz*49+ix,bb=a+1,d=a+49,c=d+1;
  g.tri(points[a],points[d],points[bb],colors[a],[colors[a],colors[d],colors[bb]]);
  g.tri(points[bb],points[d],points[c],colors[c],[colors[bb],colors[d],colors[c]]);
  for(const[k,l]of[[a,bb],[a,d],[bb,d]]){const p=[...points[k]],q=[...points[l]];p[1]+=.035;q[1]+=.035;wire.line(p,q,wireColor);}
 }
 const edges={west:[],east:[],north:[],south:[]};
 for(let i=0;i<=48;i++){edges.west.push(Math.fround(points[i*49][1]));edges.east.push(Math.fround(points[i*49+48][1]));edges.north.push(Math.fround(points[i][1]));edges.south.push(Math.fround(points[2352+i][1]));}
 // Draw only two sides of a shared boundary, eliminating duplicate lines.
 for(let i=0;i<48;i++)for(const[k,l]of[[i,i+1],[i*49,(i+1)*49]]){const p=[...points[k]],q=[...points[l]];p[1]+=.08;q[1]+=.08;grid.line(p,q,hex('#ebf2b5'));}
 if(field.riverActive){const color=hex(b.colors.water);
  for(let z=bo.minZ;z<bo.maxZ;z++){
   const z1=z+1,x0=field.riverX(z),x1=field.riverX(z1),w0=field.canyon?canyonFrame(field,z).waterHalf+1.2:10,w1=field.canyon?canyonFrame(field,z1).waterHalf+1.2:10,l0=clamp(x0-w0,bo.minX,bo.maxX),r0=clamp(x0+w0,bo.minX,bo.maxX),l1=clamp(x1-w1,bo.minX,bo.maxX),r1=clamp(x1+w1,bo.minX,bo.maxX);
   if(r0<=l0&&r1<=l1)continue;
   const y=field.riverLevel,a=[l0-bo.centerX,y,z-bo.centerZ],bb=[r0-bo.centerX,y,z-bo.centerZ],c=[r1-bo.centerX,y,z1-bo.centerZ],d=[l1-bo.centerX,y,z1-bo.centerZ];water.tri(a,d,bb,color);water.tri(bb,d,c,color);
  }
 }
 if(field.wetland)buildWetlandWater(field,bo,b,water);

 smoothTerrainLighting(field,g.v,bo.centerX,bo.centerZ);
 if(field.desert)desertSmoothNormals(field,g.v,bo.centerX,bo.centerZ);
 const data=scatterWorld({...config,bounds:bo},b,field);
 return{cx,cz,bounds:bo,terrain:new Float32Array(g.v),water:new Float32Array(water.v),grid:new Float32Array(grid.v),wire:new Float32Array(wire.v),edges,groundMask:buildGroundMask417(config,b,field,bo),instances:data.instances,signature:fingerprint(data.instances),terrainSignature:terrainFingerprint(field,bo),ms:performance.now()-started};
}
function makeChunkWorker(){
 if(typeof Worker==='undefined')return null;
 const funcs={settlementBlend410,groundWear417,groundSample417,buildGroundMask417,findSettlementSite,settlementInfluence,smoothTerrainLighting,buildWetlandWater,desertSample,desertHeight,desertGroundColor,desertSmoothNormals,scatterDesert,canyonFrame,canyonHeight,canyonGroundColor,scatterCanyon,clamp,mix,smooth,add,sub,mul,dot,cross,norm,hex,cmix,shade,hashString,avalanche,hashCell,rand,noise,fbm,num,weighted,boundsFor,scatterWorld,fingerprint,terrainFingerprint,chunkBounds,groundColor,buildChunkData};
 let code="'use strict';const TAU=Math.PI*2;const GROUPS="+JSON.stringify(GROUPS)+';const SLOTS='+JSON.stringify(SLOTS)+';\n';
 for(const[name,fn]of Object.entries(funcs))code+='const '+name+'='+fn.toString()+';\n';
 code+=Geometry.toString()+'\n'+TerrainField.toString()+`\nself.onmessage=function(e){const m=e.data;try{const d=buildChunkData(m.config,m.biome,m.cx,m.cz);self.postMessage({id:m.id,epoch:m.epoch,data:d},[d.terrain.buffer,d.water.buffer,d.grid.buffer,d.wire.buffer,d.groundMask.buffer]);}catch(error){self.postMessage({id:m.id,epoch:m.epoch,error:String(error.stack||error)});}};`;
 let url;try{url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const worker=new Worker(url);URL.revokeObjectURL(url);return worker;}catch(error){if(url)URL.revokeObjectURL(url);console.warn('Worker no disponible; se usará generación incremental local.',error);return null;}
}

function makeCanyonHorizon(config,b,cx,cz,near){
 const field=new TerrainField(config),g=new Geometry(),water=new Geometry(),ox=cx*48,oz=cz*48,R=384,dx=4,dz=8;
 const cols=2*R/dx,rows=2*R/dz,pts=[],colors=[];
 const point=(x,z)=>[x-ox,field.height(x,z),z-oz];
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const x=ox-R+i*dx,z=oz-R+j*dz;pts.push(point(x,z));colors.push(canyonGroundColor(field,b,x,z));
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=ox-R+i*dx,z=oz-R+j*dz;
  if(x>=near[0]&&z>=near[1]&&x+dx<=near[2]&&z+dz<=near[3])continue;
  const a=j*(cols+1)+i,bb=a+1,d=a+cols+1,c=d+1;
  const touches=((x+dx===near[0]||x===near[2])&&z>=near[1]&&z+dz<=near[3])||((z+dz===near[1]||z===near[3])&&x>=near[0]&&x+dx<=near[2]);
  if(touches){
   // The inner edge has the EXACT 1m lattice of the resident chunks. A fan joins
   // it to the coarser outer mesh, so no T-junction cracks or floating triangles.
   const corners=[[x,z],[x,z+dz],[x+dx,z+dz],[x+dx,z]],ring=[];
   for(let k=0;k<4;k++){
    const p=corners[k],q=corners[(k+1)%4];
    const edge=(p[0]===q[0]&&(p[0]===near[0]||p[0]===near[2])&&p[1]>=near[1]&&q[1]>=near[1]&&p[1]<=near[3]&&q[1]<=near[3])||(p[1]===q[1]&&(p[1]===near[1]||p[1]===near[3])&&p[0]>=near[0]&&q[0]>=near[0]&&p[0]<=near[2]&&q[0]<=near[2]);
    const steps=edge?Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1]):1;
    for(let t=0;t<steps;t++)ring.push([mix(p[0],q[0],t/steps),mix(p[1],q[1],t/steps)]);
   }
   const center=point(x+dx*.5,z+dz*.5),col=canyonGroundColor(field,b,x+dx*.5,z+dz*.5);
   for(let k=0;k<ring.length;k++){const p=ring[k],q=ring[(k+1)%ring.length];g.tri(center,point(...p),point(...q),col,[col,canyonGroundColor(field,b,...p),canyonGroundColor(field,b,...q)]);}
  }else{
   g.tri(pts[a],pts[d],pts[bb],colors[a],[colors[a],colors[d],colors[bb]]);
   g.tri(pts[bb],pts[d],pts[c],colors[c],[colors[bb],colors[d],colors[c]]);
  }
 }
 if(config.river)for(let z=oz-R;z<oz+R;z++){
  const z1=z+1,x=field.riverX(z),x1=field.riverX(z1),w=canyonFrame(field,z).waterHalf+1.2,w1=canyonFrame(field,z1).waterHalf+1.2,y=field.riverLevel,co=hex(b.colors.water);
  const a=[x-w-ox,y,z-oz],bb=[x+w-ox,y,z-oz],d=[x1-w1-ox,y,z1-oz],c=[x1+w1-ox,y,z1-oz];water.tri(a,d,bb,co);water.tri(bb,d,c,co);
 }
 return {terrain:new Float32Array(g.v),water:new Float32Array(water.v)};
}

function makeDesertHorizon(config,b,cx,cz,near){
 const field=new TerrainField(config),g=new Geometry(),water=new Geometry(),ox=cx*48,oz=cz*48,R=576,dx=8,dz=8;
 const cols=2*R/dx,rows=2*R/dz,pts=[],colors=[];
 const point=(x,z)=>[x-ox,field.height(x,z),z-oz];
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const x=ox-R+i*dx,z=oz-R+j*dz;pts.push(point(x,z));colors.push(desertGroundColor(field,b,x,z));
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=ox-R+i*dx,z=oz-R+j*dz;
  if(x>=near[0]&&z>=near[1]&&x+dx<=near[2]&&z+dz<=near[3])continue;
  const a=j*(cols+1)+i,bb=a+1,d=a+cols+1,c=d+1;
  const touches=((x+dx===near[0]||x===near[2])&&z>=near[1]&&z+dz<=near[3])||((z+dz===near[1]||z===near[3])&&x>=near[0]&&x+dx<=near[2]);
  if(touches){
   // The inner edge has the EXACT 1m lattice of the resident chunks. A fan joins
   // it to the coarser outer mesh, so no T-junction cracks or floating triangles.
   const corners=[[x,z],[x,z+dz],[x+dx,z+dz],[x+dx,z]],ring=[];
   for(let k=0;k<4;k++){
    const p=corners[k],q=corners[(k+1)%4];
    const edge=(p[0]===q[0]&&(p[0]===near[0]||p[0]===near[2])&&p[1]>=near[1]&&q[1]>=near[1]&&p[1]<=near[3]&&q[1]<=near[3])||(p[1]===q[1]&&(p[1]===near[1]||p[1]===near[3])&&p[0]>=near[0]&&q[0]>=near[0]&&p[0]<=near[2]&&q[0]<=near[2]);
    const steps=edge?Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1]):1;
    for(let t=0;t<steps;t++)ring.push([mix(p[0],q[0],t/steps),mix(p[1],q[1],t/steps)]);
   }
   const center=point(x+dx*.5,z+dz*.5),col=desertGroundColor(field,b,x+dx*.5,z+dz*.5);
   for(let k=0;k<ring.length;k++){const p=ring[k],q=ring[(k+1)%ring.length];g.tri(center,point(...p),point(...q),col,[col,desertGroundColor(field,b,...p),desertGroundColor(field,b,...q)]);}
  }else{
   g.tri(pts[a],pts[d],pts[bb],colors[a],[colors[a],colors[d],colors[bb]]);
   g.tri(pts[bb],pts[d],pts[c],colors[c],[colors[bb],colors[d],colors[c]]);
  }
 }

 // A narrow subsurface apron covers raster precision cracks at the fine/coarse seam.
 // It sits UNDER both meshes; it changes neither dune height nor object placement.
 const apron=(axis,value,from,to)=>{
  const p=(t,offset)=>{const x=axis===0?value+offset:t,z=axis===0?t:value+offset;return[x-ox,field.height(x,z)-.012,z-oz];};
  for(let t=from;t<to;t++){
   const a=p(t,-.10),b=p(t,.10),c=p(t+1,.10),d=p(t+1,-.10);
   const col=desertGroundColor(field,bBiome,axis===0?value:t,axis===0?t:value);
   g.tri(a,b,d,col);g.tri(b,c,d,col);
  }
 };
 const bBiome=b;
 apron(0,near[0],near[1],near[3]);apron(0,near[2],near[1],near[3]);
 apron(1,near[1],near[0],near[2]);apron(1,near[3],near[0],near[2]);
 desertSmoothNormals(field,g.v,ox,oz);
 return {terrain:new Float32Array(g.v),water:new Float32Array(water.v)};
}

class ChunkManager{
 constructor(config,biome){
  this.config=config;this.biome=biome;this.chunks=new Map();this.queue=[];this.desired=new Map();this.origin=[0,0];this.center=null;this.busy=null;this.serial=0;this.epoch=0;this.created=0;this.released=0;this.discarded=0;this.active=true;this.dead=false;this.dirty=true;this.visibleCount=0;this.initial=true;
  this.worker=makeChunkWorker();if(this.worker){this.worker.onmessage=e=>this.receive(e.data);this.worker.onerror=e=>{console.warn('Se activa el modo local de generación.',e.message);this.worker.terminate();this.worker=null;this.busy=null;this.center=null;};}
 }
 updateHorizon(cx,cz){
  if(!['canyons','desert'].includes(this.config.biome))return;
  const hx=cx,hz=cz,key=hx+','+hz+':'+state.n;
  if(this.horizonKey===key)return;
  this.clearHorizon();this.horizonKey=key;
  const make=this.config.biome==='desert'?makeDesertHorizon:makeCanyonHorizon;
  const data=make(this.config,this.biome,hx,hz,this.nearBounds),chunk={cx:hx,cz:hz,visible:true};
  this.horizonBatches=[];
  for(const[geom,kind]of[[data.terrain,0],[data.water,1]]){
   const batch=renderer.makeBatch(geom,undefined,{chunk,kind,shadow:false,horizon:true,noHorizonClip:this.config.biome==='desert'});if(batch)this.horizonBatches.push(batch);
  }
 }
 clearHorizon(){for(const b of this.horizonBatches||[])renderer.disposeBatch(b);this.horizonBatches=[];this.horizonKey=null;}
 receive(message){
  if(this.dead)return;this.busy=null;
  if(message.error){console.error(message.error);if(this.worker){this.worker.terminate();this.worker=null;}this.center=null;return;}
  const d=message.data,key=d.cx+','+d.cz;
  if(!this.active||message.epoch!==this.epoch||!this.desired.has(key)||this.chunks.has(key)){this.discarded++;this.center=null;return;}
  this.install(d);this.refreshWorld();if(this.worker)this.dispatch();
 }
 install(data){
  const chunk={cx:data.cx,cz:data.cz,key:data.cx+','+data.cz,edges:data.edges,signature:data.signature,terrainSignature:data.terrainSignature,instances:data.instances,groundMaskData:data.groundMask,batches:[],visible:true};
  const batch=(geom,instances,opts={})=>{const b=renderer.makeBatch(geom,instances,{chunk,...opts});if(b)chunk.batches.push(b);};
  batch(data.terrain,undefined,{shadow:true});renderer.attachGround417(chunk.batches[chunk.batches.length-1],data.groundMask);batch(data.water,undefined,{kind:1,shadow:false});batch(data.grid,undefined,{only:'grid',shadow:false,unlit:true,lines:true});batch(data.wire,undefined,{only:'wire',shadow:false,unlit:true,lines:true});
  for(let i=0;i<20;i++){
   const instances=data.instances[i].map(a=>({...a,x:a.x-data.cx*48,z:a.z-data.cz*48}));
   batch(prototypes[i].g,instances,{slot:i,group:slotGroup(i),clip:i===19&&!['canyons','desert'].includes(this.config.biome)});
   if(prototypes[i].water.v.length)batch(prototypes[i].water,instances,{slot:i,group:slotGroup(i),kind:1,shadow:false,clip:true});
  }
  const lo=[data.bounds.minX,Infinity,data.bounds.minZ],hi=[data.bounds.maxX,-Infinity,data.bounds.maxZ];
  for(let k=1;k<data.terrain.length;k+=9){lo[1]=Math.min(lo[1],data.terrain[k]);hi[1]=Math.max(hi[1],data.terrain[k]);}
  for(let i=0;i<20;i++)for(const a of data.instances[i]){const p=prototypes[i],co=Math.cos(a.yaw),si=Math.sin(a.yaw);for(const x of[p.min[0],p.max[0]])for(const z of[p.min[2],p.max[2]]){const xx=a.x+co*x*a.sx+si*z*a.sz,zz=a.z-si*x*a.sx+co*z*a.sz;lo[0]=Math.min(lo[0],xx);hi[0]=Math.max(hi[0],xx);lo[2]=Math.min(lo[2],zz);hi[2]=Math.max(hi[2],zz);}lo[1]=Math.min(lo[1],a.y+p.min[1]*a.sy);hi[1]=Math.max(hi[1],a.y+p.max[1]*a.sy);}
  chunk.aabb={min:lo,max:hi};this.chunks.set(chunk.key,chunk);this.created++;this.dirty=true;renderer.shadowDirty=true;generationMs=data.ms;
  if(this.initial&&(this.chunks.size>=9||(!this.queue.length&&!this.busy))){this.initial=false;$('loading').classList.add('hidden');window.__biomaReady=true;}
 }
 release(key){
  const chunk=this.chunks.get(key);if(!chunk)return;
  for(const b of chunk.batches)renderer.disposeBatch(b);chunk.batches.length=0;chunk.instances=null;this.chunks.delete(key);this.released++;this.dirty=true;
 }
 plan(cam,force=false){
  if(!this.active||this.dead)return;
  const cx=Math.floor((cam.eye[0]+24)/48),cz=Math.floor((cam.eye[2]+24)/48),r=state.n,key=cx+','+cz+':'+r;
  if(Math.abs(cam.target[0]-this.origin[0])>144||Math.abs(cam.target[2]-this.origin[1])>144){this.origin=[Math.round(cam.target[0]/48)*48,Math.round(cam.target[2]/48)*48];renderer.lastShadowFocus=null;}
  if(!force&&this.center===key)return;this.center=key;
  this.nearBounds=[(cx-r)*48-24,(cz-r)*48-24,(cx+r)*48+24,(cz+r)*48+24];this.updateHorizon(cx,cz);
  const desired=new Map(),forward=norm(sub(cam.target,cam.eye));
  for(let z=cz-r;z<=cz+r;z++)for(let x=cx-r;x<=cx+r;x++){
   const dx=x*48-cam.eye[0],dz=z*48-cam.eye[2],score=Math.hypot(dx,dz)-.18*(dx*forward[0]+dz*forward[2]);desired.set(x+','+z,{cx:x,cz:z,score});
  }
  this.desired=desired;
  for(const k of this.chunks.keys())if(!desired.has(k))this.release(k);
  renderer.compact();
  this.queue=[...desired.values()].filter(v=>!this.chunks.has(v.cx+','+v.cz)&&!(this.busy&&this.busy.cx===v.cx&&this.busy.cz===v.cz)).sort((a,b)=>a.score-b.score);
  this.refreshWorld();
 }
 tick(cam){
  this.plan(cam);this.dispatch();
 }
 dispatch(){
  if(!this.active||this.dead||this.busy||!this.queue.length)return;
  const job=this.queue.shift(),request={id:++this.serial,epoch:this.epoch,config:this.config,biome:this.biome,cx:job.cx,cz:job.cz};this.busy=job;
  if(this.worker)this.worker.postMessage(request);
  else{try{this.receive({id:request.id,epoch:request.epoch,data:buildChunkData(this.config,this.biome,job.cx,job.cz)});}catch(error){this.busy=null;showError(error);}}
 }
 refreshWorld(){
  if(!world||world.manager!==this||!this.dirty)return;this.dirty=false;
  const buckets=Array.from({length:20},()=>new Map());
  for(const c of this.chunks.values())for(let i=0;i<20;i++)for(const a of c.instances[i])buckets[i].set(a.id,a);
  world.instances=buckets.map(m=>[...m.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));world.local=world.instances;world.chunks=[...this.chunks.values()];
  world.signature=fingerprint(world.instances);world.terrainSignature=hashString([...this.chunks.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(c=>c.key+':'+c.terrainSignature).join('|')).toString(16).toUpperCase();
  if(selectionInstance&&mode==='terrain'&&!buckets[selectionInstance.slot].has(selectionInstance.id))clearSelection();
  updateStats();
 }
 cull(vp,origin){
  const planes=[];for(const[row,sign]of[[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]]){const p=[vp[3]+sign*vp[row],vp[7]+sign*vp[4+row],vp[11]+sign*vp[8+row],vp[15]+sign*vp[12+row]],len=Math.hypot(p[0],p[1],p[2]);planes.push(p.map(v=>v/len));}
  this.visibleCount=0;
  for(const c of this.chunks.values()){
   const a=c.aabb;c.visible=planes.every(q=>q[0]*((q[0]>=0?a.max[0]:a.min[0])-origin[0])+q[1]*(q[1]>=0?a.max[1]:a.min[1])+q[2]*((q[2]>=0?a.max[2]:a.min[2])-origin[1])+q[3]>=0);if(c.visible)this.visibleCount++;
  }
 }
 pause(){this.clearHorizon();this.visibleCount=0;this.active=false;this.epoch++;this.queue=[];this.desired.clear();this.center=null;for(const k of this.chunks.keys())this.release(k);renderer.compact();this.refreshWorld();}
 resume(){this.active=true;this.center=null;this.initial=true;$('loading').classList.remove('hidden');}
 dispose(){this.clearHorizon();this.dead=true;this.active=false;if(this.worker)this.worker.terminate();this.worker=null;this.busy=null;this.queue=[];for(const k of this.chunks.keys())this.release(k);this.desired.clear();renderer.compact();}
 summary(){return{loaded:this.chunks.size,visible:this.visibleCount,capacity:(state.n*2+1)**2,queued:this.queue.length+(this.busy?1:0),created:this.created,released:this.released,discarded:this.discarded,worker:!!this.worker,origin:[...this.origin],gpuGeometryBytes:renderer.gpuBytes,gpuSkyBytes:renderer.textureBytes,gpuLightingTextureBytes:renderer.environmentBytes+renderer.contactBytes,gpuGroundMaterialBytes:renderer.groundTextureBytes+renderer.groundMapBytes,gpuMergedInstanceBytes:renderer.groupBytes,gpuAssetTextureBytes:[...AssetPacks.values()].reduce((n,p)=>n+p.material.gpuBytes,0),buffers:renderer.liveBuffers,vertexArrays:renderer.liveVAOs};}
}

function addFloor(size,b,y=-1.2){const g=new Geometry(),s=size*7,col=shade(hex(b.bg),.91);g.tri([-s,y,-s],[-s,y,s],[s,y,-s],col);g.tri([s,y,-s],[-s,y,s],[s,y,s],col);renderer.makeBatch(g,undefined,{shadow:false,kind:2});}
function makeGallery(){const b=currentBiome();gallery={instances:[],size:108};for(let i=0;i<20;i++){const p=prototypes[i],col=i%5,row=Math.floor(i/5),scale=clamp(8/Math.max(...p.size),.10,8);gallery.instances.push({id:'sample:'+i,slot:i,x:(col-2)*18,z:(row-1.5)*19,y:.51-Math.min(p.min[1],p.water.v.length?p.water.min[1]:p.min[1])*scale,yaw:.10,scale,sx:scale,sy:scale,sz:scale,tint:1});}}
function installGallery(){renderer.clear();const b=currentBiome();renderer.bg=hex(b.bg);addFloor(108,b);const g=new Geometry();branch(g,[0,-.95,0],[0,-.15,0],6.4,6.35,shade(hex(b.bg),.8),32);branch(g,[0,-.15,0],[0,.5,0],6.15,6.10,shade(hex(b.bg),1.025),32);renderer.makeBatch(g,gallery.instances.map(a=>({x:a.x,y:0,z:a.z,yaw:0,sx:1,sy:1,sz:1,tint:1})),{shadow:true});for(let i=0;i<20;i++){renderer.makeBatch(prototypes[i].g,[gallery.instances[i]],{slot:i});renderer.makeBatch(prototypes[i].water,[gallery.instances[i]],{slot:i,kind:1,shadow:false});}renderer.lastShadowFocus=null;}
function readInputs(){state.seed=$('seed').value.trim().slice(0,80)||'SABANA-847291';$('seed').value=state.seed;state.n=clamp(parseInt($('size').value)||2,2,3);state.relief=clamp(Number($('relief').value)/100,0,1.8);state.density=clamp(Number($('density').value)/100,.15,1.8);if(!$('river').disabled)state.river=$('river').checked;}
function generate(reset=false){
 if(!renderer)return;readInputs();pending=true;genSerial++;window.__biomaReady=false;$('loading').classList.remove('hidden');
 try{
  const changedBiome=world?.config.biome!==state.biome;
  if(world?.manager)world.manager.dispose();renderer.clear();
  const config=snapshot(),b=biomeFrom(config),field=new TerrainField(config);config.settlementSite={...findSettlementSite(field,b)};field.settlementSite=config.settlementSite;field.heightCache.clear();activateAssetTextures(b.assetPack);prototypes=SLOTS.map((_,i)=>choosePrototype(i,b));
  const manager=new ChunkManager(config,b);world={config,biome:b,field,manager,instances:Array.from({length:20},()=>[]),local:Array.from({length:20},()=>[]),chunks:[],signature:'—',terrainSignature:'—'};renderer.bg=hex(b.bg);makeGallery();clearSelection();
  if(changedBiome&&field.canyon&&mode==='terrain'){const z=state.cz*48;camera.goal.target=[field.riverX(z),field.riverLevel,z];camera.goal.theta=0.0;camera.goal.phi=1.18;camera.goal.distance=34;camera.target=[...camera.goal.target];camera.theta=0;camera.phi=1.18;camera.distance=34;camera.focusHeight=0;camera.ready=true;updateCamera(1);}else if(reset||!camera.ready)homeCamera(true);else updateCamera(1);
  if(mode==='terrain'){installSettlement();manager.plan(camera,true);}else{manager.pause();installGallery();$('loading').classList.add('hidden');window.__biomaReady=true;}
  syncUI();syncAssetUI();syncGround417UI();window.__biomaGeneration=genSerial;
 }catch(error){showError(error);}finally{pending=false;}
}

// ===== Camera: unrestricted X/Z travel; 20 m maximum clearance over the terrain. =====
const atmosphere={night:0,waterTime:0,phase:0};
const camera={theta:.50,phi:1.16,distance:38,target:[0,4,0],eye:[0,0,0],altitude:0,focusHeight:0,goal:{theta:.50,phi:1.16,distance:38,target:[0,4,0]},fov:Math.PI/3,ready:false};
let savedTerrainCamera=null,dragMode='orbit';const keys=new Set();
function homeCamera(immediate=false){
 if(mode==='catalog'){
  const v=renderer.resize(),aspect=v.w/v.h,minFov=Math.min(camera.fov,2*Math.atan(Math.tan(camera.fov/2)*aspect));camera.goal={theta:0,phi:.65,distance:clamp(101*.54/Math.sin(minFov/2),90,500),target:[0,1,0]};
 }else{
  if(!camera.ready){const z=state.cz*48,x=state.cx===0&&world.field.riverActive?world.field.riverX(z)+2:state.cx*48;camera.goal.target=[x,world.field.surface(x,z),z];}
  if(world?.field.canyon){const z=camera.goal.target[2];camera.goal.target=[world.field.riverX(z),world.field.riverLevel,z];camera.goal.theta=0;camera.goal.phi=1.18;camera.goal.distance=34;}else{camera.goal.theta=.50;camera.goal.phi=1.16;camera.goal.distance=38;}camera.focusHeight=0;
 }
 camera.ready=true;
 if(immediate){camera.theta=camera.goal.theta;camera.phi=camera.goal.phi;camera.distance=camera.goal.distance;camera.target=[...camera.goal.target];}
 updateCamera(1);
}
function updateCamera(dt){
 const terrain=mode==='terrain',a=1-Math.exp(-dt*12);
 camera.goal.phi=clamp(camera.goal.phi,.065,1.47);
 const maxDistance=terrain?Math.min(65,20/Math.max(.19,Math.cos(camera.goal.phi))):650;
 camera.goal.distance=clamp(camera.goal.distance,4,maxDistance);
 if(terrain&&world)camera.goal.target[1]=world.field.surface(camera.goal.target[0],camera.goal.target[2])+.18+camera.focusHeight;
 camera.theta=mix(camera.theta,camera.goal.theta,a);camera.phi=mix(camera.phi,camera.goal.phi,a);camera.distance=mix(camera.distance,camera.goal.distance,a);
 camera.target=camera.target.map((v,i)=>mix(v,camera.goal.target[i],a));
 camera.eye=add(camera.target,[camera.distance*Math.sin(camera.phi)*Math.sin(camera.theta),camera.distance*Math.cos(camera.phi),camera.distance*Math.sin(camera.phi)*Math.cos(camera.theta)]);
 if(terrain&&world){const ground=world.field.surface(camera.eye[0],camera.eye[2]);camera.eye[1]=clamp(camera.eye[1],ground+2,ground+20);camera.altitude=camera.eye[1]-ground;state.cx=Math.floor((camera.target[0]+24)/48);state.cz=Math.floor((camera.target[2]+24)/48);}
}
function zoom(amount){camera.goal.distance=clamp(camera.goal.distance*Math.exp(amount),4,mode==='terrain'?Math.min(65,20/Math.cos(camera.goal.phi)):650);}
function pan(dx,dy){
 const v=renderer.view,k=2*camera.distance*Math.tan(camera.fov/2)/Math.max(120,v.h/v.dpr),right=[Math.cos(camera.theta),0,-Math.sin(camera.theta)],back=[Math.sin(camera.theta),0,Math.cos(camera.theta)];
 const vertical=1/Math.max(.38,Math.cos(camera.phi));
 camera.goal.target[0]+=(-dx*right[0]+dy*back[0]*vertical)*k;camera.goal.target[2]+=(-dx*right[2]+dy*back[2]*vertical)*k;camera.focusHeight=0;
}
// One-finger Mover and two-finger translation have the same world-space direction.
function panTouch(dx,dy){pan(dx,-dy);}
function panTwoFinger(dx,dy){panTouch(dx,dy);}
function panSinglePointer(dx,dy,pointerType){if(pointerType==='touch')panTouch(dx,dy);else pan(dx,dy);}
function touchPanAgreement(){
 const saved=[...camera.goal.target],focus=camera.focusHeight;
 try{panSinglePointer(13,17,'touch');const one=[...camera.goal.target];camera.goal.target=[...saved];panTwoFinger(13,17);return one.every((v,i)=>Math.abs(v-camera.goal.target[i])<1e-9);}
 finally{camera.goal.target=saved;camera.focusHeight=focus;}
}
function moveInput(dt){
 if(document.querySelector('dialog[open]'))return;
 camera.goal.theta+=((keys.has('e')?1:0)-(keys.has('q')?1:0))*dt*1.3;
 if(mode!=='terrain')return;
 let x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
 if(!x&&!z)return;const n=Math.hypot(x,z),speed=(keys.has('shift')?20:9)*dt/n,si=Math.sin(camera.theta),co=Math.cos(camera.theta);camera.goal.target[0]+=(x*co+z*si)*speed;camera.goal.target[2]+=(-x*si+z*co)*speed;camera.focusHeight=0;
}
function teleport(x,z,immediate=true){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1e12||Math.abs(z)>1e12)throw Error('Coordenadas no válidas o fuera de la precisión segura de este prototipo.');
 if(mode!=='terrain')switchMode('terrain');
 camera.goal.target=[x,world.field.surface(x,z)+.18,z];camera.focusHeight=0;
 if(immediate){camera.target=[...camera.goal.target];updateCamera(1);world.manager.initial=true;$('loading').classList.remove('hidden');}
 world.manager.plan(camera,true);
}
function moveWorld(dx,dz){camera.goal.target[0]+=dx*12;camera.goal.target[2]+=dz*12;camera.focusHeight=0;}
function topView(){camera.goal.phi=.065;camera.goal.theta=0;if(mode==='terrain')camera.goal.distance=Math.min(20,camera.goal.distance);toast('Vista de pájaro · altura máxima de 20 m sobre el suelo.');}
function focusSelection(){const a=selectionInstance;if(!a)return;const p=prototypes[a.slot],v=renderer.resize(),aspect=v.w/v.h,size=Math.max(...p.size)*Math.max(a.sx,a.sy,a.sz);camera.goal.target=[a.x,a.y+p.centerY*a.sy,a.z];camera.focusHeight=mode==='terrain'?p.centerY*a.sy:0;camera.goal.distance=clamp(size*2.4/Math.min(1.1,aspect),7,mode==='terrain'?30:240);camera.goal.phi=1.03;}
// Orbit is the default, with unrestricted azimuth and the existing safe tilt/altitude limits.
function orbit(dx,dy){camera.goal.theta-=dx*.005;camera.goal.phi=clamp(camera.goal.phi+dy*.004,.065,1.47);}
function updateNavigationHint(){
 const touch=matchMedia('(pointer:coarse)').matches;
 $('hint').textContent=touch
  ?(dragMode==='orbit'?'Un dedo: girar · Dos dedos: mover / zoom / giro':'Un dedo: mover · Dos dedos: zoom / giro · Girar: inclinar la vista')
  :(dragMode==='orbit'?'Arrastra: girar 360° · Mayús + arrastrar o WASD: mover · Rueda: zoom':'Arrastra: mover · Botón derecho o Q / E: girar · Rueda: zoom');
}
function setDragMode(next){
 if(next!=='pan'&&next!=='orbit')throw Error('Modo de navegación no válido.');
 dragMode=next;
 for(const id of['panMode','orbitMode']){
  const active=id===(next==='pan'?'panMode':'orbitMode');
  $(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));
 }
 canvas.style.cursor='grab';updateNavigationHint();
}
function bindDragModeButton(id,next){
 const button=$(id);button.onclick=()=>setDragMode(next);
 // Handle a touch release directly as well: mode changes are idempotent, and do not
 // depend on a delayed/suppressed compatibility click after a canvas gesture.
 button.addEventListener('pointerup',e=>{
  if(e.pointerType!=='touch')return;
  const r=button.getBoundingClientRect();
  if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){e.preventDefault();setDragMode(next);}
 });
}
const pointers=new Map();let pointerStart=null,moved=false,lastPinch=null;
function pinchState(){
 if(pointers.size!==2)return null;
 const [a,b]=[...pointers.values()],dx=b.x-a.x,dy=b.y-a.y;
 return {dist:Math.hypot(dx,dy),angle:Math.atan2(dy,dx),x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 if(!world||!(e.button===0||e.button===1||e.button===2))return;
 e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
 if(!pointers.size){pointerStart={x:e.clientX,y:e.clientY,button:e.button};moved=false;}
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});
 if(pointers.size>1){moved=true;lastPinch=pinchState();}
 canvas.style.cursor='grabbing';
},{passive:false});
canvas.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;
 e.preventDefault();const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;
 pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
 if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>4)moved=true;
 if(pointers.size>=2){
  moved=true;const next=pinchState();
  if(next&&lastPinch){
   zoom(Math.log(Math.max(lastPinch.dist,1)/Math.max(next.dist,1)));
   panTwoFinger(next.x-lastPinch.x,next.y-lastPinch.y);
   // Shortest angular delta avoids a jump when two-finger rotation crosses +/-180 degrees.
   if(next.dist>24&&lastPinch.dist>24){const d=next.angle-lastPinch.angle;camera.goal.theta-=Math.atan2(Math.sin(d),Math.cos(d));}
  }
  lastPinch=next;
 }else if(e.shiftKey||old.button===1||(old.button!==2&&dragMode==='pan'&&mode==='terrain'))panSinglePointer(dx,dy,e.pointerType);
 else orbit(dx,dy);
},{passive:false});
function endPointer(e){
 if(!pointers.has(e.pointerId))return;
 const wasMulti=pointers.size>=2;pointers.delete(e.pointerId);
 if(!moved&&!wasMulti&&pointerStart?.button===0&&e.type==='pointerup'){
  const picked=pick(e.clientX,e.clientY);if(picked)selectSlot(picked.slot,picked,false);else clearSelection();
 }
 if(wasMulti)moved=true;lastPinch=pinchState();
 if(!pointers.size){pointerStart=null;canvas.style.cursor='grab';}
 if(e.type!=='lostpointercapture'&&canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
function resetNavigationInput(){
 const ids=[...pointers.keys()];pointers.clear();pointerStart=null;lastPinch=null;moved=false;keys.clear();
 for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
 canvas.style.cursor='grab';
}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(clamp(e.deltaY,-150,150)*.0015);},{passive:false});
function pick(clientX,clientY){
 if(!world)return null;const rect=canvas.getBoundingClientRect(),v=renderer.view,x=(clientX-rect.left)*v.dpr,y=(rect.bottom-clientY)*v.dpr;if(x<v.x||x>v.x+v.w||y<v.y||y>v.y+v.h)return null;
 const nx=(x-v.x)/v.w*2-1,ny=(y-v.y)/v.h*2-1,forward=norm(sub(camera.target,camera.eye)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),tan=Math.tan(camera.fov/2),dir=norm(add(forward,add(mul(right,nx*tan*v.w/v.h),mul(up,ny*tan))));
 let best=null,bestT=Infinity;const list=mode==='catalog'?gallery.instances:world.local.flat();
 for(const a of list){if(mode==='terrain'&&(!state.layers[slotGroup(a.slot)]||(renderer.instanceVisibility.get(a.id)??1)<.2))continue;const p=prototypes[a.slot],pos=[a.x,a.y+p.centerY*a.sy,a.z],radius=mode==='catalog'?Math.max(2,Math.max(...p.size)*a.scale*.48):Math.max(.4,Math.hypot(p.radius*Math.max(a.sx,a.sz),p.size[1]*a.sy*.4)),oc=sub(pos,camera.eye),t=dot(oc,dir),h=radius*radius-(dot(oc,oc)-t*t);if(h>=0&&t>0){const hit=t-Math.sqrt(h);if(hit<bestT){bestT=hit;best=a;}}}return best;
}

// === INTERFAZ, INSPECTOR Y CATÁLOGO. ===
const labelRoot=document.createElement('div');labelRoot.id='galleryLabels';labelRoot.style.cssText='position:absolute;inset:0;pointer-events:none;display:none';$('stage').insertBefore(labelRoot,$('catalogPanel'));const galleryLabels=[];for(let i=0;i<20;i++){const el=document.createElement('button');el.textContent=String(i+1).padStart(2,'0');el.setAttribute('aria-label','Seleccionar asset '+(i+1));el.style.cssText='position:absolute;transform:translate(-50%,-50%);padding:2px 7px;border-radius:5px;font:9px ui-monospace,monospace;pointer-events:auto;background:#203326cf;border:1px solid #eef4d077;color:#e3edcd;min-width:25px';el.onclick=()=>selectSlot(i,gallery.instances[i],false);labelRoot.appendChild(el);galleryLabels.push(el)}
function updateGalleryLabels(){labelRoot.style.display=mode==='catalog'?'block':'none';if(mode!=='catalog'||!gallery)return;for(let i=0;i<20;i++){const a=gallery.instances[i],p=renderer.project([a.x,.65,a.z+6.8]),el=galleryLabels[i];if(!p||p.z>1||p.x<0||p.y<0||p.x>renderer.view.w/renderer.view.dpr||p.y>renderer.view.cssH-72){el.style.display='none';continue}el.style.display='block';el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.background=i===selected?'#9db770':'#203326cf';el.style.color=i===selected?'#142d1b':'#e3edcd'}}
function setupLayers(){const el=$('layers');for(let i=0;i<6;i++){const label=document.createElement('label');label.className='toggle';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.id='layer'+i;const span=document.createElement('span');span.textContent=GROUPS[i].short;const count=document.createElement('small');count.className='pillcount';count.id='count'+i;label.append(input,span,count);el.appendChild(label);input.onchange=()=>{state.layers[i]=input.checked;renderer.shadowDirty=true;updateStats();if(selected>=0&&slotGroup(selected)===i&&!input.checked)clearSelection();if(mode==='catalog')toast('El catálogo mantiene los 20 slots visibles. La capa cambia en Terreno.')}}}
function setupPalette(){const el=$('palette');el.replaceChildren();const b=currentBiome();for(const[key,label]of(b.fluid==='none'?[['soil','Arena'],['grass','Arena clara'],['foliage','Vegetación'],['rock','Roca']]:[['soil','Tierra'],['grass','Hierba'],['foliage','Copa'],['rock','Roca'],['water','Agua']])){const wrap=document.createElement('label');wrap.className='colorfield';const inp=document.createElement('input');inp.type='color';inp.value=b.colors[key];inp.title=label;inp.id='color-'+key;wrap.append(inp,document.createTextNode(label));el.appendChild(wrap);inp.onchange=()=>{if(!state.palette[state.biome])state.palette[state.biome]={};state.palette[state.biome][key]=inp.value;generate()}}}
function rebuildCatalog(){const root=$('assetlist');root.replaceChildren();let prev=-1;const b=currentBiome();for(let i=0;i<20;i++){if(slotGroup(i)!==prev){const h=document.createElement('div');h.className='cataloggroup';h.textContent=GROUPS[slotGroup(i)].name;root.appendChild(h);prev=slotGroup(i)}const btn=document.createElement('button');btn.className='assetitem';btn.dataset.slot=i;const id=document.createElement('span');id.className='assetid';id.textContent=String(i+1).padStart(2,'0');const name=document.createElement('span');name.textContent=b.names[i];const count=document.createElement('span');count.className='assetcount';count.textContent='×'+(world?.instances[i].length||0);btn.append(id,name,count);btn.onclick=()=>selectSlot(i,null,false);root.appendChild(btn)}}
function clearSelection(){selected=-1;selectionInstance=null;$('inspect').style.display='none';$('stage').classList.remove('inspecting');document.querySelectorAll('.assetitem.active').forEach(e=>e.classList.remove('active'))}
function selectSlot(index,instance=null,focus=false){if(index<0||index>=20)return;selected=index;const p=prototypes[index],s=SLOTS[index],b=currentBiome();if(!instance){instance=mode==='catalog'?gallery.instances[index]:world.local[index].reduce((best,a)=>!best||Math.hypot(a.x-camera.target[0],a.z-camera.target[2])<Math.hypot(best.x-camera.target[0],best.z-camera.target[2])?a:best,null)}selectionInstance=instance;$('inspectId').textContent=String(index+1).padStart(2,'0')+' / '+s.id;$('inspectName').textContent=b.names[index];$('inspectDesc').textContent='Modelo 3D de '+b.name+'. UV y normales conservadas. '+p.description;$('inspectStats').textContent=Math.round(p.triangles)+' tris · '+p.size.map(v=>v.toFixed(1)).join(' × ')+' m';$('inspectBadges').replaceChildren();for(const text of[GROUPS[slotGroup(index)].name,'GLB · texturizado',(world.instances[index]?.length||0)+' en el terreno',index===19?(b.fluid==='lava'?'Lava animada':'Agua animada'):'Instanciado GPU']){const tag=document.createElement('span');tag.className='badge';tag.textContent=text;$('inspectBadges').appendChild(tag)}$('inspect').style.display='block';$('stage').classList.add('inspecting');document.querySelectorAll('.assetitem').forEach(e=>e.classList.toggle('active',Number(e.dataset.slot)===index));$('focusBtn').disabled=!instance;if(focus&&instance)focusSelection()}
function setMenu(open){$('sidebar').classList.toggle('open',open);$('sidebarShade').classList.toggle('open',open);$('menuBtn').setAttribute('aria-expanded',String(open))}
function randomSeed(){const v=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(v);else v[0]=avalanche(Date.now());$('seed').value='BIOMA-'+v[0].toString(36).toUpperCase();generate()}

function updateStats(){
 if(!world)return;const s=world.manager.summary(),visible=mode==='catalog'?20:world.instances.reduce((n,a,i)=>n+(state.layers[slotGroup(i)]?a.length:0),0);
 $('statChunks').textContent=mode==='catalog'?'—':s.loaded+'/'+s.capacity;$('statAssets').textContent='20';$('statInstances').textContent=format(visible);$('statTime').textContent=(s.gpuGeometryBytes/1048576).toFixed(1)+' MB';$('statTime').title='Geometría: '+(s.gpuGeometryBytes/1048576).toFixed(1)+' MB; atlas de assets compartidos: '+(s.gpuAssetTextureBytes/1048576).toFixed(1)+' MB; cielos: '+(s.gpuSkyBytes/1048576).toFixed(1)+' MB. No incluye framebuffer ni mapa de sombras.';
 for(let j=0;j<6;j++)$('count'+j).textContent=format(world.instances.reduce((a,v,i)=>a+(slotGroup(i)===j?v.length:0),0));
 $('streamDetail').textContent=s.queued?'Preparando '+s.queued+' chunks · '+(s.worker?'worker activo':'modo local'):'Entorno preparado · '+s.visible+' chunks en cámara';
 $('streamCounters').textContent=s.created+' creados · '+s.released+' liberados';
 const oc=renderer.obstructionStats;$('obstructionStatus').textContent=mode==='catalog'?'Catálogo · sin ocultación':!state.autoHide?'Ocultación automática desactivada':oc.affected?oc.hidden+' ocultos · '+oc.fading+' desvaneciéndose':'Visibilidad automática · vista despejada';
 $('where').textContent='X '+state.cx+' · Z '+state.cz;
 if(document.activeElement!==$('coordX'))$('coordX').value=state.cx;if(document.activeElement!==$('coordZ'))$('coordZ').value=state.cz;
 $('altitude').textContent=mode==='terrain'?camera.altitude.toFixed(1)+' m / 20 m':'Vista de catálogo';
 document.querySelectorAll('.assetcount').forEach((el,i)=>el.textContent='×'+world.instances[i].length);
}
function syncUI(){
 const b=currentBiome();$('seedHash').textContent='#'+hashString(state.seed).toString(16).padStart(8,'0').slice(0,6).toUpperCase();$('sceneTitle').textContent=mode==='catalog'?'Biblioteca de assets':b.name;$('sceneEyebrow').textContent=mode==='catalog'?'20 SLOTS / UN CONTRATO COMÚN':'MUNDO ABIERTO / SEMILLA DETERMINISTA';$('sceneDesc').textContent=mode==='catalog'?b.name+' · muestras a escala comparativa.':(b.fluid==='none'?'Dunas continuas, arena y vegetación dispersa. Sin agua ni ríos.':'Explora sin bordes. El paisaje se construye al avanzar.');
 $('signature').textContent=mode==='catalog'?(['canyons','desert'].includes(state.biome)?'20 MODELOS · CATEGORÍAS REALES DEL GLB':'4 + 3 + 3 + 3 + 4 + 3 = 20'):'48 × 48 m POR CHUNK · CARGA PROGRESIVA';
 $('reliefVal').textContent=state.relief.toFixed(2)+'×';$('densityVal').textContent=state.density.toFixed(2)+'×';$('quality').value=state.quality;$('size').value=state.n;
 document.querySelectorAll('[data-biome]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.biome===state.biome?'true':'false'));
 setupPalette();rebuildCatalog();updateStats();syncAtmosphere();syncVisibilityControls();syncV4UI();
}
function switchMode(next){
 if(!world||mode===next)return;
 if(mode==='terrain'){savedTerrainCamera={theta:camera.theta,phi:camera.phi,distance:camera.distance,target:[...camera.target]};world.manager.pause();}
 mode=next;clearSelection();$('terrainTab').classList.toggle('active',mode==='terrain');$('catalogTab').classList.toggle('active',mode==='catalog');$('terrainTab').setAttribute('aria-selected',String(mode==='terrain'));$('catalogTab').setAttribute('aria-selected',String(mode==='catalog'));$('catalogPanel').style.display=mode==='catalog'?'block':'none';$('mapnav').style.display=mode==='terrain'?'grid':'none';$('catnote').style.display=mode==='catalog'?'block':'none';$('hint').style.display=mode==='catalog'?'none':'block';$('navigationMode').style.display=mode==='catalog'?'none':'flex';
 if(mode==='terrain'){
  renderer.clear();world.manager.resume();installSettlement();if(savedTerrainCamera){camera.goal={...savedTerrainCamera,target:[...savedTerrainCamera.target]};camera.target=[...camera.goal.target];camera.theta=camera.goal.theta;camera.phi=camera.goal.phi;camera.distance=camera.goal.distance;updateCamera(1);}else homeCamera(true);world.manager.plan(camera,true);
 }else{installGallery();homeCamera(true);$('loading').classList.add('hidden');}
 syncUI();updateGalleryLabels();
}
function syncAtmosphere(){
 $('nightLight').value=state.nightLight*100;$('nightLightVal').textContent=Math.round(state.nightLight*100)+' %';
 $('nightMix').value=Math.round(state.night*100);$('nightVal').textContent=Math.round(state.night*100)+' %';$('autoCycle').checked=state.autoCycle;$('waterSpeed').value=state.waterSpeed;$('waterSpeedVal').textContent=state.waterSpeed.toFixed(2)+'×';$('waterScale').value=state.waterScale;$('waterScaleVal').textContent=state.waterScale.toFixed(2)+'×';$('skyYaw').value=state.skyYaw;
 $('dayBtn').classList.toggle('active',state.night<.02);$('nightBtn').classList.toggle('active',state.night>.98);
}
function setNight(value,immediate=false){state.night=clamp(Number(value)||0,0,1);state.autoCycle=false;atmosphere.phase=state.night*.5;if(immediate)atmosphere.night=state.night;syncAtmosphere();}
function updateAtmosphere(dt){
 if(state.autoCycle){atmosphere.phase=(atmosphere.phase+dt/state.cycleSeconds)%1;state.night=(1-Math.cos(atmosphere.phase*TAU))*.5;}
 atmosphere.night=mix(atmosphere.night,state.night,1-Math.exp(-dt*2.4));if(Math.abs(atmosphere.night-state.night)<.0001)atmosphere.night=state.night;
 atmosphere.waterTime+=dt*state.waterSpeed;$('stage').classList.toggle('is-night',atmosphere.night>.45);
 $('dayState').textContent=atmosphere.night<.1?'DÍA':atmosphere.night>.9?'NOCHE':'TRANSICIÓN';
}

// ===== Portable v2 profiles and executable diagnostics. =====
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function exportProfile(){
 if(!world)return;const b=currentBiome(),data={format:'bioma-lab-profile',version:2,generator:'3.7.0',viewer:'4.1.8.1',config:snapshot(),camera:{...camera.goal,target:[...camera.goal.target]},biomeDefinition:{id:state.biome,name:b.name,palette:b.colors,densities:Object.fromEntries(GROUPS.map((g,i)=>[g.key,b.dens[i]])),slots:SLOTS.map((s,i)=>({id:s.id,category:GROUPS[slotGroup(i)].key,name:b.names[i]}))},diagnostics:world.manager.summary()};
 downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'bioma_infinito_'+state.biome+'.json');toast('Perfil guardado con semilla, posición, bioma, agua y atmósfera.');
}
function validateProfile(data){
 if(!data||data.format!=='bioma-lab-profile'||![1,2].includes(data.version)||!data.config)throw Error('No es un perfil compatible de BIOMA / LAB.');
 const c=data.config;if(typeof c.seed!=='string'||!c.seed.trim()||c.seed.length>80)throw Error('Semilla no válida.');if(!Object.hasOwn(BIOMES,c.biome))throw Error('Bioma desconocido.');
 const next={seed:c.seed.trim(),biome:c.biome,assetLOD:c.assetLOD??true};if(typeof next.assetLOD!=='boolean')throw Error('Detalle adaptativo no válido.');
 for(const[key,min,max,def]of[['relief',0,1.8,1],['density',.15,1.8,1],['cx',-2e10,2e10,0],['cz',-2e10,2e10,0],['night',0,1,0],['nightLight',.55,1.45,1],['hideDistance',3,12,7],['cycleSeconds',30,3600,180],['waterSpeed',0,2,.65],['waterScale',.3,2,.75],['skyYaw',-180,180,0]]){const value=c[key]??def;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Parámetro fuera de rango: '+key);next[key]=value;}
 next.cx=Math.round(next.cx);next.cz=Math.round(next.cz);next.n=data.version===1?2:clamp(Math.round(Number(c.n)||2),2,3);
 for(const k of['river','grid','wire','shadows','autorotate','autoCycle','autoHide']){if(c[k]!==undefined&&typeof c[k]!=='boolean')throw Error('Parámetro no válido: '+k);next[k]=c[k]??(k==='river'||k==='shadows'||k==='autoHide');}
 if(!['eco','normal','high'].includes(c.quality))throw Error('Calidad no válida.');next.quality=c.quality;
 if(!Array.isArray(c.layers)||c.layers.length!==6||!c.layers.every(v=>typeof v==='boolean'))throw Error('Capas no válidas.');next.layers=[...c.layers];next.palette={};
 if(c.palette&&typeof c.palette==='object')for(const id of Object.keys(BIOMES)){if(!Object.hasOwn(c.palette,id))continue;next.palette[id]={};for(const key of['soil','grass','foliage','rock','water']){const color=c.palette[id]?.[key];if(color!==undefined){if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Color no válido.');next.palette[id][key]=color;}}}
 next.lighting=c.lighting??'illustrated';if(!['classic','studio','african','illustrated'].includes(next.lighting))throw Error('Iluminación no válida.');
 next.exposure=c.exposure??1;if(!Number.isFinite(next.exposure)||next.exposure<.7||next.exposure>1.4)throw Error('Exposición no válida.');
 for(const k of ['batching','contact']){next[k]=c[k]??true;if(typeof next[k]!=='boolean')throw Error('Opción gráfica no válida: '+k);}
 for(const k of ['groundSurface','groundMicro']){next[k]=c[k]??true;if(typeof next[k]!=='boolean')throw Error('Suelo: opción no válida '+k);}
 next.groundStrength=c.groundStrength??1;if(!Number.isFinite(next.groundStrength)||next.groundStrength<0||next.groundStrength>1)throw Error('Suelo: intensidad entre 0 y 1.');
 return next;
}
async function importProfile(file){
 if(!file)return;try{
  if(file.size>1e6)throw Error('El perfil supera 1 MB.');const data=JSON.parse(await file.text()),parsed=validateProfile(data);Object.assign(state,parsed);
  $('seed').value=state.seed;$('size').value=state.n;$('relief').value=state.relief*100;$('density').value=state.density*100;$('river').checked=state.river;for(const k of['grid','wire','shadows','autorotate'])$(k).checked=state[k];for(let i=0;i<6;i++)$('layer'+i).checked=state.layers[i];
  if(mode!=='terrain')switchMode('terrain');camera.ready=false;applyQuality();generate(true);
  const cam=data.camera;
  if(cam&&Array.isArray(cam.target)&&cam.target.length===3&&cam.target.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1e12)){
   camera.goal.target=[...cam.target];for(const k of['theta','phi','distance'])if(typeof cam[k]==='number'&&Number.isFinite(cam[k]))camera.goal[k]=cam[k];camera.target=[...camera.goal.target];camera.theta=camera.goal.theta;camera.phi=camera.goal.phi;camera.distance=camera.goal.distance;updateCamera(1);world.manager.plan(camera,true);
  }
  atmosphere.night=state.night;syncAtmosphere();toast(data.version===1?'Perfil v1 migrado. El nuevo relieve de orillas corresponde al generador v2.':'Perfil cargado. Reconstruyendo esta posición.');
 }catch(error){toast('No se pudo cargar: '+error.message);}finally{$('importFile').value='';}
}
function fieldWaterLevel(f,x,z){
 if(f.c.river&&Math.abs(x-f.riverX(z))<3.5&&f.surface(x,z)<f.riverLevel-.14)return f.riverLevel;
 for(const p of f.nearbyPonds(x,z))if(Math.hypot(x-p.x,z-p.z)<p.radius*.6&&f.surface(x,z)<p.level-.12)return p.level-.035;
 return null;
}
function assetProfileRegression(){
 const profiles=Object.values(BIOMES),errors=[];
 for(const profile of profiles){try{validateAssetProfile(profile);}catch(e){errors.push(e.message);}}
 let rejectsOverflow=false;
 const profile=BIOMES.mangrove;
 if(profile){
  const invalid={...profile,dens:[...profile.dens]};invalid.dens[2]=1.08;
  try{validateAssetProfile(invalid);}catch(e){rejectsOverflow=/densidad/.test(e.message);}
 }
 return {ok:profiles.length===6&&errors.length===0&&rejectsOverflow,
  detail:errors.length?errors.join(' · '):'Seis perfiles: seis densidades válidas y pesos compatibles con veinte slots. La prueba negativa rechaza 1.08 sin modificar el perfil real.'};
}
function checks416(){
 if(!world)throw Error('Primero genera un mundo.');
 const c=world.config,b=world.biome,cx=state.cx,cz=state.cz,bo=chunkBounds(cx,cz),f=new TerrainField(c),one=scatterWorld({...c,bounds:bo},b,f),two=scatterWorld({...c,bounds:bo},b,new TerrainField(c),true),hash=fingerprint(one.instances),loaded=world.manager.chunks.get(cx+','+cz);
 let seamMax=0,pairs=0;
 for(const ch of world.manager.chunks.values())for(const[dx,dz,side,other]of[[1,0,'east','west'],[0,1,'south','north']]){const nb=world.manager.chunks.get((ch.cx+dx)+','+(ch.cz+dz));if(nb){pairs++;for(let i=0;i<ch.edges[side].length;i++)seamMax=Math.max(seamMax,Math.abs(ch.edges[side][i]-nb.edges[other][i]));}}
 if(!pairs){const a=buildChunkData(c,b,cx,cz),bb=buildChunkData(c,b,cx+1,cz);pairs=1;for(let i=0;i<49;i++)seamMax=Math.max(seamMax,Math.abs(a.edges.east[i]-bb.edges.west[i]));}
 const nextBounds=chunkBounds(cx+1,cz),joined={...bo,maxX:nextBounds.maxX,size:96,centerX:bo.centerX+24},next=scatterWorld({...c,bounds:nextBounds},b,new TerrainField(c)),both=scatterWorld({...c,bounds:joined},b,new TerrainField(c));
 const merged=one.instances.map((list,i)=>[...new Map([...list,...next.instances[i]].map(a=>[a.id,a])).values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));
 const sameTerrain=terrainFingerprint(new TerrainField({...c,biome:c.biome==='savanna'?'grand_river':'savanna'}),bo)===terrainFingerprint(f,bo);
 const resources=new Set(renderer.batches.filter(b=>!b.disposed).flatMap(b=>b.variants.map(v=>v.resource))),bytes=[...resources].reduce((n,r)=>n+r.bytes,0)+renderer.batches.filter(b=>!b.disposed).reduce((n,b)=>n+b.instanceBytes+b.visibilityBytes,0)+renderer.groupBytes,s=world.manager.summary();
 const z=77,x=f.riverX(z)+13,bankSlope=Math.abs(f.riverBase(x+.1,z)-f.riverBase(x-.1,z))/.2;
 const probe={min:[-2,0,-2],max:[2,10,2]},record=obstructionRecord({id:'test',x:0,y:0,z:0,sx:1,sy:1,sz:1,yaw:0},probe);
 const inside=obstructionVisibility(record,obstructionFrame([0,8,0],[0,8,-10],Math.PI/3,1.5,7));
 const near=obstructionVisibility(record,obstructionFrame([0,8,4],[0,8,0],Math.PI/3,1.5,7));
 const far=obstructionVisibility(record,obstructionFrame([0,8,30],[0,8,0],Math.PI/3,1.5,7));
 return[
  {name:'Motor V4: mapas de entorno y materiales',ok:renderer.envTextures.length===2&&prototypes.every(p=>describeSurface(p,0,state.biome).params.every(Number.isFinite)),detail:'Materiales por categoría, atlas originales, radiancia del cielo y contacto ligero.'},
  {name:'Batching global sin modificar instancias',ok:!state.batching||renderer.performance.mainDraws<=renderer.performance.rawDraws,detail:renderer.performance.mainDraws+' llamadas frente a '+renderer.performance.rawDraws+' sin agrupación global; misma distribución y LOD.'},
  {name:'Perfiles de bioma y regresión de densidad',...assetProfileRegression()},
  {name:'Desierto: veinte assets secos, con tres LOD',ok:AssetPacks.get('desert')?.prototypes.length===20&&AssetPacks.get('desert').prototypes.every(p=>p.water.v.length===0&&p.lodTriangles.length===3),detail:'La poza del GLB se ha convertido en cubeta seca. No hay geometría de agua en el paquete.'},
  {name:'Desierto: sin hidrología aunque el perfil pida río',ok:(()=>{const df=new TerrainField({...c,biome:'desert',river:true});return !df.riverActive&&!df.pondsActive&&df.pond(0,0)===null&&df.nearbyPonds(0,0).length===0&&Array.from({length:11},(_,i)=>df.waterInfo(i*73-380,i*41-210)).every(q=>!q.inside&&q.level===null);})(),detail:'La exclusión está en el generador, no solo en la interfaz.'},
  {name:'Manglar conserva el agua a +2 cm',ok:(()=>{const mf=new TerrainField({...c,biome:'mangrove'});return [[0,0],[-178,95],[442,-637]].every(([x,z])=>Math.abs(mf.wetlandLevel(x,z)-mf.surface(x,z)-.02)<1e-8);})(),detail:'Terreno plano y lámina +0,02 m: la corrección anterior no se modifica.'},
  {name:'Cañones: río visible bajo paredes',ok:!f.canyon||Array.from({length:41},(_,i)=>(i-20)*11).every(z=>{const x=f.riverX(z);return f.surface(x,z)<f.riverLevel-.35&&[-1,1].every(side=>f.surface(x+side*42,z)>f.riverLevel+12);}),detail:'Se muestrean fondo y ambas paredes en 451 metros del río.'},
  {name:'Cañones: categorías y modelos íntegros',ok:AssetPacks.get('canyons').sourceTriangles===32908&&AssetPacks.get('canyons').prototypes[2].group===3&&AssetPacks.get('canyons').prototypes[0].group===0,detail:'32.908 triángulos originales, sin cortar copas; acacias en Árboles, mesas/agujas/arco en Rocas.'},
  {name:'Catálogo volcánico completo',ok:AssetPacks.get('volcanoes')?.prototypes.length===20&&AssetPacks.get('volcanoes').prototypes.every(p=>p.imported&&p.lodTriangles.length===3),detail:'20 modelos reales y 3 LOD por pieza; sin assets de prueba.'},
  {name:'Superficie propia de cada bioma',ok:BIOMES.volcanoes.fluid==='lava'&&['savanna','grand_river','mangrove'].every(id=>BIOMES[id].fluid!=='lava')&&AssetPacks.get('volcanoes').prototypes[19].water.v.length>0,detail:'Volcanes usa lava. Sabana, Gran río y Manglar conservan agua.'},
  {name:'Solo biomas integrados, sin modelos de prueba',ok:Object.keys(BIOMES).length===6&&AssetPacks.size===6&&prototypes.every(p=>p.imported)&&!$('assetMode')&&!$('loadAssetPack'),detail:'Sabana, Gran río, Manglar, Volcanes, Cañones y Desierto: veinte slots reales cada uno. Sin selector procedural ni importador de modelos.'},
  {name:'Plantas flotantes sobre agua',ok:b.habitats?.plant_03!=='floating'||world.instances[9].every(a=>{const y=fieldWaterLevel(f,a.x,a.z);return y!==null&&Math.abs(a.y-(y-.055*a.sy))<.005;}),detail:'Los nenúfares no se dispersan en terreno seco; su altura sigue la superficie del agua.'},
  {name:'Escala real de los modelos',ok:assetScaleIssues(prototypes).length===0,detail:'Árboles: '+prototypes.filter((p,i)=>slotGroup(i)===0).map(p=>p.size[1].toFixed(2)+' m').join(' · ')+'. Formaciones rocosas validadas por separado.'},
  {name:'Tres niveles de detalle por asset',ok:prototypes.every(p=>p.lodTriangles.length===3&&p.lodTriangles[0]>=p.lodTriangles[1]&&p.lodTriangles[1]>=p.lodTriangles[2]),detail:'Mallas cercanas completas y versiones reducidas para media y larga distancia.'},
  {name:'Paquete de assets y atlas íntegros',ok:prototypes.every(p=>!p.imported||(p.g.uv?.length===p.g.v.length/9*2&&p.g.index?.length>0&&p.g.material.textures.length===3)),detail:'Mallas indexadas, UV y tres atlas compartidos por bioma.'},
  {name:'Detalle adaptativo sin duplicados',ok:renderer.batches.filter(b=>!b.disposed).every(b=>new Set(Array.from(b.order.subarray(0,b.activeCount))).size===b.activeCount),detail:'Cada instancia se dibuja una sola vez, en uno de sus niveles de detalle.'},
  {name:'20 slots geométricos válidos',ok:prototypes.length===20&&prototypes.every(p=>p.g.v.length&&p.g.v.every(Number.isFinite)),detail:'Veinte identificadores estables; Cañones clasifica los contenidos según sus modelos reales.'},
  {name:'Reconstrucción por semilla y coordenadas',ok:loaded?loaded.signature===hash:hash===fingerprint(scatterWorld({...c,bounds:bo},b,new TerrainField(c)).instances),detail:loaded?'Chunk '+cx+','+cz+': '+loaded.signature+' / regenerado '+hash:'Repetición independiente de la región '+cx+','+cz+': '+hash+'.'},
  {name:'Independencia del orden de generación',ok:hash===fingerprint(two.instances),detail:'Orden inverso de candidatos: misma posición, giro y escala.'},
  {name:'Continuidad de mallas entre chunks',ok:pairs>0&&seamMax===0,detail:pairs+' uniones residentes; diferencia máxima '+seamMax.toExponential(2)+' m.'},
  {name:'Distribución local = distribución conjunta',ok:fingerprint(merged)===fingerprint(both.instances),detail:'Dos chunks separados producen los mismos assets que su región conjunta. Charcas deduplicadas.'},
  {name:'Relieve coherente con la estrategia del bioma',ok:(f.canyon||f.wetland||f.desert)?!sameTerrain:sameTerrain,detail:(f.canyon||f.wetland||f.desert)?'Manglar, Cañones y Desierto tienen relieve propio; los demás mantienen el campo original.':'El relieve compartido de los biomas originales se conserva.'},
  {name:'Residencia acotada y liberación de buffers',ok:s.loaded<=s.capacity&&s.created-s.released===s.loaded&&bytes===renderer.gpuBytes,detail:s.loaded+'/'+s.capacity+' chunks; '+s.released+' liberados. Contabilidad exacta de buffers activos.'},
  {name:'Cámara de terreno limitada a 20 m',ok:mode!=='terrain'||camera.altitude<=20.00001,detail:mode==='terrain'?'Altura sobre el suelo de la cámara: '+camera.altitude.toFixed(3)+' m.':'El catálogo técnico no utiliza el límite de la cámara del mundo.'},
  {name:'Dos skyboxes HDR originales integrados',ok:renderer.skyInfo.length===2&&renderer.skyInfo.every(s=>s.width===2048&&s.height===1024),detail:'2048 × 1024 cada uno. RGBE y filtrado después de decodificar la radiancia.'},
  {name:'Ribera con pendiente suave',ok:!c.river||f.wetland||f.canyon||f.desert||bankSlope<.015,detail:f.desert?'Desierto: sin cauce, sin charcas y sin agua.':f.canyon?'Cañón: fondo bajo el agua y paredes elevadas.':f.wetland?'Manglar: terreno plano y agua elevada 2 cm; los canales se definen por máscara, materiales y vegetación, no por relieve.':c.river?'Pendiente transversal del campo base a 13 m del eje: '+(bankSlope*100).toFixed(2)+' %.':'Río desactivado para este perfil.'},
  {name:'Materiales sin niebla',ok:!FS.includes('uFog')&&!FS.includes('col=mix(col,skyColor'),detail:'Se conserva el color del material a cualquier distancia y el tono azul nocturno.'},
  {name:'Controles de rotación disponibles',ok:['pan','orbit'].includes(dragMode)&&typeof orbit==='function'&&$('orbitMode').getAttribute('aria-pressed')===String(dragMode==='orbit'),detail:'Giro horizontal 360°, inclinación, Q / E y gestos de dos dedos.'},
  {name:'Mover con uno y dos dedos: mismo sentido',ok:touchPanAgreement(),detail:'Misma transformación para el avance y el desplazamiento lateral. Giro, pellizco y WASD no cambian.'},
  {name:'Ocultación por volumen del objeto',ok:inside===0&&near===0&&far===1,detail:'Cámara dentro de copa o a 2 m del volumen: oculto. A 28 m del volumen: visible.'},
  {name:'Cielo separado de la iluminación',ok:!SKY_FS.includes('uNightLight')&&!SKY_FS.includes('uLightDir')&&!SKY_FS.includes('uNight')&&!FS.includes('skyColor'),detail:'Shader unlit independiente. La noche al 100 % dibuja solamente el HDR nocturno.'}

 ];
}
function verify(){
 if(!world||pending)return;$('verifyBtn').disabled=true;
 setTimeout(()=>{try{
  const results=checks();let dialog=$('verifyDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='verifyDialog';document.body.appendChild(dialog);}dialog.replaceChildren();const close=document.createElement('button');close.className='icon closemodal';close.textContent='×';close.onclick=()=>dialog.close();const title=document.createElement('h2');title.textContent=results.every(r=>r.ok)?'Verificación correcta':'Revisar resultados';dialog.append(close,title);
  for(const r of results){const h=document.createElement('h3');h.textContent=(r.ok?'✓  ':'✕  ')+r.name;h.style.color=r.ok?'#d3dea6':'#efaf88';const p=document.createElement('p');p.textContent=r.detail;dialog.append(h,p);}const note=document.createElement('p');note.textContent='Estas pruebas validan invariantes del prototipo, no todos los dispositivos ni todas las semillas posibles.';dialog.append(note);dialog.showModal();window.__biomaChecks=results;
 }catch(error){toast('Error de verificación: '+error.message);}finally{$('verifyBtn').disabled=false;}},20);
}


function checksGround417(){
 if(!world)return[];
 let pairs=0,error=0;
 const n=35,at=(x,z,k)=>(z*n+x)*4+k;
 for(const c of world.manager.chunks.values()){
  const a=c.groundMaskData;if(!a)continue;
  for(const[dx,dz]of[[1,0],[0,1]]){
   const b=world.manager.chunks.get((c.cx+dx)+','+(c.cz+dz))?.groundMaskData;if(!b)continue;pairs++;
   for(let i=1;i<=33;i++)for(let k=0;k<4;k++)error=Math.max(error,Math.abs(a[dx?at(33,i,k):at(i,33,k)]-b[dx?at(1,i,k):at(i,1,k)]));
  }
 }
 let regenerated=true;const c=world.manager.chunks.values().next().value;
 if(c?.groundMaskData){const b=buildGroundMask417(world.config,world.biome,new TerrainField(world.config),chunkBounds(c.cx,c.cz));regenerated=b.every((v,i)=>v===c.groundMaskData[i]);}
 const maps=renderer.batches.filter(b=>!b.disposed&&b.groundTexture);
 return[
 {name:'Suelo: máscaras sin costuras',ok:error===0,detail:pairs+' uniones. Diferencia máxima de canales: '+error+'/255.'},
 {name:'Suelo: anclaje determinista',ok:regenerated,detail:'Misma semilla y coordenadas producen los mismos bytes de material, independientemente de la cámara.'},
 {name:'Suelo: texturas con residencia acotada',ok:maps.length===renderer.groundMapCount&&maps.reduce((s,b)=>s+b.groundBytes,0)===renderer.groundMapBytes&&maps.length===world.manager.chunks.size,detail:maps.length+' máscaras de 35×35. Se liberan junto con cada chunk.'},
 {name:'Suelo: exclusión de objetos y líquidos',ok:maps.every(b=>b.kind===0&&!b.material&&!b.settlement&&!b.lines),detail:'Sólo la malla del terreno tiene máscara. Assets, poblado, agua, lava y cielo mantienen sus shaders.'}
 ];
}
function checks(){return [...checks416(),...checksGround417()];}

function syncV4UI(){
 syncGround417UI();
 if($('lightingMode'))$('lightingMode').value=state.lighting;
 if($('batchingV4'))$('batchingV4').checked=state.batching;
 if($('exposureV4')){$('exposureV4').value=state.exposure;$('exposureV4Val').textContent=state.exposure.toFixed(2)+'×';}
}
function setupV4UI(){
 setupGround417UI();
 $('lightingMode').onchange=()=>{state.lighting=$('lightingMode').value;syncV4UI();};
 $('batchingV4').onchange=()=>{state.batching=$('batchingV4').checked;renderer.discardGroups();renderer.shadowDirty=true;};
 $('exposureV4').oninput=()=>{state.exposure=Number($('exposureV4').value);syncV4UI();};syncV4UI();
}

function applyQuality(){const size=state.quality==='eco'?768:state.quality==='high'?2048:1024;if(renderer.shadowSize!==size){renderer.shadowSize=size;renderer.initShadow();}renderer.resize();$('quality').value=state.quality;}
function showError(error){
 console.error(error);const box=document.createElement('div');box.className='errorbox';const h=document.createElement('h2');h.textContent='El visor no ha podido iniciarse';const p=document.createElement('p');p.textContent=error.message||String(error);const q=document.createElement('p');q.textContent=/Perfil de|paquete|slots|pesos|densidad|densidades|Escala de assets|Atlas inválido|textura integrada/i.test(error.message||'')?'El problema está en los datos del HTML, no en tu dispositivo. Necesitas una versión corregida del archivo.':'Abre el HTML en un navegador con WebGL 2 y aceleración gráfica. No se necesita conexión ni servidor.';const btn=document.createElement('button');btn.textContent='Reintentar';btn.onclick=()=>location.reload();box.append(h,p,q,btn);$('loading').replaceChildren(box);$('loading').classList.remove('hidden');window.__biomaError=String(error);
}

// ===== UI events. =====
$('assetLOD').onchange=()=>{state.assetLOD=$('assetLOD').checked;renderer.shadowDirty=true;};

$('generateBtn').onclick=()=>{generate();setMenu(false);};$('randomBtn').onclick=randomSeed;$('seed').addEventListener('keydown',e=>{if(e.key==='Enter')generate();});
for(const id of['relief','density','river'])$(id).addEventListener('change',()=>generate());
$('size').onchange=()=>{state.n=clamp(Number($('size').value),2,3);world.manager.plan(camera,true);updateStats();};
$('relief').oninput=()=>{$('reliefVal').textContent=(Number($('relief').value)/100).toFixed(2)+'×';};$('density').oninput=()=>{$('densityVal').textContent=(Number($('density').value)/100).toFixed(2)+'×';};
for(const id of['coordX','coordZ'])$(id).onchange=()=>{const x=Number($('coordX').value),z=Number($('coordZ').value);if(Number.isFinite(x)&&Number.isFinite(z))teleport(Math.round(x)*48,Math.round(z)*48);};
document.querySelectorAll('[data-biome]').forEach(el=>el.onclick=()=>{state.biome=el.dataset.biome;generate();});
$('resetPalette').onclick=()=>{delete state.palette[state.biome];generate();};
for(const id of['grid','wire','shadows','autorotate'])$(id).onchange=()=>{state[id]=$(id).checked;renderer.shadowDirty=true;};
$('quality').onchange=()=>{state.quality=$('quality').value;applyQuality();};
$('terrainTab').onclick=()=>switchMode('terrain');$('catalogTab').onclick=()=>switchMode('catalog');$('homeBtn').onclick=()=>{homeCamera();clearSelection();};$('topBtn').onclick=topView;
$('closeInspect').onclick=clearSelection;$('focusBtn').onclick=focusSelection;$('backBtn').onclick=()=>{homeCamera();clearSelection();};
$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('menuBtn').onclick=()=>setMenu(!$('sidebar').classList.contains('open'));$('sidebarShade').onclick=()=>setMenu(false);
$('exportBtn').onclick=exportProfile;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=e=>importProfile(e.target.files[0]);$('verifyBtn').onclick=verify;
document.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>moveWorld(...el.dataset.move.split(',').map(Number)));
$('originBtn').onclick=()=>{teleport(world.field?.riverActive?world.field.riverX(0)+2:0,0);homeCamera();};
bindDragModeButton('panMode','pan');bindDragModeButton('orbitMode','orbit');
$('dayState').onclick=()=>setNight(state.night>.5?0:1);$('dayBtn').onclick=()=>setNight(0);$('nightBtn').onclick=()=>setNight(1);$('nightMix').oninput=()=>setNight(Number($('nightMix').value)/100);
$('autoCycle').onchange=()=>{state.autoCycle=$('autoCycle').checked;atmosphere.phase=Math.acos(1-2*state.night)/TAU;};
$('autoHide').onchange=()=>setObstruction($('autoHide').checked);$('hideDistance').oninput=()=>setObstruction(state.autoHide,Number($('hideDistance').value));
$('nightLight').oninput=()=>{state.nightLight=Number($('nightLight').value)/100;syncAtmosphere();};
$('waterSpeed').oninput=()=>{state.waterSpeed=Number($('waterSpeed').value);syncAtmosphere();};$('waterScale').oninput=()=>{state.waterScale=Number($('waterScale').value);syncAtmosphere();};$('skyYaw').oninput=()=>{state.skyYaw=Number($('skyYaw').value);};
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Este navegador no ofrece pantalla completa.');}catch(error){toast('Pantalla completa no disponible en este contexto.');}};
$('shotBtn').onclick=()=>{if(!world)return;renderer.render(camera,atmosphere.waterTime);canvas.toBlob(blob=>{if(blob){downloadBlob(blob,'bioma_'+state.biome+'_'+(atmosphere.night>.5?'noche':'dia')+'.png');toast('Captura guardada.');}else toast('El navegador no ha permitido guardar la captura.');},'image/png');};
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||document.querySelector('dialog[open]'))return;
 const key=e.key.toLowerCase();if(['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){keys.add(key);e.preventDefault();}
 if(key==='r'){homeCamera();clearSelection();}if(key==='t')topView();if(key==='n')setNight(state.night>.5?0:1);if(key==='escape'){clearSelection();setMenu(false);}if(key==='o')setDragMode(dragMode==='pan'?'orbit':'pan');
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',resetNavigationInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetNavigationInput();});
window.addEventListener('resize',()=>{if(renderer)renderer.resize();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(world)world.manager.dispose();showError(Error('Se ha perdido el contexto gráfico. Recarga el archivo o reduce la calidad.'));});
updateNavigationHint();
let lastFrame=0,lastFPS=0,frameCount=0,lastHUD=0;
function animate(t){
 requestAnimationFrame(animate);if(document.hidden||!renderer||!world||window.__biomaError){lastFrame=t;return;}
 const dt=Math.min((t-lastFrame)/1000,.08);if(state.quality==='eco'&&t-lastFrame<30)return;lastFrame=t;
 if(state.autorotate&&!pointers.size)camera.goal.theta+=dt*.12;moveInput(dt);updateCamera(dt);updateAtmosphere(dt);if(mode==='terrain')world.manager.tick(camera);renderer.render(camera,atmosphere.waterTime);updateGalleryLabels();frameCount++;
 if(t-lastHUD>250){updateStats();if(state.autoCycle)syncAtmosphere();lastHUD=t;}
 if(t-lastFPS>1000){$('fps').textContent=Math.round(frameCount*1000/(t-lastFPS))+' FPS';$('triangles').textContent=format(Math.round(renderer.triangles))+' triángulos';$('rendererLabel').textContent='V4 · '+renderer.draws+' LLAMADAS / '+renderer.performance.rawDraws+' · '+(state.batching?'BATCHING':'POR CHUNK');$('compassArrow').style.transform='rotate('+(-camera.theta*180/Math.PI)+'deg)';frameCount=0;lastFPS=t;}
}
window.BiomaLab={
 version:'4.1.10',defaultBiome:'savanna',getState:snapshot,
 getFluid:()=>({kind:currentBiome().fluid||'water',animated:currentBiome().fluid!=='none'}),
 getBiomes:()=>Object.entries(BIOMES).map(([id,b])=>({id,name:b.name,slots:20})),
 getMaterials:()=>prototypes.map((p,i)=>({slot:i,name:p.name,...describeSurface(p,0,state.biome)})),
 setLighting:mode=>{if(!['classic','studio','african','illustrated'].includes(mode))throw Error('Iluminación no válida');state.lighting=mode;syncV4UI();},
 setBatching:value=>{state.batching=!!value;renderer.discardGroups();renderer.shadowDirty=true;syncV4UI();},
 setExposure:value=>{if(!Number.isFinite(value)||value<.7||value>1.4)throw Error('Exposición fuera de rango');state.exposure=value;syncV4UI();},
 getRenderedAssets:()=>prototypes.map((p,i)=>({slot:SLOTS[i].id,name:p.name,size:[...p.size],count:renderer.batches.filter(b=>!b.disposed&&b.slot===i&&b.kind===0&&renderer.visible(b)).reduce((n,b)=>n+b.activeCount,0)})),
 getAssetPacks:()=>[...AssetPacks.values()].map(p=>({id:p.id,title:p.title,source:p.source,slots:p.prototypes.length,triangles:p.sourceTriangles,atlasBytes:p.material.gpuBytes})),
 setAssetLOD:enabled=>{state.assetLOD=!!enabled;syncAssetUI();},

 getSummary:()=>world?{renderV4:{...renderer.performance,lighting:state.lighting,batching:state.batching,mergedBufferBytes:renderer.groupBytes},signature:world.signature,terrainSignature:world.terrainSignature,counts:world.instances.map(a=>a.length),instances:world.instances.flat().length,slots:prototypes.length,triangles:renderer.triangles,drawCalls:renderer.draws,mode,generationMs,stream:world.manager.summary(),fog:false,navigationMode:dragMode,camera:{theta:camera.theta,eye:[...camera.eye],target:[...camera.target],goal:{...camera.goal,target:[...camera.goal.target]},altitude:camera.altitude,phi:camera.phi,distance:camera.distance},night:atmosphere.night,nightLight:state.nightLight,skyUnlit:true,skyPasses:renderer.skyPasses.map(p=>({...p})),obstruction:{...renderer.obstructionStats,enabled:state.autoHide,distance:state.hideDistance},skyboxes:renderer.skyInfo,modelSource:'embedded-glb',assetLOD:state.assetLOD,importedSlots:prototypes.filter(p=>p.imported).length,modelLodDrawCounts:renderer.batches.filter(b=>!b.disposed&&renderer.visible(b)&&b.material).reduce((a,b)=>{for(const s of b.drawSlices)a[s.level]+=s.count;return a;},[0,0,0]),caches:{height:world.field.heightCache.size,pond:world.field.pondCache.size}}:null,
 verify:checks,regenerate:()=>generate(),validateProfile,teleport,setNight,setDragMode,setObstruction,
 getObstruction:()=>({...renderer.obstructionStats,enabled:state.autoHide,distance:state.hideDistance,instances:[...renderer.instanceVisibility].map(([id,visibility])=>({id,visibility}))}),
 updateObstructions:()=>{renderer.updateObstructions(camera,true);renderer.render(camera,atmosphere.waterTime);},
 getSkies:()=>({mix:atmosphere.night,dayWeight:1-atmosphere.night,nightWeight:atmosphere.night,unlit:true,passes:renderer.skyPasses.map(p=>({...p})),panoramas:renderer.skyInfo.map(p=>({...p}))}),
 setNightLight:value=>{if(!Number.isFinite(value)||value<.55||value>1.45)throw Error("Claridad nocturna fuera de rango");state.nightLight=value;syncAtmosphere();},
 setCamera:values=>{if(values.target){camera.goal.target=[...values.target];camera.target=[...values.target];}for(const k of['theta','phi','distance'])if(Number.isFinite(values[k])){camera.goal[k]=values[k];camera[k]=values[k];}if(Number.isFinite(values.height))camera.goal.distance=values.height/Math.max(.1,Math.cos(camera.goal.phi));updateCamera(1);if(mode==='terrain')world.manager.plan(camera,true);},
 setBiome:id=>{if(!Object.hasOwn(BIOMES,id))throw Error('Bioma desconocido');state.biome=id;generate();},
 getChunk:(cx,cz)=>{const c=world?.manager.chunks.get(cx+','+cz);return c?{cx,cz,signature:c.signature,terrainSignature:c.terrainSignature,edges:c.edges,counts:c.instances.map(a=>a.length)}:null;},
 scatter:(overrides={},reverse=false)=>{const c={...snapshot(),bounds:chunkBounds(state.cx,state.cz),...overrides},b=biomeFrom(c),f=new TerrainField(c);return scatterWorld(c,b,f,reverse);},
 getWorldInstances:()=>world?.instances, getCanyonSection:z=>world?.field.canyon?canyonFrame(world.field,z):null,
 sampleHeight:(x,z)=>world?.field.surface(x,z),sampleWater:(x,z)=>world?.field.waterInfo(x,z),sampleDesert:(x,z)=>world?.field.desert?desertSample(world.field,x,z):null,
 getWaterGeometry:()=>({triangles:renderer.batches.filter(b=>!b.disposed&&b.kind===1).reduce((a,b)=>a+b.vertexCount*b.count/3,0),batches:renderer.batches.filter(b=>!b.disposed&&b.kind===1).length}),sampleRiver:z=>world.field.desert?null:({x:world.field.riverX(z),level:world.field.riverLevel}),
 getPrototype:i=>prototypes[i]?{slot:SLOTS[i].id,source:prototypes[i].source,description:prototypes[i].description,name:prototypes[i].name,imported:!!prototypes[i].imported,lodTriangles:prototypes[i].lodTriangles,triangles:prototypes[i].triangles,min:prototypes[i].min,max:prototypes[i].max,sourceComponents:prototypes[i].sourceComponents,waterTriangles:prototypes[i].water.v.length/27}:null,
 render:time=>renderer.render(camera,Number.isFinite(time)?time:atmosphere.waterTime),getGLError:()=>gl.getError(),
 setGround:setGround417,
 getGroundInfo:()=>({enabled:state.groundSurface,strength:state.groundStrength,micro:state.groundMicro,maps:renderer.groundMapCount,textureBytes:renderer.groundTextureBytes+renderer.groundMapBytes,geometryAdded:0,drawPassesAdded:0,maskSize:35,maskStep:1.5,tileSize:renderer.groundBiomeTextures[state.biome]?.width??0,normalSize:renderer.groundBiomeTextures[state.biome]?.normalWidth??0,embedded:true,loadedBiomes:Object.keys(renderer.groundBiomeTextures)}),
 sampleGround:(x,z)=>world?groundSample417(world.field,world.biome,x,z):null,
 getArtProfile:()=>JSON.parse(JSON.stringify(ART416_PROFILES[state.biome])),
 getSettlement:()=>world?.settlement?{...world.settlement}:null,
 getMaterialDiagnostics:()=>({version:'4.1.10',name:GROUND417_BIOME_TILES[state.biome].name,tile:GROUND417_BIOME_TILES[state.biome],activeBiome:renderer.activeGround410,groundGPU:renderer.groundTextureBytes,populationGPU:settlementMaterial?.gpuBytes,uvRestored:settlementGeometry?.uv.length,normalTangents:settlementGeometry?.tangent.length,populationMaps:settlementMaterial?.images.map(im=>[im.naturalWidth,im.naturalHeight]),localBase:settlementGeometry?.min[1],pad:world?.config.settlementSite}),
 getShaders:()=>({vertex:VS,fragment:FS}),
 getWorkerStatus:()=>({active:!!world?.manager.worker,pending:!!world?.manager.busy,queue:world?.manager.queue.length||0})
};
(async()=>{try{
 gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!gl)throw Error('WebGL 2 no está disponible en este navegador o visor de archivos.');
 renderer=new Renderer(gl);renderer.loadSkies();await renderer.loadGroundBiomeTextures417();await loadSettlement410();
 for(const payload of document.querySelectorAll('[data-biome-payload]')){await registerEmbeddedBiome(JSON.parse(payload.textContent));payload.remove();}
 setupLayers();setupV4UI();applyQuality();setDragMode('orbit');generate(true);requestAnimationFrame(animate);
}catch(error){showError(error);}})();

})();

