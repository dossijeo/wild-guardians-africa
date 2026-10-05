// Optional player strategy. All construction and repair use ordinary commands.
import * as Game from '../src/simulation/game.js';
import {centerFootprint} from '../src/world/centers.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,operational,wallSpec} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';

export function createFarmDefensePolicy({startDay=10,savingTarget=500,material='zarzas'}={}){
 if(!Number.isSafeInteger(startDay)||startDay<1||!Number.isSafeInteger(savingTarget)||savingTarget<0)throw Error('Invalid defense savings policy');
 wallSpec(material);
 let built=null,attemptAfter=0,repairRequests=0,capitalTarget=savingTarget;
 const reserve=s=>s.day>=startDay&&!built?capitalTarget:0;
 function act(s,nav,{command,reserve:cashReserve}){
  if(s.day<startDay||!permission(s,'wall'))return 0;
  if(!Number.isFinite(cashReserve)||cashReserve<0)throw Error('Invalid protected defense cash');
  cashReserve=Math.max(cashReserve,HIRING_RESERVE);
  const pendingCost=()=>s.tasks.filter(t=>t.kind==='repair').reduce((total,t)=>{
   const target=s.structures.find(c=>c.id===t.targetId);return total+(target?Math.ceil(numberOf(Game.repairCost(target))):0);
  },0);
  let actions=0;
  if(!built&&s.elapsed>=attemptAfter&&numberOf(s.ledger.balance)>=cashReserve+pendingCost()+capitalTarget){
   attemptAfter=s.elapsed+30;
   const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
   if(land.length){
    const bounds=land.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.z),Math.max(b[2],p.x),Math.max(b[3],p.z)],[Infinity,Infinity,-Infinity,-Infinity]);
    bounds[0]-=2;bounds[1]-=2;bounds[2]+=2;bounds[3]+=2;
    const [x0,z0,x1,z1]=bounds,points=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],options={smooth:false,snap:false};
    // The production preview rejects an unaffordable full stroke. Save its
    // nominal upper-bound cost first; native skipped pieces can make the
    // final paid amount smaller without granting a speculative balance.
    const expectedPieces=wallStroke(points,s.structures,options).length;
    capitalTarget=Math.max(capitalTarget,expectedPieces*wallSpec(material).cost);
    if(numberOf(s.ledger.balance)<cashReserve+pendingCost()+capitalTarget)return actions;
    const plan=Game.previewWallChain(s,material,points,nav,options);
    capitalTarget=Math.max(capitalTarget,plan.cost);
    if(plan.pieces.length&&numberOf(s.ledger.balance)>=plan.cost+cashReserve+pendingCost()){
     Game.buildWallChain(s,command('wall'),material,points,nav,options);actions++;
     built={day:s.day,time:s.time,bounds,points,cost:plan.cost,ids:plan.pieces.map(p=>p.id),pieces:plan.pieces.length,expectedPieces};
    }
   }
  }
  if(built){
   const owned=new Set(built.ids);
   for(const wall of s.structures)if(owned.has(wall.id)&&['intact','ruined'].includes(wall.status)&&wall.hp<wall.maxHp*.8&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===wall.id)){
    const cost=Math.ceil(numberOf(Game.repairCost(wall)));
    if(numberOf(s.ledger.balance)>=cost+cashReserve+pendingCost()){
     Game.requestRepair(s,command('repair'),wall.id);repairRequests++;actions++;
    }
   }
  }
  return actions;
 }
 const report=s=>structuredClone({startDay,savingTarget,capitalTarget,material,built,repairRequests,
  livingOutsideInitialPerimeter:built?s.plants.filter(p=>p.alive&&(p.x<built.bounds[0]||p.x>built.bounds[2]||p.z<built.bounds[1]||p.z>built.bounds[3])).length:null,
  scope:'One paid initial perimeter with ordinary manual repair requests. Native skipped modules are retained as gaps; later outside plantings are not claimed protected. No plant cap or free construction.'});
 return {reserve,act,report};
}
