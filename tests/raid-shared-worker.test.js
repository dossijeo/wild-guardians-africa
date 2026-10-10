import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {SharedRaidPreparationWorker,isSharedRaidReply} from '../src/world/raid-shared-worker.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {createRaidExteriorFramePrewarming} from '../src/world/raid-exterior-frame-prewarming.js';
import {computeRaidExteriorGeometry} from '../src/world/raid-exterior-prewarming.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
function fake(){const requests=[],events=new WeakSet(),worker={postMessage:r=>requests.push(r),terminate(){this.terminated=true;}},transport=new SharedRaidPreparationWorker({createWorker:()=>worker,verifyOwnedEvent:e=>events.has(e)});return {worker,transport,requests,reply(result,error){const job=requests.at(-1),event={data:{kind:'raid-preparation-reply',job:job.job,jobKind:job.jobKind,owner:job.owner,result,error,computeMs:1}};events.add(event);worker.onmessage(event);},events};}
const req=(owner,n)=>({owner,token:n,key:`key${n}`}),result=r=>({...r});
test('one active job, bounded entry priority and geometry fairness with explicit owners',()=>{
 const f=fake(),order=[],entry=f.transport.channel('entry','e',e=>{order.push('entry');if(order.filter(v=>v==='entry').length<3)entry.post(req('e',order.length+10));},()=>{}),geo=f.transport.channel('geometry','g',()=>order.push('geometry'),()=>{});
 entry.post(req('e',1));geo.post(req('g',2));assert.equal(f.requests.length,1);assert.equal(f.transport.queue.size,1);
 f.reply(result(f.requests.at(-1).request));assert.equal(f.requests.at(-1).jobKind,'entry');f.reply(result(f.requests.at(-1).request));assert.equal(f.requests.at(-1).jobKind,'geometry');f.reply(result(f.requests.at(-1).request));assert.equal(f.requests.at(-1).jobKind,'entry');f.reply(result(f.requests.at(-1).request));assert.deepEqual(order,['entry','entry','geometry','entry']);f.transport.dispose();
});
test('cancellation suppresses an active result without terminating peer; unowned, malformed and wrong-owner replies fail closed',()=>{
 const f=fake(),accepted=[];const geo=f.transport.channel('geometry','g',()=>accepted.push('g'),()=>{}),entry=f.transport.channel('entry','e',()=>accepted.push('e'),()=>{});geo.post(req('g',1));entry.post(req('e',2));geo.cancel();f.reply(result(f.requests.at(-1).request));assert.equal(f.worker.terminated,undefined);f.reply(result(f.requests.at(-1).request));assert.deepEqual(accepted,['e']);assert.equal(f.transport.stats.cancelled,1);f.transport.dispose();
 for(const kind of ['unowned','wrong-owner','nonfinite','cycle']){const f=fake();let failures=0;const c=f.transport.channel('geometry','g',()=>assert.fail('must not adopt'),()=>failures++);c.post(req('g',1));const job=f.requests[0],data={kind:'raid-preparation-reply',job:job.job,jobKind:'geometry',owner:kind==='wrong-owner'?'x':'g',result:result(job.request),computeMs:kind==='nonfinite'?NaN:1};if(kind==='cycle')data.self=data;const event={data};if(kind!=='unowned')f.events.add(event);f.worker.onmessage(event);assert.equal(failures,1,kind);assert.equal(f.transport.worker,null);assert.equal(f.transport.queue.size,0);}
});
test('geometry result error resumes true cooperative work and does not destroy the existing entry worker',()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'saheliana'});assert.ok(Game.buildWallChain(s,'walls','zarzas',[[85,6.2],[92,6.2],[92,17],[85,17],[85,6.2]],nav,{smooth:false,snap:false}));s.nightPlan={group:['warthog'],at:400,done:false};nav.setActiveBounds([-24,-120,216,120]);nav.setRaidView({x:88,z:9},{x:88,z:6.5});
 const before=serialize(s),f=fake(),entry=new RaidEntryPreparer(nav,{transport:f.transport}),controller=createRaidExteriorFramePrewarming(nav,{enabled:true,transport:f.transport});controller.frame(s);entry.update(s);assert.equal(f.requests[0].jobKind,'geometry');f.reply(undefined,'geometry compute failed');assert.equal(controller.geometry.worker,null);assert.ok(controller.geometry.pending.iterator);assert.equal(f.worker.terminated,undefined);f.reply(computeRaidEntry(f.requests.at(-1).request));assert.equal(entry.stats.accepted,1);let frames=0;while(controller.geometry.status==='working'&&frames++<10000)controller.frame(s);assert.equal(controller.geometry.status,'prepared');assert.equal(serialize(s),before);controller.dispose();entry.dispose();
});
test('shared reply capability is not arbitrary keyed object authority; stale wall reply never installs partial geometry',()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'saheliana'});assert.ok(Game.buildWallChain(s,'walls','zarzas',[[85,6.2],[92,6.2],[92,17],[85,17],[85,6.2]],nav,{smooth:false,snap:false}));const f=fake(),controller=createRaidExteriorFramePrewarming(nav,{enabled:true,transport:f.transport});controller.frame(s);const old=f.requests[0],computed=computeRaidExteriorGeometry(old.request);assert.equal(isSharedRaidReply(structuredClone(computed),f.worker,old.owner,'geometry'),false);
 assert.ok(Game.removeWall(s,'edit',s.structures.find(p=>p.kind==='wall'&&!p.autoGate).id,nav));controller.frame(s);f.reply(computed);assert.equal(controller.geometry.stats.adopted,0);assert.equal(f.requests.length,2);f.reply(computeRaidExteriorGeometry(f.requests[1].request));assert.equal(controller.geometry.stats.adopted,1);controller.dispose();f.transport.dispose();
});
test('duplicate late owned job cannot poison a newer active peer or install a cancelled result',()=>{
 const f=fake(),accepted=[],geo=f.transport.channel('geometry','g',()=>accepted.push('g'),()=>assert.fail('late reply should not disable')),entry=f.transport.channel('entry','e',()=>accepted.push('e'),()=>assert.fail('late reply should not disable'));
 geo.post(req('g',1));entry.post(req('e',2));const old=f.requests[0];f.reply(result(old.request));const event={data:{kind:'raid-preparation-reply',job:old.job,jobKind:old.jobKind,owner:old.owner,result:result(old.request),computeMs:1}};f.events.add(event);f.worker.onmessage(event);assert.ok(f.transport.worker);assert.equal(f.transport.stats.rejected,1);f.reply(result(f.requests.at(-1).request));assert.deepEqual(accepted,['g','e']);f.transport.dispose();
});
