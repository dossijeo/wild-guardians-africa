// Reproducible ordinary-command policy on the repository's native campaign player.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './experiments/spatial-campaign-opening.mjs';
import * as G from '../src/simulation/game.js';
import {awakeningState,activeBlessings} from '../src/simulation/awakenings.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize} from '../src/persistence/snapshots.js';
import {permission} from '../src/simulation/rules.js';

const [arm='competent',daysArg='100',biome='sabana',seedArg='712',culture='mapungubwe',outArg=`docs/qa/despertares/campaigns/${arm}-${biome}-${seedArg}.json`]=process.argv.slice(2);
if(!['baseline','competent','poor','agriculture','defense','recovery'].includes(arm))throw Error('Unknown arm');
const days=Number(daysArg),seed=Number(seedArg),out=resolve(outArg),started=performance.now();
mkdirSync(dirname(out),{recursive:true});
const provenance={startedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  dirty:execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim(),node:process.version,
  hashes:Object.fromEntries(['tools/check_awakenings_campaign.mjs','tools/native-campaign-runner.mjs','src/simulation/awakenings.js','src/simulation/awakening-config.js','src/world/wild-engine/spatial-savanna.wasm'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
let state,stop,seq=0,workerSeconds=0,delivered=0,passive=0,removed=false;
const casts=[],losses=[],checkpoints=[],daily=[],sourceValue={},decisions={nearSourcePlantSites:0,agriculture:0,defense:0},observed=new Set();
const flush=(status,extra={})=>writeFileSync(out,JSON.stringify({status,arm,days,biome,seed,culture,provenance,elapsedWallSeconds:(performance.now()-started)/1000,
  completedNights:state?.completedNights,day:state?.day,time:state?.time,result:state?.result,
  casts,losses,sourceValue,decisions,passiveDeliveredCoins:passive,deliveredCrates:delivered,workerSeconds,
  deliveredPerWorkerDay:workerSeconds?delivered/(workerSeconds/300):0,checkpoints,daily,...extra},null,2)+'\n');
const snapshot=()=>({money:numberOf(state.ledger.balance),living:state.plants.filter(p=>p.alive&&!p.blessing).length,
  sources:activeBlessings(state).length,destroyed:state.awakenings?.destroyed??0,
  centerHp:state.structures.filter(p=>p.kind==='center').map(p=>({id:p.id,hp:p.hp,status:p.status})),
  walls:state.structures.filter(p=>p.kind==='wall'&&p.status==='intact').length,
  progress:state.awakenings?.progress??0});
function chooseBlessing(s){
  const plants=s.plants.filter(p=>p.alive&&!p.blessing),walls=s.structures.filter(p=>p.kind==='wall'&&p.status==='intact'&&p.hp>0&&!p.blessing);
  const recent=s.awakenings.history.slice(-3).reduce((n,h)=>n+h.facts.losses,0);
  const defensive=arm==='defense'||arm==='recovery'||arm==='competent'&&recent>3;
  if(defensive&&walls.length){
    walls.sort((a,b)=>(b.maxHp-b.hp)-(a.maxHp-a.hp)||a.id.localeCompare(b.id));
    decisions.defense++;return walls[0];
  }
  if(arm==='defense')return null; // Bank it until a real wall is available.
  plants.sort((a,b)=>plants.filter(p=>Math.hypot(p.x-b.x,p.z-b.z)<=2.05).length-plants.filter(p=>Math.hypot(p.x-a.x,p.z-a.z)<=2.05).length||a.id.localeCompare(b.id));
  if(plants[0])decisions.agriculture++;return plants[0];
}
const preferredPlantSite=arm==='baseline'||arm==='poor'||arm==='defense'?null:(s,nav)=>{
  for(const source of s.plants.filter(p=>p.alive&&p.blessing))for(const [dx,dz] of [[1.5,0],[-1.5,0],[0,1.5],[0,-1.5],[1.4,1.4],[-1.4,1.4],[1.4,-1.4],[-1.4,-1.4]]){
    const p={x:source.x+dx,z:source.z+dz};
    if(s.plants.some(q=>q.alive&&Math.hypot(q.x-p.x,q.z-p.z)<1.2))continue;
    if(!nav.placement(p.x,p.z,.4).valid)continue;
    // This is a bounded policy preference; the real Game.plant command still
    // validates native placement/ownership, and the runner enforces cash reserves.
    decisions.nearSourcePlantSites++;return p;
  }
  return null;
};
try{
 const result=await simulateNativeCampaign({days,seed,biome,culture,strategy:arm==='poor'?'bad':'good',
  labourPolicy:process.env.WG_CAMPAIGN_LABOUR??'legacy',nativeIntents:true,nativeWallPlans:true,spatialAdvice:true,
  defensePolicy:'expanding',nativeEvidence:false,reloadRaids:false,preferredPlantSite,
  openingFactory:async options=>{
    const o=await createSpatialCampaignOpening(options);state=o.s;
    if(arm==='baseline')awakeningState(state).enabled=false;
    stop=G.observeGameEvents(state,e=>{
      if(e.type==='CrateDelivered'){
        const c=state.crates.find(c=>c.id===e.targetId);delivered++;
        const bonus=c?.blessingBonus?numberOf(c.blessingBonus):0;passive+=bonus;
        for(const id of c?.blessingSourceIds??[]){const row=sourceValue[id]??={sharedAttributedCoins:0,deliveries:0};row.sharedAttributedCoins+=bonus/(c.blessingSourceIds.length);row.deliveries++;}
      }
      if(e.type==='BlessingDestroyed'||e.type==='BlessingRemoved')losses.push({day:state.day,time:state.time,type:e.type,targetId:e.targetId});
    });return o;
  },entryDriverFactory:nav=>({async advancePresentation(){if(nav.raidEntryFailure)throw Error(JSON.stringify(nav.raidEntryFailure));},async waitForEntry(){if(nav.raidEntryFailure)throw Error(JSON.stringify(nav.raidEntryFailure));},report(){return {mode:'continuous-native-entry'};},async dispose(){}}),
  onTick(s,nav,{dt}){
    state=s;nav.serviceRaidConnectivityDemand?.();workerSeconds+=s.workers.filter(w=>w.status!=='gone').length*dt;
    if(arm==='recovery'&&!removed&&s.awakenings?.total>=2&&s.time<290&&permission(s,'build')){
      const wall=s.structures.find(p=>p.kind==='wall'&&p.blessing&&p.status==='intact');
      if(wall){G.removeWall(s,`awakening-policy-remove-${seq++}`,wall.id,nav);removed=true;}
    }
    if(arm!=='baseline'&&s.awakenings?.progress===100&&permission(s,'awakening')){
      const target=chooseBlessing(s);
      if(target&&G.bless(s,`awakening-policy-${seq++}`,target.id))casts.push({day:s.day,time:s.time,targetId:target.id,kind:target.species?'plant':'wall',...snapshot()});
    }
  },onDay(row){
    const a=state.awakenings,h=a?.history.find(h=>h.day===row.day);
    daily.push({...row,finance:{...row.finance,entries:undefined},awakening:h??null,...snapshot()});
    if([10,20,30,50,75,100].includes(row.day))checkpoints.push({night:row.day,...snapshot()});
    console.log(JSON.stringify({arm,day:row.day,money:row.money,blessings:a?.total??0,wallSeconds:Math.round((performance.now()-started)/1000)}));flush('running');
  }});
 state=result.state;writeFileSync(out.replace(/\.json$/,'.state.json'),serialize(state));
 const {state:omitState,nav:omitNav,daily:omitDaily,...report}=result;
 flush('complete',{campaign:report,averageEarned:state.awakenings?.history.reduce((n,h)=>n+h.earned,0)/(state.awakenings?.history.length||1)||0,
  recoveryScenario:arm==='recovery'?'Prescribed ordinary removal of one blessed wall after two earned charges, then continue earning/reinvesting. Other losses are native animal contacts.':null});
}catch(error){
 if(state)writeFileSync(out.replace(/\.json$/,'.state.json'),serialize(state));
 flush('failed',{error:error.stack,partial:error.nativeCampaignPartial?{...error.nativeCampaignPartial,state:undefined}:null});console.error(error.stack);process.exitCode=1;
}finally{stop?.();}
