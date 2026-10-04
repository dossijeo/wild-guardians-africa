import {BALANCE} from '../simulation/balance.js';
import {permission,spellUnlocked} from '../simulation/rules.js';
export const SPELL_UNLOCK_LABELS=Object.freeze({shield:'Disponible desde la noche 1',growth:'Disponible desde el día 3',multiply:'Disponible desde el día 5'});
export function spellCardStatus(state,spec){
  const locked=!spellUnlocked(state,spec.id),cooldown=Math.max(0,state.cooldowns[spec.id]??0),allowed=permission(state,spec.id);
  return {disabled:locked||cooldown>0||!allowed,label:locked?SPELL_UNLOCK_LABELS[spec.id]:cooldown>0?'Recargando':!allowed?'No disponible ahora':'',cooldown,ratio:cooldown/spec.cooldown_seconds*100};
}
const secondsLabel=cooldown=>cooldown>0?String(Math.ceil(Math.max(0,cooldown-1e-9))):'';
export function spellCardsMarkup(state,symbol){
  return `<div class="card-grid three">${BALANCE.spells.map((spec,i)=>{const status=spellCardStatus(state,spec);return `<button class="choice-card spell-card" data-spell="${spec.id}" ${status.disabled?'disabled':''}><span class="spell-symbol ${['blue','green','purple'][i]}">${symbol(i)}<span class="spell-cooldown" style="--cd:${status.ratio}%"></span><span class="cooldown-number">${secondsLabel(status.cooldown)}</span></span><strong>${spec.name}</strong><span class="detail">${spec.duration_seconds} s · recarga ${spec.cooldown_seconds} s</span><span class="detail spell-status" data-source="${status.label}" ${status.label?'':'hidden'}>${status.label}</span></button>`;}).join('')}</div><p class="panel-note">Selecciona un poder y toca una zona para previsualizarlo antes de confirmar.</p>`;
}
export function refreshSpellCards(root,state){
  for(const button of root.querySelectorAll('[data-spell]')){
    const spec=BALANCE.spells.find(s=>s.id===button.dataset.spell);if(!spec)continue;
    const status=spellCardStatus(state,spec);if(button.disabled!==status.disabled)button.disabled=status.disabled;
    const label=button.querySelector('.spell-status');
    // The i18n runtime may translate textContent. Compare its source key rather
    // than replacing the translated text on every refresh; keep DOM/scroll.
    if(label&&label.dataset.source!==status.label){label.dataset.source=status.label;label.textContent=status.label;label.hidden=!status.label;}
    const seconds=button.querySelector('.cooldown-number'),number=secondsLabel(status.cooldown);
    if(seconds&&seconds.textContent!==number)seconds.textContent=number;
    const ring=button.querySelector('.spell-cooldown'),ratio=status.ratio+'%';if(ring&&ring.style.getPropertyValue('--cd')!==ratio)ring.style.setProperty('--cd',ratio);
  }
}
