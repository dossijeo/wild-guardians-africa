import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {UiAudio,UI_SOUND_IDS} from '../src/audio/ui-audio.js';
function fixture(){const calls=[];let now=0;const ui=new UiAudio((id,options)=>calls.push({id,options}),()=>now);return {ui,calls,time:t=>now=t};}
test('three hundred panel renders do not duplicate transition sounds; selection and closure each play once',()=>{
 const {ui,calls}=fixture();for(let i=0;i<300;i++)ui.surface('panel','cultivos');ui.surface('panel','construir');ui.close();ui.close();assert.deepEqual(calls.map(c=>c.id),['ui_panel_open','ui_tab','ui_panel_close']);assert.ok(calls.every(c=>c.options.bus==='ui'&&c.options.emitter==='ui:surface'));
});
test('replacing a panel with a mandatory dialog creates one open cue, with no invented close or purchase',()=>{
 const {ui,calls}=fixture();ui.surface('panel','cultivos');ui.surface('hiring');ui.surface('hiring');ui.close();assert.deepEqual(calls.map(c=>c.id),['ui_panel_open','ui_panel_open','ui_panel_close']);
});
test('repeated errors within one real second are bounded while a later error remains audible',()=>{
 const f=fixture();for(let i=0;i<100;i++)f.ui.error();f.time(.999);f.ui.error();assert.equal(f.calls.length,1);f.time(1);f.ui.error();assert.deepEqual(f.calls.map(c=>c.id),['ui_error','ui_error']);assert.ok(f.calls.every(c=>c.options.emitter==='ui:error'));
});
test('only actual user menu-pause transitions cue; closing another pause never falsely announces resume',()=>{
 const {ui,calls}=fixture();ui.pause([],['menu']);ui.pause(['menu'],['menu']);ui.pause(['menu','hiring'],['hiring']);ui.pause(['hiring'],[]);ui.pause([],['hidden']);ui.pause(['hidden'],[]);ui.pause([],['menu']);ui.pause(['menu'],[]);assert.deepEqual(calls.map(c=>c.id),['ui_pause','ui_pause','ui_resume']);
});
test('load/scene reset is silent, retains no previous surface, and permits an immediate new warning',()=>{
 const {ui,calls}=fixture();ui.surface('context','plant');ui.error();ui.reset();assert.equal(calls.length,2);ui.close();ui.error();ui.surface('context','plant');assert.deepEqual(calls.map(c=>c.id),['ui_panel_open','ui_error','ui_error','ui_panel_open']);
});
test('audio failure cannot throw into a successful interface or game action',async()=>{
 for(const play of [()=>{throw Error('device');},()=>Promise.reject(Error('decode'))]){const ui=new UiAudio(play);ui.surface('panel');ui.error();ui.pause([],['menu']);ui.close();await new Promise(done=>setImmediate(done));}
});
test('all transition cues retain original one-shot IDs from the supplied bank',()=>{
 const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url),'utf8'));assert.equal(UI_SOUND_IDS.length,10);for(const id of UI_SOUND_IDS){const item=bank.items.find(i=>i.id===id);assert.ok(item,id);assert.equal(item.loop,false);}
});


test('stale panel/close requests expire on the next transition before decoding can produce playback',()=>{
 const f=fixture();f.ui.surface('panel','seed');const open=f.calls[0];assert.equal(open.options.isCurrent(),true);f.ui.close();assert.equal(open.options.isCurrent(),false);const close=f.calls[1];assert.equal(close.options.isCurrent(),true);f.ui.surface('hiring');assert.equal(close.options.isCurrent(),false);assert.equal(f.calls[2].options.isCurrent(),true);f.ui.reset();assert.equal(f.calls[2].options.isCurrent(),false);
});
test('delayed error/pause requests cannot replay after their interaction window or scene reset',()=>{
 const f=fixture();f.ui.error();f.ui.pause([],['menu']);assert.ok(f.calls.every(c=>c.options.isCurrent()));f.time(.501);assert.ok(f.calls.every(c=>!c.options.isCurrent()));f.ui.pause(['menu'],[]);assert.equal(f.calls.at(-1).options.isCurrent(),true);f.ui.reset();assert.equal(f.calls.at(-1).options.isCurrent(),false);
});

test('each completed failed wall gesture can cue error 107 even within the general warning debounce',()=>{
 const f=fixture();f.ui.error({force:true});f.time(.2);f.ui.error({force:true});f.ui.error();
 assert.deepEqual(f.calls.map(c=>c.id),['ui_error','ui_error']);
 const bank=JSON.parse(readFileSync(new URL('../public/content/sfx-routing.json',import.meta.url),'utf8'));
 const item=bank.items.find(i=>i.id==='ui_error');assert.equal(item.number,107);assert.equal(item.filename,'107_ui_error.mp3');
});

test('magic selection uses original 092 instead of panel closure and expires superseded or reset requests',()=>{
 const f=fixture();f.ui.surface('panel','magic');f.ui.close({silent:true});assert.equal(f.ui.selectSpell('growth'),true);const first=f.calls.at(-1);assert.equal(first.id,'spirit_select');assert.equal(first.options.bus,'ui');assert.equal(first.options.emitter,'ui:magic');assert.equal(first.options.isCurrent(),true);assert.equal(f.calls.filter(c=>c.id==='ui_panel_close').length,0);
 f.ui.selectSpell('shield');assert.equal(first.options.isCurrent(),false);assert.equal(f.calls.at(-1).options.isCurrent(),true);f.time(.501);assert.equal(f.calls.at(-1).options.isCurrent(),false);f.time(1);f.ui.selectSpell('multiply');f.ui.reset();assert.equal(f.calls.at(-1).options.isCurrent(),false);
 const count=f.calls.length;assert.equal(f.ui.selectSpell('invalid'),false);assert.equal(f.calls.length,count);
 const bank=JSON.parse(readFileSync(new URL('../public/content/sfx-routing.json',import.meta.url),'utf8'));assert.equal(bank.items.find(i=>i.id==='spirit_select').number,92);
});

test('opening another surface cancels pending magic selection before late decoding',()=>{
 const f=fixture();f.ui.selectSpell('growth');const selection=f.calls.at(-1);assert.equal(selection.options.isCurrent(),true);f.ui.surface('panel','cultivos');assert.equal(selection.options.isCurrent(),false);assert.equal(f.calls.at(-1).options.isCurrent(),true);
});

test('guided HUD touch is exclusive to the two indicated actions, once per game',()=>{
 const f=fixture();
 for(const action of ['build','grow','magic','home'])assert.equal(f.ui.guidedTouch(action),false);
 assert.equal(f.ui.guidedTouch('magic',{guided:true}),false);
 for(const action of ['build','grow']){
  assert.equal(f.ui.guidedTouch(action,{guided:true}),true);
  assert.equal(f.ui.guidedTouch(action,{guided:true}),false);
 }
 assert.deepEqual(f.calls.map(c=>c.id),['spirit_touch','spirit_touch']);
 assert.ok(f.calls.every(c=>c.options.bus==='ui'&&c.options.emitter==='ui:guided-hud'));
 f.ui.reset();assert.equal(f.ui.guidedTouch('build',{guided:true}),true);
});
test('guided touch expires on panel replacement, scene reset and late decode',()=>{
 const f=fixture();f.ui.surface('panel','build');f.ui.guidedTouch('build',{guided:true});
 const first=f.calls.at(-1);assert.equal(first.options.isCurrent(),true);
 f.ui.close();assert.equal(first.options.isCurrent(),false);
 f.ui.guidedTouch('grow',{guided:true});const second=f.calls.at(-1);
 f.time(.501);assert.equal(second.options.isCurrent(),false);
 f.ui.reset();assert.equal(second.options.isCurrent(),false);
});
