// Presentation of the user-approved activity gate; does not alter strategy,
// simulation clocks or any recorded measurement.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const bytes=readFileSync(new URL('../docs/qa/intensive-acceptance-policy.json',import.meta.url));
const policy=JSON.parse(bytes);
const {comparison,maximumFraction}=policy.unoccupiedDaylight;
if(comparison!=='strictly-less-than'||!Number.isFinite(maximumFraction)||maximumFraction<=0||maximumFraction>1)throw Error('Unsupported intensive activity acceptance policy');
const provenance=Object.freeze({path:'docs/qa/intensive-acceptance-policy.json',sha256:createHash('sha256').update(bytes).digest('hex'),updated:policy.updated,comparison,maximumFraction});
export function intensiveActivityAcceptance(fraction){
 const valid=typeof fraction==='number'&&Number.isFinite(fraction)&&fraction>=0&&fraction<=1;
 return {status:valid?(fraction<maximumFraction?'accepted':'not-accepted'):'unverified',measuredFraction:fraction??null,policy:provenance,scope:'Activity metric only; does not prove survival, accounting, source fidelity, bad-management loss or complete release acceptance.'};
}

export function intensiveActivityMatrixAcceptance(cases,{sourceConsistent=true,expectedCases=30}={}){
 if(!sourceConsistent)return 'unverified';
 if(cases.some(row=>row.status==='passed'&&row.activityAcceptance?.status==='not-accepted'))return 'not-accepted';
 return cases.length===expectedCases&&cases.every(row=>row.status==='passed'&&row.activityAcceptance?.status==='accepted')?'accepted':'unverified';
}
