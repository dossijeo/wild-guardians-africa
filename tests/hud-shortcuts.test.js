import test from 'node:test';
import assert from 'node:assert/strict';
import {hudShortcut} from '../src/ui/hud-shortcuts.js';

function fixture(){
  const calls=[],buttons=new Map();
  for(const selector of ['[data-menu="home"]','[data-menu="build"]','[data-menu="grow"]','[data-menu="magic"]','#menuButton']){
    buttons.set(selector,{disabled:false,closest:()=>null,click:()=>calls.push(selector)});
  }
  const root={querySelector:selector=>buttons.get(selector)};
  const event=(key,other={})=>({key,target:{closest:()=>null},preventDefault(){this.prevented=true;},...other});
  return {calls,buttons,root,event};
}
test('native menu shortcuts use live click handlers, including village and pause, without synthesizing commands',()=>{
  const {calls,root,event}=fixture();
  for(const key of ['1','2','3','4','H','P']){const e=event(key);assert.equal(hudShortcut(e,root),true);assert.equal(e.prevented,true);}
  assert.deepEqual(calls,['[data-menu="home"]','[data-menu="build"]','[data-menu="grow"]','[data-menu="magic"]','[data-menu="home"]','#menuButton']);
  for(const key of ['Escape','e','t','5'])assert.equal(hudShortcut(event(key),root),false);
  assert.equal(calls.length,6);
});
test('typing, repeats, modified shortcuts and blocking overlays cannot activate HUD controls',()=>{
  const {calls,root,event}=fixture();
  for(const other of [{repeat:true},{ctrlKey:true},{altKey:true},{metaKey:true},{defaultPrevented:true},{target:{closest:()=>({})}}]){
    const e=event('2',other);assert.equal(hudShortcut(e,root),false);assert.equal(e.prevented,undefined);
  }
  assert.equal(hudShortcut(event('2'),root,{enabled:false}),false);assert.deepEqual(calls,[]);
});
test('buttons becoming disabled or inert are observed at dispatch time and may become usable again',()=>{
  const {calls,buttons,root,event}=fixture(),button=buttons.get('[data-menu="build"]');
  button.disabled=true;assert.equal(hudShortcut(event('2'),root),false);
  button.disabled=false;button.closest=()=>({});assert.equal(hudShortcut(event('2'),root),false);
  button.closest=()=>null;assert.equal(hudShortcut(event('2'),root),true);
  buttons.delete('[data-menu="build"]');assert.equal(hudShortcut(event('2'),root),false);
  assert.deepEqual(calls,['[data-menu="build"]']);
});
