import * as Game from '../src/simulation/game.js';
import {operational} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
export function requestComparisonCenterRepairs(s,{enabled,command,labourReserve,reserveMaintenance=true}){
 let actions=0;
 for(const c of (enabled?s.structures.filter(c=>c.kind==='center'&&operational(c)):[]))if(c.hp<(reserveMaintenance?600:540)&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===c.id)&&numberOf(s.ledger.balance)>=numberOf(Game.repairCost(c))+labourReserve()){
  Game.requestRepair(s,command('repair'),c.id);actions++;
 }
 return actions;
}
