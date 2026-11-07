import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('cinematic keeps its cover until completion is confirmed and retries a failed transition',async()=>{
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia,Audio:globalThis.Audio,window:globalThis.window};
 const root={removed:false,classList:{remove(){}},veil:{classList:{remove(){}}},button:{style:{}},status:null,querySelector(selector){return selector==='.campaign-cinema__veil'?this.veil:selector==='.campaign-cinema__status'?this.status:selector==='button'?this.button:null;},append(element){this.status=element;},remove(){this.removed=true;}};
 globalThis.document={baseURI:'http://localhost/',createElement(){return {setAttribute(){}};}};globalThis.matchMedia=()=>({matches:true});globalThis.window={WildGuardiansLanguage:{getLanguage:()=> 'es'}};globalThis.Audio=class{pause(){}removeAttribute(){}load(){}};
 try{
  const bundle=await build({entryPoints:['src/ui/campaign-cinematics.js'],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.css':'empty'},logLevel:'silent'}),module={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url));
  const first=deferred(),second=deferred(),errors=[];let calls=0,closed=0;const owner=new module.exports.CampaignCinematics({onComplete:()=>++calls===1?first.promise:second.promise,onClosed:()=>closed++,onError:error=>errors.push(error.message)});owner.active=true;owner.token=1;owner.element=root;
  const finish=owner.finish(1);await sleep(180);assert.equal(calls,1);assert.equal(owner.active,true);assert.equal(root.removed,false);await owner.finish();assert.equal(calls,1);first.reject(Error('temporary'));await finish;assert.deepEqual(errors,['temporary']);assert.equal(root.button.textContent,'Reintentar');assert.equal(root.button.style.zIndex,'5');assert.equal(owner.active,true);assert.equal(root.removed,false);
  root.button.onclick();root.button.onclick();await Promise.resolve();assert.equal(calls,2);assert.equal(root.removed,false);second.resolve();await Promise.resolve();assert.equal(owner.active,true);await sleep(180);assert.equal(root.removed,true);assert.equal(owner.active,false);assert.equal(closed,1);
 }finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});

test('cinematic disposal while confirmation is pending cannot reopen or close a later surface',async()=>{
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia,Audio:globalThis.Audio,window:globalThis.window};let removed=0;const root={classList:{remove(){}},querySelector(){return null;},remove(){removed++;}};
 globalThis.document={baseURI:'http://localhost/'};globalThis.matchMedia=()=>({matches:true});globalThis.window={};globalThis.Audio=class{pause(){}removeAttribute(){}load(){}};
 try{const bundle=await build({entryPoints:['src/ui/campaign-cinematics.js'],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.css':'empty'},logLevel:'silent'}),module={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url));const pending=deferred(),owner=new module.exports.CampaignCinematics({onComplete:()=>pending.promise});owner.active=true;owner.token=1;owner.element=root;const finishing=owner.finish(1);await sleep(180);owner.dispose();assert.equal(owner.active,false);assert.equal(removed,1);pending.resolve();await finishing;await sleep(150);assert.equal(removed,1);}finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});

test('late cinematic manifest cannot start a GPU worker or modify a newer surface after disposal',async()=>{
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia,Audio:globalThis.Audio,window:globalThis.window,fetch:globalThis.fetch,Image:globalThis.Image,requestAnimationFrame:globalThis.requestAnimationFrame};
 const callbacks=[],roots=[],host={append(root){roots.push(root);}},manifest=deferred();let images=0;
 function root(){const veil={classList:{remove(){},add(){}}},status={},button={style:{}};return {classList:{add(){this.opened=true;},remove(){}},setAttribute(){},querySelector(selector){return selector==='button'?button:selector==='.campaign-cinema__status'?status:selector==='.campaign-cinema__veil'?veil:null;},remove(){this.removed=true;}};}
 globalThis.document={baseURI:'http://localhost/',createElement:()=>root()};globalThis.matchMedia=()=>({matches:false});globalThis.window={};globalThis.Audio=class{pause(){}removeAttribute(){}load(){}};globalThis.fetch=async()=>({ok:true,json:()=>manifest.promise});globalThis.Image=class{constructor(){images++;}};globalThis.requestAnimationFrame=callback=>callbacks.push(callback);
 try{const bundle=await build({entryPoints:['src/ui/campaign-cinematics.js'],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.css':'empty'},logLevel:'silent'}),module={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url));const owner=new module.exports.CampaignCinematics({host,pencilBackend:'webgpu-worker'});const first=owner.play(1);await Promise.resolve();owner.dispose();const second=owner.play(1);await Promise.resolve();callbacks[0]();assert.equal(roots[1].classList.opened,undefined);owner.dispose();manifest.resolve({acts:[{number:1,scenes:Array.from({length:5},()=>({id:'01',layers:[]}))}]});await Promise.all([first,second]);assert.equal(images,0);assert.equal(owner.pencil,null);assert.ok(roots.every(item=>item.removed));}finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
