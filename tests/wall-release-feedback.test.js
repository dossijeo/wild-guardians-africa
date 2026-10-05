import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {UiAudio} from '../src/audio/ui-audio.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
const source=readFileSync(new URL('../src/app/main.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('function buildWallStroke('),source.indexOf('function toolPanel('));
function fixture({money=1000,blocked=false}={}){
 const state=Game.newGame({seed:712}),base=clearNavigation();Game.placeStructure(state,'center',{x:-20,z:0},base);state.day=101;state.postgame=true;state.initialPreparation=false;state.ledger.balance=rational(money);
 const nav=blocked?{...base,wallPlacement:()=>({valid:false,suppress:[]})}:base,sounds=[],warnings=[],effects=[];
 const uiAudio=new UiAudio(id=>sounds.push(id),()=>0),world={clearWallPreview:()=>effects.push('clear'),syncResidentProps:()=>effects.push('props')};
 const release=new Function('state','tool','Game','world','nav','commandId','RESERVE_MESSAGE','uiAudio','error','toolSession','save',body+';return buildWallStroke;')(state,{kind:'wall',material:'zarzas'},Game,world,nav,()=>crypto.randomUUID(),'reserve',uiAudio,(...args)=>warnings.push(args),{used:()=>effects.push('used')},()=>effects.push('save'));
 return {state,release,sounds,warnings,effects};
}
test('actual application release cues one error for a wholly blocked chain, with no payment or save',()=>{
 const f=fixture({blocked:true}),before=serialize(f.state);f.release([[0,0],[30,0]]);
 assert.deepEqual(f.sounds,['ui_error']);assert.deepEqual(f.effects,[]);assert.deepEqual(f.warnings,[]);assert.equal(serialize(f.state),before);
});
test('each unfunded release cues one error and requests the deduplicated reserve warning silently',()=>{
 const f=fixture({money:30}),before=serialize(f.state);f.release([[0,0],[30,0]]);f.release([[0,0],[30,0]]);
 assert.deepEqual(f.sounds,['ui_error','ui_error']);assert.deepEqual(f.warnings,[['reserve',{silent:true}],['reserve',{silent:true}]]);assert.equal(serialize(f.state),before);
});
test('partial affordable success in the application has no error cue and performs one save',()=>{
 const f=fixture({money:50});f.release([[0,0],[30,0]]);
 assert.deepEqual(f.sounds,[]);assert.equal(f.state.structures.filter(p=>p.kind==='wall').length,2);assert.equal(numberOf(f.state.ledger.balance),30);assert.deepEqual(f.effects,['used','clear','props','save']);
});
