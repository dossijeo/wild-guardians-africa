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
