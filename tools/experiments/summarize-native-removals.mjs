import {readFileSync,writeFileSync} from 'node:fs';
const root=process.argv[2];if(!root)throw Error('Expected diagnostic directory');
const r=JSON.parse(readFileSync(root+'/raid-ui.json'));if(!r.ok)throw Error('Diagnostic failed');
const calls=r.residual.phases.filter(p=>p.label.startsWith('native:'));
const summary=selected=>{const c=calls.filter(p=>p.selectedRequested===selected),s=c.map(x=>x.ms).sort((a,b)=>a-b);return {calls:c.length,totalMs:s.reduce((a,b)=>a+b,0),medianMs:s.length?s[Math.floor(s.length/2)]:null,maxMs:s.at(-1)??null,records:c};};
const result={scope:'Single real-game diagnostic with candidate runtime. No causal performance claim or ABAB.',selected:summary(true),notSelected:summary(false),errors:r.errors,consoleErrors:r.consoleErrors,failedRequests:r.failedRequests};
writeFileSync(root+'/native-removal-summary.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
