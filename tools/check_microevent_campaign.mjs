// Uses the existing campaign policy and authoritative simulation. The headless
// director assumes a stable camera and samples live crop anchors; no visual claim.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
import {AttentionDirector} from '../src/microevents/director.js';
import {microState,trackIncome,reserveEvent,settleEvent} from '../src/microevents/economy.js';
import {activeCrops} from '../src/simulation/active-crops.js';
const [policy='off',daysText='100',out='.tmp/microevent-campaign.json',baselineRoot]=process.argv.slice(2),days=Number(daysText);
if(!['off','ignore','complete','half','beneficial'].includes(policy)||!Number.isInteger(days)||days<1||days>100)throw Error('Usage: node tools/check_microevent_campaign.mjs off|ignore|complete|half|beneficial 1..100 OUTPUT [BASELINE_ROOT]');
const began=Date.now(),source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),hashes:Object.fromEntries(['src/simulation/game.js','src/microevents/definitions.js','src/microevents/director.js','src/microevents/economy.js','tools/native-campaign-runner.mjs'].map(file=>[file,createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex')]))};
let d,active,commandCount,eventTail,lastElapsed=0,spawns=0,completed=0,ignored=0,credits=0,reservedLoss=0,observed;
function observe(s){
 if(policy==='off')return;
 if(observed!==s){d=new AttentionDirector(microState(s));observed=s;commandCount=s.commandIds.length;eventTail=s.events.at(-1)?.id;lastElapsed=s.elapsed;active=null;}
 const dt=Math.max(0,s.elapsed-lastElapsed)/(s.time>=300&&!s.raid?5:1);lastElapsed=s.elapsed;
 const tail=s.events.findIndex(e=>e.id===eventTail);trackIncome(s,s.events.slice(tail+1));eventTail=s.events.at(-1)?.id;
 if(commandCount!==s.commandIds.length){commandCount=s.commandIds.length;d.coreAction();if(active){settleEvent(s,active.ticket,'cancelled');d.finish('cancelled');active=null;}}
 const blocked=[...s.pauses,...(s.raid?['raid']:[]),...(s.result?['result']:[])],anchors=activeCrops(s.plants).slice(0,24),op=d.step(dt,{state:s,anchors,blocked});
 if(op?.cancel&&active){settleEvent(s,active.ticket,'cancelled');d.finish('cancelled');active=null;}
 else if(op&&!active){const ticket=reserveEvent(s,op.def.id,op.anchor.id);if(ticket){active={ticket,def:op.def,age:0};d.begin(op.def);spawns++;}}
 if(active){active.age+=dt;const engage=policy==='complete'||policy==='half'&&spawns%2===0||policy==='beneficial'&&active.def.category==='beneficial';if(engage)d.interaction();
  if(active.age>=(engage?2:active.def.lifetime)){const outcome=engage?'completed':'ignored',result=settleEvent(s,active.ticket,outcome);credits+=result.delta;reservedLoss+=result.reservedLoss??0;if(engage)completed++;else ignored++;d.finish(outcome);active=null;}
 }
}
const options={days,seed:712,slotId:'microevent-campaign',strategy:'good',biome:'sabana',culture:'mapungubwe',profile:'olderFemale',labourPolicy:'legacy',onTick:observe,onDay:row=>console.error(JSON.stringify({policy,day:row.day,money:row.money,result:row.result,spawns,completed,ignored}))};
const result=await simulateNativeCampaign(options);
function summary(r){return {result:r.result,nights:r.completedNights,money:r.money,activity:r.activity,counts:r.counts,daily:r.daily,walls:r.state.structures.filter(p=>p.kind==='wall').map(p=>({id:p.id,hp:p.hp,status:p.status})),workers:r.state.workers.length,production:r.state.crates.filter(c=>c.delivered).length,ledger:r.state.ledger};}
const data=summary(result),report={scope:'Existing real campaign policy; headless stable-camera microevent opportunities; observed defeat is a result, not 100-night survival',source,elapsedSeconds:(Date.now()-began)/1000,policy,requestedDays:days,spawns,completed,ignored,credits,reservedLoss,result:data};
if(baselineRoot){if(policy!=='off')throw Error('Baseline exact comparison requires off');const base=await import(pathToFileURL(resolve(baselineRoot,'tools/native-campaign-runner.mjs')).href);const original=summary(await base.simulateNativeCampaign({...options,onTick:undefined}));const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');report.baseline={sha256:hash(original),featureSha256:hash(data),identical:hash(original)===hash(data)};if(!report.baseline.identical)process.exitCode=1;}
mkdirSync(resolve(out,'..'),{recursive:true});const encoded=JSON.stringify(report,null,2)+'\n';writeFileSync(out,out.endsWith('.gz')?gzipSync(Buffer.from(encoded)):encoded);console.log(JSON.stringify({...report,result:{result:data.result,nights:data.nights,money:data.money,production:data.production}}));
