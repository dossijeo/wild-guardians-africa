import {createHash} from 'node:crypto';
import {DEFAULT_GENES,GENE_SCHEMA,MATERIALS,validateGenes} from './policy-genes.mjs';

export function seededRandom(seed){
 let state=seed>>>0;
 return ()=>{state=(state+0x6d2b79f5)>>>0;let x=state;
  x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);
  return ((x^(x>>>14))>>>0)/4294967296;};
}
export const genomeId=genes=>createHash('sha256').update(JSON.stringify(validateGenes(genes))).digest('hex').slice(0,16);
export function randomGenome(random){
 const genes={...DEFAULT_GENES};
 for(const [key,[min,max,step]] of Object.entries(GENE_SCHEMA))
  genes[key]=+(min+Math.floor(random()*(Math.round((max-min)/step)+1))*step).toFixed(8);
 genes.wallMaterial=MATERIALS[Math.floor(random()*MATERIALS.length)];
 genes.magicPriority=random()<0.5?'growth':'multiply';
 return validateGenes(genes);
}
export function breed(a,b,random,mutationRate=0.2){
 const genes={};
 for(const [key,[min,max,step]] of Object.entries(GENE_SCHEMA)){
  const inherited=random()<0.5?a[key]:b[key];
  const value=random()<mutationRate?inherited+(random()<0.5?-step:step):inherited;
  genes[key]=+Math.min(max,Math.max(min,value)).toFixed(8);
 }
 genes.wallMaterial=random()<mutationRate?MATERIALS[Math.floor(random()*MATERIALS.length)]:random()<0.5?a.wallMaterial:b.wallMaterial;
 genes.magicPriority=random()<mutationRate?(random()<0.5?'growth':'multiply'):random()<0.5?a.magicPriority:b.magicPriority;
 return validateGenes(genes);
}
export function scoreCampaign(report,targetDays){
 const rows=report.rows??[];
 const completed=Math.min(targetDays,Math.max(0,report.completedNights??0));
 const terminal=report.result==='defeat'||report.result==='victory';
 if(report.status==='error'||!rows.length||!terminal&&completed<targetDays)return {score:-1e9,valid:false,reason:'technical-or-truncated'};
 const productive=rows.reduce((n,r)=>n+(r.delivered??0),0);
 const living=rows.at(-1)?.living??0;
 const cash=rows.at(-1)?.money??0;
 if(report.result!=='victory'&&living===0&&
  !rows.slice(-2).some(r=>(r.planted??0)>0||(r.delivered??0)>0))
  return {score:-1e9,valid:false,reason:'no-active-farm',completed,productive,living,cash};
 const noFarmPenalty=productive===0?1000:0;
 // Survival dominates. Modest secondary rewards cannot offset one lost night.
 return {score:completed*1000+Math.min(150,Math.max(-100,cash)/20)+Math.min(70,living/2)+Math.min(30,productive/20)-noFarmPenalty,
  valid:true,completed,productive,living,cash,result:report.result};
}
