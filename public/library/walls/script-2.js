/* BASTIÓN V4.1 / larger arched gates with extra scale for reinforced adobe.
 * Preserves V2 geometry, axis alignment, plinth removal and opaque morph renderer.
 * Scene v3 persists active collapse; scene v1/v2 imports remain supported. */
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const MATERIALS=[
 {id:'zarzas',name:'Zarzas',desc:'Ramas entrelazadas',hp:100},
 {id:'empalizada',name:'Empalizada',desc:'Madera y cuerda',hp:200},
 {id:'adobe',name:'Adobe',desc:'Tierra compactada',hp:300},
 {id:'piedra',name:'Piedra',desc:'Mampostería',hp:500},
 {id:'reforzado',name:'Adobe reforzado',desc:'Tierra y estructura',hp:400}
];
const DEFAULTS={hp:Object.fromEntries(MATERIALS.map(m=>[m.id,m.hp])),impact:20,smooth:true,snap:true,shadows:true,labels:true,grid:true};
const LIMIT=240,UNIT=2.18,BOUNDS=23;
const LARGE_GATE_SCALES={adobe:1.4,piedra:1.4,reforzado:1.6};
const LARGE_GATE_MATERIALS=new Set(Object.keys(LARGE_GATE_SCALES));
const gateScale=(material,kind='gate')=>kind==='gate'?(LARGE_GATE_SCALES[material]||1):1;
// Collapse owns both health and visual morph while active: healing / scrubbing
// cannot interrupt it. Store elapsed seconds, not an absolute browser timestamp.
const COLLAPSE_THRESHOLD=.20,COLLAPSE_SECONDS=1.4,HEALTH_EPSILON=1e-9;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const deep=x=>JSON.parse(JSON.stringify(x));
const fmt=x=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(x);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const mid=(a,b)=>[(a[0]+b[0])*.5,(a[1]+b[1])*.5];
const MODE_COPY={draw:['Traza una línea o curva. Al cerrar un recinto, se añade una puerta automáticamente.','Traza un muro. Cierra un recinto para añadir su puerta.','route'],inspect:['Toca una pieza para consultar su vida, probar el daño o eliminarla. El borrado se puede deshacer.','Toca una pieza para examinarla o eliminarla.','eye'],hit:['Cada toque daña solo la pieza elegida. Al llegar al 20 % o menos, colapsa automáticamente hasta el 0 %.','Golpea el muro. Al 20 % colapsa hasta los escombros.','hit'],repair:['Repara una pieza estable o reconstruye sus escombros. Un colapso en curso no se puede detener.','Toca un tramo para repararlo y reconstruirlo.','repair'],camera:['Arrastra para girar. Con Shift, desplaza. Dos dedos desplazan y amplían.','Arrastra para girar · Dos dedos para mover y ampliar.','hand']};
function pointSegment(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(!l)return dist(p,a);let t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l,0,1);return dist(p,[a[0]+t*dx,a[1]+t*dz]);}
function simplify(points,epsilon=.12){if(points.length<3)return points;let d=0,index=0;for(let i=1;i<points.length-1;i++){let v=pointSegment(points[i],points[0],points.at(-1));if(v>d){d=v;index=i;}}if(d>epsilon){let a=simplify(points.slice(0,index+1),epsilon),b=simplify(points.slice(index),epsilon);return a.slice(0,-1).concat(b);}return[points[0],points.at(-1)];}
function smoothPath(p){if(p.length<3)return p;const out=[p[0]];for(let i=0;i<p.length-1;i++){let a=p[i],b=p[i+1];out.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}out.push(p.at(-1));return out;}
function resample(points){
 if(points.length<2)return[];const d=[0];for(let i=1;i<points.length;i++)d.push(d.at(-1)+dist(points[i-1],points[i]));
 const length=d.at(-1);if(length<.15)return[];const n=Math.min(350,Math.max(1,Math.ceil(length/UNIT))),step=length/n;
 const at=t=>{let j=1;while(j<d.length-1&&d[j]<t)j++;const f=clamp((t-d[j-1])/(d[j]-d[j-1]||1),0,1);return[points[j-1][0]*(1-f)+points[j][0]*f,points[j-1][1]*(1-f)+points[j][1]*f];};
 const slots=[];for(let i=0;i<n;i++){const a=at(i*step),b=at((i+1)*step),chord=dist(a,b);if(chord<.06)continue;slots.push({x:(a[0]+b[0])*.5,z:(a[1]+b[1])*.5,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:chord/UNIT});}return slots;
}

class BastionApp{
 constructor(renderer,raw){
  this.r=renderer;this.raw=raw;this.settings=deep(DEFAULTS);this.pieces=[];this.nextId=1;this.material='adobe';this.mode='draw';this.cameraMode=false;this.library=false;this.selected=null;this.hover=null;this.pointer=null;this.stroke=[];this.pointers=new Map();this.gesture=null;this.undoStack=[];this.redoStack=[];this.particles=[];this.floaters=[];this.dirty=true;this.lastRender=0;this.lastTime=0;this.confirmFn=null;this.catalog=[];this.saveTimer=null;this.overlay=$('#overlay');this.ctx=this.overlay.getContext('2d');this.world=$('#world');this.lastAngle=0;this.needsFit=false;
  this.makeMaterials();this.makeSettings();this.bindUI();this.bindPointers();
  let restored=false;try{const text=(localStorage.getItem('bastion.scene.v4')||localStorage.getItem('bastion.scene.v3')||localStorage.getItem('bastion.scene.v2')||localStorage.getItem('bastion.scene.v1'));if(text){this.restore(this.validate(JSON.parse(text)),false);restored=true;$('#local-status').innerHTML='Escena local recuperada<br>Todo está guardado en tu navegador';}}catch(e){console.info('No local scene restored:',e.message);}
  if(!restored)this.makeDemo();
  this.resize();if(!restored)this.fit();this.syncUI();
  new ResizeObserver(()=>this.resize()).observe($('#stage'));
  this.world.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;$('#loading').hidden=false;$('#loading-text').textContent='Se ha perdido el contexto gráfico. Tu escena se guardó localmente cuando fue posible. Recarga el archivo para continuar.';this.autosave();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.dirty=true;this.lastTime=0;}});
  requestAnimationFrame(t=>this.frame(t));
 }
 makeMaterials(){const el=$('#materials');for(const m of MATERIALS){const b=document.createElement('button');b.type='button';b.className='material'+(m.id===this.material?' active':'');b.dataset.material=m.id;b.setAttribute('role','radio');b.setAttribute('aria-checked',m.id===this.material?'true':'false');b.innerHTML=`<img class="material-image" src="${this.raw.icons[m.id]}" alt="Muro intacto de ${m.name.toLowerCase()}" draggable="false"><span class="material-text"><span class="material-name">${m.name}</span><span class="material-desc">${m.desc}</span></span><span class="material-hp" data-hp="${m.id}">${m.hp} PV</span><span class="material-check"></span>`;b.addEventListener('click',()=>{this.material=m.id;this.syncUI();this.dirty=true;});el.appendChild(b);}}
 makeSettings(){const grid=$('#resistance-settings');for(const m of MATERIALS){let n=document.createElement('label');n.htmlFor='hp-'+m.id;n.textContent=m.name;let v=document.createElement('input');v.type='number';v.min='25';v.max='5000';v.step='5';v.value=m.hp;v.id='hp-'+m.id;v.setAttribute('aria-label','Resistencia de '+m.name);let g=document.createElement('span');g.className='gate-value';g.id='gate-hp-'+m.id;g.textContent=fmt(m.hp*.6);v.addEventListener('input',()=>g.textContent=fmt(Number(v.value)*.6));grid.append(n,v,g);}}
 makePiece(material,params={},health=1){
  const kind=params.kind||'wall',maxHp=this.settings.hp[material]*(kind==='gate'?.6:1),ratio=clamp(health,0,1);
  const baseScaleX=(typeof params.baseScaleX==='number'&&Number.isFinite(params.baseScaleX)?params.baseScaleX:(params.scaleX||1));
  const gScale=gateScale(material,kind);
  const p={id:this.nextId++,material,kind,autoGate:!!params.autoGate,x:params.x||0,z:params.z||0,angle:params.angle||0,baseScaleX,scaleX:baseScaleX*gScale,scaleY:params.scaleY||gScale,scaleZ:params.scaleZ||gScale,maxHp,hp:maxHp*ratio,visual:ratio,flash:0,collapse:null};
  if(params.collapse){
   p.collapse={elapsed:params.collapse.elapsed,fromHealth:params.collapse.fromHealth,fromVisual:params.collapse.fromVisual};
   const t=clamp(p.collapse.elapsed/COLLAPSE_SECONDS,0,1),ease=t*t*(3-2*t);
   p.hp=maxHp*p.collapse.fromHealth*(1-t);p.visual=p.collapse.fromVisual*(1-ease);
   if(t===1){p.hp=0;p.visual=0;p.collapse=null;}
  }else if(ratio>0&&ratio<=COLLAPSE_THRESHOLD+HEALTH_EPSILON){
   // Older scenes may contain a stable wall below the new failure threshold.
   // Apply the new rule on import rather than leaving an immortal critical wall.
   p.collapse={elapsed:0,fromHealth:ratio,fromVisual:ratio};
  }
  return p;
 }
 appendPath(points,material,health=1,avoid=true){const slots=resample(points);let added=0;for(const s of slots){if(this.pieces.length>=LIMIT)break;if(avoid&&this.pieces.some(p=>Math.hypot(p.x-s.x,p.z-s.z)<.35&&Math.abs(Math.sin(p.angle-s.angle))<.18))continue;this.pieces.push(this.makePiece(material,s,health));added++;this.lastAngle=s.angle;}return added;}
 makeDemo(){this.pieces=[];this.nextId=1;
  this.appendPath(smoothPath([[-7.1,4.4],[-7.1,-3.6],[-5.7,-5.1],[4.7,-5.1],[6.4,-3.5],[6.4,4.4],[-7.1,4.4]]),'adobe',1,false);
  this.ensureAutomaticGates();
  this.appendPath(smoothPath([[-10.5,5.4],[-11.1,1],[-10.4,-3.7]]),'empalizada',1,false);
  this.appendPath([[10.2,-4.4],[10.2,3.9]],'piedra',1,false);
  this.appendPath([[-6,8.4],[-1.9,8.4]],'zarzas',1,false);
  this.appendPath([[4.7,8.1],[8.8,8.1]],'reforzado',1,false);
  let ad=this.pieces.filter(p=>p.material==='adobe'&&p.kind==='wall');for(const [i,h]of[[3,.68],[13,.34]])if(ad[i]){ad[i].hp=ad[i].maxHp*h;ad[i].visual=h;}
  let stone=this.pieces.filter(p=>p.material==='piedra');if(stone[2]){stone[2].hp=0;stone[2].visual=0;}if(stone[1]){stone[1].hp=stone[1].maxHp*.5;stone[1].visual=.5;}
  this.selected=null;this.dirty=true;
 }
 getSelected(){return this.pieces.find(p=>p.id===this.selected)||null;}
 setMode(mode){this.mode=mode;this.cameraMode=mode==='camera';if(mode==='hit')this.selected=null;this.stroke=[];this.pointer=null;this.syncUI();this.dirty=true;}
 setSelected(p){this.selected=this.mode==='hit'?null:(p?p.id:null);this.syncInspector();this.dirty=true;}
 syncUI(){for(const b of $$('.material')){const active=b.dataset.material===this.material;b.classList.toggle('active',active);b.setAttribute('aria-checked',String(active));}for(const m of MATERIALS){$(`[data-hp="${m.id}"]`).textContent=fmt(this.settings.hp[m.id])+' PV';}$('#active-material-label').textContent=MATERIALS.find(m=>m.id===this.material).name;
  for(const b of $$('[data-mode]')){let active=b.dataset.mode===this.mode&&!this.cameraMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
  const copy=MODE_COPY[this.cameraMode?'camera':this.mode];$('#mode-help').textContent=copy[0];$('#hint-text').textContent=this.library?'Explora las 20 piezas sin peana. Arrastra para girar la vista.':copy[1];$('#hint-icon').setAttribute('href','#i-'+(this.library?'stack':copy[2]));$('#camera-mode').classList.toggle('active',this.cameraMode);$('#camera-mode').setAttribute('aria-pressed',String(this.cameraMode));$('#top-view').classList.toggle('active',this.r.camera.top);$('#top-view').setAttribute('aria-pressed',String(this.r.camera.top));$('#grid-toggle').classList.toggle('active',this.settings.grid);$('#grid-toggle').setAttribute('aria-pressed',String(this.settings.grid));
  $('#impact-range').value=this.settings.impact;$('#impact-value').textContent=this.settings.impact;$('#undo').disabled=!this.undoStack.length;$('#redo').disabled=!this.redoStack.length;$('#stats').hidden=this.library;$('#library-legend').hidden=!this.library;$('#tab-terrain').classList.toggle('active',!this.library);$('#tab-library').classList.toggle('active',this.library);$('#tab-terrain').setAttribute('aria-pressed',String(!this.library));$('#tab-library').setAttribute('aria-pressed',String(this.library));$('#scene-title').textContent=this.library?'Atlas de materiales':'Terreno de pruebas';$('#scene-sub').textContent=this.library?'5 materiales · 4 estados independientes':'Dibuja. Construye. Ponlo a prueba.';$('#clear').disabled=this.library;$('#demo').disabled=this.library;
  this.world.style.cursor=this.cameraMode||this.library?'grab':this.mode==='draw'?'crosshair':this.mode==='hit'?'crosshair':'pointer';this.syncStats();this.syncInspector();
 }
 syncStats(){const n=this.pieces.length,alive=this.pieces.filter(p=>p.hp>0).length,total=this.pieces.reduce((s,p)=>s+p.maxHp,0),life=this.pieces.reduce((s,p)=>s+p.hp,0);$('#stat-pieces').innerHTML=`${n}<span>/ ${LIMIT}</span>`;$('#stat-standing').textContent=alive;$('#stat-health').innerHTML=`${total?Math.round(life/total*100):100}<span>%</span>`;}
 syncInspector(){
  const p=this.getSelected(),panel=$('#inspector');panel.hidden=!p||this.library||this.mode==='hit';
  if(panel.hidden)return;
  const falling=!!p.collapse,ratio=p.hp/p.maxHp,pc=Math.round(ratio*100),name=MATERIALS.find(m=>m.id===p.material).name;
  panel.classList.toggle('is-collapsing',falling);
  $('#inspector-id').textContent=`TRAMO ${String(p.id).padStart(3,'0')} · ${falling?'COLAPSANDO':p.hp===0?'DESTRUIDO':p.hp===p.maxHp?'INTACTO':'CON DAÑOS'}`;
  $('#inspector-name').textContent=name;
  $('#inspector-kind').textContent=p.kind==='gate'?`Puerta · 60 % del muro · ${LARGE_GATE_MATERIALS.has(p.material)?Math.round(gateScale(p.material,'gate')*100)+' % del tamaño · ':''}${fmt(p.maxHp)} PV`:`Muro · ${fmt(p.maxHp)} PV de resistencia`;
  $('#health-percent').textContent=pc+'%';$('#health-pv').textContent=`${fmt(p.hp)} / ${fmt(p.maxHp)} PV`;
  $('#health-fill').style.width=(ratio*100)+'%';
  const color=falling||ratio<=COLLAPSE_THRESHOLD?'var(--red)':ratio>.5?'var(--green)':'var(--amber)';
  $('#health-percent').style.color=color;$('#health-fill').style.background=color;
  $('#health-scrub').value=ratio*100;$('#scrub-value').textContent=pc+'%';
  $('#middle-step').textContent=p.kind==='gate'?'Transición':'Dañado';
  $('#inspect-hit').disabled=falling||p.hp<=0;$('#inspect-repair').disabled=falling||p.hp>=p.maxHp;
  $('#inspect-repair').title=falling?'No se puede detener un colapso':p.hp===0?'Reconstruir la pieza desde sus escombros':'Restaurar al 100 %';
  $('#health-scrub').disabled=falling;for(const b of $$('.health-preset'))b.disabled=falling;
  $('#collapse-notice').hidden=!falling;
  $('#inspect-delete').disabled=false;
  $('#inspect-delete').title=(p.hp===0&&!falling?'Retirar los escombros':'Eliminar esta pieza')+' · Se puede deshacer';
 }
 update(){this.syncUI();this.dirty=true;this.autosave();}
 history(){this.undoStack.push(this.snapshot());if(this.undoStack.length>40)this.undoStack.shift();this.redoStack=[];}
 snapshot(){
  return{format:'bastion.scene',version:4,settings:deep(this.settings),camera:{...this.r.camera},pieces:this.pieces.map(p=>({
   id:p.id,material:p.material,kind:p.kind,autoGate:!!p.autoGate,x:p.x,z:p.z,angle:p.angle,scaleX:p.scaleX,baseScaleX:p.baseScaleX??(p.kind==='gate'?p.scaleX/gateScale(p.material,p.kind):p.scaleX),health:p.hp/p.maxHp,
   ...(p.collapse?{collapse:{elapsed:p.collapse.elapsed,fromHealth:p.collapse.fromHealth,fromVisual:p.collapse.fromVisual}}:{})
  }))};
 }
 restore(s,fit=false){this.settings=deep(s.settings);this.pieces=[];this.nextId=1;for(const q of s.pieces){const p=this.makePiece(q.material,q,q.health);p.id=q.id;this.pieces.push(p);this.nextId=Math.max(this.nextId,p.id+1);}if(s.camera){Object.assign(this.r.camera,s.camera);this.r.updateCamera();}this.selected=null;this.savedSelected=null;this.scrubbing=false;this.particles=[];this.floaters=[];this.syncUI();if(fit)this.fit();this.dirty=true;}
 validate(s){if(!s||s.format!=='bastion.scene'||![1,2,3,4].includes(s.version)||!Array.isArray(s.pieces))throw Error('Este archivo no es una escena de Bastión compatible (v1 / v2 / v3 / v4).');if(s.pieces.length>LIMIT)throw Error(`La escena supera el límite de ${LIMIT} piezas.`);const out={format:s.format,version:s.version,settings:deep(DEFAULTS),camera:null,pieces:[]};const ids=new Set();for(const m of MATERIALS){const hp=s.settings?.hp?.[m.id];if(typeof hp==='number'&&Number.isFinite(hp)&&hp>=25&&hp<=5000)out.settings.hp[m.id]=hp;else if(hp!==undefined)throw Error('La resistencia de un material no es válida.');}for(const k of['smooth','snap','shadows','labels','grid'])if(typeof s.settings?.[k]==='boolean')out.settings[k]=s.settings[k];if(Number.isFinite(s.settings?.impact))out.settings.impact=clamp(s.settings.impact,5,100);
  for(const [i,p]of s.pieces.entries()){if(!p||!MATERIALS.some(m=>m.id===p.material)||!['wall','gate'].includes(p.kind))throw Error('Hay un material o tipo de pieza desconocido.');for(const k of['x','z','angle','scaleX','health'])if(typeof p[k]!=='number'||!Number.isFinite(p[k]))throw Error('La escena contiene coordenadas o vida no válidas.');if(p.baseScaleX!==undefined&&(typeof p.baseScaleX!=='number'||!Number.isFinite(p.baseScaleX)))throw Error('La escena contiene escalas base no válidas.');if(Math.abs(p.x)>BOUNDS+2||Math.abs(p.z)>BOUNDS+2||p.scaleX<.02||p.scaleX>3||p.health<0||p.health>1||Math.abs(p.angle)>1000)throw Error('Hay piezas fuera de los límites permitidos.');let id=Number.isInteger(p.id)&&p.id>0?p.id:i+1;while(ids.has(id))id++;ids.add(id);const q={id,material:p.material,kind:p.kind,autoGate:!!p.autoGate,x:p.x,z:p.z,angle:p.angle,scaleX:p.scaleX,baseScaleX:p.baseScaleX,health:p.health};
   if(p.collapse!=null){
    const c=p.collapse;
    if(typeof c!=='object'||!['elapsed','fromHealth','fromVisual'].every(k=>typeof c[k]==='number'&&Number.isFinite(c[k]))||c.elapsed<0||c.elapsed>COLLAPSE_SECONDS||c.fromHealth<0||c.fromHealth>COLLAPSE_THRESHOLD+HEALTH_EPSILON||c.fromVisual<0||c.fromVisual>1)throw Error('La escena contiene un estado de colapso no válido.');
    q.collapse={elapsed:c.elapsed,fromHealth:c.fromHealth,fromVisual:c.fromVisual};
    q.health=c.fromHealth*(1-c.elapsed/COLLAPSE_SECONDS);
   }
   out.pieces.push(q);}
  if(s.camera&&['theta','elev','size','x','z'].every(k=>typeof s.camera[k]==='number'&&Number.isFinite(s.camera[k]))){out.camera={theta:s.camera.theta% (Math.PI*2),elev:clamp(s.camera.elev,.32,1.48),size:clamp(s.camera.size,4,40),x:clamp(s.camera.x,-30,30),z:clamp(s.camera.z,-30,30),top:!!s.camera.top};}return out;
 }
 undo(){if(!this.undoStack.length)return;this.redoStack.push(this.snapshot());this.restore(this.undoStack.pop());this.update();this.toast('Última acción deshecha.');}
 redo(){if(!this.redoStack.length)return;this.undoStack.push(this.snapshot());this.restore(this.redoStack.pop());this.update();this.toast('Acción recuperada.');}
 autosave(){clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>{try{localStorage.setItem('bastion.scene.v4',JSON.stringify(this.snapshot()));$('#local-status').innerHTML='Guardado en este navegador<br>Sin conexión · WebGL2';}catch(e){$('#local-status').innerHTML='Guardado local no disponible<br>Usa «Guardar escena»';}},450);}
 toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
 confirm(title,message,fn){this.confirmFn=fn;$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-dialog').showModal();}
 exportScene(){const s=this.snapshot();s.savedAt=new Date().toISOString();this.download(new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),'bastion_escena.json');this.toast('Escena guardada: disposición, vida, colapsos en curso y ajustes.');}
 download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 capture(){this.r.render(this.library?this.catalog:this.pieces,this.library?null:this.selected,this.settings);this.drawOverlay(performance.now());const c=document.createElement('canvas');c.width=this.world.width;c.height=this.world.height;const ctx=c.getContext('2d');ctx.drawImage(this.world,0,0);ctx.drawImage(this.overlay,0,0,c.width,c.height);ctx.font=`${Math.round(c.width/65)}px Georgia`;ctx.fillStyle='#35452b';ctx.fillText('BASTIÓN / LABORATORIO DE MURALLAS',24,c.height-24);c.toBlob(b=>{if(b)this.download(b,'bastion_terreno.png');else this.toast('No se pudo crear la imagen.');},'image/png');}
 openSettings(){for(const m of MATERIALS){$('#hp-'+m.id).value=this.settings.hp[m.id];$('#gate-hp-'+m.id).textContent=fmt(this.settings.hp[m.id]*.6);}$('#settings-impact').value=this.settings.impact;$('#settings-impact-value').textContent=this.settings.impact+' PV';for(const k of['smooth','snap','shadows','labels'])$('#'+k+'-toggle').checked=this.settings[k];$('#settings-dialog').showModal();}
 applySettings(){for(const m of MATERIALS){const v=Number($('#hp-'+m.id).value);if(!Number.isFinite(v)||v<25||v>5000){$('#hp-'+m.id).focus();this.toast('La resistencia debe estar entre 25 y 5000 PV.');return;}}
  this.history();const ratios=this.pieces.map(p=>p.hp/p.maxHp);for(const m of MATERIALS)this.settings.hp[m.id]=Number($('#hp-'+m.id).value);this.settings.impact=Number($('#settings-impact').value);for(const k of['smooth','snap','shadows','labels'])this.settings[k]=$('#'+k+'-toggle').checked;this.pieces.forEach((p,i)=>{p.maxHp=this.settings.hp[p.material]*(p.kind==='gate'?.6:1);p.hp=ratios[i]*p.maxHp;const gs=gateScale(p.material,p.kind);p.baseScaleX=(p.baseScaleX??(p.kind==='gate'?p.scaleX/gs:p.scaleX));p.scaleX=p.baseScaleX*gs;p.scaleY=gs;p.scaleZ=gs;});$('#settings-dialog').close();this.update();this.toast('Ajustes aplicados. Las puertas conservan el factor 60 %.');}
 bindUI(){for(const b of $$('[data-mode]'))b.addEventListener('click',()=>{if(this.library)this.showLibrary(false);this.setMode(b.dataset.mode);});for(const b of $$('[data-action]'))b.addEventListener('click',()=>b.dataset.action==='settings'?this.openSettings():$('#help-dialog').showModal());for(const b of $$('[data-close]'))b.addEventListener('click',()=>$('#'+b.dataset.close).close());for(const d of $$('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
  $('#undo').onclick=()=>this.undo();$('#redo').onclick=()=>this.redo();$('#save').onclick=()=>this.exportScene();$('#export-settings').onclick=()=>this.exportScene();$('#load').onclick=()=>$('#scene-file').click();$('#scene-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2e6)throw Error('El archivo de escena es demasiado grande.');const s=this.validate(JSON.parse(await file.text()));this.history();if(this.library)this.showLibrary(false);this.restore(s);this.ensureAutomaticGates();this.update();$('#settings-dialog').close();this.toast(`Escena cargada: ${this.pieces.length} módulos.`);}catch(err){this.toast(err.message);}};
  $('#screenshot').onclick=()=>this.capture();$('#capture-settings').onclick=()=>{this.capture();$('#settings-dialog').close();};$('#impact-range').oninput=e=>{this.settings.impact=Number(e.target.value);$('#impact-value').textContent=e.target.value;this.autosave();};$('#settings-impact').oninput=e=>$('#settings-impact-value').textContent=e.target.value+' PV';$('#apply-settings').onclick=()=>this.applySettings();$('#reset-settings').onclick=()=>{for(const m of MATERIALS){$('#hp-'+m.id).value=m.hp;$('#gate-hp-'+m.id).textContent=fmt(m.hp*.6);}$('#settings-impact').value=20;$('#settings-impact-value').textContent='20 PV';for(const k of['smooth','snap','shadows','labels'])$('#'+k+'-toggle').checked=true;};
  $('#close-inspector').onclick=()=>this.setSelected(null);
  $('#inspect-hit').onclick=()=>{const p=this.getSelected();if(p)this.damage(p);};
  $('#inspect-repair').onclick=()=>{const p=this.getSelected();if(p)this.repair(p,true);};
  $('#inspect-delete').onclick=()=>this.removePiece(this.getSelected());
  const beginScrub=()=>{const p=this.getSelected();if(p&&!p.collapse&&!this.scrubbing){this.history();this.scrubbing=true;}};
  const endScrub=()=>{if(this.scrubbing){this.scrubbing=false;this.update();}};
  $('#health-scrub').addEventListener('pointerdown',beginScrub);
  $('#health-scrub').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End','ArrowUp','ArrowDown'].includes(e.key))beginScrub();});
  $('#health-scrub').oninput=e=>{const p=this.getSelected();if(!p||p.collapse)return;beginScrub();this.setTestHealth(p,Number(e.target.value)/100,true);};
  $('#health-scrub').onchange=endScrub;
  $('#health-scrub').addEventListener('pointerup',endScrub);
  $('#health-scrub').addEventListener('pointercancel',endScrub);
  for(const b of $$('.health-preset'))b.onclick=()=>{const p=this.getSelected();if(!p||p.collapse)return;this.history();this.setTestHealth(p,Number(b.dataset.value)/100);};
  $('#clear').onclick=()=>{if(!this.pieces.length)return;this.confirm('¿Empezar de nuevo?','Se retirarán todos los módulos. Podrás deshacer esta acción.',()=>{this.history();this.pieces=[];this.selected=null;this.particles=[];this.floaters=[];this.update();this.toast('Terreno despejado. Tu siguiente defensa empieza con un trazo.');});};$('#demo').onclick=()=>this.confirm('¿Cargar el ejemplo?','Sustituirá la escena actual por el terreno de demostración. Puedes deshacerlo.',()=>{this.history();this.makeDemo();this.fit();this.update();this.toast('Terreno de demostración preparado.');});$('#confirm-ok').onclick=()=>{$('#confirm-dialog').close();this.confirmFn?.();this.confirmFn=null;};
  $('#camera-mode').onclick=()=>{this.cameraMode=!this.cameraMode;if(this.mode==='camera'&&!this.cameraMode)this.mode='draw';this.syncUI();};$('#top-view').onclick=()=>{this.r.camera.top=!this.r.camera.top;this.r.updateCamera();this.syncUI();this.dirty=true;};$('#rotate-view').onclick=()=>{this.r.camera.theta+=Math.PI/4;this.r.updateCamera();this.dirty=true;};$('#zoom-in').onclick=()=>this.zoom(.8);$('#zoom-out').onclick=()=>this.zoom(1.25);$('#fit-view').onclick=()=>this.fit();$('#grid-toggle').onclick=()=>{this.settings.grid=!this.settings.grid;this.update();};$('#tab-terrain').onclick=()=>this.showLibrary(false);$('#tab-library').onclick=()=>this.showLibrary(true);
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||document.querySelector('dialog[open]'))return;const key=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();e.shiftKey?this.redo():this.undo();return;}if((e.ctrlKey||e.metaKey)&&key==='y'){e.preventDefault();this.redo();return;}if((e.ctrlKey||e.metaKey)&&key==='s'){e.preventDefault();this.exportScene();return;}if(e.ctrlKey||e.metaKey||e.altKey)return;const modes={d:'draw',i:'inspect',g:'hit',r:'repair',c:'camera'};if(modes[key]){if(this.library)this.showLibrary(false);this.setMode(modes[key]);}if(key==='f')this.fit();if(key==='escape'){this.stroke=[];this.pointer=null;this.setSelected(null);this.dirty=true;}if((key==='delete'||key==='backspace')&&!this.library){const p=this.getSelected();if(p){e.preventDefault();this.removePiece(p);}}});
 }
 resize(){this.r.resize();const d=this.r.canvas.width/Math.max(1,this.r.width);this.overlay.width=this.r.canvas.width;this.overlay.height=this.r.canvas.height;this.ctx.setTransform(d,0,0,d,0,0);this.dirty=true;}
 zoom(factor){this.r.camera.size=clamp(this.r.camera.size*factor,4,40);this.r.updateCamera();this.dirty=true;}
 fit(){const ps=this.library?this.catalog:this.pieces,c=this.r.camera;if(!ps.length){c.x=0;c.z=0;c.size=this.r.width<600?19:12;c.theta=.27;c.elev=.88;c.top=false;}else{const xs=ps.map(p=>p.x),zs=ps.map(p=>p.z);c.x=(Math.min(...xs)+Math.max(...xs))/2;c.z=(Math.min(...zs)+Math.max(...zs))/2;this.r.updateCamera();let boundx=0,boundy=0;for(const p of ps)for(const dy of[0,2.6*(p.scaleY||1)]){const a=M4.point(this.r.view,[p.x,dy,p.z]);boundx=Math.max(boundx,Math.abs(a[0])+1.7*(p.scaleX||1));boundy=Math.max(boundy,Math.abs(a[1])+1.4*(p.scaleY||1));}const aspect=this.r.width/this.r.height;c.size=clamp(Math.max(boundy*1.35,boundx/aspect*1.25),6,40);if(this.r.width<600)c.size=Math.min(40,c.size*1.08);}this.r.updateCamera();this.syncUI();this.dirty=true;}
 showLibrary(on){if(on===this.library)return;this.stroke=[];this.pointer=null;if(on){this.savedCamera={...this.r.camera};this.savedSelected=this.selected;this.library=true;this.catalog=[];for(let row=0;row<4;row++)for(let col=0;col<5;col++){const st=['intacto','puerta','danado','destruido'][row];{const material=MATERIALS[col].id,kind=row===1?'gate':'wall',gs=gateScale(material,kind);this.catalog.push({id:10000+row*5+col,asset:material+'_'+st,material,x:(col-2)*3.7,z:(row-1.5)*4.3,angle:0,scaleX:gs,scaleY:gs,scaleZ:gs,row,col});}}Object.assign(this.r.camera,{theta:0,elev:1.02,top:false,x:0,z:0,size:14});this.fit();}else{this.library=false;if(this.savedCamera)Object.assign(this.r.camera,this.savedCamera);this.r.updateCamera();this.selected=this.savedSelected||null;}this.syncUI();this.dirty=true;}
 localEvent(e){const r=this.world.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
 groundEvent(pt){let p=this.r.groundAt(pt.x,pt.y);if(!p)return null;return[clamp(p[0],-BOUNDS,BOUNDS),clamp(p[2],-BOUNDS,BOUNDS)];}
 bindPointers(){const canvas=this.world;canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(clamp(e.deltaY,-140,140)*.0017));},{passive:false});
  canvas.addEventListener('pointerdown',e=>{if(document.querySelector('dialog[open]'))return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const pt=this.localEvent(e);this.pointers.set(e.pointerId,pt);if(this.pointers.size>=2){this.stroke=[];this.pointer=null;const a=[...this.pointers.values()].slice(0,2);this.gesture={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),mid:{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}};this.dirty=true;return;}const cam=this.cameraMode||this.library||e.button===2||e.button===1||e.shiftKey;this.pointer={id:e.pointerId,start:pt,last:pt,ground:this.groundEvent(pt),isTouch:e.pointerType==='touch',cam,pan:e.shiftKey||e.button===1,moved:0,button:e.button};if(!cam&&this.mode==='draw'&&this.pointer.ground)this.stroke=[this.pointer.ground];else this.stroke=[];this.dirty=true;});
  canvas.addEventListener('pointermove',e=>{const pt=this.localEvent(e);if(this.pointers.has(e.pointerId))this.pointers.set(e.pointerId,pt);if(this.gesture&&this.pointers.size>=2){e.preventDefault();const a=[...this.pointers.values()].slice(0,2);let dd=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),mm={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};const old=this.r.groundAt(this.gesture.mid.x,this.gesture.mid.y),next=this.r.groundAt(mm.x,mm.y);if(old&&next){this.r.camera.x=clamp(this.r.camera.x+old[0]-next[0],-30,30);this.r.camera.z=clamp(this.r.camera.z+old[2]-next[2],-30,30);}this.r.camera.size=clamp(this.r.camera.size*this.gesture.distance/Math.max(10,dd),4,40);this.gesture={distance:dd,mid:mm};this.r.updateCamera();this.dirty=true;return;}
   const p=this.pointer;if(!p||p.id!==e.pointerId){return;}e.preventDefault();const dx=pt.x-p.last.x,dy=pt.y-p.last.y;p.moved=Math.max(p.moved,Math.hypot(pt.x-p.start.x,pt.y-p.start.y));if(p.cam){if(p.pan){const a=this.r.groundAt(p.last.x,p.last.y),b=this.r.groundAt(pt.x,pt.y);if(a&&b){this.r.camera.x=clamp(this.r.camera.x+a[0]-b[0],-30,30);this.r.camera.z=clamp(this.r.camera.z+a[2]-b[2],-30,30);}}else{this.r.camera.theta-=dx*.006;if(!this.r.camera.top)this.r.camera.elev=clamp(this.r.camera.elev+dy*.005,.32,1.48);}this.r.updateCamera();}else if(this.mode==='draw'){const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];for(const ev of events.length?events:[e]){const q=this.groundEvent(this.localEvent(ev));if(q&&(!this.stroke.length||dist(q,this.stroke.at(-1))>.07)&&this.stroke.length<3000)this.stroke.push(q);}}p.last=pt;this.dirty=true;});
  const release=e=>{const pt=this.localEvent(e),p=this.pointer;this.pointers.delete(e.pointerId);if(this.gesture){if(this.pointers.size===0)this.gesture=null;this.pointer=null;this.stroke=[];this.dirty=true;return;}if(!p||p.id!==e.pointerId)return;this.pointer=null;try{canvas.releasePointerCapture(e.pointerId);}catch(_){}if(e.type==='pointercancel'){this.stroke=[];this.dirty=true;return;}if(this.library){if(p.moved<7){const obj=this.r.pick(pt.x,pt.y,this.catalog,p.isTouch);if(obj){const m=this.raw.meta.find(m=>m.id===obj.asset);this.toast(`${m.material} · ${m.estado==='danado'?'dañado':m.estado} · ${fmt(m.triangulos)} triángulos`);}}this.dirty=true;return;}if(p.cam){if(p.moved<7){const hit=this.r.pick(pt.x,pt.y,this.pieces,p.isTouch);if(hit)this.setSelected(hit);}this.stroke=[];return;}if(this.mode==='draw'){if(p.moved<8||this.stroke.length<2){const hit=this.r.pick(pt.x,pt.y,this.pieces,p.isTouch);if(hit)this.setSelected(hit);else if(p.ground)this.addSingle(p.ground);}else this.buildStroke(this.stroke);this.stroke=[];}else if(p.moved<13){const hit=this.r.pick(pt.x,pt.y,this.pieces,p.isTouch);if(this.mode==='hit'){this.selected=null;if(hit)this.damage(hit);else this.syncInspector();}else if(this.mode==='inspect'){this.setSelected(hit);}else if(hit){this.setSelected(hit);this.repair(hit);}else this.setSelected(null);}this.dirty=true;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 }
 snap(point){let result=point,min=.95;for(const p of this.pieces){if(p.hp<=0||p.collapse)continue;const c=Math.cos(p.angle),s=Math.sin(p.angle);for(const side of[-1,1]){const q=[p.x+side*c*UNIT*p.scaleX*.5,p.z+side*s*UNIT*p.scaleX*.5],d=dist(point,q);if(d<min){min=d;result=q;}}}return result;}
  buildStroke(input){
   let p=input.filter(q=>Array.isArray(q)&&q.length===2&&q.every(Number.isFinite)).map(q=>q.slice());if(p.length<2)return;
   let length=0;for(let i=1;i<p.length;i++)length+=dist(p[i-1],p[i]);
   const closed=p.length>=3&&length>UNIT*2.2&&dist(p[0],p.at(-1))<1.1;
   if(closed)p[p.length-1]=p[0].slice();p=simplify(p,.13);if(this.settings.smooth)p=smoothPath(p);
   if(this.settings.snap){p[0]=this.snap(p[0]);p[p.length-1]=closed?p[0].slice():this.snap(p.at(-1));}
   if(closed)p[p.length-1]=p[0].slice();
   if(this.pieces.length>=LIMIT){this.toast(`Límite de ${LIMIT} módulos alcanzado.`);return;}
   this.history();const n=this.appendPath(p,this.material,1,true);
   if(!n){this.undoStack.pop();this.toast('Ese tramo ya está ocupado. Dibuja en un espacio libre.');}
   else{const gates=this.ensureAutomaticGates();this.selected=null;this.toast(`${n} módulos construidos`+(gates?` · ${gates===1?'Puerta automática añadida':gates+' puertas automáticas añadidas'}`:'')+(this.pieces.length===LIMIT?' · Límite alcanzado':''));}
   this.update();
  }
 addSingle(point){if(this.pieces.length>=LIMIT){this.toast(`Límite de ${LIMIT} módulos alcanzado.`);return;}if(this.pieces.some(p=>Math.hypot(p.x-point[0],p.z-point[1])<.8)){this.toast('Ese espacio ya está ocupado.');return;}this.history();const p=this.makePiece(this.material,{x:point[0],z:point[1],angle:this.lastAngle});this.pieces.push(p);this.ensureAutomaticGates();this.setSelected(p);this.update();}
 // Logical sockets, not the decorative bounding box, define connectivity.
 endpoints(p){const half=UNIT*p.scaleX*.5,dx=Math.cos(p.angle)*half,dz=Math.sin(p.angle)*half;return[[p.x-dx,p.z-dz],[p.x+dx,p.z+dz]];}
 closedFaces(){
  const EPS=.10,cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
  const segs=this.pieces.filter(p=>p.hp>0&&!p.collapse).map(p=>{const [a,b]=this.endpoints(p);return{p,a,b,d:[b[0]-a[0],b[1]-a[1]],cuts:[0,1]};});
  // Split the logical graph at crossings and T junctions. Rendering remains
  // modular; an intersection cannot silently create or delete a visual piece.
  for(let i=0;i<segs.length;i++)for(let j=i+1;j<segs.length;j++){
   const a=segs[i],b=segs[j],den=cross(a.d,b.d),v=[b.a[0]-a.a[0],b.a[1]-a.a[1]];
   if(Math.abs(den)>1e-8){const t=cross(v,b.d)/den,u=cross(v,a.d)/den;if(t>=-1e-6&&t<=1+1e-6&&u>=-1e-6&&u<=1+1e-6){a.cuts.push(clamp(t,0,1));b.cuts.push(clamp(u,0,1));}}
   for(const [s,o]of [[a,b],[b,a]])for(const q of [o.a,o.b]){
    const l=s.d[0]*s.d[0]+s.d[1]*s.d[1];if(l<1e-8)continue;const t=((q[0]-s.a[0])*s.d[0]+(q[1]-s.a[1])*s.d[1])/l;
    if(t>0&&t<1&&pointSegment(q,s.a,s.b)<EPS)s.cuts.push(t);
   }
  }
  const nodes=[],edges=[],edgeKeys=new Set();
  const node=(q)=>{let id=nodes.findIndex(n=>dist(n.q,q)<EPS);if(id<0){id=nodes.length;nodes.push({q,out:[]});}return id;};
  for(const s of segs){
   const ts=s.cuts.sort((a,b)=>a-b).filter((t,i,a)=>i===0||Math.abs(t-a[i-1])>1e-5);
   for(let i=1;i<ts.length;i++){
    const at=t=>[s.a[0]+s.d[0]*t,s.a[1]+s.d[1]*t],u=node(at(ts[i-1])),v=node(at(ts[i]));if(u===v)continue;
    const key=[Math.min(u,v),Math.max(u,v)].join(':');if(edgeKeys.has(key))continue;edgeKeys.add(key);
    const id=edges.length,a={id,from:u,to:v,piece:s.p,twin:id+1,used:false},b={id:id+1,from:v,to:u,piece:s.p,twin:id,used:false};edges.push(a,b);nodes[u].out.push(a);nodes[v].out.push(b);
   }
  }
  for(const n of nodes)n.out.sort((a,b)=>Math.atan2(nodes[a.to].q[1]-n.q[1],nodes[a.to].q[0]-n.q[0])-Math.atan2(nodes[b.to].q[1]-n.q[1],nodes[b.to].q[0]-n.q[0]));
  const faces=[];
  for(const start of edges){
   if(start.used)continue;let edge=start,path=[],valid=false;
   for(let guard=0;guard<=edges.length;guard++){
    if(edge.used){valid=edge.id===start.id;break;}edge.used=true;path.push(edge);
    const out=nodes[edge.to].out,i=out.findIndex(q=>q.id===edge.twin);edge=out[(i-1+out.length)%out.length];
   }
   if(!valid||path.length<3)continue;
   let area=0;for(const e of path){const a=nodes[e.from].q,b=nodes[e.to].q;area+=cross(a,b)*.5;}
   if(area<.6)continue; // Exterior walk is negative; zero-area doubled lines are not enclosures.
   const walked=new Set(path.map(e=>e.id)),boundary=path.filter(e=>!walked.has(e.twin));
   const ids=[...new Set(boundary.map(e=>e.piece.id))];if(ids.length<3)continue;
   const hosts=ids.filter(id=>boundary.some(e=>e.piece.id===id&&pointSegment([e.piece.x,e.piece.z],nodes[e.from].q,nodes[e.to].q)<.025&&dist([e.piece.x,e.piece.z],nodes[e.from].q)>.18&&dist([e.piece.x,e.piece.z],nodes[e.to].q)>.18));
   faces.push({area,ids,hosts,x:Math.min(...path.map(e=>nodes[e.from].q[0])),z:Math.min(...path.map(e=>nodes[e.from].q[1]))});
  }
  faces.sort((a,b)=>a.x-b.x||a.z-b.z||a.area-b.area);return faces;
 }
 ensureAutomaticGates(){
  const byId=new Map(this.pieces.map(p=>[p.id,p]));let added=0;
  for(const face of this.closedFaces()){
   const perimeter=face.ids.map(id=>byId.get(id)),hosts=face.hosts.map(id=>byId.get(id));if(hosts.some(p=>p.kind==='gate'))continue;
   const candidates=hosts.filter(p=>p.kind==='wall'&&p.hp>0&&!p.collapse&&p.scaleX>=.55);
   if(!candidates.length)continue;
   // Canonical geometric order + perimeter count. Never Math.random(), and no
   // dependency on transient frame timing. Existing gates are never moved.
   candidates.sort((a,b)=>Math.round(a.x*1e5)-Math.round(b.x*1e5)||Math.round(a.z*1e5)-Math.round(b.z*1e5)||a.material.localeCompare(b.material)||a.id-b.id);
   const p=candidates[Math.floor(perimeter.length/2)%candidates.length],health=p.hp/p.maxHp;
   p.kind='gate';p.autoGate=true;p.baseScaleX=(p.baseScaleX??p.scaleX);const gs=gateScale(p.material,'gate');p.scaleX=p.baseScaleX*gs;p.scaleY=gs;p.scaleZ=gs;p.maxHp=this.settings.hp[p.material]*.6;p.hp=p.maxHp*health;p.visual=health;delete p._target;added++;
  }
  return added;
 }
 beginCollapse(p,notify=true){
  if(p.collapse||p.hp/p.maxHp>COLLAPSE_THRESHOLD+HEALTH_EPSILON||(p.hp===0&&p.visual===0))return false;
  p.collapse={elapsed:0,fromHealth:p.hp/p.maxHp,fromVisual:clamp(p.visual,0,1)};
  // A moving target must bypass the ordinary 480 ms damage interpolation.
  delete p._target;this.scrubbing=false;this.dirty=true;
  if(notify)this.toast('Colapso irreversible: la pieza caerá hasta el 0 %.');
  return true;
 }
 advanceCollapse(p,seconds){
  const c=p.collapse;if(!c)return false;
  c.elapsed=Math.min(COLLAPSE_SECONDS,c.elapsed+Math.max(0,seconds));
  const t=c.elapsed/COLLAPSE_SECONDS,ease=t*t*(3-2*t);
  p.hp=p.maxHp*c.fromHealth*(1-t);p.visual=c.fromVisual*(1-ease);
  if(t>=1){p.hp=0;p.visual=0;p.collapse=null;p._target=0;p._from=0;this.effect(p,0,false);return true;}
  return false;
 }
 setTestHealth(p,ratio,immediate=false){
  if(!p||p.collapse||this.library||!Number.isFinite(ratio))return false;
  ratio=clamp(ratio,0,1);p.hp=p.maxHp*ratio;
  const started=this.beginCollapse(p);
  if(!started&&immediate){p.visual=ratio;delete p._target;}
  this.update();return true;
 }
 removePiece(p){
  if(!p||this.library)return false;
  const i=this.pieces.findIndex(q=>q.id===p.id);if(i<0)return false;
  this.history();this.pieces.splice(i,1);
  if(this.selected===p.id)this.selected=null;if(this.savedSelected===p.id)this.savedSelected=null;
  this.scrubbing=false;this.stroke=[];this.pointer=null;
  // Do not regenerate gates here: deleting a wall / gate deliberately opens a gap.
  this.update();this.world.focus({preventScroll:true});
  this.toast('Pieza eliminada. Puedes recuperarla con Deshacer.');return true;
 }
 damage(p){
  if(!p||this.library||!this.pieces.includes(p))return;
  if(p.collapse){this.toast('El colapso ya está en marcha; no necesita más golpes.');return;}
  if(p.hp<=0){this.toast('Esta pieza ya está destruida. Puedes reconstruirla o eliminarla.');return;}
  this.history();const amount=Math.min(this.settings.impact,p.hp);p.hp=Math.max(0,p.hp-amount);
  if(p.hp<1e-8)p.hp=0;p.flash=1;this.selected=this.mode==='hit'?null:p.id;
  this.effect(p,amount,false);this.beginCollapse(p);this.update();
 }
 repair(p,full=false){
  if(!p||this.library||!this.pieces.includes(p))return;
  if(p.collapse){this.toast('No se puede reparar durante el colapso. Espera a que queden los escombros.');return;}
  if(p.hp>=p.maxHp){this.setSelected(p);this.toast('Esta pieza ya tiene el 100 % de vida.');return;}
  this.history();const before=p.hp;
  // Rebuilding rubble creates a stable wall; never leave a newly rebuilt wall
  // below the 20 % failure threshold, including after saving / loading a scene.
  p.hp=(full||before===0)?p.maxHp:Math.min(p.maxHp,p.hp+this.settings.impact*2);
  this.selected=p.id;this.effect(p,p.hp-before,true);this.update();
 }
 effect(p,amount,repair){const now=performance.now();if(amount>0)this.floaters.push({x:p.x,z:p.z,y:1.9,born:now,text:(repair?'+':'−')+fmt(amount)+' PV',repair});for(let i=0;i<(repair?7:15);i++){const a=Math.random()*Math.PI*2;this.particles.push({x:p.x+(Math.random()-.5)*1.4,z:p.z+(Math.random()-.5)*.6,y:.65+Math.random()*.9,vx:Math.cos(a)*(.7+Math.random()),vz:Math.sin(a)*(.7+Math.random()),vy:1.3+Math.random()*2.2,age:0,life:.55+Math.random()*.65,size:2+Math.random()*3,repair});}}
 frame(time){
  if(this.contextLost)return;
  if(document.hidden){this.lastTime=0;requestAnimationFrame(t=>this.frame(t));return;}
  const seconds=this.lastTime?Math.max(0,(time-this.lastTime)/1000):0,dt=Math.min(.055,seconds);this.lastTime=time;
  let active=false,healthChanged=false,finished=false;
  for(const p of this.pieces){
   if(p.collapse){
    finished=this.advanceCollapse(p,seconds)||finished;healthChanged=true;active=true;
   }else{
    const target=p.hp/p.maxHp;
    if(p._target!==target){p._target=target;p._from=p.visual;p._start=time;}
    if(p.visual!==target){const t=clamp((time-p._start)/480,0,1),ease=1-Math.pow(1-t,3);p.visual=t===1?target:p._from+(target-p._from)*ease;active=true;}
   }
   if(p.flash>.002){p.flash*=Math.exp(-dt*9);active=true;}else p.flash=0;
  }
  if(healthChanged){this.syncStats();this.syncInspector();}
  if(finished)this.autosave();
  const hadEffects=this.particles.length||this.floaters.length;
  for(const p of this.particles){p.age+=dt;p.vy-=dt*5.5;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y=Math.max(.02,p.y+p.vy*dt);}
  this.particles=this.particles.filter(p=>p.age<p.life);this.floaters=this.floaters.filter(p=>time-p.born<1150);
  if(hadEffects||this.particles.length||this.floaters.length)active=true;
  if((this.dirty||active)&&time-this.lastRender>14){this.r.render(this.library?this.catalog:this.pieces,this.library?null:this.selected,this.settings);this.drawOverlay(time);this.dirty=false;this.lastRender=time;}
  requestAnimationFrame(t=>this.frame(t));
 }
 drawOverlay(time){const c=this.ctx,w=this.r.width,h=this.r.height,d=this.overlay.width/Math.max(1,w);c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);const proj=p=>this.r.project(p);
  const selected=this.getSelected();if(selected&&!this.library&&this.mode!=='hit'){const p=selected,co=Math.cos(p.angle),si=Math.sin(p.angle),xx=1.35*p.scaleX,zz=.76;const poly=[[-xx,-zz],[xx,-zz],[xx,zz],[-xx,zz]].map(([x,z])=>proj([p.x+co*x-si*z,.06,p.z+si*x+co*z]));c.beginPath();poly.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.setLineDash([4,4]);c.lineWidth=1.5;c.strokeStyle=p.hp>0?'#536d3e':'#b25e42';c.stroke();c.setLineDash([]);}
  if(this.stroke.length>0){const color='#49623d';c.beginPath();this.stroke.forEach((p,i)=>{let q=proj([p[0],.075,p[1]]);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]);});c.lineWidth=5;c.lineJoin='round';c.lineCap='round';c.strokeStyle='#fffdf7b3';c.stroke();c.lineWidth=2;c.strokeStyle=color;c.setLineDash([6,5]);c.stroke();c.setLineDash([]);const a=proj([this.stroke[0][0],.075,this.stroke[0][1]]),b=proj([this.stroke.at(-1)[0],.075,this.stroke.at(-1)[1]]);for(const q of[a,b]){c.beginPath();c.arc(q[0],q[1],4,0,7);c.fillStyle=color;c.fill();c.strokeStyle='#f4f3e7';c.lineWidth=2;c.stroke();}let len=0;for(let i=1;i<this.stroke.length;i++)len+=dist(this.stroke[i-1],this.stroke[i]);const text=`≈ ${Math.max(1,Math.ceil(len/UNIT))} módulos`;this.pill(c,b[0]+12,b[1]-23,text,'#455b43');}
  if(this.library){for(const p of this.catalog){const q=proj([p.x,.06,p.z+1.4]);if(q[1]>h-35||q[1]<70)continue;c.font=(w<600?'8':'10')+'px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';c.textAlign='center';c.fillStyle='#526246';c.fillText(p.row===0?MATERIALS[p.col].name:['','Puerta','Dañado','Escombros'][p.row],q[0],q[1]+5);}return;}
  if(this.settings.labels){for(const p of this.pieces){const ratio=p.hp/p.maxHp;if(ratio>.999&&p.id!==this.selected)continue;const st=this.r.stages(p);let ht=0;for(const a of st)ht=Math.max(ht,this.r.assets[a.key].bounds[1][1]);const q=proj([p.x,ht+.24,p.z]);if(q[0]<0||q[0]>w||q[1]<0||q[1]>h)continue;const bw=p.id===this.selected?44:29;c.fillStyle='#fffdf2d9';this.roundRect(c,q[0]-bw/2-3,q[1]-4,bw+6,11,4);c.fill();c.fillStyle='#cfccbb';this.roundRect(c,q[0]-bw/2,q[1],bw,3,2);c.fill();c.fillStyle=ratio>.5?'#617b49':ratio>.2?'#ba8c48':'#b66549';this.roundRect(c,q[0]-bw/2,q[1],Math.max(0,bw*ratio),3,2);c.fill();if(p.collapse){c.font='600 9px -apple-system, sans-serif';c.textAlign='center';c.fillStyle='#9c583d';c.fillText('Colapsando',q[0],q[1]-9);}else if(p.id===this.selected){c.font='9px -apple-system, sans-serif';c.textAlign='center';c.fillStyle='#42543a';c.fillText(Math.round(ratio*100)+'%',q[0],q[1]-9);}}}
  for(const p of this.particles){const q=proj([p.x,p.y,p.z]);c.globalAlpha=(1-p.age/p.life)*.76;c.fillStyle=p.repair?'#8fa875':'#b3814f';c.beginPath();c.arc(q[0],q[1],p.size*(.7+p.age*.5),0,7);c.fill();}c.globalAlpha=1;
  for(const f of this.floaters){const t=(time-f.born)/1150,q=proj([f.x,f.y+t*1.7,f.z]);c.globalAlpha=Math.min(1,(1-t)*2);this.pill(c,q[0],q[1],f.text,f.repair?'#556e44':'#9c583d',true);}c.globalAlpha=1;
  const a=proj([this.r.camera.x,0,this.r.camera.z]),b=proj([this.r.camera.x+2,0,this.r.camera.z]);$('#scale-bar').style.width=Math.max(22,Math.hypot(b[0]-a[0],b[1]-a[1]))+'px';
 }
 roundRect(c,x,y,w,h,r){if(w<=0)return;c.beginPath();c.roundRect(x,y,w,h,r);}
 pill(c,x,y,text,color,center=false){c.font='600 11px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';let ww=c.measureText(text).width+17;if(center)x-=ww/2;c.fillStyle=color;this.roundRect(c,x,y,ww,24,7);c.fill();c.fillStyle='#fffdf5';c.textAlign='left';c.fillText(text,x+8,y+16);}
}
(async()=>{try{await new Promise(r=>setTimeout(r,35));const assetElement=$('#bastion-assets'),raw=JSON.parse(assetElement.textContent);const renderer=new BastionRenderer($('#world'),raw);await renderer.ready;const app=new BastionApp(renderer,raw);window.bastion=app;window.BASTION_VERSION='3.0';window.BASTION_READY=true;assetElement.remove();$('#loading').hidden=true;app.dirty=true;}catch(err){console.error(err);$('#loading-text').textContent='No se pudo iniciar el laboratorio. '+err.message;$('.loader-line').hidden=true;window.BASTION_ERROR=err.message;}})();
