import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE} from '../src/simulation/balance.js';
import {spellCardStatus,spellCardsMarkup,refreshSpellCards} from '../src/ui/spell-cards.js';
import * as Game from '../src/simulation/game.js';
import {translate} from '../public/i18n/catalog.js';

const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function ready(){const s=Game.newGame({seed:712,slotId:'cards'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:12,z:8},nav);Game.plant(s,'seed','mijo',17,8,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});return s;}

test('cards and game validation agree on unlocks and general permissions for valid targets',()=>{
  for(const [day,time] of [[1,0],[1,299.9],[1,300],[2,0],[5,0]])for(const change of [()=>{},s=>s.pauses.push('menu'),s=>s.structures[0].status='ruined',s=>s.workers=[]]){
    const s=ready();s.day=day;s.time=time;change(s);
    for(const spec of BALANCE.spells){
      const card=spellCardStatus(s,spec),point=spec.id==='shield'?{x:40,z:40}:{x:17,z:8};
      assert.equal(card.disabled,!Game.previewSpell(s,spec.id,point.x,point.z,nav).valid,`${spec.id} day ${day} time ${time}`);
    }
  }
});

test('shield cooldown starts on cast and pauses freeze it; agricultural powers have no cooldown',()=>{
  const s=ready();s.day=2;Game.cast(s,'cast-shield','shield',40,40,nav);
  const shield=BALANCE.spells.find(spec=>spec.id==='shield');
  assert.equal(spellCardStatus(s,shield).cooldown,90);
  assert.equal(spellCardStatus(s,shield).label,'Recargando');
  Game.tick(s,1,nav);
  assert.ok(s.spells[0].remaining>18);
  assert.ok(Math.abs(spellCardStatus(s,shield).cooldown-89)<1e-8);
  Game.pause(s,'menu');Game.tick(s,10,nav);
  assert.ok(Math.abs(spellCardStatus(s,shield).cooldown-89)<1e-8);

  const farm=ready(),growth=BALANCE.spells.find(spec=>spec.id==='growth');
  Game.cast(farm,'cast-growth','growth',17,8,nav,farm.plants[0].id);
  assert.equal(spellCardStatus(farm,growth).cooldown,0);
  assert.equal(spellCardStatus(farm,growth).disabled,false);
});

test('native markup retains symbols, current unlocks, cooldown details and translations',()=>{
  const markup=spellCardsMarkup(ready(),i=>`<svg data-original="${i}"></svg>`);
  assert.equal((markup.match(/ disabled/g)||[]).length,2);
  assert.equal((markup.match(/data-original=/g)||[]).length,4);
  assert.equal((markup.match(/una planta Â· sin recarga/g)||[]).length,2);
  for(const [es,en] of [['Disponible desde la noche 1','Available from night 1'],['Disponible desde el dÃ­a 1','Available from day 1'],['Recargando','Cooling down'],['No disponible ahora','Unavailable now'],['una planta Â· sin recarga','one plant Â· no cooldown']]){
    assert.equal(translate(es,'es'),es);
    assert.equal(translate(es,'en'),en);
  }
});

test('spell panel explains per-plant and terrain targeting in both languages',()=>{
  const hint='Crecimiento y Multiplicar: toca una planta. Escudo: toca el terreno. Ataque: toca una bestia activa. Cada aplicaciÃ³n mantiene la selecciÃ³n diez segundos.';
  assert.ok(spellCardsMarkup(ready(),()=>'<svg></svg>').includes(hint));
  assert.equal(translate(hint,'es'),hint);
  assert.equal(translate(hint,'en'),'Growth and Multiply: tap a plant. Shield: tap the ground. Attack: touch an active beast. Each cast keeps selection active for ten seconds.');
});

test('stable refresh preserves translated text, nodes and scroll while shield status changes',()=>{
  const s=ready(),label={dataset:{source:'Disponible desde la noche 1'},textContent:'Available from night 1',hidden:false},number={textContent:''},values=new Map([['--cd','0%']]),ring={style:{getPropertyValue:k=>values.get(k),setProperty:(k,v)=>values.set(k,v)}},button={dataset:{spell:'shield'},disabled:true,querySelector:k=>({'.spell-status':label,'.cooldown-number':number,'.spell-cooldown':ring}[k])},root={scrollTop:117,querySelectorAll:()=>[button]};
  for(let i=0;i<100;i++)refreshSpellCards(root,s);
  assert.equal(label.textContent,'Available from night 1');
  assert.equal(root.scrollTop,117);
  assert.equal(button.disabled,true);
  s.time=300;refreshSpellCards(root,s);
  assert.equal(button.disabled,false);
  assert.equal(label.hidden,true);
  assert.equal(root.scrollTop,117);
  s.cooldowns.shield=89.00000000000006;refreshSpellCards(root,s);
  assert.equal(number.textContent,'89');
  s.cooldowns.shield=44.2;refreshSpellCards(root,s);
  assert.equal(label.textContent,'Recargando');
  assert.equal(number.textContent,'45');
  assert.equal(label.hidden,false);
  assert.equal(root.scrollTop,117);
});


test('Attack card exposes remaining cooldown and enables again at zero',()=>{
 const s=ready();s.day=2;s.raid={animals:[]};const spec=BALANCE.spells.find(spec=>spec.id==='attack');
 for(const remaining of [12,11.9,.1]){
  s.cooldowns.attack=remaining;const card=spellCardStatus(s,spec);
  assert.equal(card.disabled,true);assert.equal(card.label,'Recargando');
  assert.equal(card.cooldown,remaining);assert.equal(card.ratio,remaining/12*100);
 }
 s.cooldowns.attack=0;assert.equal(spellCardStatus(s,spec).disabled,false);
});
