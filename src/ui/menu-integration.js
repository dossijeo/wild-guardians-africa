// Inserted inside the original menu closure by prepare_menu.py.
const nativeRenderPanel=renderPanel;
const sendProduction=action=>parent.postMessage({type:'wild-guardians:menu',action},location.origin);
renderPanel=function(id){
 nativeRenderPanel(id);
 const backButton=$('#panel [data-back]');
 const replace=html=>{const panel=$('#panel');panel.replaceChildren(backButton);panel.insertAdjacentHTML('beforeend',html);};
 if(id==='new'){
  replace('<div class="sectionmark">Una nueva semilla</div><h1>Todo empieza aquí.</h1><p class="lede">Elige el paisaje y la cultura de tu comunidad. Cultiva y protege tu finca durante cien noches.</p><button class="primary" id="production-new">Nueva partida <span>→</span></button>');
  $('#production-new').onclick=()=>sendProduction('new');
 }
 if(id==='continue'){
  replace('<div class="sectionmark">Tu refugio</div><h1>Volver a casa.</h1><p class="lede">Retoma uno de tus poblados guardados en este navegador.</p><button class="primary" id="production-load">Ver partidas guardadas <span>→</span></button>');
  $('#production-load').onclick=()=>sendProduction('load');
 }
 if(id==='library'){
  replace('<div class="sectionmark">El mundo que te rodea</div><h1>Pequeños descubrimientos.</h1><p class="lede">Consulta los laboratorios originales de cultivos, defensas, destrucción y sonido.</p><button class="primary" id="production-library">Abrir biblioteca <span>→</span></button>');
  $('#production-library').onclick=()=>sendProduction('library');
 }
 if(id==='options'){
  $('#panel').insertAdjacentHTML('beforeend','<div class="rule"></div><button class="secondary" id="production-settings">Audio y calidad del juego →</button>');
  $('#production-settings').onclick=()=>sendProduction('settings');
 }
};
