import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve();}
function fixture({register=Promise.resolve({id:'worker'}),ready=Promise.resolve(),controller=null,secure=true}={}){
 const timers=new Map(),listeners=new Set();let next=0,calls=0;
 const serviceWorker={controller,ready,register(){calls++;return register;},addEventListener(type,fn){assert.equal(type,'controllerchange');listeners.add(fn);},removeEventListener(type,fn){listeners.delete(fn);}};
 const context={navigator:{serviceWorker},isSecureContext:secure,URL,setTimeout(fn,ms){assert.equal(ms,3000);timers.set(++next,fn);return next;},clearTimeout(id){timers.delete(id);}};
 const source=readFileSync(new URL('../src/audio/music-disk-cache.js',import.meta.url),'utf8').replace('export function','function').replaceAll('import.meta.env?.DEV','false').replaceAll('import.meta.url',"'https://game.example/assets/game.js'");
 runInNewContext(source+'\nglobalThis.prepare=prepareMusicDiskCache;',context);
 return {prepare:context.prepare,serviceWorker,timers,listeners,get calls(){return calls;},expire(){for(const fn of [...timers.values()])fn();},claim(){serviceWorker.controller={};for(const fn of [...listeners])fn();}};
}

test('cache registration itself has a bounded wait and late success cannot attach listeners',async()=>{
 const registration=deferred(),f=fixture({register:registration.promise});let settled=false;
 const pending=f.prepare().then(value=>{settled=true;assert.equal(value,null);});await flush();
 assert.equal(f.timers.size,1);f.expire();await flush();assert.equal(settled,true);
 registration.resolve({id:'late'});await flush();assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);await pending;
});
test('pending service-worker activation falls back and late activation cannot resume preparation',async()=>{
 const activation=deferred(),f=fixture({ready:activation.promise});let result='pending';
 const pending=f.prepare().then(value=>{result=value;});await flush();f.expire();await flush();assert.equal(result,null);
 activation.resolve();await flush();assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);await pending;
});
test('controller claim completes shared initialization and removes timeout/listener',async()=>{
 const worker={id:'ready'},f=fixture({register:Promise.resolve(worker)});
 const first=f.prepare(),second=f.prepare();assert.equal(first,second);await flush();assert.equal(f.listeners.size,1);
 f.claim();assert.equal(await first,worker);assert.equal(f.calls,1);assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
});
test('controller timeout removes its listener and a late claim does not change the result',async()=>{
 const f=fixture(),pending=f.prepare();await flush();assert.equal(f.listeners.size,1);f.expire();assert.equal(await pending,null);
 assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);f.claim();assert.equal(await f.prepare(),null);assert.equal(f.calls,1);
});
test('late registration rejection is handled after fallback has already completed',async()=>{
 const registration=deferred(),f=fixture({register:registration.promise});const pending=f.prepare();
 f.expire();assert.equal(await pending,null);registration.reject(Error('late denial'));await flush();
 assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);assert.equal(await f.prepare(),null);
});
test('ready controlled service worker, denied registration and insecure context settle without leaks',async()=>{
 const worker={id:'existing'},controlled=fixture({register:Promise.resolve(worker),controller:{}});
 assert.equal(await controlled.prepare(),worker);assert.equal(controlled.timers.size,0);assert.equal(controlled.listeners.size,0);
 const denied=fixture({register:Promise.reject(Error('denied'))});assert.equal(await denied.prepare(),null);assert.equal(denied.timers.size,0);
 const insecure=fixture({secure:false});assert.equal(await insecure.prepare(),null);assert.equal(insecure.calls,0);assert.equal(insecure.timers.size,0);
});
