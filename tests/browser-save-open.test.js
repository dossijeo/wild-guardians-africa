import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserSaveRepository} from '../src/persistence/browser-saves.js';

function setup(){
 const requests=[];
 const storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 const repo=new BrowserSaveRepository(storage,{database:{open(){const request={};requests.push(request);return request;}}});
 const db=()=>({closed:0,close(){this.closed++;}});
 return {repo,requests,db};
}

test('blocked open closes late success and cannot invalidate a newer connection',async()=>{
 const {repo,requests,db}=setup();
 const old=repo.open(),rejected=assert.rejects(old,/ocupado/);
 requests[0].onblocked();await rejected;
 const current=repo.open(),live=db();requests[1].result=live;requests[1].onsuccess();
 assert.equal(await current,live);
 const orphan=db();requests[0].result=orphan;requests[0].onsuccess();
 assert.equal(orphan.closed,1);
 requests[0].error=Error('late failure');requests[0].onerror();
 assert.equal(repo.open(),current);assert.equal(live.closed,0);assert.equal(requests.length,2);
});

test('old versionchange closes only its own database and preserves newer certified state',async()=>{
 const {repo,requests,db}=setup();
 const first=repo.open(),old=db();requests[0].result=old;requests[0].onsuccess();await first;
 old.onversionchange();assert.equal(old.closed,1);
 const current=repo.open(),live=db();requests[1].result=live;requests[1].onsuccess();await current;
 const certified={slotId:'new',text:'current'};repo.lastCommitted=certified;
 old.onversionchange();assert.equal(repo.open(),current);assert.equal(repo.lastCommitted,certified);
 live.onversionchange();assert.equal(live.closed,1);assert.equal(repo.connection,null);assert.equal(repo.lastCommitted,null);
});

test('synchronous storage-open errors permit retry instead of retaining a rejected connection',async()=>{
 const {repo,requests}=setup(),normal=repo.database.open;let attempts=0;
 repo.database.open=function(){if(attempts++===0)throw Error('storage unavailable');return normal.call(this);};
 await assert.rejects(repo.open(),/storage unavailable/);
 const retry=repo.open();assert.equal(requests.length,1);
 requests[0].error=Error('request failure');requests[0].onerror();await assert.rejects(retry,/request failure/);
 assert.equal(repo.connection,null);
});

test('concurrent opens share one request and normal upgrade retains the slots schema',async()=>{
 const {repo,requests,db}=setup();
 const first=repo.open(),second=repo.open();assert.equal(first,second);assert.equal(requests.length,1);
 const live=db(),created=[];live.createObjectStore=(name,options)=>created.push({name,options});
 requests[0].result=live;requests[0].onupgradeneeded();requests[0].onsuccess();
 assert.deepEqual(created,[{name:'slots',options:{keyPath:'slotId'}}]);
 assert.equal(await first,live);assert.equal(await second,live);assert.equal(repo.open(),first);
});
