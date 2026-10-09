import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const native=read('public/menu/native.js'),integration=read('src/ui/menu-integration.js');
const extract=source=>source.slice(source.indexOf('let productionLabViewer=null;'),source.indexOf('const sectionFrame='));

function environment({audioOn=true,play=async()=>true,nativeAudio=false}={}){
 const document={activeElement:null,listeners:[],addEventListener(...args){this.listeners.push(args);}};
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.inert=false;this.isConnected=true;}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  remove(){this.parent.children=this.parent.children.filter(node=>node!==this);this.isConnected=false;}
  focus(){document.activeElement=this;}
  querySelectorAll(tag){return this.children.flatMap(node=>[...(node.tagName===tag?[node]:[]),...node.querySelectorAll(tag)]);}
 }
 document.createElement=tag=>new Element(tag);document.body=new Element('body');
 const panel=new Element('section'),alreadyInert=new Element('div'),trigger=new Element('button');alreadyInert.inert=true;panel.append(trigger);document.body.append(panel,alreadyInert);
 const music={currentTime:17,volume:.72,pauses:0,plays:0,pause(){this.pauses++;},play(){this.plays++;return play();}},gestures=new Map();
 const context=createContext({document,performance:{now:()=>100},lastFrame:0,back:()=>{},Array,queueMicrotask,audioOn,menuMusic:music,musicGestureArmed:true,syncAudioUI(){},toast(){},window:{addEventListener:(name,handler)=>gestures.set(name,handler)},startMenuMusic:async()=>{if(!context.audioOn)return false;return music.play();}});
 const starter=nativeAudio?native.slice(native.indexOf('async function startMenuMusic('),native.indexOf('function front(y)')):'';
 runInContext(extract(native)+starter,context);
 return {context,document,panel,trigger,alreadyInert,music,gestures,open:(key='crops')=>runInContext(`openProductionLab('${key}','Cultivos',document.body.children[0].children[0])`,context),close:()=>runInContext('closeProductionLab()',context)};
}

test('SFX viewer pauses menu music, blocks gesture/visibility starts and resumes without changing preference or position',async()=>{
 const env=environment();env.open('sfx');assert.equal(env.music.pauses,1);
 assert.equal(await runInContext('startMenuMusic(true)',env.context),false);assert.equal(env.music.plays,0);
 env.close();await Promise.resolve();assert.equal(env.music.plays,1);assert.equal(env.context.audioOn,true);
 assert.equal(env.music.currentTime,17);assert.equal(env.music.volume,.72);
});

test('closing SFX respects muted music and hidden documents; unrelated labs do not change music',async()=>{
 for(const options of [{audioOn:false},{}]){
  const env=environment(options);if(options.audioOn!==false)env.document.hidden=true;
  env.open('sfx');env.close();await Promise.resolve();assert.equal(env.music.plays,0);assert.equal(env.context.audioOn,options.audioOn??true);
 }
 const env=environment();env.open('crops');env.open('walls');env.close();assert.equal(env.music.pauses,0);assert.equal(env.music.plays,0);
});

test('replacing SFX with SFX does not restart music; replacing it with another lab restores once',async()=>{
 const env=environment();env.open('sfx');env.open('sfx');assert.equal(env.music.plays,0);
 env.open('crops');await Promise.resolve();assert.equal(env.music.plays,1);env.close();assert.equal(env.music.plays,1);
});

test('late play resolution cannot reactivate menu music inside SFX; rejected autoplay remains handled',async()=>{
 let resolve;const env=environment({play:()=>new Promise(done=>resolve=done)});
 const pending=runInContext('startMenuMusic(true)',env.context);env.open('sfx');resolve(true);
 assert.equal(await pending,false);assert.equal(env.music.plays,1);assert.equal(env.music.pauses,2);
 // The native starter handles browser autoplay rejection and returns false.
 const blocked=environment({nativeAudio:true,play:async()=>{throw Error('Autoplay blocked');}});blocked.open('sfx');blocked.close();await Promise.resolve();assert.equal(blocked.music.plays,1);assert.equal(blocked.context.audioOn,true);
});

test('actual native starter and gesture handlers retain the SFX guard despite later function declarations',async()=>{
 const env=environment({nativeAudio:true});env.open('sfx');
 for(const name of ['pointerdown','keydown','touchstart'])env.gestures.get(name)();
 await Promise.resolve();assert.equal(env.music.plays,0);assert.equal(env.context.musicGestureArmed,true);
 env.close();await Promise.resolve();await Promise.resolve();assert.equal(env.music.plays,1);assert.equal(env.context.musicGestureArmed,false);
});

test('actual sanctuary buttons use the full-screen controller, including regenerated menu',()=>{
 assert.equal(extract(native),extract(integration));
 for(const source of [native,integration]){
  assert.match(source,/button\.onclick=\(\)=>openProductionLab\(button\.dataset\.productionLab/);
  assert.doesNotMatch(source,/production-library'\)\.innerHTML=sectionFrame/);
 }
 assert.match(native,/if\(productionLabViewer\|\|!ready/);
 assert.match(read('tools/prepare_menu.py'),/if\(productionLabViewer\|\|!ready/);
 const css=read('public/ui-theme.css');assert.match(css,/\.production-lab-viewer\{position:fixed;inset:0/);assert.match(css,/\.production-lab-frame\{[^}]*flex:1;min-height:0/);
});

test('lab is a body-level screen, frees its iframe and restores catalogue focus/inert state',()=>{
 const env=environment();env.open();
 const host=env.document.body.children.at(-1),frame=host.children[1];
 assert.equal(host.className,'production-lab-viewer');assert.equal(host.parent,env.document.body);
 assert.equal(frame.src,'../library.html?lab=crops');assert.equal(env.panel.inert,true);
 env.close();assert.equal(frame.src,'about:blank');assert.equal(env.document.body.children.length,2);
 assert.equal(env.panel.inert,false);assert.equal(env.alreadyInert.inert,true);assert.equal(env.document.activeElement,env.trigger);
});

test('reopening releases the old lab and unknown keys cannot replace a live viewer',()=>{
 const env=environment();env.open();const first=env.document.body.children.at(-1),frame=first.children[1];
 env.open('walls');assert.equal(first.isConnected,false);assert.equal(frame.src,'about:blank');
 assert.equal(env.document.body.children.length,3);assert.equal(env.document.body.children.at(-1).children[1].src,'../library.html?lab=walls');
 env.open('unknown');assert.equal(env.document.body.children.length,3);
 env.close();assert.equal(env.panel.inert,false);
});

test('Escape closes only the lab before the sanctuary handles navigation',()=>{
 const env=environment();env.open();let stopped=false,prevented=false;
 const [type,handler,capture]=env.document.listeners[0];assert.equal(type,'keydown');assert.equal(capture,true);
 handler({key:'Escape',preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
 assert.ok(stopped&&prevented);assert.equal(env.document.body.children.length,2);
});

test('focused iframe Escape closes the viewer and releases its child listener',async()=>{
 const env=environment();env.open();const frame=env.document.body.children.at(-1).children[1];
 const listeners=new Map();let removed=0;
 frame.contentDocument={addEventListener(type,handler){listeners.set(type,handler);},removeEventListener(type,handler){assert.equal(listeners.get(type),handler);listeners.delete(type);removed++;}};
 frame.onload();const handler=listeners.get('keydown');assert.equal(typeof handler,'function');
 let prevented=false;handler({key:'Escape',defaultPrevented:false,preventDefault(){prevented=true;}});
 await Promise.resolve();assert.ok(prevented);assert.equal(removed,1);assert.equal(listeners.size,0);assert.equal(frame.onload,null);
 assert.equal(frame.src,'about:blank');assert.equal(env.document.activeElement,env.trigger);
 // A queued event from the destroyed iframe cannot close its replacement.
 env.open('walls');handler({key:'Escape',preventDefault(){throw Error('Stale handler');}});
 await Promise.resolve();assert.equal(env.document.body.children.length,3);env.close();
});

test('lab-consumed Escape stays local and reloading replaces the child listener',async()=>{
 const env=environment();env.open();const frame=env.document.body.children.at(-1).children[1];
 const attached=[],removed=[];
 const child={addEventListener(type,handler){attached.push(handler);},removeEventListener(type,handler){removed.push(handler);}};
 frame.contentDocument=child;frame.onload();const first=attached[0];
 first({key:'Escape',defaultPrevented:true,preventDefault(){throw Error('Consumed Escape');}});
 first({key:'ArrowLeft',preventDefault(){throw Error('Lab input intercepted');}});
 const delayed={key:'Escape',defaultPrevented:false,preventDefault(){throw Error('Later lab handler consumed Escape');}};
 first(delayed);delayed.defaultPrevented=true;
 await Promise.resolve();assert.equal(env.document.body.children.length,3);
 frame.onload();assert.equal(removed[0],first);assert.equal(attached.length,2);
 env.close();assert.equal(removed[1],attached[1]);
});
