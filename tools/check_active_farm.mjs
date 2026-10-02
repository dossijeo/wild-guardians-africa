// Legal farming diagnostic. Never alters money, clock, growth, RNG, raid budgets or results.
import {pathToFileURL} from 'node:url';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {isMature} from '../src/simulation/crops.js';
import {permission,cropSpec,operational} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function simulateActiveFarm({days=100,startDay=5,profile='olderMale',plotCount=16,species='girasol',diversifyDay=null,onDay,...world}={}){
  const opening=createOpeningWorld(world),nav=opening.nav;let s=opening.s,command=0,reloads=0;
  const id=kind=>`active-${kind}-${command++}`;
  const center=s.structures[0],departure={x:center.x+3.4,z:center.z};
  const plots=[];
  for(let dz=-9;dz<=9;dz+=1.5)for(let dx=4.5;dx<=15;dx+=1.5){
    const point={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
    if(nav.placement(point.x,point.z,.4).valid&&nav.path(departure,point,.28,null,true)&&nav.path(point,departure,.28,null,true))plots.push(point);
  }
  plots.sort((a,b)=>distance(a,departure)-distance(b,departure)||a.z-b.z||a.x-b.x);
  if(!plots.length)throw new Error('No legal farm plot');
  Game.plant(s,id('plant'),'mijo',plots[0].x,plots[0].z,nav);Game.openInitialHiring(s);Game.hire(s,id('hire'),{});
  const seen=new Set(),counts={},daily=[],activeRaids=new Set(),deliveries={},magic={};let diversified=false;
  const collect=()=>{for(const e of s.events)if(!seen.has(e.id)){
    seen.add(e.id);counts[e.type]=(counts[e.type]??0)+1;
    if(e.type==='CrateDelivered'){const crate=s.crates.find(c=>c.id===e.targetId);deliveries[crate.species]=(deliveries[crate.species]??0)+1;}
    if(e.type==='SpellActivated')magic[e.kind]=(magic[e.kind]??0)+1;
  }};
  const canCast=(kind,p)=>permission(s,kind)&&s.cooldowns[kind]===0&&nav.terrainValid(p.x,p.z,.2)&&
    !s.spells.some(a=>a.remaining>0&&distance(a,p)<a.radius+Game.spellRadius(kind))&&
    (kind!=='shield'||!s.raid?.animals.some(a=>a.status!=='gone'&&distance(a,p)<a.radius+Game.spellRadius(kind)));
  const cast=(kind,p)=>{if(canCast(kind,p))return Game.cast(s,id(kind),kind,p.x,p.z,nav);return false;};
  const act=()=>{
    if(s.raid&&s.cooldowns.shield===0){
      for(const a of s.raid.animals.filter(a=>a.hitsRemaining>0)){
        const target=[...s.plants,...s.structures].find(t=>t.id===a.targetId);
        if(target&&distance(a,target)<8&&!Game.spellAt(s,'shield',target)&&cast('shield',target))break;
      }
    }
    if(!permission(s,'plant'))return;
    const live=s.plants.filter(p=>p.alive);
    for(const p of live.filter(p=>isMature(p)&&!p.harvestRequested))Game.harvest(s,id('harvest'),p.id);
    if(s.day>=5&&s.cooldowns.multiply===0){
      const picking=s.workers.filter(w=>w.status==='acting'&&s.tasks.find(t=>t.id===w.taskId)?.kind==='harvest');
      for(const w of picking){const p=s.plants.find(p=>p.id===s.tasks.find(t=>t.id===w.taskId).targetId);if((p.species===species||diversified)&&cast('multiply',p))break;}
    }
    if(s.day>=3&&s.cooldowns.growth===0){
      const growing=live.filter(p=>!isMature(p)&&p.water[0].status!=='due'&&!p.water.some(w=>w.status==='due')&&
        p.water.some(w=>w.status==='future'&&w.at>p.growth&&w.at-p.growth<=40));
      const coverage=new Map(growing.map(p=>[p.id,live.filter(q=>distance(q,p)<=Game.spellRadius('growth')).length]));
      growing.sort((a,b)=>coverage.get(b.id)-coverage.get(a.id));
      for(const p of growing)if(cast('growth',p))break;
    }
    if(s.day<startDay||!s.workers.some(w=>w.contractDay===s.day&&s.time<PROFILES.find(p=>p.id===w.profile).end))return;
    if(diversifyDay!==null&&s.day>=diversifyDay&&numberOf(s.ledger.balance)>=1500)diversified=true;
    // Fill this strategy's fixed set of plots. It is not a gameplay entity limit.
    // After startup, keep a full next-day wage while financing the following crop cohort.
    const end=PROFILES.find(p=>p.id===profile).end,reserve=s.day===startDay&&s.time<30?0:120;
    if(s.time<end-10){
      for(const [i,p] of plots.slice(0,plotCount).entries()){
        if(live.some(plant=>distance(plant,p)<1.1))continue;
        const next=diversified&&i>=8?['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'][(i-8)%8]:species;
        if(numberOf(s.ledger.balance)<cropSpec(next).plant_cost+reserve)continue;
        Game.plant(s,id('plant'),next,p.x,p.z,nav);
        live.push(s.plants.at(-1));
      }
    }
    for(const target of s.structures.filter(operational)){
      const cost=Math.ceil(numberOf(Game.repairCost(target)));
      if(target.hp<300&&numberOf(s.ledger.balance)>=cost+120&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===target.id))Game.requestRepair(s,id('repair'),target.id);
    }
  };
  const finishDay=()=>{
    const day=s.day,started=s.elapsed,delivered=counts.CrateDelivered??0,picked=counts.CropPicked??0,before=numberOf(s.ledger.balance);
    while(s.day===day&&!s.result){
      act();Game.tick(s,s.time<300||s.raid?.animals.some(a=>a.status==='attacking') ? .5:5,nav);collect();
      if(s.raid&&!activeRaids.has(s.raid.id)){
        activeRaids.add(s.raid.id);const text=serialize(s);s=deserialize(text);nav.setState(s);reloads++;
      }
      if(s.elapsed-started>2400)throw new Error(`Incursion did not finish: ${JSON.stringify(s.raid)}`);
    }
    const report={day,before,money:numberOf(s.ledger.balance),delivered:(counts.CrateDelivered??0)-delivered,picked:(counts.CropPicked??0)-picked,
      living:s.plants.filter(p=>p.alive).length,mature:s.plants.filter(isMature).length,centerHp:s.structures.filter(operational).map(c=>c.hp),result:s.result,
      magic:{...magic}};
    daily.push(report);onDay?.(report);
  };
  collect();finishDay();
  while(s.day<=days&&!s.result){
    const money=numberOf(s.ledger.balance),preferred=PROFILES.find(p=>p.id===profile);
    if(!preferred)throw new Error('Unknown worker profile');
    const selected=money>=preferred.wage?preferred:PROFILES.find(p=>p.wage<=money);
    const selection=s.day>=startDay&&selected?{[selected.id]:1}:{};
    Game.hire(s,id('hire'),selection);collect();finishDay();
  }
  return {biome:s.biome,culture:s.culture,seed:s.seed,result:s.result,day:s.day,completedNights:s.completedNights,money:numberOf(s.ledger.balance),
    reloads,counts,deliveries,magic,diversified,daily,state:s,nav};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=simulateActiveFarm({days:Number(process.argv[2]??100),profile:process.argv[3]??'olderMale',species:process.argv[4]??'girasol',diversifyDay:process.argv[5]?Number(process.argv[5]):null,onDay:r=>console.log(JSON.stringify(r))});
  const {state,nav,daily,...summary}=report;console.log(JSON.stringify(summary));
}
