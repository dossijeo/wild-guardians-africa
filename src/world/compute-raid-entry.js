import {RaidEntryComputation} from './raid-entry-computation.js';

export function computeRaidEntry(request){
  const computation=new RaidEntryComputation(request);
  try{let step;do{step=computation.pump({maxBoundaries:1000000,maxGeometryChecks:1000000});}while(!step.done);return step.value;}
  finally{computation.dispose();}
}
