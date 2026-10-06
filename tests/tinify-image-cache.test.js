import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {TinifyImageCache} from '../tools/tinify-image-cache.mjs';

const source=Buffer.from('test image input'),key='test-only-secret';
const webp=await sharp({create:{width:2,height:2,channels:4,background:'#00ff0080'}}).webp().toBuffer();
const output='https://api.tinify.com/output/test';
const uploaded=()=>new Response('{}',{status:201,headers:{location:output,'compression-count':'7'}});
const downloaded=()=>new Response(webp,{headers:{'content-type':'image/webp','compression-count':'8'}});
const fixture=async(t,fetchImpl)=>{const cacheDirectory=await mkdtemp(join(tmpdir(),'wg-tinify-test-'));t.after(()=>rm(cacheDirectory,{recursive:true,force:true}));return {cacheDirectory,client:new TinifyImageCache({key,cacheDirectory,fetchImpl})};};

test('converts once, publishes no credential/location and reuses the verified disk result across clients',async t=>{
 const calls=[];const {client,cacheDirectory}=await fixture(t,async(url,options)=>{calls.push({url,options});return url.endsWith('/shrink')?uploaded():downloaded();});
 const a=await client.optimize(source,{format:'png'});assert.equal(calls.length,2);assert.equal(calls[0].options.method,'POST');
 assert.deepEqual(JSON.parse(calls[1].options.body),{convert:{type:'image/webp'}});
 assert.equal(calls[0].options.headers.Authorization,'Basic '+Buffer.from('api:'+key).toString('base64'));
 assert.ok(a.bytes.equals(webp));assert.equal(a.reused,false);assert.equal(a.receipt.compressionCount,'8');
 assert.ok(!JSON.stringify(a.receipt).includes(key)&&!JSON.stringify(a.receipt).includes(output));
 const b=await new TinifyImageCache({key,cacheDirectory,fetchImpl:()=>assert.fail('Network must not run')}).optimize(source,{format:'png'});
 assert.equal(b.reused,true);assert.ok(b.bytes.equals(webp));
});
test('simultaneous requests for identical bytes share one upload and one output',async t=>{
 let count=0;const {client}=await fixture(t,async url=>{count++;await new Promise(resolve=>setTimeout(resolve,10));return url.endsWith('/shrink')?uploaded():downloaded();});
 const [a,b]=await Promise.all([client.optimize(source,{format:'jpeg'}),client.optimize(source,{format:'jpeg'})]);assert.equal(count,2);assert.equal(a,b);
});
test('already WebP requests download optimization without an unnecessary conversion operation',async t=>{
 const calls=[];const {client}=await fixture(t,async(url,options)=>{calls.push(options.method);return url.endsWith('/shrink')?uploaded():downloaded();});
 await client.optimize(webp,{format:'webp'});assert.deepEqual(calls,['POST','GET']);
});
test('failed output resumes the known upload and never exposes provider error bodies or the secret',async t=>{
 let uploads=0,outputs=0;const {client}=await fixture(t,async url=>{if(url.endsWith('/shrink')){uploads++;return uploaded();}outputs++;return outputs===1?new Response(key,{status:429}):downloaded();});
 await assert.rejects(client.optimize(source,{format:'png'}),error=>error.message.includes('429')&&!error.message.includes(key));
 await client.optimize(source,{format:'png'});assert.equal(uploads,1);assert.equal(outputs,2);
});
test('rejects hostile upload locations without sending an authenticated request to another host',async t=>{
 let calls=0;const {client}=await fixture(t,async()=>{calls++;return new Response('{}',{status:201,headers:{location:'https://other.example/output/a'}});});
 await assert.rejects(client.optimize(source,{format:'png'}),/Unexpected Tinify output location/);assert.equal(calls,1);
});
test('rejects corrupted disk outputs and non-WebP provider output',async t=>{
 const {client,cacheDirectory}=await fixture(t,async url=>url.endsWith('/shrink')?uploaded():downloaded());
 await client.optimize(source,{format:'png'});const hash=createHash('sha256').update(source).digest('hex');
 await writeFile(join(cacheDirectory,hash+'-webp-v1','output.webp'),'damaged');
 await assert.rejects(client.optimize(source,{format:'png'}),/cache integrity/);
 const other=await fixture(t,async url=>url.endsWith('/shrink')?uploaded():new Response('not an image',{headers:{'content-type':'image/webp'}}));
 await assert.rejects(other.client.optimize(source,{format:'png'}),/did not return a WebP/);
 assert.equal((await readFile(join(cacheDirectory,hash+'-webp-v1','receipt.json'),'utf8')).includes(key),false);
});
test('network exception text cannot echo the authorization value',async t=>{
 const {client}=await fixture(t,()=>{throw Error(key);});
 await assert.rejects(client.optimize(source,{format:'png'}),error=>!error.message.includes(key)&&error.message.includes('network'));
 assert.throws(()=>client.optimize(source,{format:'svg'}),/static PNG/);
});
