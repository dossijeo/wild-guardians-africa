// Read-only analysis of a source-only audit. Equal sampled state is not proof
// of causality or a waiver of a noisy original control.
import {readFile} from 'node:fs/promises';
const path=process.argv[2]??'docs/qa/frontside-model-pilot/worker-runtime-visual-selection.json',report=JSON.parse(await readFile(path,'utf8')),audit=report.sourceDrawAudit;
if(!audit)throw Error('Report has no source draw audit');
const source=audit.frames.filter(f=>f.label==='reference'),labels=[...new Set(audit.frames.map(f=>f.label).filter(l=>l!=='reference'))],rows=[];
for(const label of labels){const repeat=audit.frames.filter(f=>f.label===label),differences=[];for(let i=0;i<Math.max(source.length,repeat.length);i++){
 const a=source[i],b=repeat[i];if(!a||!b){differences.push({draw:i,missingDraw:true});continue;}
 const changed=Object.keys(a).filter(key=>key!=='label'&&JSON.stringify(a[key])!==JSON.stringify(b[key]));if(changed.length)differences.push({draw:i,mesh:a.mesh,changedFields:changed});
 }rows.push({label,draws:repeat.length,differences});}
const attributesUnchanged=JSON.stringify(audit.initialBuffers)===JSON.stringify(audit.finalBuffers);
console.log(JSON.stringify({status:'SOURCE_STATE_DIAGNOSIS_NOT_APPROVAL',file:path,referenceDraws:source.length,programs:audit.programs.length,attributesUnchanged,repeats:rows,limitations:['Object/buffer identities local to the capture; FNV hashes are not collision-free.', 'Draw ordering is compared by ordinal; differences need inspection, not noise subtraction.', 'GL instrumentation can perturb timing; equal captured state neither proves a cause nor accepts V1/candidate.']},null,2));
