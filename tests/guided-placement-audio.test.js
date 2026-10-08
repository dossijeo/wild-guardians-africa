import test from 'node:test';
import assert from 'node:assert/strict';
import {UiAudio,guidedPlacementKind} from '../src/audio/ui-audio.js';
const hands=target=>({mesh:{visible:true},adapter:{phase:'reading'},hints:{custom:{target}}});
test('confirmation requires the visible current world guide and matching placement tool',()=>{
 for(const kind of ['center','plant']){
  const target=kind==='center'?'center-site':'plant-site',h=hands(target);
  assert.equal(guidedPlacementKind({kind},h),kind);
  h.mesh.visible=false;assert.equal(guidedPlacementKind({kind},h),null);h.mesh.visible=true;
  h.adapter.phase='closed';assert.equal(guidedPlacementKind({kind},h),null);
 }
 for(const kind of ['wall','spell','village',undefined])assert.equal(guidedPlacementKind({kind},hands('center-site')),null);
 assert.equal(guidedPlacementKind({kind:'plant'},hands('center-site')),null);
 assert.equal(guidedPlacementKind({kind:'center'},null),null);
});
test('each guided placement cues 096 once per game and normal placements stay silent',()=>{
 const calls=[],ui=new UiAudio((id,options)=>calls.push({id,options}),()=>0);
 for(const kind of [null,'wall','spell'])assert.equal(ui.guidedPlacement(kind),false);
 for(const kind of ['center','plant']){assert.equal(ui.guidedPlacement(kind),true);assert.equal(ui.guidedPlacement(kind),false);}
 assert.deepEqual(calls.map(c=>c.id),['spirit_valid','spirit_valid']);
 assert.ok(calls.every(c=>c.options.bus==='ui'&&c.options.emitter==='ui:guided-placement'));
 ui.reset();assert.equal(ui.guidedPlacement('center'),true);
});
test('late decoding and scene reset invalidate a pending confirmation',()=>{
 const calls=[];let now=0;const ui=new UiAudio((id,options)=>calls.push(options),()=>now);
 ui.guidedPlacement('center');assert.equal(calls[0].isCurrent(),true);now=.501;assert.equal(calls[0].isCurrent(),false);
 ui.guidedPlacement('plant');assert.equal(calls[1].isCurrent(),true);ui.reset();assert.equal(calls[1].isCurrent(),false);
});
