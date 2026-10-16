import {writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../check_opening.mjs';
import * as current from '../../src/simulation/game.js';

const baselinePath=new URL('../../src/simulation/game-history-baseline-qa.mjs',import.meta.url);
const baselineRef='d474328dd4419163d352f3b473a06c31e24d3875';
const historyCount=Number(process.argv[2]??5000);
if(!Number.isSafeInteger(historyCount)||historyCount<0)throw Error('Invalid historical crop count');
writeFileSync(baselinePath,execFileSync('git',['show',`${baselineRef}:src/simulation/game.js`]));
try{
  const baseline=await import(baselinePath.href);
  const {s,nav}=createOpeningWorld({seed:123}),center=s.structures[0];
  current.plant(s,'benchmark-seed','mijo',center.x+6,center.z+1,nav);
  current.openInitialHiring(s);current.hire(s,'benchmark-hire',{olderFemale:1});
  const crop=s.plants[0];
  for(let i=0;i<historyCount;i++)s.plants.push({...crop,id:`historical-${i}`,alive:false,
    x:crop.x+30+i%80,z:crop.z+30+Math.floor(i/80)});
  const points=[[73,-15.5],[102.5,-15.5],[102.5,15.5],[73,15.5],[73,-15.5]];
  const options={smooth:false,snap:false};
  const arms={baseline:()=>baseline.quoteWallChain(s,'zarzas',points,nav,options),
    current:()=>current.quoteWallChain(s,'zarzas',points,nav,options)};
  for(const run of Object.values(arms))run();
  const rows=[];
  for(const order of [['baseline','current'],['current','baseline'],
    ['current','baseline'],['baseline','current']])for(const name of order){
    const start=performance.now(),result=arms[name]();
    rows.push({name,ms:performance.now()-start,pieces:result.pieces.length,
      gates:result.gates,cost:result.cost});
  }
  for(const row of rows)assert.deepEqual(
    {pieces:row.pieces,gates:row.gates,cost:row.cost},
    {pieces:rows[0].pieces,gates:rows[0].gates,cost:rows[0].cost});
  console.log(JSON.stringify({fixture:'Sabana/123 enclosed wall quote',baselineRef,
    livingCrops:1,historicalCrops:historyCount,rows},null,2));
}finally{unlinkSync(baselinePath);}
