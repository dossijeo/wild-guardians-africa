// Phase-2 fitness diagnostics: pressure starts after the first five intro nights.
// This does not change physical campaign outcomes or the historical seven-night score.
const sum=(rows,key)=>rows.reduce((total,row)=>total+Number(row[key]??0),0);
const financial=rows=>({income:sum(rows,'income'),seeds:sum(rows,'seeds'),
 wages:sum(rows,'wages'),repairs:sum(rows,'repairs'),walls:sum(rows,'walls')});
const operating=finance=>finance.income-finance.seeds-finance.wages-finance.repairs;

export function postIntroMetrics(report,{firstPressureDay=6,window=3}={}){
 const rows=(report.rows??[]).filter(row=>row.day>=firstPressureDay);
 const opening=rows.slice(0,window),terminal=rows.slice(-window);
 const openingFinance=financial(opening),terminalFinance=financial(terminal);
 const openingDelivered=sum(opening,'delivered'),terminalDelivered=sum(terminal,'delivered');
 const attraction=(report.raid??[]).filter(raid=>raid.day>=firstPressureDay)
  .reduce((total,raid)=>total+Number(raid.attraction??0),0);
 const destroyed=sum(rows,'destroyed');
 return {firstPressureDay,window,pressureDays:rows.length,
  delivered:sum(rows,'delivered'),destroyed,attraction,
  opening:{days:opening.length,delivered:openingDelivered,living:opening.at(-1)?.living??0,
   ...openingFinance,operating:operating(openingFinance)},
  terminal:{days:terminal.length,delivered:terminalDelivered,living:terminal.at(-1)?.living??0,
   cash:terminal.at(-1)?.money??0,...terminalFinance,operating:operating(terminalFinance)},
  deliveryRetention:openingDelivered>0?terminalDelivered/openingDelivered:null,
  terminalDeliveryPerDay:terminal.length?terminalDelivered/terminal.length:0,
  productiveAtEnd:terminalDelivered>0&&(terminal.at(-1)?.living??0)>0};
}

export function scorePostIntro(report,targetDays,{minimumTerminalDeliveryPerDay=null}={}){
 if(!Number.isInteger(targetDays)||targetDays<14)throw Error('Post-intro fitness needs at least 14 nights');
 if(minimumTerminalDeliveryPerDay!==null&&
  (!Number.isFinite(minimumTerminalDeliveryPerDay)||minimumTerminalDeliveryPerDay<0))
  throw Error('Invalid measured delivery floor');
 if(report.status==='error')return {score:-1e9,valid:false,
  reason:report.name==='CampaignCostStop'?'computational-cost-stop':'technical-error',
  scoreVersion:'post-intro-v1'};
 const completed=report.completedNights??0;
 const terminal=report.result==='defeat'||report.result==='victory';
 if(!terminal&&completed<targetDays)return {score:-1e9,valid:false,reason:'truncated',scoreVersion:'post-intro-v1'};
 const metrics=postIntroMetrics(report);
 if(!metrics.pressureDays)return {score:-1e9,valid:false,reason:'no-post-intro-evidence',scoreVersion:'post-intro-v1'};
 const eligible=metrics.productiveAtEnd&&
  (minimumTerminalDeliveryPerDay===null||metrics.terminalDeliveryPerDay>=minimumTerminalDeliveryPerDay);
 // The native result remains intact. A farm with collapsed delivery may survive
 // the horizon but cannot be selected as a competent virtual-player policy.
 if(!eligible&&report.result!=='defeat')return {score:-1e9,valid:false,reason:'collapsed-production',
  scoreVersion:'post-intro-v1',completed,metrics,minimumTerminalDeliveryPerDay,
  nativeResult:report.result,competitiveEligible:false};
 const terminalDefeatPenalty=report.result==='defeat'?500:0;
 const cropLossFraction=metrics.destroyed/Math.max(1,
  (report.raid??[]).filter(raid=>raid.day>=6).reduce((n,raid)=>n+Number(raid.livingAtSpawn??0),0));
 const operatingPerDay=metrics.terminal.operating/Math.max(1,metrics.terminal.days);
 // Secondary terms are bounded below one night of native survival. Defensive
 // spending has no direct penalty: its real effects appear in cash and crops.
 const secondary=Math.max(-150,Math.min(150,operatingPerDay/3))+
  Math.min(125,metrics.terminalDeliveryPerDay)+
  Math.max(-100,Math.min(100,(metrics.deliveryRetention??0)*50))-
  Math.min(125,cropLossFraction*250);
 return {score:Math.min(targetDays,completed)*1000-terminalDefeatPenalty+secondary,
  valid:true,scoreVersion:'post-intro-v1',completed,metrics,cropLossFraction,
  minimumTerminalDeliveryPerDay,result:report.result,nativeResult:report.result,
  competitiveEligible:eligible?(minimumTerminalDeliveryPerDay===null?null:true):false};
}

// Keep v1 immutable for historical runs. Its 500-point terminal penalty was
// smaller than the possible spread of secondary terms, so a defeated farm
// could outrank a live horizon survivor. V2 restores that ordering without
// changing campaign outcomes or any other score component.
export function scorePostIntroV2(report,targetDays,options={}){
 const prior=scorePostIntro(report,targetDays,options);
 return {...prior,scoreVersion:'post-intro-v2',
  score:prior.valid&&report.result==='defeat'?prior.score-300:prior.score};
}
