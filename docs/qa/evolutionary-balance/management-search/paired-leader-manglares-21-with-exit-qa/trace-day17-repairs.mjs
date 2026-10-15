// Diagnostic observer only: repeats the frozen native policy without changing its decisions.
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {evaluateOne} from '../../../../../tools/evolutionary-balance/run-ga.mjs';
import * as Game from '../../../../../src/simulation/game.js';
import {numberOf} from '../../../../../src/simulation/money.js';

const genes={plantsPerWorker:6,wageReserveDays:1,seedReserve:0,
  defenseCashFraction:.2,defenseStartDay:2,repairHealthFraction:.8,
  magicIntervalSeconds:5,growthShare:0,plantingIntervalSeconds:1,
  wallMaterial:'zarzas',magicPriority:'multiply',wallPolicy:'planned'};
const sourceHash=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const samples=[];
let lastKey='';
const report=await evaluateOne({biome:'manglares',seed:123},17,'evolved',genes,
  undefined,false,(s)=>{
    if(s.day!==17||s.time>300)return;
    const bucket=Math.floor(s.time/10),key=`${s.day}:${bucket}`;
    if(key===lastKey)return;
    lastKey=key;
    const repairs=s.tasks.filter(t=>t.kind==='repair');
    const pending=repairs.reduce((n,t)=>{
      const target=s.structures.find(p=>p.id===t.targetId);
      return n+(target?Math.ceil(numberOf(Game.repairCost(target))):0);
    },0);
    const balance=numberOf(s.ledger.balance);
    const living=s.plants.filter(p=>p.alive).length;
    // The runner's exact next-wage reserve is private; this is only a lower
    // bound derived from the living crop count, never fed back into the game.
    const labourReserveFloor=Math.ceil(living/genes.plantsPerWorker)*30;
    const protectedCashFloor=Math.max(labourReserveFloor+pending,
      Math.ceil(balance*(1-genes.defenseCashFraction)));
    const wall=s.structures.filter(p=>p.kind==='wall');
    samples.push({day:s.day,time:s.time,balance,living,
      labourReserveFloor,protectedCashFloor,pending,
      headroomFloorWithDuplicatePending:balance-protectedCashFloor-pending,
      headroomFloorWithoutDuplicatePending:balance-protectedCashFloor,
      wallRuined:wall.filter(p=>p.status==='ruined').length,
      wallDamaged:wall.filter(p=>p.status==='intact'&&p.hp<p.maxHp).length,
      repairTasks:repairs.length,
      paidRepairs:Object.keys(s.ledger.entries).filter(id=>id.startsWith('repair:')).length,
      workerStatuses:Object.fromEntries([...new Set(s.workers.map(w=>w.status))].map(status=>
        [status,s.workers.filter(w=>w.status===status).length]))});
  });
const result={sourceHash,scenario:{biome:'manglares',seed:123,days:17,
  strategy:'evolved',genes},status:report.status,
  completedNights:report.completedNights,day17:report.rows?.find(r=>r.day===17)??null,
  samples};
writeFileSync(new URL('./day17-repair-trace.json',import.meta.url),
  JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({sourceHash,status:result.status,
  completedNights:result.completedNights,samples:samples.length,
  day17:result.day17&&{money:result.day17.money,repairs:result.day17.repairs,
    destroyed:result.day17.destroyed}}));
