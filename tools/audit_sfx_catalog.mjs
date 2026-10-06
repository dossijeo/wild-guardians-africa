import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {eventSound,eventExtraSound,eventAlertSound} from '../src/audio/audio.js';
import {WALL_BUILD_SOUNDS,WALL_HIT_SOUNDS,STRUCTURE_ALERT_SOUNDS,STRUCTURE_DETAIL_SOUNDS} from '../src/audio/structure-audio.js';
import {ANIMAL_SOUND_ROUTES} from '../src/audio/animal-audio.js';
import {AMBIENT_SOUND_IDS} from '../src/audio/ambient-audio.js';
import {MOVEMENT_SOUND_IDS} from '../src/audio/movement-audio.js';
import {FARM_CONTACT_IDS} from '../src/audio/farm-contact-audio.js';
import {WORK_SOUND_IDS} from '../src/audio/work-audio.js';
import {WORKER_SOUND_IDS} from '../src/audio/worker-audio.js';
import {GUARDIAN_SOUND_IDS} from '../src/audio/guardian-audio.js';
import {UNLOCK_SOUND_IDS} from '../src/audio/unlock-audio.js';
import {RAID_ARRIVAL_SOUND_IDS} from '../src/audio/raid-arrival-audio.js';
import {UI_SOUND_ROUTES} from '../src/audio/ui-audio.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path));
const json=path=>JSON.parse(read(path).toString('utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bank=json('public/content/sfx.json'),declared=json('public/content/sfx-routing.json');
const plan=json('docs/plan/sfx_mapeo_implementacion.json'),original=json('docs/plan/sfx_catalogo_extraido.json');
const points=new Map(),sourceFiles=new Set(['src/app/main.js','src/rendering/scene.js','src/simulation/raids.js']);
function add(id,file,selector,trigger){
 sourceFiles.add(file);const text=read(file).toString('utf8'),line=text.split(/\r?\n/).findIndex(s=>s.includes(selector))+1;
 assert.ok(line,`${file}: missing ${selector}`);
 const routes=points.get(id)??[];routes.push({file,line,trigger});points.set(id,routes);
}
for(const [event,id] of Object.entries(eventSound))add(id,'src/audio/audio.js','export const eventSound=',event);
for(const [event,id] of Object.entries(eventExtraSound))add(id,'src/audio/audio.js','export const eventExtraSound=',event+' (extra contact/completion)');
for(const [event,id] of Object.entries(eventAlertSound))add(id,'src/audio/audio.js','export const eventAlertSound=',event+' (grouped gameplay warning)');
for(const [material,id] of Object.entries(WALL_BUILD_SOUNDS))add(id,'src/audio/structure-audio.js','export const WALL_BUILD_SOUNDS','WallChainBuilt: '+material);
for(const [material,id] of Object.entries(WALL_HIT_SOUNDS))add(id,'src/audio/structure-audio.js','export const WALL_HIT_SOUNDS','StructureHit: '+material);
for(const [trigger,id] of Object.entries(STRUCTURE_ALERT_SOUNDS))add(id,'src/audio/structure-audio.js','export const STRUCTURE_ALERT_SOUNDS',trigger);
for(const [trigger,id] of Object.entries(STRUCTURE_DETAIL_SOUNDS))add(id,'src/audio/structure-audio.js','export const STRUCTURE_DETAIL_SOUNDS',trigger+' (world detail)');
for(const [species,routes] of Object.entries(ANIMAL_SOUND_ROUTES))for(const [phase,id] of Object.entries(routes))add(id,'src/audio/animal-audio.js','export const ANIMAL_SOUND_ROUTES',species+': '+phase);
for(const [file,selector,ids,trigger] of [
 ['ambient-audio','AMBIENT_SOUND_IDS',AMBIENT_SOUND_IDS,'AmbientAudio.update: local day/night/hydrology layer'],
 ['movement-audio','MOVEMENT_SOUND_IDS',MOVEMENT_SOUND_IDS,'MovementAudio.update: observed moving native foot contact'],
 ['farm-contact-audio','FARM_CONTACT_IDS',FARM_CONTACT_IDS,'FarmContactAudio.update: native initial/water/harvest/crate contact'],
 ['work-audio','WORK_SOUND_IDS',WORK_SOUND_IDS,'WorkAudio.update: visible native watering window'],
 ['worker-audio','WORKER_SOUND_IDS',WORKER_SOUND_IDS,'WorkerAudio.update: observed assignment/work/flight reaction'],
 ['guardian-audio','GUARDIAN_SOUND_IDS',GUARDIAN_SOUND_IDS,'GuardianAudio.observe: actual rendered portrait lifecycle'],
 ['raid-arrival-audio','RAID_ARRIVAL_SOUND_IDS',RAID_ARRIVAL_SOUND_IDS,'RaidArrivalAudio.update: first observed physical farm entry per raid'],
 ['unlock-audio','UNLOCK_SOUND_IDS',UNLOCK_SOUND_IDS,'UnlockAudio.update: newly reached permanent magic milestone'],
])for(const id of ids)add(id,`src/audio/${file}.js`,`export const ${selector}`,trigger);
for(const [id,trigger] of Object.entries(UI_SOUND_ROUTES))add(id,'src/audio/ui-audio.js','export const UI_SOUND_ROUTES',trigger);
assert.equal(bank.items.length,126);assert.equal(declared.items.length,126);assert.equal(plan.items.length,126);
assert.equal(new Set(bank.items.map(s=>s.id)).size,126);
for(const id of points.keys())assert.ok(bank.items.some(s=>s.id===id),'Unknown runtime sound: '+id);
const rows=bank.items.map(item=>{
 const route=declared.items.find(r=>r.id===item.id),proposal=plan.items.find(r=>r.id===item.id),ref=original.items.find(r=>r.id===item.id);
 assert.ok(route&&proposal&&ref,item.id);assert.equal(item.number,route.number);assert.equal(item.number,proposal.number);
 const bytes=read('public/'+item.audio.url.replace(/^\//,'')),hash=sha(bytes);
 assert.equal(hash,item.sha256,item.id);assert.equal(hash,route.sha256,item.id);assert.equal(hash,ref.sha256,item.id);assert.equal(bytes.length,item.bytes);
 const locations=points.get(item.id)??[],connected=locations.length>0;
 assert.equal(route.status,connected?'connected':'reserved','Declared route differs from runtime exports: '+item.id);
 if(!connected)assert.ok(route.reservation_reason,item.id+' needs an explicit reason');
 return {number:item.number,id:item.id,name:item.name,category:item.category,loop:item.loop,bytes:bytes.length,sha256:hash,
  planClass:proposal.integration_status,plannedAction:proposal.trigger_proposal,
  runtimeStatus:connected?'assigned':'unassigned',codePoints:locations,
  pendingContext:connected?null:route.reservation_reason,
  evidence:connected?'Code assignment and exact original bytes; this row does not prove audible playback.':'Original retained; no runtime assignment. Review the proposed context before binding.'};
});
const groups={};for(const row of rows){const key=row.planClass+' / '+row.runtimeStatus;(groups[key]??=[]).push(row.id);}
const sources=['public/content/sfx.json','public/content/sfx-routing.json','docs/plan/sfx_mapeo_implementacion.json','docs/plan/sfx_catalogo_extraido.json',...sourceFiles].sort();
const report={scope:'Complete 126-row catalogue/code/byte audit. No claim of playback, listening or completed pending bindings.',
 sourceHashes:Object.fromEntries(sources.map(path=>[path,sha(read(path))])),total:126,assigned:points.size,unassigned:126-points.size,groups,rows};
const output=JSON.stringify(report,null,2)+'\n',folder=resolve(root,'docs/qa/sfx-catalog-post-jam');mkdirSync(folder,{recursive:true});
const target=resolve(folder,'inventory.json');
if(process.argv.includes('--check'))assert.equal(readFileSync(target,'utf8'),output,'Catalogue audit is stale; regenerate and review it.');
else{
 writeFileSync(target,output);
 const escape=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
 const table=['# Barrido de los 126 SFX','',
  'Inventario completo de asignaciones de código y bytes originales. No acredita escucha ni la integración de los pendientes. Regenerar con `node tools/audit_sfx_catalog.mjs`; comprobar vigencia con `--check`.','',
  `Asignados: **${report.assigned}**. Sin asignar en gameplay: **${report.unassigned}**.`, '',
  '| Nº | ID / nombre | Estado | Acción prevista | Punto de código o contexto pendiente |','| --- | --- | --- | --- | --- |',
  ...rows.map(r=>`| ${String(r.number).padStart(3,'0')} | ${escape(r.id+' · '+r.name)} | ${r.runtimeStatus==='assigned'?'Asignado':'Pendiente'} | ${escape(r.plannedAction)} | ${escape(r.codePoints.length?r.codePoints.map(p=>p.file+':'+p.line+' → '+p.trigger).join('; '):r.pendingContext)} |`),
  '', 'Las 36 alternativas/contextos y 12 reservas del plan requieren su contexto correcto. No se crean lluvia, salud de animales, sacos o recompensas monetarias para que suenen tomas reservadas. Los usos compatibles pendientes deben recibir implementación y pruebas antes de cerrar la tarea.',''];
 writeFileSync(resolve(folder,'inventory.md'),table.join('\n'));
}
console.log(JSON.stringify({total:report.total,assigned:report.assigned,unassigned:report.unassigned,exactOriginalFiles:rows.length,stale:false}));
