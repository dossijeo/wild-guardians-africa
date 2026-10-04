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
    const s=ready();s.day=day;s.time=time;change(s);for(const spec of BALANCE.spells){const card=spellCardStatus(s,spec);assert.equal(card.disabled,!Game.previewSpell(s,spec.id,40,40,nav).valid);}
  }
});
test('cooldown starts at casting and updates cards while effect continues; pauses freeze it',()=>{
  const s=ready();s.day=5;Game.cast(s,'cast','growth',40,40,nav);const spec=BALANCE.spells.find(s=>s.id==='growth');assert.equal(spellCardStatus(s,spec).cooldown,90);assert.equal(spellCardStatus(s,spec).label,'Recargando');Game.tick(s,1,nav);assert.ok(s.spells[0].remaining>28);assert.ok(Math.abs(spellCardStatus(s,spec).cooldown-89)<1e-8);Game.pause(s,'menu');Game.tick(s,10,nav);assert.ok(Math.abs(spellCardStatus(s,spec).cooldown-89)<1e-8);
});
test('native markup keeps original symbols and translated status labels',()=>{
  const markup=spellCardsMarkup(ready(),i=>`<svg data-original="${i}"></svg>`);assert.equal((markup.match(/ disabled/g)||[]).length,3);assert.equal((markup.match(/data-original=/g)||[]).length,3);
  for(const [es,en] of [['Disponible desde la noche 1','Available from night 1'],['Disponible desde el día 3','Available from day 3'],['Disponible desde el día 5','Available from day 5'],['Recargando','Cooling down'],['No disponible ahora','Unavailable now']]){assert.equal(translate(es,'es'),es);assert.equal(translate(es,'en'),en);}
});
test('stable refresh preserves translated text, existing nodes and scroll; a state transition updates only status',()=>{
  const s=ready(),label={dataset:{source:'Disponible desde el día 3'},textContent:'Available from day 3',hidden:false},number={textContent:''},values=new Map([['--cd','0%']]),ring={style:{getPropertyValue:k=>values.get(k),setProperty:(k,v)=>values.set(k,v)}},button={dataset:{spell:'growth'},disabled:true,querySelector:k=>({'.spell-status':label,'.cooldown-number':number,'.spell-cooldown':ring}[k])},root={scrollTop:117,querySelectorAll:()=>[button]};
  for(let i=0;i<100;i++)refreshSpellCards(root,s);assert.equal(label.textContent,'Available from day 3');assert.equal(root.scrollTop,117);assert.equal(button.disabled,true);s.day=3;refreshSpellCards(root,s);assert.equal(button.disabled,false);assert.equal(label.hidden,true);assert.equal(root.scrollTop,117);s.cooldowns.growth=89.00000000000006;refreshSpellCards(root,s);assert.equal(number.textContent,'89');s.cooldowns.growth=44.2;refreshSpellCards(root,s);assert.equal(label.textContent,'Recargando');assert.equal(number.textContent,'45');assert.equal(label.hidden,false);assert.equal(root.scrollTop,117);
});
