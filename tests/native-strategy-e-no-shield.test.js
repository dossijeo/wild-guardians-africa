import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {nativeCampaignStrategy,campaignMagicAllowed,NATIVE_CAMPAIGN_PROTOCOL} from '../tools/native-campaign-protocol.mjs';
import {parseNativeCampaignArgs} from '../tools/run_native_campaign.mjs';
// Controlled day-five command fixture: all three spells are natively unlocked.
// No simulated passage of time, income or campaign acceptance is implied.
function fixture(){const s=Game.newGame({seed:712,slotId:'shield-control'}),nav=new Navigation(712,'sabana');s.day=5;nav.field={canyon:false,riverLevel:0,surface:()=>0,slope:()=>0,fluidInside:()=>false};nav.propsAt=()=>[];nav.setState(s);Game.placeStructure(s,'center',{x:-15,z:0},nav);Game.plant(s,'seed','mijo',0,0,nav);Game.plant(s,'seed-growth','mijo',6,0,nav);Game.plant(s,'seed-multiply','mijo',8,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});return {s,nav};}
test('E uses exactly D productive settings except explicit shield permission, retaining all existing shield defaults',()=>{
 const {shield:d,...D}=nativeCampaignStrategy('no-walls'),{shield:e,...E}=nativeCampaignStrategy('no-shield');assert.deepEqual(E,D);assert.equal(d,true);assert.equal(e,false);assert.equal(E.defend,false);assert.equal(E.repair,false);
 for(const name of ['expansive','good','bad','no-walls'])assert.equal(nativeCampaignStrategy(name).shield,true);
 assert.equal(NATIVE_CAMPAIGN_PROTOCOL.strategies.length,6);assert.equal(NATIVE_CAMPAIGN_PROTOCOL.shieldByStrategy['no-shield'],false);assert.equal(parseNativeCampaignArgs(['--out','fixture','--strategy','no-shield']).strategy,'no-shield');
});
test('same command gate used by runner executes native D shield but leaves E unchanged; growth and multiply remain equal without new RNG',()=>{
 const D=fixture(),E=fixture(),d=nativeCampaignStrategy('no-walls'),e=nativeCampaignStrategy('no-shield');const initialRng=D.s.rng;
 const cast=(f,p,kind,x,z)=>campaignMagicAllowed(p,kind)&&Game.cast(f.s,kind,kind,x,z,f.nav);
 assert.equal(cast(D,d,'shield',0,0),true);assert.equal(cast(E,e,'shield',0,0),false);assert.equal(E.s.spells.length,0);assert.equal(E.s.cooldowns.shield,0);assert.equal(E.s.commandIds.includes('shield'),false);
 for(const kind of ['growth','multiply']){const x=kind==='growth'?6:8;assert.equal(cast(D,d,kind,x,0),true);assert.equal(cast(E,e,kind,x,0),true);assert.equal(D.s.cooldowns[kind],E.s.cooldowns[kind]);}
 assert.equal(D.s.rng,initialRng);assert.equal(E.s.rng,initialRng);assert.deepEqual(D.s.ledger,E.s.ledger);assert.deepEqual(D.s.workers,E.s.workers);assert.deepEqual(D.s.plants,E.s.plants);
 assert.equal(D.s.events.filter(x=>x.type==='SpellActivated'&&x.kind==='shield').length,1);assert.equal(E.s.events.filter(x=>x.type==='SpellActivated'&&x.kind==='shield').length,0);
});
