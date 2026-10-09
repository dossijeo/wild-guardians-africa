// Bounded ordinary Node simulations, not AI agents. No rule or clock overrides.
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BIOMES,CULTURES} from '../src/simulation/game.js';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {intensiveActivityMatrixAcceptance} from './intensive-activity-acceptance.mjs';

const days=Number(process.argv[2]??100),workers=Number(process.argv[3]??2);
if(!Number.isSafeInteger(days)||days<1||days>100||!Number.isSafeInteger(workers)||workers<1||workers>4)throw Error('Usage: node tools/check_intensive_matrix_parallel.mjs [DAYS=100] [WORKERS=2, maximum 4]');
const root=new URL('../',import.meta.url),output=new URL(`../test-results/intensive-parallel-${days}-${Date.now()}/`,import.meta.url);
mkdirSync(output,{recursive:true});
const matrix={days,seed:712,profile:'olderFemale',mixed:true,workers,provenance:intensiveRunProvenance(process.argv.slice(2)),campaign100:'unverified',sourceConsistent:true,cases:BIOMES.flatMap(biome=>CULTURES.map(culture=>({biome,culture,status:'pending'})))};
const save=()=>writeFileSync(new URL('matrix.json',output),JSON.stringify(matrix,null,2)+'\n');save();
console.log(JSON.stringify({output:fileURLToPath(output),days,workers}));
let next=0;
async function worker() {
  while(next<matrix.cases.length) {
    const row=matrix.cases[next++],key=row.biome+'-'+row.culture;
    const child=spawn(process.execPath,[fileURLToPath(new URL('./check_intensive_case.mjs',import.meta.url)),row.biome,row.culture,String(days),fileURLToPath(output)],{cwd:fileURLToPath(root),windowsHide:true,stdio:['ignore','pipe','pipe']});
    row.status='running';row.pid=child.pid;save();
    let stdout='',stderr='';child.stdout.on('data',chunk=>{stdout+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
    const outcome=await new Promise(resolve=>{child.once('error',error=>resolve({error:String(error)}));child.once('close',(code,signal)=>resolve({code,signal}));});
    try {
      const result=JSON.parse(readFileSync(new URL(key+'-status.json',output),'utf8'));
      const sameSources=JSON.stringify(result.provenance.sourceHashes)===JSON.stringify(matrix.provenance.sourceHashes);
      matrix.sourceConsistent&&=sameSources;
      const {provenance,lastDay,...details}=result;Object.assign(row,details,{sourceConsistent:sameSources,exitCode:outcome.code});
      if(outcome.code!==0||result.status!=='passed'){row.status='failed';row.error??={message:outcome.error??stderr??'Case did not pass'};}
    }catch(error){row.status='failed';row.error={message:String(error),process:outcome,stderr};}
    writeFileSync(new URL(key+'-process.json',output),JSON.stringify({outcome,stdout,stderr},null,2)+'\n');save();
    console.log(JSON.stringify(row));
  }
}
await Promise.all(Array.from({length:workers},worker));
matrix.campaign100=days===100&&matrix.sourceConsistent&&matrix.cases.length===30&&matrix.cases.every(row=>row.status==='passed')?'verified':'unverified';
matrix.activityAcceptance=intensiveActivityMatrixAcceptance(matrix.cases,{sourceConsistent:matrix.sourceConsistent});
save();if(matrix.cases.some(row=>row.status!=='passed')||!matrix.sourceConsistent)process.exitCode=1;
