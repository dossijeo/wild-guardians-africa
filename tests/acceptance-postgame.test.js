import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {villageLayout,findVillageEntry} from '../src/world/villages.js';
import {attraction,cropSpec} from '../src/simulation/rules.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {TutorialProfile} from '../src/tutorial/profile.js';
import {TUTORIAL_IDS} from '../src/tutorial/messages.js';
const catalog=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'));
function memory(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
function navigation(s){const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);return nav;}
function farm(culture){
 const s=Game.newGame({seed:712,culture,slotId:'qa-postgame-'+culture});Game.resume(s,'intro');
 const payload=catalog.find(p=>p.id===(culture==='saheliana'?'saheliano':culture)),v=s.villages[0];v.x=-100;v.buildings=villageLayout(payload,-100,0);
 const nav=navigation(s);v.entry=findVillageEntry(nav,[],-100,0);assert.ok(v.entry);
 s.ledger.balance=rational(200000);Game.placeStructure(s,'qa-paid-center',{x:0,z:0},nav);
 s.day=100;s.completedNights=99;s.initialPreparation=false;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};s.time=599.9;
 // Actually charge every seed; unstaffed live crops keep daytime attraction high.
 const count=Math.ceil(10000/cropSpec('platano').base_harvest_value);
 s.time=0;for(let i=0;i<count;i++)Game.plant(s,'qa-paid-seed-'+i,'platano',10+(i%8)*2,Math.floor(i/8)*2,nav);s.time=599.9;
 assert.ok(attraction(s.plants)>=10000);Game.tick(s,.1,nav);assert.equal(s.result,'victory');assert.equal(s.day,101);assert.equal(s.completedNights,100);
 return {s,nav};
}
for(const culture of Game.CULTURES)test(`QA-135/136 ${culture}: continue actual last-night outcome and run 300 complete postgame nights with high attraction`,()=>{
 let {s,nav}=farm(culture);const observed=new Set(),counts={},messages=[];const collect=()=>{for(const e of s.events)if(!observed.has(e.id)){observed.add(e.id);counts[e.type]=(counts[e.type]??0)+1;if(e.type==='TutorialMessageStarted')messages.push(e.messageId);}};collect();const storage=memory(),repo=new SaveRepository(storage),profile=new TutorialProfile(memory());
 // Prior mechanic readings are remembered; liberation must still be local.
 for(const id of TUTORIAL_IDS.filter(id=>!['campaign.liberation','world.expansion'].includes(id)))profile.record(id);
 let controller=new TutorialController(s,profile);assert.equal(controller.presentation().id,'campaign.liberation');assert.ok(controller.presentation().text.includes('maldición'));
 controller.acknowledge();const holdings=JSON.stringify({structures:s.structures,plants:s.plants,ledger:s.ledger,villages:s.villages,seed:s.seed,slot:s.slotId});
 Game.continuePostgame(s);assert.equal(s.postgame,true);assert.equal(s.result,null);assert.deepEqual(s.pauses,['hiring']);assert.equal(JSON.stringify({structures:s.structures,plants:s.plants,ledger:s.ledger,villages:s.villages,seed:s.seed,slot:s.slotId}),holdings);
 Game.continuePostgame(s);assert.equal(s.events.filter(e=>e.type==='PostgameStarted').length,1);
 collect();const advance=seconds=>{for(let left=seconds;left>0;left-=30){Game.tick(s,Math.min(30,left),nav);controller.update();collect();assert.equal(s.raid,null);assert.equal(s.result,null);}};const balance=numberOf(s.ledger.balance),centerHp=s.structures[0].hp;let reloads=0,nightPlans=0,dayPlans=0;
 for(let night=0;night<300;night++){
  const day=101+night;assert.equal(s.day,day);assert.deepEqual(s.pauses,['hiring']);
  if(night%25===0){repo.save(s);const text=serialize(s);s=repo.load(s.slotId);nav=navigation(s);assert.equal(serialize(s),text);controller=new TutorialController(s,profile);const held=serialize(s);Game.tick(s,10,nav);assert.equal(serialize(s),held);reloads++;}
  Game.hire(s,'qa-postgame-hire-'+day,{});controller.update();
  if(controller.presentation()?.reading){assert.equal(controller.presentation().id,'world.expansion');controller.acknowledge();}
  assert.equal(controller.presentation(),null);assert.ok(attraction(s.plants)>=10000);
  advance(300);assert.equal(s.time,300);assert.equal(s.day,day);assert.equal(s.dayPlan.done,true);dayPlans++;
  assert.deepEqual(s.nightPlan.group,[]);assert.equal(s.nightPlan.done,false);assert.ok(s.nightPlan.at>300&&s.nightPlan.at<600);nightPlans++;
  repo.save(s);const text=serialize(s);const loaded=repo.load(s.slotId);assert.equal(serialize(loaded),text);
  advance(300);assert.equal(s.day,day+1);assert.equal(s.completedNights,101+night);assert.equal(s.time,0);assert.equal(s.result,null);assert.equal(s.raid,null);
  assert.equal(numberOf(s.ledger.balance),balance);assert.equal(s.structures[0].hp,centerHp);
 }
 const count=type=>counts[type]??0;
 assert.equal(s.day,401);assert.equal(s.completedNights,400);assert.equal(count('RaidSpawned'),0);assert.equal(count('RaidEnded'),0);assert.equal(count('StructureHit'),0);assert.equal(count('GameOver'),0);
 assert.equal(count('CampaignWon'),1);assert.equal(count('PostgameStarted'),1);assert.equal(count('Dawn'),300);assert.equal(count('NightStarted'),300);
 assert.equal(messages.filter(id=>id==='mechanic.first-raid').length,0);
 assert.equal(s.tutorial.seen.filter(id=>id==='world.expansion').length,1);assert.equal(s.plants.every(p=>p.alive),true);
 repo.save(s);assert.equal(serialize(repo.load(s.slotId)),serialize(s));
 console.log('QA-136: '+JSON.stringify({culture,nights:300,day:s.day,dayPlans,nightPlans,reloads,midnightSaves:300,attraction:attraction(s.plants),raids:count('RaidSpawned'),balance}));
});
