import {INTERACTIONS} from './interactions.js';
import {MICROEVENT_FEEDBACK} from './feedback.js';
// Presentation-only presets. No definition may supply an arbitrary simulation mutation.
export const MICROEVENT_CONFIG=Object.freeze({earliest:9,stable:.8,cooldown:14,opportunityRate:.075,maxParticles:30,positiveDailyFraction:.01,positiveDailyCoins:5,negativeDailyFraction:.0025,negativeDailyCoins:2,localLossFraction:.005});
export const FREQUENCIES=Object.freeze({off:0,low:.45,adaptive:1,high:1.5});
export const MICROEVENT_ATLAS=Object.freeze({url:'/content/microevents/atlas.webp',cell:64,width:512,height:512});
const cosmetic=(id,category,spriteOffset,spriteY,extra={})=>({id,category,count:12,lifetime:7,cooldown:85,weight:.6,day:true,anchor:'crop',size:28,upright:true,spriteOffset,spriteY,sprite:id,frames:1,fps:0,interactions:['swipe','drag','hold'],behavior:{repel:1100,advection:.65,damping:2.6,maxSpeed:170,disperse:true},threshold:.72,hold:1.5,success:'cosmetic',timeout:'none',fallback:'hold',...extra});
const entry=(id,category,index,extra={})=>cosmetic(id,category,index%8*64,Math.floor(index/8)*64,extra);
const flight=(speed,turn=5)=>({speed,turn,width:155,height:100});
const gather={attract:900,advection:.8,damping:3,maxSpeed:160,absorb:true};
const scatter={repel:1300,advection:1,damping:2.5,maxSpeed:190,disperse:true};
const dry=['sabana','desierto','volcanes','gran-canon'],wet=['gran-rio','manglares'];
const eventDefinitions={
  seeds:{id:'seeds',category:'beneficial',count:14,lifetime:6,cooldown:55,weight:1.2,day:true,anchor:'crop',size:24,spriteOffset:0,interactions:['drag','swipe','hold'],behavior:{attract:1050,advection:.25,damping:3,maxSpeed:160,absorb:true},sprite:'seed',frames:1,fps:0,threshold:.7,hold:1.5,success:'coin',timeout:'none',fallback:'hold'},
  fireflies:{id:'fireflies',flight:flight(125),category:'beneficial',count:18,lifetime:7,cooldown:60,weight:1,night:true,anchor:'crop',size:20,spriteOffset:64,glow:['#e6ffc8','#a9e07d00'],interactions:['drag','hold'],behavior:{attract:850,swirl:280,damping:3,maxSpeed:130,absorb:true},sprite:'firefly',frames:1,fps:0,threshold:.7,hold:1.5,success:'cosmetic',timeout:'none',fallback:'hold'},
  birds:{id:'birds',flight:flight(190),category:'nuisance',count:7,lifetime:6,cooldown:80,weight:.65,day:true,anchor:'crop',size:36,spriteOffset:128,rotateWithVelocity:true,interactions:['swipe','rub','hold'],behavior:{repel:1700,advection:.4,damping:2,maxSpeed:210,disperse:true},sprite:'bird',frames:4,fps:9,threshold:.72,hold:1.5,success:'cosmetic',timeout:'harvest-loss',fallback:'hold'},
  butterflies:cosmetic('butterflies','beneficial',0,64,{flight:flight(145),frames:4,fps:7,count:9,size:32,behavior:{attract:650,swirl:220,damping:2.8,maxSpeed:130,absorb:true}}),
  beetle:cosmetic('beetle','beneficial',256,64,{flight:flight(185),count:1,size:38,weight:.18,cooldown:160,behavior:{repel:600,advection:.3,damping:1.7,maxSpeed:210,wander:100,absorb:true}}),
  locusts:cosmetic('locusts','nuisance',320,64,{flight:flight(215),frames:3,fps:12,count:16,size:27,behavior:{repel:1850,advection:.8,damping:2,maxSpeed:240,disperse:true}}),
  termites:cosmetic('termites','nuisance',0,128,{anchor:'wood',count:18,size:19,formation:'trail',bounds:{minX:-130,maxX:130,minY:-9,maxY:65}}),
  raincloud:cosmetic('raincloud','beneficial',64,128,{count:8,size:58,formation:'cloud',objective:'gather',behavior:{attract:650,advection:1.5,damping:3,maxSpeed:100,absorb:true},secondary:{spriteOffset:128,spriteY:128,size:15,kind:'rain'}}),
  fire:cosmetic('fire','emergency',192,128,{frames:5,fps:11,count:9,size:45,weight:.08,cooldown:360,biomes:['sabana','desierto','volcanes','gran-canon'],formation:'ground',behavior:{repel:300,advection:.8,damping:6,maxSpeed:45,absorb:true},secondary:{spriteOffset:0,spriteY:192,size:25,kind:'smoke'}}),
  storm:cosmetic('storm','emergency',256,192,{day:false,count:10,size:58,weight:.08,cooldown:360,behavior:{repel:750,advection:1,damping:3,maxSpeed:110,absorb:true},tint:'#7c89aa',secondary:{spriteOffset:64,spriteY:192,size:48,kind:'lightning',frames:3,fps:10}}),
  feather:entry('feather','beneficial',32,{count:1,size:42,upright:false,interactions:['tap','drag','hold'],tapStrength:1,behavior:{...gather,gravity:10,wind:12},formation:'fall'}),
  dew:entry('dew','beneficial',33,{count:10,size:23,formation:'ground',interactions:['tap','drag','hold'],tapStrength:.8,behavior:gather,glow:['#c6f4ee','#c6f4ee00']}),
  flower:entry('flower','beneficial',34,{count:3,size:39,formation:'ground',behavior:{...gather,rooted:28,pull:true},pulse:.06,interactions:['hold','drag']}),
  spirit:entry('spirit','beneficial',35,{flight:flight(150),count:1,size:43,day:false,night:true,behavior:{...gather,wander:160},glow:['#c8e9ff','#c8e9ff00'],pulse:.08}),
  goldenleaves:entry('goldenleaves','beneficial',36,{count:12,size:28,upright:false,formation:'fall',behavior:{...gather,gravity:18,wind:24}}),
  star:entry('star','beneficial',37,{count:1,size:36,day:false,night:true,weight:.18,cooldown:160,formation:'comet',interactions:['tap','swipe','hold'],tapStrength:1,behavior:{...gather,wind:90,gravity:18,maxSpeed:140},trail:true,glow:['#fff2c8','#fff2c800']}),
  pollen:entry('pollen','beneficial',38,{count:18,size:18,formation:'cloud',objective:'gather',behavior:{...gather,swirl:220},targetSprite:{x:128,y:256,size:28}}),
  rainbow:entry('rainbow','beneficial',39,{count:15,size:21,day:false,behavior:{...gather,swirl:450},formation:'ring',objective:'gather',targetSprite:{x:448,y:256,size:16},spriteVariants:[{x:448,y:256},{x:384,y:448},{x:448,y:448}],glow:['#e9dbff','#e9dbff00']}),
  rareseed:entry('rareseed','beneficial',40,{count:1,size:39,weight:.18,cooldown:160,interactions:['tap','hold'],tapStrength:1,behavior:{...gather,wander:70},pulse:.1,glow:['#f8e59c','#f8e59c00']}),
  weeds:entry('weeds','nuisance',41,{count:6,size:36,formation:'ground',behavior:{repel:300,advection:1.5,damping:5,maxSpeed:95,rooted:35,pull:true,absorb:true}}),
  ants:entry('ants','nuisance',42,{count:22,size:17,formation:'trail',behavior:{...scatter,wind:32}}),
  burrow:entry('burrow','nuisance',44,{count:4,size:34,formation:'ground',reveal:true,interactions:['tap','hold'],tapStrength:1,behavior:{...scatter,rooted:45},secondary:{spriteOffset:192,spriteY:320,size:39,kind:'mound'}}),
  dustdevil:entry('dustdevil','nuisance',45,{count:14,size:42,formation:'ring',biomes:dry,opacity:.6,behavior:{...scatter,swirl:600,orbit:210,gravity:-4}}),
  fog:entry('fog','nuisance',46,{count:7,size:74,formation:'ground',day:false,biomes:wet,opacity:.45,behavior:{...scatter,advection:1.8,wind:8,maxSpeed:100}}),
  pathleaves:entry('pathleaves','nuisance',47,{count:13,size:25,formation:'ground',upright:false,behavior:{...scatter,advection:1.7,rooted:3}}),
  spores:entry('spores','nuisance',48,{count:19,size:20,day:false,opacity:.7,behavior:{...scatter,swirl:200,gravity:-12}}),
  debris:entry('debris','nuisance',49,{count:10,size:27,upright:false,formation:'fall',behavior:{...scatter,wind:60,gravity:12}}),
  web:entry('web','nuisance',50,{count:3,size:63,formation:'ground',opacity:.7,interactions:['rub','hold'],behavior:{repel:100,advection:.8,damping:7,maxSpeed:40,rooted:40,absorb:true}}),
  insects:entry('insects','nuisance',51,{flight:flight(200),count:22,size:16,behavior:{...scatter,wander:110,swirl:150}}),
  grain:entry('grain','nuisance',52,{count:14,size:22,objective:'gather',formation:'spill',targetSprite:{x:320,y:384,size:37},behavior:gather}),
  snake:entry('snake','nuisance',54,{count:9,size:23,formation:'chain',bodySprite:{x:448,y:384},behavior:{...scatter,chain:18,wander:35,maxSpeed:100}}),
  thornseeds:entry('thornseeds','nuisance',56,{count:10,size:27,upright:false,formation:'ground',behavior:{...scatter,advection:1.5}}),
  hail:entry('hail','emergency',57,{count:22,size:20,day:false,weight:.07,cooldown:360,formation:'fall',behavior:{...scatter,gravity:70,wind:35,maxSpeed:160}}),
  vortex:entry('vortex','emergency',45,{count:22,size:49,biomes:dry,weight:.07,cooldown:360,formation:'ring',opacity:.65,behavior:{...scatter,swirl:850,orbit:350,gravity:-10}}),
  gust:entry('gust','emergency',58,{count:14,size:43,weight:.07,cooldown:360,formation:'trail',opacity:.65,behavior:{...scatter,wind:160,maxSpeed:210},secondary:{spriteOffset:256,spriteY:256,size:21,kind:'leaf'}}),
  branch:entry('branch','emergency',59,{count:1,size:75,weight:.07,cooldown:360,upright:false,formation:'fall',interactions:['swipe','drag','hold'],behavior:{...scatter,gravity:24,wind:6}}),
  lightning:entry('lightning','emergency',28,{count:5,size:62,day:false,weight:.07,cooldown:360,formation:'tower',behavior:{...scatter,absorb:true},secondary:{spriteOffset:64,spriteY:192,size:55,kind:'lightning',frames:3,fps:10}}),
  heat:entry('heat','emergency',61,{count:7,size:63,biomes:dry,weight:.07,cooldown:360,formation:'ground',opacity:.4,behavior:{...scatter,swirl:130,gravity:-8},pulse:.1}),
  fallingdebris:entry('fallingdebris','emergency',60,{count:9,size:30,biomes:['volcanes','gran-canon'],weight:.07,cooldown:360,formation:'fall',upright:false,behavior:{...scatter,gravity:55,wind:10}}),
  smoke:entry('smoke','emergency',24,{count:13,size:56,day:false,weight:.07,cooldown:360,formation:'tower',opacity:.55,behavior:{...scatter,gravity:-28,swirl:150}})
};
export const EVENTS=Object.freeze(Object.fromEntries(Object.entries(eventDefinitions).map(([id,def])=>[id,{...def,sound:MICROEVENT_FEEDBACK[id].sound,feedback:MICROEVENT_FEEDBACK[id],primary:INTERACTIONS[id],interactions:INTERACTIONS[id].mode==='catch'?[...new Set(['tap',...def.interactions])]:INTERACTIONS[id].mode==='swirl'?['swipe','rub','hold']:def.interactions,tapStrength:INTERACTIONS[id].mode==='catch'?1:def.tapStrength}])));
export function compatible(def,state){return (!def.day||state.time<300)&&(!def.night||state.time>=300)&&(!def.biomes||def.biomes.includes(state.biome));}

export function eligibleAnchor(def,entity){return !!entity&&(def.anchor==='wood'?entity.kind==='wall'&&entity.material==='empalizada'&&entity.status==='intact'&&entity.hp>0:entity.alive===true&&!entity.blessing);}
