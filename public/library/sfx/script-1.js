'use strict';
const $=id=>document.getElementById(id);
const BANK=JSON.parse($('bankData').textContent);
const items=BANK.items;
const opus=BANK.runtimeCodec==='opus';
const audioMime=opus?'audio/ogg':'audio/mpeg';
if(opus){
 document.querySelector('.intro p').textContent='Busca un sonido, escúchalo y descarga su Opus.';
 document.querySelector('.legend .right').textContent='Ficha técnica · Opus';
 document.querySelector('footer>span').textContent='Wild Guardians · SFX Opus · 48 kHz · Estéreo · VBR 96 kb/s';
 document.querySelector('.guide-content').innerHTML='<p>Reproducción y descarga usan el mismo Opus. No se vuelve a normalizar ni recortar el audio.</p><p>Las mediciones de LUFS, pico verdadero y forma de onda pertenecen al MP3 de origen. El ZIP conserva su auditoría y añade los hashes y tamaños de los Opus.</p><p>Derivados con pérdida desde MP3 normalizados. Escucha, móvil físico y Tauri pendientes.</p>';
 $('downloadCurrent').title='Descargar Opus';
 $('downloadCurrent').setAttribute('aria-label','Descargar el Opus actual');
}

const itemById=new Map(items.map(i=>[i.id,i]));
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const seconds=v=>new Intl.NumberFormat(window.WildGuardiansLanguage.locale(),{minimumFractionDigits:1,maximumFractionDigits:1}).format(v)+' s';
const number=v=>Number(v).toLocaleString(window.WildGuardiansLanguage.locale(),{minimumFractionDigits:1,maximumFractionDigits:1});
const bytes=v=>v>=1048576?(v/1048576).toLocaleString(window.WildGuardiansLanguage.locale(),{maximumFractionDigits:1})+' MB':(v/1024).toLocaleString(window.WildGuardiansLanguage.locale(),{maximumFractionDigits:1})+' KB';
const clock=v=>`${Math.floor(Math.max(0,v)/60)}:${(Math.max(0,v)%60).toFixed(1).padStart(4,'0')}`;
const pad=v=>String(v).padStart(3,'0');
let category='',query='',filter='all',sort='number',visible=[...items];
const collapsed=new Set(), openInfo=new Set();
let current=null,ctx=null,gainNode=null,source=null,buffer=null,position=0,startedAt=0,playing=false,loading=false,looping=false,token=0,frame=0,seeking=false,toastTimer;
const cache=new Map();
let volume=.8;
try{const v=JSON.parse(localStorage.getItem('wg-sfx-v12-catalog-settings')||'null');if(v&&Number.isFinite(v.volume))volume=Math.min(1,Math.max(0,v.volume));}catch{}
$('volume').value=Math.round(volume*100);
$('volume').setAttribute('aria-valuetext',`${Math.round(volume*100)} %`);
for(const cat of BANK.categories){const opt=document.createElement('option');opt.value=cat;opt.textContent=cat;$('category').appendChild(opt);}
$('totalTime').textContent=`${Math.floor(BANK.total_duration/60)}:${Math.floor(BANK.total_duration%60).toString().padStart(2,'0')}`;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function detailHTML(i){
 const meta=[['Archivo',i.filename],['Duración',seconds(i.duration)],['Formato',opus?'Opus · VBR 96 kb/s · 48 kHz · estéreo':'MP3 · 128 kb/s · 44,1 kHz · estéreo'],[opus?'Sonoridad del MP3 de origen':'Sonoridad final',number(i.lufs)+' LUFS'],[opus?'Pico verdadero del MP3 de origen':'Pico verdadero',number(i.true_peak_dbtp)+' dBTP'],['Perfil',i.profile],['Tamaño',bytes(i.bytes)],['Procesamiento',i.limiter?'Ganancia y limitación acotada de picos':'Ganancia lineal'],['Uso',i.loop?'Ambiente preparado para bucle':'Evento o secuencia']];
 return `<dl>${meta.map(([k,v])=>`<div><dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd></div>`).join('')}</dl><div class="idline"><code>${escapeHTML(i.id)}</code><button class="small" data-action="copy" data-id="${i.id}">${icon('copy')}Copiar ID</button></div>${i.assignment_note?`<p class="note">Asignación conservada: ${escapeHTML(i.assignment_note)}</p>`:''}<p class="note">${opus?'Huella SHA-256 del Opus:':'Huella SHA-256 del MP3 normalizado:'}<br><code>${i.sha256}</code></p>`;
}
function rowHTML(i){const selected=current?.id===i.id;const active=selected&&playing;const isLoading=selected&&loading;const info=openInfo.has(i.id);return `<article class="item" data-id="${i.id}"><div class="row${selected?' selected':''}${active?' playing':''}" id="row-${i.id}"><span class="num">${pad(i.number)}</span><button class="icon play-btn${active?' playing':''}${isLoading?' loading':''}" data-action="play" data-id="${i.id}" aria-label="${active?'Pausar':'Reproducir'} ${escapeHTML(i.name)}" title="${active?'Pausar':'Reproducir'}">${icon(active?'pause':'play')}</button><div><div class="name">${escapeHTML(i.name)}${i.loop?'<span class="tag">Bucle</span>':''}</div><div class="subname">${escapeHTML(i.id)}</div></div><div class="metric"><span class="duration">${seconds(i.duration)}</span><small>${number(i.lufs)} LUFS</small></div><button class="icon info-btn" data-action="info" data-id="${i.id}" aria-expanded="${info}" aria-controls="info-${i.id}" aria-label="Ficha técnica: ${escapeHTML(i.name)}" title="Ficha técnica">${icon('info')}</button><button class="icon download-btn" data-action="download" data-id="${i.id}" aria-label="Descargar ${escapeHTML(i.filename)}" title="Descargar ${opus?'Opus':'MP3'}">${icon('down')}</button></div><div class="details-panel" id="info-${i.id}"${info?'':' hidden'}>${detailHTML(i)}</div></article>`;}
function render(){
 const terms=norm(query).trim().split(/\s+/).filter(Boolean);
 visible=items.filter(i=>!category||i.category===category).filter(i=>filter==='all'||(filter==='loops'?i.loop:!i.loop)).filter(i=>{const text=norm(`${pad(i.number)} ${i.number} ${i.name} ${window.WildGuardiansLanguage.translate(i.name,'en')} ${i.id} ${i.category} ${window.WildGuardiansLanguage.translate(i.category,'en')}`);return terms.every(t=>text.includes(t));});
 if(sort==='name')visible.sort((a,b)=>window.WildGuardiansLanguage.translate(a.name).localeCompare(window.WildGuardiansLanguage.translate(b.name),window.WildGuardiansLanguage.locale()));else if(sort==='duration')visible.sort((a,b)=>a.duration-b.duration||a.number-b.number);else visible.sort((a,b)=>a.number-b.number);
 $('resultCount').textContent=`${visible.length} de ${items.length} sonidos${category?' · '+category:''}`;
 $('empty').hidden=visible.length>0;
 const groups=sort==='number'?BANK.categories.filter(cat=>visible.some(i=>i.category===cat)):['Resultados'];
 $('catalog').innerHTML=groups.map(cat=>{const group=sort==='number'?visible.filter(i=>i.category===cat):visible;return `<details class="category" data-category="${escapeHTML(cat)}"${collapsed.has(cat)?'':' open'}><summary>${escapeHTML(cat)}<span>${group.length} ${group.length===1?'sonido':'sonidos'}</span></summary>${group.map(rowHTML).join('')}</details>`;}).join('');
 for(const d of document.querySelectorAll('.category'))d.addEventListener('toggle',()=>{d.open?collapsed.delete(d.dataset.category):collapsed.add(d.dataset.category);});
 updateButtons();
}
function currentPosition(){if(!buffer)return position;const duration=buffer.duration;const elapsed=playing?(ctx.currentTime-startedAt):0;return looping?(position+elapsed)%duration:Math.min(duration,position+elapsed);}
function detach(){if(source){const s=source;source=null;s.onended=null;try{s.stop();}catch{}s.disconnect();}}
function pause(){position=currentPosition();playing=false;detach();cancelAnimationFrame(frame);updateButtons();draw();}
function stop(){++token;loading=false;playing=false;position=0;detach();cancelAnimationFrame(frame);updateButtons();draw();}
async function ensureAudio(){if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)throw new Error('Este navegador no admite Web Audio.');ctx=new A({sampleRate:44100});gainNode=ctx.createGain();gainNode.gain.value=volume;gainNode.connect(ctx.destination);}if(ctx.state==='suspended')await ctx.resume();}
function base64bytes(data){const raw=atob(data);const out=new Uint8Array(raw.length);for(let j=0;j<raw.length;j++)out[j]=raw.charCodeAt(j);return out;}
async function getBuffer(i){if(cache.has(i.id)){const value=cache.get(i.id);cache.delete(i.id);cache.set(i.id,value);return value;}const result=await ctx.decodeAudioData(base64bytes(i.audio).buffer);cache.set(i.id,result);while(cache.size>5)cache.delete(cache.keys().next().value);return result;}
function startAt(offset){detach();if(!buffer||!ctx)return;position=Math.max(0,Math.min(offset,buffer.duration));if(position>=buffer.duration-.003)position=0;startedAt=ctx.currentTime;source=ctx.createBufferSource();source.buffer=buffer;source.loop=looping;source.connect(gainNode);const thisSource=source;source.onended=()=>{if(source!==thisSource||looping)return;playing=false;position=buffer.duration;source.disconnect();source=null;updateButtons();draw();};source.start(0,position);playing=true;loading=false;updateButtons();cancelAnimationFrame(frame);tick();}
async function selectAndPlay(id){const i=itemById.get(id);if(!i)return;if(current?.id===id&&playing){pause();return;}if(current?.id===id&&loading){stop();return;}
 const request=++token;detach();playing=false;loading=true;cancelAnimationFrame(frame);if(current?.id!==id){current=i;position=0;buffer=null;}updateButtons();draw();
 try{await ensureAudio();const decoded=await getBuffer(i);if(request!==token)return;buffer=decoded;startAt(position);}catch(err){if(request!==token)return;loading=false;playing=false;toast(opus?'No se pudo reproducir. Prueba a descargar el Opus o abrir el HTML en Chrome.':'No se pudo reproducir. Prueba a descargar el MP3 o abrir el HTML en Chrome.');console.error(err);updateButtons();}
}
function updateButtons(){
 const exists=!!current;const ready=exists&&!loading;
 $('playPause').disabled=!exists;$('playPause').innerHTML=icon(playing?'pause':'play');$('playPause').setAttribute('aria-label',loading?'Cancelar carga':playing?'Pausar':'Reproducir');$('playPause').title=loading?'Cancelar carga':playing?'Pausar':'Reproducir';$('playPause').classList.toggle('loading',loading);
 for(const id of ['copyCurrent','downloadCurrent','stop'])$(id).disabled=!exists;
 for(const id of ['restart','loop'])$(id).disabled=!ready;
 for(const id of ['prev','next'])$(id).disabled=!exists||visible.length===0;
 $('seek').disabled=!buffer||loading;
 if(current){$('nowTitle').textContent=`${pad(current.number)} · ${current.name}`;$('nowMeta').textContent=`${current.category} · ${seconds(current.duration)} · ${number(current.lufs)} LUFS${loading?' · Cargando…':''}`;}
 for(const row of document.querySelectorAll('.row')){const selected=row.id===`row-${current?.id}`;const active=selected&&playing;row.classList.toggle('selected',selected);row.classList.toggle('playing',active);const btn=row.querySelector('.play-btn');btn.classList.toggle('playing',active);btn.classList.toggle('loading',selected&&loading);btn.innerHTML=icon(active?'pause':'play');const i=itemById.get(btn.dataset.id);btn.setAttribute('aria-label',`${active?'Pausar':'Reproducir'} ${i.name}`);btn.title=active?'Pausar':'Reproducir';}
}
function draw(){const canvas=$('wave'),r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=canvas.getContext('2d');c.clearRect(0,0,w,h);const dur=buffer?.duration||current?.duration||0;const pos=seeking?Number($('seek').value)/1000*dur:currentPosition();const progress=dur?pos/dur:0;
 if(!current){c.strokeStyle='#40513f';c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();}else{const peaks=current.waveform,max=Math.max(...peaks,1e-9),n=Math.min(peaks.length,Math.floor(r.width/3)),step=w/n;for(let b=0;b<n;b++){const a=Math.floor(b*peaks.length/n),z=Math.max(a+1,Math.floor((b+1)*peaks.length/n));let peak=0;for(let t=a;t<z;t++)peak=Math.max(peak,peaks[t]);const height=Math.max(dpr*2,Math.pow(peak/max,.62)*h*.88);c.fillStyle=b/n<=progress?'#e6bd74':'#789378';c.fillRect(b*step,(h-height)/2,Math.max(dpr,step-dpr),height);}if(progress>0){c.fillStyle='#f4dbab';c.fillRect(Math.min(w-2,w*progress),0,Math.max(1,dpr),h);}}
 if(!seeking)$('seek').value=dur?Math.round(progress*1000):0;
 $('seek').setAttribute('aria-valuetext',`${clock(pos)} de ${clock(dur)}`);$('elapsed').textContent=clock(pos);$('duration').textContent=clock(dur);
}
function tick(){draw();if(playing)frame=requestAnimationFrame(tick);}
async function jump(delta){if(!visible.length)return;let index=visible.findIndex(i=>i.id===current?.id);index=index<0?(delta>0?-1:0):index;await selectAndPlay(visible[(index+delta+visible.length)%visible.length].id);}
function seekTo(value){if(!buffer)return;const offset=buffer.duration*Math.min(1,Math.max(0,value/1000));if(playing)startAt(offset);else{position=offset;draw();}}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function downloadOne(i){downloadBlob(new Blob([base64bytes(i.audio)],{type:audioMime}),i.filename);}
async function copyID(i){try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(i.id);}else{const t=document.createElement('textarea');t.value=i.id;t.style.cssText='position:fixed;left:-9999px';document.body.appendChild(t);t.select();if(!document.execCommand('copy'))throw new Error('copy unavailable');t.remove();}toast('ID copiado: '+i.id);}catch{toast('ID: '+i.id);}}
// A small dependency-free ZIP writer. MP3 bytes are already compressed; ZIP entries are stored verbatim.
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=crcTable[(c^bytes[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function makeZip(files){const encoder=new TextEncoder(),chunks=[],central=[];let offset=0,centralSize=0;const date=new Date(BANK.created_at);const year=Math.max(1980,date.getUTCFullYear());const dosDate=((year-1980)<<9)|((date.getUTCMonth()+1)<<5)|date.getUTCDate();const dosTime=(date.getUTCHours()<<11)|(date.getUTCMinutes()<<5)|(date.getUTCSeconds()>>1);
 for(const f of files){const name=encoder.encode(f.name),data=f.data,crc=crc32(data);const local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(10,dosTime,true);v.setUint16(12,dosDate,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);chunks.push(local,data);
 const h=new Uint8Array(46+name.length),a=new DataView(h.buffer);a.setUint32(0,0x02014b50,true);a.setUint16(4,20,true);a.setUint16(6,20,true);a.setUint16(8,0x0800,true);a.setUint16(12,dosTime,true);a.setUint16(14,dosDate,true);a.setUint32(16,crc,true);a.setUint32(20,data.length,true);a.setUint32(24,data.length,true);a.setUint16(28,name.length,true);a.setUint32(42,offset,true);h.set(name,46);central.push(h);centralSize+=h.length;offset+=local.length+data.length;}
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...chunks,...central,end],{type:'application/zip'});
}
async function downloadAll(){const button=$('downloadAll');button.disabled=true;const old=button.innerHTML;button.innerHTML='Preparando ZIP…';await new Promise(r=>setTimeout(r,30));try{const e=new TextEncoder();const files=items.map(i=>({name:'audio/'+i.filename,data:base64bytes(i.audio)}));files.push({name:'manifest.json',data:e.encode(JSON.stringify(BANK.manifest,null,2))},{name:opus?'conversion.csv':'normalizacion.csv',data:e.encode(BANK.audit_csv)},...(opus?[{name:'normalizacion_original.csv',data:e.encode(BANK.original_audit_csv)}]:[]),{name:'SHA256SUMS.txt',data:e.encode(items.map(i=>`${i.sha256}  audio/${i.filename}`).join('\n')+'\n')},{name:'LEEME.txt',data:e.encode(BANK.readme)});downloadBlob(makeZip(files),opus?'Wild_Guardians_SFX_Opus.zip':'Wild_Guardians_SFX_V12_MP3.zip');toast(opus?'ZIP listo: 126 Opus.':'ZIP listo: 126 MP3 normalizados.');}catch(err){console.error(err);toast(opus?'No se pudo crear el ZIP. Los Opus individuales siguen disponibles.':'No se pudo crear el ZIP. Los MP3 individuales siguen disponibles.');}finally{button.disabled=false;button.innerHTML=old;}}
$('catalog').addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;const i=itemById.get(button.dataset.id);if(!i)return;switch(button.dataset.action){case 'play':selectAndPlay(i.id);break;case 'download':downloadOne(i);break;case 'copy':copyID(i);break;case 'info':{const next=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(next));$('info-'+i.id).hidden=!next;next?openInfo.add(i.id):openInfo.delete(i.id);break;}}});
let searchTimer;$('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=$('search').value;render();},100);});
$('category').addEventListener('change',()=>{category=$('category').value;render();});
$('sort').addEventListener('change',()=>{sort=$('sort').value;render();});
for(const chip of document.querySelectorAll('[data-filter]'))chip.addEventListener('click',()=>{filter=chip.dataset.filter;for(const b of document.querySelectorAll('[data-filter]')){const on=b===chip;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}render();});
$('resetFilters').addEventListener('click',()=>{query='';category='';filter='all';$('search').value='';$('category').value='';for(const b of document.querySelectorAll('[data-filter]')){const on=b.dataset.filter==='all';b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}render();});
$('playPause').addEventListener('click',()=>{if(current)selectAndPlay(current.id);});
$('stop').addEventListener('click',stop);
$('prev').addEventListener('click',()=>jump(-1));$('next').addEventListener('click',()=>jump(1));
$('restart').addEventListener('click',async()=>{if(!current)return;if(buffer){await ensureAudio();startAt(0);}else{position=0;selectAndPlay(current.id);}});
$('loop').addEventListener('click',()=>{const pos=currentPosition();looping=!looping;$('loop').setAttribute('aria-pressed',String(looping));if(playing)startAt(pos);else position=pos;draw();});
$('volume').addEventListener('input',()=>{volume=Number($('volume').value)/100;$('volume').setAttribute('aria-valuetext',`${Math.round(volume*100)} %`);if(gainNode)gainNode.gain.setTargetAtTime(volume,ctx.currentTime,.015);try{localStorage.setItem('wg-sfx-v12-catalog-settings',JSON.stringify({volume}));}catch{}});
$('seek').addEventListener('pointerdown',()=>seeking=true);
$('seek').addEventListener('input',()=>{if(!seeking)seekTo(Number($('seek').value));else draw();});
$('seek').addEventListener('change',()=>{const value=Number($('seek').value);seeking=false;seekTo(value);});
$('seek').addEventListener('pointercancel',()=>{seeking=false;draw();});
$('downloadCurrent').addEventListener('click',()=>current&&downloadOne(current));$('copyCurrent').addEventListener('click',()=>current&&copyID(current));$('downloadAll').addEventListener('click',downloadAll);
window.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,button,summary')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='/'){e.preventDefault();$('search').focus();}else if(e.code==='Space'&&current){e.preventDefault();selectAndPlay(current.id);}else if(e.key==='ArrowRight'&&current){e.preventDefault();jump(1);}else if(e.key==='ArrowLeft'&&current){e.preventDefault();jump(-1);}});
window.addEventListener('resize',draw);window.addEventListener('pagehide',stop);
render();draw();

window.addEventListener('wild-guardians:language-change',()=>{render();updateButtons();draw();});
