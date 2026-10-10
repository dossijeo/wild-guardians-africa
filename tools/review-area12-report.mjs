// Independent review of retained evidence; never changes or reruns a campaign.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';

export function reviewArea12Report(report, state) {
 const owned=new Set(report.defense?.built?.ids??[]);
 const walls=state.structures.filter(s=>s.kind==='wall'&&owned.has(s.id));
 const wallStatuses={};
 for(const wall of walls)wallStatuses[wall.status]=(wallStatuses[wall.status]??0)+1;
 const meaningful=report.meaningfulObservedActivity;
 const fraction=meaningful?.unoccupiedFraction;
 const meaningfulAvailable=Number.isFinite(fraction)&&fraction>=0&&fraction<=1;
 return {
  completedNights:state.completedNights,
  result:state.result,
  ownedWallCount:walls.length,
  ownedWallStatuses:wallStatuses,
  ownedIntactWalls:walls.filter(w=>w.status==='intact').length,
  ownedRuinedWalls:walls.filter(w=>w.status==='ruined').length,
  rawUnoccupiedFraction:report.observedActivity?.unoccupiedFraction??null,
  meaningfulUnoccupiedFraction:meaningfulAvailable?fraction:null,
  meaningfulActivityBelow25:meaningfulAvailable?fraction<.25:null,
  paidRestoringRepairOrders:meaningful?.creditedPaidRestoringRequests??null,
  structureHits:(report.raidFacts??[]).filter(e=>e.type==='StructureHit').length,
  diagnosticWarnings:[
   ...(!meaningfulAvailable?['Meaningful activity missing or invalid; raw activity cannot establish acceptance.']:[]),
   ...(report.defense?.currentOwnedOperational!==undefined&&report.defense.currentOwnedOperational!==walls.filter(w=>w.status==='intact').length?['Original owned operational counter disagrees with retained wall state.']:[]),
   ...(report.defense?.currentOwnedRuined!==undefined&&report.defense.currentOwnedRuined!==walls.filter(w=>w.status==='ruined').length?['Original owned ruined counter disagrees with retained wall state.']:[]),
  ],
  scope:'Retained-state diagnostics only; no route interception, useful wall activity, GPU, or 100-night balance acceptance inferred.',
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const directory=process.argv[2];
 if(!directory)throw Error('Provide a retained case directory containing native-report.json.gz and native-state.json.gz');
 const load=name=>JSON.parse(gunzipSync(readFileSync(join(directory,name))));
 console.log(JSON.stringify(reviewArea12Report(load('native-report.json.gz'),load('native-state.json.gz')),null,2));
}
