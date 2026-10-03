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
function rejectsUnchanged(state,nav,chain,reason){
  const before=serialize(state),obstacles=JSON.stringify(nav.obstacles),suppression=[...nav.suppressed];
  assert.throws(()=>Game.previewWallChain(state,'zarzas',chain.points,nav,options),reason);
  assert.throws(()=>Game.buildWallChain(state,'rejected-chain','zarzas',chain.points,nav,options),reason);
  assert.equal(serialize(state),before,'all-or-nothing purchase, IDs and modules');
  assert.equal(JSON.stringify(nav.obstacles),obstacles);assert.deepEqual([...nav.suppressed],suppression);
}
for(const biome of Game.BIOMES)test(`QA-085 ${biome}: native large prop rejects a chain containing legal modules without partial purchase`,async()=>{
  const {nav,state,center}=await fixture(biome);
  const props=nav.propsAt(center.x,center.z,100).filter(p=>p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18);
  let chain,prop;
  for(const candidate of props){chain=chainAt(nav,state,candidate,'árbol o roca');if(chain){prop=candidate;break;}}
  assert.ok(chain,'real native scatter has an obstructed chain with a legal prefix');
  rejectsUnchanged(state,nav,chain,/árbol o roca/);
  const target=chain.pieces[chain.checks.findIndex(c=>!c.valid&&c.reason.includes('árbol o roca'))];
  const before=serialize(state);
  assert.throws(()=>Game.placeStructure(state,'rejected-single',{...target},nav),/árbol o roca/);
  assert.equal(serialize(state),before);
  console.log(JSON.stringify({biome,propId:prop.id,slot:prop.slot,points:chain.points,legalModules:chain.checks.filter(c=>c.valid).length,rejectedModules:chain.checks.filter(c=>!c.valid).length,balance:state.ledger.balance.n}));
});
for(const biome of ['gran-rio','manglares','volcanes','gran-canon'])test(`QA-085 ${biome}: native water, lava or slope rejects the complete chain after a legal prefix`,async()=>{
  const {nav,state,center}=await fixture(biome);let chain;
  for(let z=-160;z<=160&&!chain;z+=4)for(let x=-160;x<=160&&!chain;x+=4){
    const p={x:center.x+x,z:center.z+z};
    if(!nav.terrainValid(p.x,p.z,.05))chain=chainAt(nav,state,p,'Agua, lava');
  }
  assert.ok(chain,'native terrain has a buildable-to-invalid boundary');
  rejectsUnchanged(state,nav,chain,/Agua, lava/);
  console.log(JSON.stringify({biome,terrain:chain.points,legalModules:chain.checks.filter(c=>c.valid).length,rejectedModules:chain.checks.filter(c=>!c.valid).length,balance:state.ledger.balance.n}));
});
