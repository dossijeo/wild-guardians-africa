// Node-only experiment: never edits or replaces the production source on disk.
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(process.env.MOBILE_PHASE_EXPERIMENT!=='1'||!url.endsWith('/src/simulation/game.js'))return result;
 let source=String(result.source);
 const condition='if((stationarySeconds>=3||destinationStallSeconds>=12)&&',phase='const phased=(w.mobilePhaseRemaining??0)>0;';
 if(!source.includes(condition)||!source.includes(phase))throw Error('Mobile phase experiment hooks changed');
 source=source.replace(condition,'if(false&&(stationarySeconds>=3||destinationStallSeconds>=12)&&').replace(phase,'const phased=false;');
 return {...result,source,shortCircuit:true};
}
