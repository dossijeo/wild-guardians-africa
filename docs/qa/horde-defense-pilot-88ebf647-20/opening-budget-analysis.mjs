// Read-only observations from the retained terminal report, not a new simulation.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const input=new URL('./native-original/responsible/native-report.json.gz',import.meta.url);
const bytes=readFileSync(input),report=JSON.parse(gunzipSync(bytes));
const rows=[];
for(let day=1;day<=5;day++){
 const decisions=report.decisions.filter(d=>d.day===day&&d.daylightSeconds>0&&!d.actions&&d.reason==='budget');
 const range=key=>decisions.length?[Math.min(...decisions.map(d=>d[key])),Math.max(...decisions.map(d=>d[key]))]:null;
 rows.push({day,budgetSeconds:decisions.reduce((n,d)=>n+d.daylightSeconds,0),balanceRange:range('balance'),staffRange:range('staff'),pendingTaskRange:range('pendingTasks'),workerSeconds:Object.fromEntries(['idle','walking','acting','carrying'].map(status=>[status,decisions.reduce((n,d)=>n+(d.workerStates[status]??0)*d.daylightSeconds,0)]))});
}
const output={source:'88ebf647b6bbe0d589125e4136d65e73fdf303a6',inputSHA256:createHash('sha256').update(bytes).digest('hex'),rows,scope:'Budget-only zero-action daylight observations, days1–5. Worker-seconds are aggregate worker occupancy, not player inactivity. No per-route length, task identity, first-delivery timestamp or complete reserve breakdown is retained here; no causal attribution or parameter change follows.'};
writeFileSync(new URL('./opening-budget-analysis.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(rows));
