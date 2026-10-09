import {Navigation} from './navigation.js';
import {chooseRaidEntrySteps,warmRaidApproachesSteps} from '../simulation/raids.js';
import {animalSpec,randomInt} from '../simulation/rules.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {raidNavigationWarmth,navigationPathKey} from './raid-navigation-warmth.js';
import {withRaidEntryBudget} from './raid-entry-budget.js';

const workState=(limit,maxGeometryChecks,maxSearchYields)=>({limit,searches:0,geometryChecks:0,searchYields:0,approachChecks:0,maxGeometryChecks,maxSearchYields,exhausted:null});
export class RaidEntryComputation{
 constructor(request){
  const started=performance.now();this.request=structuredClone(request);const {state,profile,group,bounds,view}=this.request;
  this.nav=new Navigation(state.seed,state.biome,profile);this.nav.setState(state);this.nav.setActiveBounds(bounds);this.nav.setRaidView(view.eye,view.target);
  this.specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  this.side=state.nightPlan?.entryPreferredSide??randomInt(state,0,3);
  this.iterator=chooseRaidEntrySteps(state,this.specs,bounds,this.side,this.nav);this.phase='entry';
  this.entryWork=workState(32,100000,50000);this.warmWork=workState(64,1000000,100000);
  this.metrics={constructionMilliseconds:performance.now()-started,slices:0,totalMilliseconds:0,maxSliceMilliseconds:0,maxSliceGeometryChecks:0,yieldBoundaries:0};
 }
 startWarm(){
  const nav=this.nav;this.pathDescriptor=Object.getOwnPropertyDescriptor(nav,'pathSteps');const original=nav.pathSteps;let points=0;nav.warmPaths=new Map();
  nav.pathSteps=function*(start,end,radius=.3,ignore=null,worker=true,margin=16,...rest){
   const route=yield* original.call(this,start,end,radius,ignore,worker,margin,...rest);
   if(route&&nav.warmPaths.size<128&&points+route.length<=20000){const key=navigationPathKey(start,end,radius,ignore,worker,margin);if(!nav.warmPaths.has(key)){nav.warmPaths.set(key,route.map(p=>({...p})));points+=route.length;}}
   return route;
  };
  this.iterator=warmRaidApproachesSteps(this.request.state,this.specs,this.entry,nav);this.phase='warm';
 }
 restoreWarmMethod(){if(this.pathDescriptor!==undefined)Object.defineProperty(this.nav,'pathSteps',this.pathDescriptor);else if(this.phase!=='entry')delete this.nav.pathSteps;}
 finish(){
  this.result={key:this.request.key,token:this.request.token,entry:this.entry,warmth:raidNavigationWarmth(this.nav),diagnostics:{entryWork:{...this.entryWork},warmWork:{...this.warmWork}}};
  this.iterator?.return?.();this.iterator=null;this.restoreWarmMethod();this.phase='done';return {done:true,value:this.result};
 }
 pump({maxBoundaries=16,maxGeometryChecks=256}={}){
  if(!Number.isSafeInteger(maxBoundaries)||maxBoundaries<1||!Number.isSafeInteger(maxGeometryChecks)||maxGeometryChecks<1)throw Error('Invalid cooperative raid slice');
  if(this.disposed)throw Error('Disposed raid computation');if(this.phase==='done')return {done:true,value:this.result};
  const began=performance.now(),phase=this.phase,work=phase==='entry'?this.entryWork:this.warmWork,before=work.geometryChecks;
  let boundaries=0,finished=false;
  try{
   const status=withRaidEntryBudget(this.nav,work.limit,()=>{
    while(boundaries<maxBoundaries&&work.geometryChecks-before<maxGeometryChecks){
     const step=this.iterator.next();if(step.done){finished=true;return step;}boundaries++;
    }
    return {done:false};
   },{maxGeometryChecks:work.maxGeometryChecks,maxSearchYields:work.maxSearchYields,workState:work});
   if(status===null){this.iterator.return?.();if(phase==='entry')this.entry=null;return this.finish();}
   if(finished){if(phase==='entry'){this.entry=status.value;this.startWarm();return {done:false};}return this.finish();}
   return {done:false};
  }catch(error){this.dispose();throw error;}
  finally{
   const duration=performance.now()-began;this.metrics.slices++;this.metrics.totalMilliseconds+=duration;this.metrics.maxSliceMilliseconds=Math.max(this.metrics.maxSliceMilliseconds,duration);this.metrics.maxSliceGeometryChecks=Math.max(this.metrics.maxSliceGeometryChecks,work.geometryChecks-before);this.metrics.yieldBoundaries+=boundaries;
  }
 }
 dispose(){if(this.disposed)return;this.iterator?.return?.();this.iterator=null;this.restoreWarmMethod();this.disposed=true;this.phase='disposed';}
}
