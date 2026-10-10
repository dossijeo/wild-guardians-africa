import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE} from '../src/simulation/balance.js';
import {spellCardStatus,spellCardsMarkup,refreshSpellCards} from '../src/ui/spell-cards.js';
import * as Game from '../src/simulation/game.js';
import {translate} from '../public/i18n/catalog.js';
const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function ready(){const s=Game.newGame({seed:712,slotId:'cards'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:12,z:8},nav);Game.plant(s,'seed','mijo',17,8,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});return s;}
test('cards and game validation agree on unlock dates, pauses, infrastructure and workers',()=>{
  for(const [day,time] of [[1,0],[2,299.9],[2,300],[3,0],[5,0]])for(const change of [()=>{},s=>s.pauses.push('menu'),s=>s.structures[0].status='ruined',s=>s.workers=[]]){
    const s=ready();s.day=day;s.time=time;change(s);for(const spec of BALANCE.spells){const card=spellCardStatus(s,spec);assert.equal(card.disabled,!Game.previewSpell(s,spec.id,17,8,nav).valid);}
  }
});
test('agricultural cards ignore legacy cooldowns and never show a cooldown ring',()=>{
 const s=ready();for(const kind of ['growth','multiply']){
  s.cooldowns[kind]=120;const spec=BALANCE.spells.find(s=>s.id===kind);
  assert.equal(spellCardStatus(s,spec).disabled,false);assert.equal(spellCardStatus(s,spec).cooldown,0);
 }
});
test('native markup keeps original symbols and translated status labels',()=>{
  const markup=spellCardsMarkup(ready(),i=>`<svg data-original="${i}"></svg>`);assert.equal((markup.match(/ disabled/g)||[]).length,1);assert.equal((markup.match(/data-original=/g)||[]).length,3);
  for(const [es,en] of [['Disponible desde la noche 1','Available from night 1'],['Disponible desde el día 3','Available from day 3'],['Disponible desde el día 5','Available from day 5'],['Recargando','Cooling down'],['No disponible ahora','Unavailable now']]){assert.equal(translate(es,'es'),es);assert.equal(translate(es,'en'),en);}
});
test('the spell panel describes direct placement in both languages',()=>{
 const hint='Crecimiento y Multiplicar: toca una planta. Escudo: toca el terreno. Cada aplicación mantiene la selección diez segundos.';
 assert.ok(spellCardsMarkup(ready(),()=>'<svg></svg>').includes(hint));
 assert.equal(translate(hint,'es'),hint);
 assert.equal(translate(hint,'en'),'Growth and Multiply: tap a plant. Shield: tap the ground. Each cast keeps selection active for ten seconds.');
});
test('stable agricultural card refresh preserves scroll and hides stale legacy cooldown',()=>{
 const s=ready(),label={dataset:{source:''},textContent:'',hidden:true},number={textContent:'89'},values=new Map([['--cd','90%']]),ring={style:{getPropertyValue:k=>values.get(k),setProperty:(k,v)=>values.set(k,v)}},button={dataset:{spell:'growth'},disabled:true,querySelector:k=>({'.spell-status':label,'.cooldown-number':number,'.spell-cooldown':ring}[k])},root={scrollTop:117,querySelectorAll:()=>[button]};
 s.cooldowns.growth=90;for(let i=0;i<100;i++)refreshSpellCards(root,s);
 assert.equal(root.scrollTop,117);assert.equal(button.disabled,false);assert.equal(number.textContent,'');assert.equal(values.get('--cd'),'0%');
});
