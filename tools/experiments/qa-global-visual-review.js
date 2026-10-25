import {mountCoverageReview} from './qa-continuous-grass-review.js';
export async function mountGlobalReview(world){
 const biome=world.state.biome;
 if(biome==='sabana'||biome==='gran-rio'){
  const {applyMaterialStudy}=await import(biome==='sabana'?'./qa-continuous-grass-occupancy.js':'./qa-continuous-grass-river.js');
  return mountCoverageReview(world,{applyStudy:applyMaterialStudy,title:biome==='sabana'?'Cobertura de Sabana':'Cobertura de Gran Río',origin:biome==='sabana'?[135,9.400129699707032,45]:[87.83156862745099,7.077262442364413,15.827254901960785]});
 }
 if(biome!=='gran-canon')throw Error('Bioma sin candidato de revisión');
 await(await import('./qa-water-view.js')).focusWater(world);const origin=world.controls.target.clone();
 const q=(await import('./qa-canyon-warm-floor-streaming.js')).applyMaterialStudy(world);q.setEnabled(false);
 const host=document.createElement('aside');host.id='canyon-review';host.setAttribute('aria-label','Revisión del Cañón');const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<style>:host{position:fixed;right:16px;top:16px;z-index:99999;width:270px;background:#29251fed;color:#f7edce;padding:16px;border:1px solid #bdad7d;border-radius:12px;font:14px system-ui}h2{font-size:18px}button,select{font:inherit;padding:8px;margin:4px;background:#494135;color:inherit;border:1px solid #bdad7d;border-radius:5px}button[aria-pressed=true]{background:#806c39}label{display:block;margin-top:10px}p{font-size:12px;line-height:1.4}</style><h2>Sombras del Cañón</h2><button data-variant="A" aria-pressed="true">A · Original</button><button data-variant="B" aria-pressed="false">B · Cálida</button><label for="camera">Cámara</label><select id="camera"><option value="game">Normal</option><option value="oblique">Oblicua</option></select><label for="light">Iluminación</label><select id="light"><option value="day">Día</option><option value="night">Noche</option></select><p>Paleta candidata del suelo en sombra diurna. Sin cambios de geometría. Rendimiento pendiente de aprobación.</p><p id="status" role="status">A · Original</p>`;
 const style=document.createElement('style');style.textContent='#stage>:not(canvas){visibility:hidden!important;pointer-events:none!important}#world{pointer-events:none!important}';document.head.append(style);document.body.append(host);
 const camera=async()=>{const o=root.querySelector('#camera').value==='game'?[12,18,18]:[18,8,18];world.controls.target.copy(origin);world.camera.position.copy(origin).add({x:o[0],y:o[1],z:o[2]});world.syncChunks();await world.whenChunksReady();await world.horizon.whenReady();world.render(.016)};
 for(const b of root.querySelectorAll('[data-variant]'))b.onclick=()=>{q.setEnabled(b.dataset.variant==='B');for(const other of root.querySelectorAll('[data-variant]'))other.setAttribute('aria-pressed',String(other===b));root.querySelector('#status').textContent=b.textContent;world.render(.016)};
 root.querySelector('#camera').onchange=()=>camera().catch(e=>root.querySelector('#status').textContent=e.message);
 root.querySelector('#light').onchange=e=>{world.state.time=e.target.value==='day'?150:350;world.render(.016)};
 world.state.time=150;await camera();return {host,dispose(){q.dispose();style.remove();host.remove()}};
}
