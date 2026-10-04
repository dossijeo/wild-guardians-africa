// Native Bioma Lab V4.1.10.3 generator; gameplay supplies the persisted village site.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
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
const num=v=>Number(v.toFixed(4));
function settlementBlend410(s,x,z){
 const dx=x-s.x,dz=z-s.z,c=Math.cos(s.yaw),n=Math.sin(s.yaw);
 const xx=dx*c-dz*n,zz=dx*n+dz*c;
 const edge=Math.max(Math.abs(xx)-(s.hx||14),Math.abs(zz)-(s.hz||14));
 return 1-smooth(0,6,edge);
}
const NO_SETTLEMENT_SITE=Object.freeze({x:1e30,z:1e30,y:0,yaw:0,clearRadius:0,softRadius:0,haloRadius:0});
function findSettlementSite(field,b){return field.c.settlementSite||NO_SETTLEMENT_SITE;}
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
  const cell=this.featureCell,tx=Math.round(x/cell),tz=Math.round(z/cell);
  // Adjacent terrain probes usually share one feature cell. Retain only its
  // nine deterministic ponds, in the original iteration order.
  if(this.pondNeighborhood?.tx===tx&&this.pondNeighborhood.tz===tz)return this.pondNeighborhood.ponds;
  const span=1,a=[];
  for(let zc=tz-span;zc<=tz+span;zc++)for(let xc=tx-span;xc<=tx+span;xc++)a.push(this.pond(xc,zc));
  this.pondNeighborhood={tx,tz,ponds:Object.freeze(a)};
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


export {TerrainField,scatterWorld,hashString,hashCell,noise,rand,SLOTS,GROUPS,hex,canyonFrame,canyonGroundColor,desertGroundColor};
