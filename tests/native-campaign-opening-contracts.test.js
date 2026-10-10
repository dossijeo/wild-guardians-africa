import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {dawnMinimum} from '../src/simulation/rules.js';
import {affordableOpening,NATIVE_CAMPAIGN_SEEDS,nativeCampaignStrategy} from '../tools/native-campaign-protocol.mjs';
function emptyField(cash){
 const s=Game.newGame({seed:712,slotId:'empty-recovery'}),nav=new Navigation(712,'sabana');
 nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-15,z:0},nav);
 // Explicit command fixture funds; not an affordable new-game campaign.
 s.ledger.balance=rational(cash);s.day=2;s.time=0;s.initialPreparation=false;Game.pause(s,'hiring');return{s,nav};
}
test('native negative: declared dawn minimum35 cannot pay wage30 and then seed5 with reserve30',()=>{
 const {s,nav}=emptyField(35);assert.equal(dawnMinimum(s),35);
 Game.hire(s,'hire',{olderFemale:1});assert.equal(s.ledger.entries.hire.n,'-30');assert.equal(numberOf(s.ledger.balance),5);
 assert.throws(()=>Game.plant(s,'seed','mijo',0,0,nav),/contratar|monedas|reserva/i);
 assert.equal(s.plants.length,0);assert.equal(s.ledger.entries.seed,undefined);assert.equal(numberOf(s.ledger.balance),5);
});
test('native positive: fixture65 legally pays wage30 and seed5, preserving30 without bypass',()=>{
 const {s,nav}=emptyField(65);Game.hire(s,'hire',{olderFemale:1});
 assert.equal(Game.plant(s,'seed','mijo',0,0,nav),true);assert.equal(numberOf(s.ledger.balance),30);assert.equal(s.plants.length,1);assert.equal(s.tasks[0].kind,'initial');
});
test('preselected seeds and affordable opening never use projected income or credit',()=>{
 assert.deepEqual(NATIVE_CAMPAIGN_SEEDS,[712,123,2026]);assert.equal(nativeCampaignStrategy('expansive').foundVillages,true);assert.equal(nativeCampaignStrategy('bad').repair,false);assert.throws(()=>nativeCampaignStrategy('reroll'));
 for(const cash of [0,5,30,35,65,695,1500]){const a=affordableOpening({cash,living:1});assert.ok(a.wages<=cash);assert.equal(a.wages,a.staff*30);}
});


test('productive no-wall controls retain paid center maintenance; bad management alone neglects it',()=>{
 for(const id of ['good','expansive','passive','no-walls','no-shield'])assert.equal(nativeCampaignStrategy(id).repair,true,id);
 for(const id of ['no-walls','no-shield'])assert.equal(nativeCampaignStrategy(id).defend,false,id);
 assert.equal(nativeCampaignStrategy('no-walls').shield,true);
 assert.equal(nativeCampaignStrategy('no-shield').shield,false);
 assert.equal(nativeCampaignStrategy('bad').repair,false);
});
