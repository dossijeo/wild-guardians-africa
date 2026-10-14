import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function plotRun(folder){
 const files=readdirSync(folder).filter(x=>(x.endsWith('.json')||x.endsWith('.json.gz'))&&
  !['config.json','search.json','result.json','archive-index.json'].includes(x));
 const reports=files.map(x=>JSON.parse(x.endsWith('.gz')?
  gunzipSync(readFileSync(join(folder,x))):readFileSync(join(folder,x),'utf8')))
  .filter(x=>x.status==='completed'&&x.rows?.length);
 const width=960,height=790,left=80,right=30,colors=['#687d3c','#af652e','#586d7c','#9b3f42','#aa8a32','#574e75'];
 const panels=[{key:'money',label:'Monedas al cierre',y:60},{key:'living',label:'Cultivos vivos',y:245},
  {key:'destroyed',label:'Cultivos destruidos',y:430},{key:'wages',label:'Salarios pagados',y:615}];
 const maxDay=Math.max(1,...reports.flatMap(r=>r.rows.map(x=>x.day)));
 let body=`<rect width="${width}" height="${height}" fill="#f4ecda"/>`;
 for(const panel of panels){
  const top=panel.y,ph=118,max=Math.max(1,...reports.flatMap(r=>r.rows.map(x=>x[panel.key]??0)));
  body+=`<text x="${left}" y="${top-12}" font-size="17" fill="#25261e">${xml(panel.label)}</text>`;
  body+=`<path d="M${left} ${top}V${top+ph}H${width-right}" fill="none" stroke="#555"/>`;
  body+=`<text x="5" y="${top+12}" font-size="12" fill="#555">${Math.round(max)}</text>`;
  for(let i=0;i<reports.length;i++){
   const r=reports[i],points=r.rows.map(row=>`${left+(row.day-1)/Math.max(1,maxDay-1)*(width-left-right)},${top+ph-(row[panel.key]??0)/max*ph}`);
   body+=`<polyline points="${points.join(' ')}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="2"/>`;
  }
 }
 const legend=reports.map((r,i)=>`${r.strategy} ${r.biome}/${r.seed}${r.genes?' (GA)':''}`).join(' · ');
 body+=`<text x="${left}" y="${height-12}" font-size="11" fill="#333">${xml(legend.slice(0,145))}</text>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`;
 writeFileSync(join(folder,'trajectories.svg'),svg);
 return {reports:reports.length,path:join(folder,'trajectories.svg')};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
 console.log(plotRun(resolve(process.argv[2]??'docs/qa/evolutionary-balance/pilot-7day')));
