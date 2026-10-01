// Inserted inside the original menu closure by prepare_menu.py.
const nativeRenderPanel=renderPanel;
const sendProduction=(action,detail={})=>parent.postMessage({type:'wild-guardians:menu',action,...detail},location.origin);
const sectionFrame=(src,title)=>`<iframe class="production-section" title="${title}" src="${src}" style="width:100%;height:70dvh;min-height:340px;border:0;border-radius:9px"></iframe>`;
renderPanel=function(id){
 nativeRenderPanel(id);
 const panel=$('#panel'),backButton=$('#panel [data-back]');
 panel.style.width=id==='new'||id==='library'?'min(1160px,94vw)':'';
 const replace=html=>{panel.replaceChildren(backButton);panel.insertAdjacentHTML('beforeend',html);};
 if(id==='new')replace(sectionFrame('/selector/index.html?embedded=1','Nueva partida · Bioma y cultura'));
 if(id==='continue'){
  replace('<div class="sectionmark">Tu refugio</div><h1>Volver a casa.</h1><div id="production-saves" aria-live="polite">Consultando tus poblados…</div>');sendProduction('request-saves');
 }
 if(id==='library'){
  replace('<div class="sectionmark">El mundo que te rodea</div><h1>Pequeños descubrimientos.</h1><div id="production-library">'+[['crops','Cultivos'],['walls','Bastión'],['destruction','Destrucción'],['sfx','Sonidos']].map(([key,title])=>`<button class="secondary" data-production-lab="${key}">${title} →</button>`).join('')+'</div>');
  $$('[data-production-lab]').forEach(button=>button.onclick=()=>{$('#production-library').innerHTML=sectionFrame('/library.html?lab='+button.dataset.productionLab,button.textContent);});
 }
 if(id==='options'){
  panel.insertAdjacentHTML('beforeend','<div class="rule"></div><h2>Audio del juego</h2><label class="control">Sonidos<input id="production-sfx" type="range" min="0" max="1" step=".05"></label><label class="control">Música<input id="production-music" type="range" min="0" max="1" step=".05"></label><label class="field"><span>Calidad del juego</span><select id="production-quality"><option value="muy_baja">Muy baja</option><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label>');sendProduction('request-settings');
  for(const id of ['production-sfx','production-music','production-quality'])$('#'+id).oninput=()=>sendProduction('settings-change',{settings:{sfx:Number($('#production-sfx').value),music:Number($('#production-music').value),quality:$('#production-quality').value}});
 }
};
window.addEventListener('message',event=>{
 if(event.origin!==location.origin)return;
 if(event.source===parent&&event.data?.type==='wild-guardians:menu-data'){
  if(event.data.slots&&$('#production-saves')){
   $('#production-saves').innerHTML=event.data.slots.length?event.data.slots.map(slot=>`<div class="savecard"><strong>${esc(slot.cultureName)}</strong><span>Día ${slot.day} · ${esc(slot.biomeName)} · ${esc(slot.money)} monedas</span><button class="secondary" data-production-save="${esc(slot.slotId)}">Continuar →</button></div>`).join(''):'<p class="lede">Todavía no hay poblados guardados.</p>';
   $$('[data-production-save]').forEach(button=>button.onclick=()=>sendProduction('load-slot',{slotId:button.dataset.productionSave}));
  }
  if(event.data.settings&&$('#production-sfx')){const settings=event.data.settings;$('#production-sfx').value=settings.sfx;$('#production-music').value=settings.music;$('#production-quality').value=settings.quality;}
 }
 const frame=$('#panel iframe.production-section');
 if(event.source===frame?.contentWindow&&event.data?.type==='wild-guardians:selector'){
  if(event.data.action==='back')back();
  if(event.data.action==='start')sendProduction('start',{biome:event.data.biome,culture:event.data.culture});
 }
});
const nativeBack=back;
back=function(){
 const frames=$$('#panel iframe');nativeBack();
 if(frames.length)requestAnimationFrame(function cleanup(){if(state==='home'){frames.forEach(frame=>frame.remove());return;}requestAnimationFrame(cleanup);});
};
