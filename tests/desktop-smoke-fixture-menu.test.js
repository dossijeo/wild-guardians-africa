import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';import {execFileSync} from 'node:child_process';
import {BrowserSaveRepository} from '../src/persistence/browser-saves.js';
const source=readFileSync('src-tauri/smoke.js','utf8'),helper=source.slice(source.indexOf('  async function listFixtureForSmoke('),source.indexOf('  async function checkVisibility('));
function setup(send){
 const listeners=new Set(),timers=new Map(),parent={},target={addEventListener(type,fn){assert.equal(type,'message');listeners.add(fn);},removeEventListener(type,fn){assert.equal(type,'message');listeners.delete(fn);}},menu={contentWindow:target};
 const context={window:parent,location:{origin:'http://tauri.localhost'},document:{querySelector:()=>menu},setTimeout(fn,ms){assert.equal(ms,10000);timers.set(1,fn);return 1;},clearTimeout(id){timers.delete(id);}};
 const list=runInNewContext(`${helper}\nlistFixtureForSmoke`,context);
 const emit=(data,{origin=context.location.origin,source=parent}={})=>{for(const fn of [...listeners])fn({origin,source,data});};
 const promise=list(menu,{slotId:'owned'},detail=>send?.(detail,emit));
 return {promise,emit,listeners,timers,menu,target,parent};
}
test('real save repository list response precedes load and supplies the stored preview',async()=>{
 const map=new Map(),storage={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:key=>map.get(key)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const fixture=JSON.parse(readFileSync('docs/qa/windows-loading-regression/crop-partition-visual-qa/fixtures/night-fixture.json','utf8'));
 storage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);
 const repository=new BrowserSaveRepository(storage,{database:null}),slots=await repository.list();assert.equal(slots[0].time,302.00000000000045);
 const f=setup((detail,emit)=>{assert.deepEqual(JSON.parse(JSON.stringify(detail)),{action:'request-saves'});emit({type:'wild-guardians:menu-data',slots:slots.map(s=>({...s,slotId:'owned'}))});});
 const result=await f.promise;assert.equal(result.listed,true);assert.equal(result.preview.time,slots[0].time);assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
});
test('other origins/sources/types/settings/wrong slots are ignored until matching response',async()=>{
 const f=setup();let done=false;f.promise.then(()=>{done=true;});
 const data={type:'wild-guardians:menu-data',slots:[{slotId:'owned',day:2,time:310}]};
 f.emit(data,{origin:'http://evil.invalid'});f.emit(data,{source:{}});f.emit({...data,type:'wrong'});f.emit({type:data.type,settings:{}});f.emit({...data,slots:[{slotId:'other'}]});await Promise.resolve();assert.equal(done,false);assert.equal(f.listeners.size,1);
 f.emit(data);const result=await f.promise;assert.equal(result.preview.time,310);assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
});
test('timeout and synchronous request failure always remove listener/timer and reject',async()=>{
 const f=setup(),rejected=assert.rejects(f.promise,/did not appear/);[...f.timers.values()][0]();await rejected;assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
 const failure=setup(()=>{throw Error('request failed');});await assert.rejects(failure.promise,/request failed/);assert.equal(failure.listeners.size,0);assert.equal(failure.timers.size,0);
});
test('replaced iframe cannot validate a stale reply and later events cannot repopulate result',async()=>{
 const f=setup(),rejected=assert.rejects(f.promise,/replaced/);f.menu.contentWindow={};f.emit({type:'wild-guardians:menu-data',slots:[{slotId:'owned'}]});await rejected;assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
 f.emit({type:'wild-guardians:menu-data',slots:[{slotId:'owned'}]});assert.equal(f.listeners.size,0);
});
test('only fixture flow changed; defaults/world/visibility gates and App preview source are intact',()=>{
 const baseline=execFileSync('git',['show','b76cda99:src-tauri/smoke.js'],{encoding:'utf8'}).replaceAll('\r\n','\n');
 const block=`    if (fixture) {
      localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);
      report.checks.fixtureMenuList=await listFixtureForSmoke(menu,fixture,send);
      send({action:'load-slot',slotId:fixture.slotId});
    }`;
 assert.equal(source.replaceAll('\r\n','\n').replace(helper.replaceAll('\r\n','\n'),'').replace(block,"    if (fixture) {localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);send({action:'load-slot',slotId:fixture.slotId});}"),baseline);
 const app=readFileSync('src/app/main.js','utf8');assert.match(app,/request-saves'\)respond\(\{slots:\(await listedSaves\(\)\)/);assert.match(app,/preview:savePreviews.get\(data.slotId\)/);
 assert.equal(helper.includes('JSON.parse'),false);assert.equal(helper.includes('snapshot'),false);
});
