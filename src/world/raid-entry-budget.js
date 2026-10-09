export class RaidEntryBudgetExceeded extends Error{}

// Bounds work units, never frame time. Throwing through path() prevents an
// interrupted search from being recorded as a proven failed route.
export function withRaidEntryBudget(nav,limit,calculate,{maxGeometryChecks=256,maxSearchYields=32,workState=null}={}){
 for(const [name,value,max] of [['searches',limit,64],['geometry',maxGeometryChecks,1000000],['yields',maxSearchYields,100000]])if(!Number.isSafeInteger(value)||value<0||value>max)throw Error(`Invalid raid entry ${name} budget`);
 const descriptors=new Map(),stats=workState??{limit,searches:0,geometryChecks:0,searchYields:0,approachChecks:0,maxGeometryChecks,maxSearchYields,exhausted:null};
 if(stats.limit!==limit||stats.maxGeometryChecks!==maxGeometryChecks||stats.maxSearchYields!==maxSearchYields)throw Error('Raid entry continuation budget mismatch');
 const exhaust=kind=>{stats.exhausted=kind;throw new RaidEntryBudgetExceeded(`Raid entry ${kind} budget exhausted`);};
 const replace=(name,make)=>{const original=nav[name];if(typeof original!=='function')return;descriptors.set(name,Object.getOwnPropertyDescriptor(nav,name));nav[name]=make(original);};
 for(const name of ['walkable','segmentClear'])replace(name,original=>function(...args){if(stats.geometryChecks>=maxGeometryChecks)exhaust('geometry');stats.geometryChecks++;return original.apply(this,args);});
 replace('approachPath',original=>function(...args){stats.approachChecks++;return original.apply(this,args);});
 replace('findPathSteps',original=>function*(...args){
  const iterator=original.apply(this,args);let started=false;
  try{while(true){const step=iterator.next();if(step.done)return step.value;
   // Native A* yields after eight visited nodes. Direct and cached routes
   // never reach this boundary and consume no search allowance.
   if(!started){if(stats.searches>=limit)exhaust('searches');stats.searches++;started=true;}
   if(stats.searchYields>=maxSearchYields)exhaust('yields');stats.searchYields++;yield step.value;
  }}finally{iterator.return?.();}
 });
 try{return calculate();}
 catch(error){if(!(error instanceof RaidEntryBudgetExceeded))throw error;return null;}
 finally{for(const [name,descriptor] of descriptors)if(descriptor)Object.defineProperty(nav,name,descriptor);else delete nav[name];nav.lastRaidEntryBudget=stats;}
}
