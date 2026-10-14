import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Navigation} from '../../src/world/navigation.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';

const [daysArg='2',biome='sabana',seedArg='712',strategy='good',output='docs/qa/hierarchical-navigation/navigation-demand.json']=process.argv.slice(2);
const days=Number(daysArg),seed=Number(seedArg);
if(!Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))throw Error('Invalid probe parameters');
const started=performance.now(),profiles=new Map();
const counts={setState:0,path:0,region:0,connectivity:0,workerViews:0,workerViewUnique:0,workerViewPath:0};
const viewObjects=new WeakSet();
const original={setState:Navigation.prototype.setState,path:Navigation.prototype.path,
  region:Navigation.prototype.regionFor,connectivity:Navigation.prototype.regionConnected,
  workerViews:Navigation.prototype.workerNavigationView};
const profile=(radius,worker,ignore)=>`${worker?'worker':'animal'}:${radius}:${ignore??''}`;
Navigation.prototype.setState=function(...args){counts.setState++;return original.setState.apply(this,args);};
Navigation.prototype.path=function(start,end,radius=.3,ignore=null,worker=true,...rest){
  counts.path++;
  if(viewObjects.has(this))counts.workerViewPath++;
  const key=profile(radius,worker,ignore);
  let row=profiles.get(key);
  if(!row)profiles.set(key,row={key,queries:0,found:0,missed:0,minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity});
  row.queries++;
  for(const p of [start,end]){
    row.minX=Math.min(row.minX,p.x);row.minZ=Math.min(row.minZ,p.z);
    row.maxX=Math.max(row.maxX,p.x);row.maxZ=Math.max(row.maxZ,p.z);
  }
  const result=original.path.call(this,start,end,radius,ignore,worker,...rest);
  if(result)row.found++;else row.missed++;
  return result;
};
Navigation.prototype.regionFor=function(...args){counts.region++;return original.region.apply(this,args);};
Navigation.prototype.regionConnected=function(...args){counts.connectivity++;return original.connectivity.apply(this,args);};
Navigation.prototype.workerNavigationView=function(...args){
  counts.workerViews++;
  const view=original.workerViews.apply(this,args);
  if(view!==this&&!viewObjects.has(view)){viewObjects.add(view);counts.workerViewUnique++;}
  return view;
};
const daily=[];
try{
  const result=await simulateNativeCampaign({days,biome,seed,strategy,culture:'mapungubwe',nativeEvidence:false,
    onDay:row=>{daily.push({day:row.day,money:row.money,living:row.living,elapsedSeconds:(performance.now()-started)/1000,
      counts:{...counts}});console.log(JSON.stringify(daily.at(-1)));}});
  const report={status:'completed',parameters:{days,biome,seed,strategy},completedNights:result.completedNights,
    elapsedSeconds:(performance.now()-started)/1000,counts,profiles:[...profiles.values()].sort((a,b)=>b.queries-a.queries),daily};
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,completedNights:report.completedNights,elapsedSeconds:report.elapsedSeconds,counts,profiles:report.profiles.length}));
}catch(error){
  const report={status:'error',parameters:{days,biome,seed,strategy},message:error.message,elapsedSeconds:(performance.now()-started)/1000,counts,profiles:[...profiles.values()],daily};
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify(report));process.exitCode=1;
}
