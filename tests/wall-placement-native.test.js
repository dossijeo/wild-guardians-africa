import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {findInitialLocationAsync} from '../src/world/villages.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {rational} from '../src/simulation/money.js';
import {serialize} from '../src/persistence/snapshots.js';

const catalog=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url)));
const options={smooth:false,snap:false};
async function fixture(biome){
  const pack=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[biome]+'.json',import.meta.url)));
  const nav=new Navigation(712,biome,pack.profile),payload=catalog.find(v=>v.id==='mapungubwe');
  const place=await findInitialLocationAsync(nav,payload),state=Game.newGame({seed:712,biome,slotId:'qa-wall-placement-'+biome});
  Object.assign(state.villages[0],place);state.suppressed.push(...place.suppress);nav.setState(state);
  state.ledger.balance=rational(10000);Game.resume(state,'intro');Game.placeStructure(state,'paid-center',place.center,nav);
  return {nav,state,center:state.structures[0]};
}
function chainAt(nav,state,p,reason){
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,points=[[p.x-12*Math.cos(angle),p.z-12*Math.sin(angle)],[p.x,p.z]];
    const pieces=wallStroke(points,state.structures,options).map(slot=>({kind:'wall',material:'zarzas',gate:false,x:slot.x,z:slot.z,yaw:-slot.angle,baseScaleX:slot.scaleX}));
    const checks=pieces.map(piece=>nav.wallPlacement(piece));
    if(checks[0]?.valid&&checks.find(c=>!c.valid)?.reason.includes(reason))return {points,pieces,checks};
  }
}
for(const biome of Game.BIOMES)test(`QA-085 ${biome}: a native large prop leaves a silent gap, charging only legal modules`,async()=>{
 const {nav,state,center}=await fixture(biome);
 const props=nav.propsAt(center.x,center.z,100).filter(p=>p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18);
 let chain;for(const candidate of props){chain=chainAt(nav,state,candidate,'árbol o roca');if(chain)break;}
 assert.ok(chain);const plan=Game.previewWallChain(state,'zarzas',chain.points,nav,options),before=Number(state.ledger.balance.n);
 assert.ok(plan.pieces.length>0&&plan.pieces.length<chain.pieces.length);
 Game.buildWallChain(state,'partial-chain','zarzas',chain.points,nav,options);
 assert.equal(Number(state.ledger.balance.n),before-plan.cost);assert.equal(state.structures.filter(p=>p.kind==='wall').length,plan.pieces.length);
 const target=chain.pieces[chain.checks.findIndex(c=>!c.valid)];const saved=serialize(state);
 assert.equal(Game.placeStructure(state,'skipped-single',target,nav),false);assert.equal(serialize(state),saved);
});
for(const biome of ['gran-rio','manglares','volcanes','gran-canon'])test(`QA-085 ${biome}: native blocked terrain permits paid walls while preserving crop restrictions`,async()=>{
 const {nav,state,center}=await fixture(biome);let point;
 for(let z=-100;z<=100&&!point;z+=4)for(let x=-100;x<=100&&!point;x+=4){const p={x:center.x+x,z:center.z+z};
  if(nav.field.blocked(p.x,p.z,.15)&&nav.wallPlacement({kind:'wall',material:'zarzas',yaw:0,...p}).valid)point=p;
 }
 assert.ok(point,'native water/lava point without a large prop');assert.equal(nav.placement(point.x,point.z,.4).valid,false);
 const before=Number(state.ledger.balance.n);Game.placeStructure(state,'wet-wall',{kind:'wall',material:'zarzas',...point},nav);
 assert.equal(Number(state.ledger.balance.n),before-10);assert.equal(state.structures.at(-1).kind,'wall');
});
