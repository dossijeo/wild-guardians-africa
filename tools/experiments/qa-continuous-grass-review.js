import {applyMaterialStudy} from '/tools/experiments/qa-continuous-grass.js';
export async function mountCoverageReview(world){
 if(world.state.biome!=='sabana')throw Error('La revisión de cobertura requiere Sabana');
 await applyMaterialStudy(world,'C');const q=world.qaContinuousGrass;
 let running=true,elapsed=0,started=performance.now();
 const now=()=>elapsed+(running?(performance.now()-started)/1000:0);
 Object.defineProperty(q,'timeOverride',{configurable:true,get:now,set(value){elapsed=Number(value)||0;started=performance.now();}});
 const host=document.createElement('aside');host.id='coverage-review';host.setAttribute('aria-label','Revisión de cobertura herbácea');
 const shadow=host.attachShadow({mode:'open'});shadow.innerHTML=`<style>
 :host{position:fixed;z-index:99999;right:16px;top:16px;width:270px;color:#f7edce;font:14px system-ui;background:#1d2828ed;border:1px solid #bdad7d;border-radius:12px;padding:14px;box-shadow:0 8px 28px #0008}h2{font-size:17px;margin:0 0 10px}button,select{font:inherit;padding:7px;background:#34433d;color:inherit;border:1px solid #839578;border-radius:5px}button[aria-pressed=true]{background:#85723b}fieldset{border:0;padding:0;margin:10px 0}legend{margin-bottom:5px}label{display:block;margin-top:10px}input{width:100%}.row{display:flex;gap:6px}p{font-size:12px;line-height:1.4;margin-bottom:0}output{font-weight:bold}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #ffcf62}#status{min-height:32px}</style>
 <h2>Cobertura de Sabana</h2>
 <fieldset><legend>Comparación</legend><div class="row"><button data-variant="A" aria-pressed="false">A · Original</button><button data-variant="B" aria-pressed="false">B · Ligera</button><button data-variant="C" aria-pressed="true">C · Refinada</button></div></fieldset>
 <label for="wind">Fuerza del viento: <output id="strength">8×</output></label><input id="wind" type="range" min="0" max="12" step="0.5" value="8">
 <button id="motion" aria-pressed="false">Congelar viento</button>
 <label for="camera">Cámara</label><select id="camera"><option value="close">Cercana</option><option value="game">Normal</option><option value="elevated">Elevada</option></select>
 <label for="light">Iluminación</label><select id="light"><option value="day">Día</option><option value="night">Noche</option></select>
 <p>Escena pausada para comparar. El viento se anima con un reloj visual independiente. Solo C utiliza viento.</p><p id="status" role="status">C · Viento 8×</p>`;
 const cleanView=document.createElement('style');cleanView.textContent='#stage > :not(canvas){visibility:hidden!important;pointer-events:none!important} #world{pointer-events:none!important}';document.head.append(cleanView);
 document.body.append(host);
 const status=shadow.querySelector('#status'),buttons=[...shadow.querySelectorAll('[data-variant]')];
 async function camera(){const name=shadow.querySelector('#camera').value;world.controls.target.set(135,9.400129699707032,45);world.camera.position.set(...(name==='close'?[138,11.400129699707032,49]:name==='game'?[157,25.400129699707032,63]:[151,39.400129699707032,63]));world.syncChunks();await world.whenChunksReady();await world.horizon.whenReady();world.render(.016);}
 for(const b of buttons)b.onclick=async()=>{buttons.forEach(x=>x.disabled=true);try{await applyMaterialStudy(world,b.dataset.variant);buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status.textContent=b.dataset.variant==='C'?`C · Viento ${q.uniforms.uCoverageWindStrength.value}×`:`${b.dataset.variant} · Sin viento`;world.render(.016);}catch(e){status.textContent=e.message;}finally{buttons.forEach(x=>x.disabled=false);}};
 shadow.querySelector('#wind').oninput=e=>{const strength=Number(e.target.value);q.uniforms.uCoverageWindStrength.value=strength;shadow.querySelector('#strength').textContent=strength+'×';status.textContent=q.variant==='C'?`C · Viento ${strength}×`:`${q.variant} · Fuerza preparada para C`;};
 shadow.querySelector('#motion').onclick=e=>{elapsed=now();started=performance.now();running=!running;e.target.textContent=running?'Congelar viento':'Animar viento';e.target.setAttribute('aria-pressed',String(!running));};
 shadow.querySelector('#camera').onchange=()=>camera().catch(e=>{status.textContent=e.message;});
 shadow.querySelector('#light').onchange=e=>{world.state.time=e.target.value==='day'?150:350;world.render(.016);};
 world.state.time=150;await camera();
 return {host,dispose(){const current=now();delete q.timeOverride;q.timeOverride=current;cleanView.remove();host.remove();}};
}
