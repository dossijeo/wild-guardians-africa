import {POWER_READY_SOUND_IDS} from '../src/audio/power-ready-audio.js';
import {DESTRUCTION_SOUND_ROUTES} from '../src/audio/destruction-audio.js';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {eventSound,eventExtraSound,eventAlertSound,eventRefundSound,eventSpendSound} from '../src/audio/audio.js';
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
const points=new Map(),sourceFiles=new Set(['tools/audit_sfx_catalog.mjs','src/app/main.js','src/rendering/scene.js','src/simulation/raids.js']);
function add(id,file,selector,trigger){
 sourceFiles.add(file);const text=read(file).toString('utf8'),line=text.split(/\r?\n/).findIndex(s=>s.includes(selector))+1;
 assert.ok(line,`${file}: missing ${selector}`);
 const routes=points.get(id)??[];routes.push({file,line,selector,trigger});points.set(id,routes);
}
for(const [event,id] of Object.entries(eventSound))add(id,'src/audio/audio.js','export const eventSound=',event);
for(const [event,id] of Object.entries(eventExtraSound))add(id,'src/audio/audio.js','export const eventExtraSound=',event+' (extra contact/completion)');
for(const [event,id] of Object.entries(eventAlertSound))add(id,'src/audio/audio.js','export const eventAlertSound=',event+' (grouped gameplay warning)');
for(const [event,id] of Object.entries(eventRefundSound))add(id,'src/audio/audio.js','export const eventRefundSound=',event+' (positive committed refund only)');
for(const [event,id] of Object.entries(eventSpendSound))add(id,'src/audio/audio.js','export const eventSpendSound=',event+' (positive committed payroll only)');
for(const [material,id] of Object.entries(WALL_BUILD_SOUNDS))add(id,'src/audio/structure-audio.js','export const WALL_BUILD_SOUNDS','WallChainBuilt: '+material);
for(const [material,id] of Object.entries(WALL_HIT_SOUNDS))add(id,'src/audio/structure-audio.js','export const WALL_HIT_SOUNDS','StructureHit: '+material);
for(const [trigger,id] of Object.entries(STRUCTURE_ALERT_SOUNDS))add(id,'src/audio/structure-audio.js','export const STRUCTURE_ALERT_SOUNDS',trigger);
for(const [trigger,id] of Object.entries(STRUCTURE_DETAIL_SOUNDS))add(id,'src/audio/structure-audio.js','export const STRUCTURE_DETAIL_SOUNDS',trigger+' (world detail)');
for(const [trigger,id] of Object.entries(DESTRUCTION_SOUND_ROUTES))add(id,'src/audio/destruction-audio.js','export const DESTRUCTION_SOUND_ROUTES','Native building fragments: '+trigger+' (observed particle batch)');
for(const [species,routes] of Object.entries(ANIMAL_SOUND_ROUTES))for(const [phase,id] of Object.entries(routes))add(id,'src/audio/animal-audio.js','export const ANIMAL_SOUND_ROUTES',species+': '+phase);
for(const [file,selector,ids,trigger] of [
 ['ambient-audio','AMBIENT_SOUND_IDS',AMBIENT_SOUND_IDS,'AmbientAudio.update: local day/night/hydrology layer'],
 ['movement-audio','MOVEMENT_SOUND_IDS',MOVEMENT_SOUND_IDS,'MovementAudio.update: observed moving native foot contact'],
 ['farm-contact-audio','FARM_CONTACT_IDS',FARM_CONTACT_IDS,'FarmContactAudio.update: native initial/water/harvest/crate contact'],
 ['work-audio','WORK_SOUND_IDS',WORK_SOUND_IDS,'WorkAudio.update: visible native watering window'],
 ['worker-audio','WORKER_SOUND_IDS',WORKER_SOUND_IDS,'WorkerAudio.update: observed assignment/work/flight reaction'],
 ['guardian-audio','GUARDIAN_SOUND_IDS',GUARDIAN_SOUND_IDS,'GuardianAudio.observe: actual rendered portrait lifecycle'],
 ['raid-arrival-audio','RAID_ARRIVAL_SOUND_IDS',RAID_ARRIVAL_SOUND_IDS,'RaidArrivalAudio.update: first observed physical farm entry per raid'],
 ['power-ready-audio','POWER_READY_SOUND_IDS',POWER_READY_SOUND_IDS,'PowerReadyAudio.update: observed positive cooldown reaching zero'],
 ['unlock-audio','UNLOCK_SOUND_IDS',UNLOCK_SOUND_IDS,'UnlockAudio.update: newly reached permanent magic milestone'],
])for(const id of ids)add(id,`src/audio/${file}.js`,`export const ${selector}`,trigger);
for(const [id,trigger] of Object.entries(UI_SOUND_ROUTES))add(id,'src/audio/ui-audio.js','export const UI_SOUND_ROUTES',trigger);
// A declaration is not a caller. Pin each adapter and application entry point,
// retaining literal mentions separately (notably the unreachable wood variant).
function files(folder){return readdirSync(resolve(root,folder),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(folder+'/'+entry.name):entry.name.endsWith('.js')?[folder+'/'+entry.name]:[]);}
const allSource=files('src'),sourceLines=new Map(allSource.map(file=>[file,read(file).toString('utf8').split(/\r?\n/)]));
function reference(file,selector){
 const line=sourceLines.get(file)?.findIndex(text=>text.includes(selector))+1;
 assert.ok(line,`${file}: missing caller ${selector}`);sourceFiles.add(file);
 return {file,line,selector};
}
const mentions=new Map(),eventProducers=new Map(),bankIds=new Set(bank.items.map(item=>item.id));
for(const [file,lines] of sourceLines)for(let index=0;index<lines.length;index++){
 const seen=new Set();for(const match of lines[index].matchAll(/['"]([a-z0-9_]+)['"]/g))if(bankIds.has(match[1])&&!seen.has(match[1])){
  seen.add(match[1]);const entries=mentions.get(match[1])??[];entries.push({file,line:index+1});mentions.set(match[1],entries);
 }
 if(file.startsWith('src/simulation/')||file.startsWith('src/tutorial/'))for(const match of lines[index].matchAll(/\bemit\([^,]+,\s*['"](\w+)['"]/g)){
  const entries=eventProducers.get(match[1])??[];entries.push({file,line:index+1,selector:match[0]});eventProducers.set(match[1],entries);
 }
}
const app='src/app/main.js',audioFile='src/audio/audio.js';
const adapters={
 'ambient-audio':['updateAmbient','this.ambient.update(state,options);'],
 'movement-audio':['updateMovement','this.movement.update(state,options);'],
 'farm-contact-audio':['updateFarmActors','this.farm.update(state,options);'],
 'work-audio':['updateFarmActors','this.work.update(state,options);'],
 'worker-audio':['updateFarmActors','this.workers.update(state,options);'],
 'animal-audio':['updateAnimals','this.animals.update(state,options);'],
 'raid-arrival-audio':['updateAnimals','this.raidArrival.update(state);'],
 'power-ready-audio':['updateUnlocks','this.powerReady.update(state);'],
 'unlock-audio':['updateUnlocks','this.unlocks.update(state);'],
 'guardian-audio':['guardianPhase','this.guardianAudio.observe(phase);'],
};
const uiMethods={ui_panel_open:'surface',ui_panel_close:'close',ui_tab:'surface',ui_error:'error',ui_pause:'pause',ui_resume:'pause',spirit_select:'selectSpell',spirit_touch:'guidedTouch',spirit_drag:'wallGesture',spirit_drop:'wallGesture',spirit_valid:'guidedPlacement'};
function chain(point,id){
 const module=point.file.split('/').at(-1).replace('.js','');
 if(module==='ui-audio')return [reference(app,'uiAudio.'+uiMethods[id]+'('),reference(app,'new UiAudio((id,options)=>audio.sound(id,options))')];
 if(module==='destruction-audio')return [reference('src/rendering/building-effects.js','pipeline.onDestructionCue?.('),reference(app,'world.destructionPass.onDestructionCue='),reference(audioFile,'destructionSounds(counts)')];
 if(adapters[module]){const [caller,bridge]=adapters[module];return [reference(app,'audio.'+caller+'('),reference(audioFile,bridge)];}
 const event=module==='structure-audio'?(point.trigger.startsWith('WallChainBuilt')?'WallChainBuilt':'StructureHit'):point.trigger.split(' ')[0];
 const producers=eventProducers.get(event)??[];for(const producer of producers)sourceFiles.add(producer.file);
 assert.ok(producers.length,'No logical event producer: '+event);
 const consumer=point.selector.includes('eventExtraSound')?'const extra=eventExtraSound[event.type]':point.selector.includes('eventAlertSound')||point.selector.includes('STRUCTURE_ALERT_SOUNDS')?'const alert=event.type===':point.selector.includes('eventRefundSound')?'const refund=eventRefundSound[event.type]':point.selector.includes('eventSpendSound')?'const spend=eventSpendSound[event.type]':point.selector.includes('STRUCTURE_DETAIL_SOUNDS')?'const detail=event.type===':'const id=event.type===';
 return [...producers,reference(app,'audio.process(state.events,'),reference(audioFile,consumer)];
}
const contextExceptions=new Set(['amb_wind_strong','step_wood','farm_hoe_dig','build_tool_hit']);
const contextEvidence={
 amb_wind_strong:{documents:['docs/qa/audio-buses/context-reservations.md'],sources:[reference('src/rendering/crop-batch.js','wind:{value:1}')],limitation:'No authoritative strong-wind transition; static shader breeze is not weather.'},
 step_wood:{documents:['docs/qa/audio-buses/context-reservations.md'],sources:[reference('src/world/navigation.js','p.slot>=18'),reference('src/rendering/scene.js','this.movementSurfaceAt=')],limitation:'movementSound accepts wood as an API variant, but the app surface resolver does not produce wood.'},
 farm_hoe_dig:{documents:['docs/qa/audio-buses/farm-markers.md'],sources:[reference('src/audio/farm-contact-audio.js',"if(phase==='initial')")],limitation:'Native initial care is Plant/Water, with hoe hidden; no new Dig phase is authorized.'},
 build_tool_hit:{documents:['docs/qa/repair-contact-reservation/README.md'],sources:[reference('src/simulation/game.js',"if(t.kind==='repair'){completeTask")],limitation:'Repair executes at arrival before an acting/Dig contact; source animation mapping alone is insufficient.'},
};
for(const entry of Object.values(contextEvidence))for(const file of entry.documents)sourceFiles.add(file);
const byteGroups=new Map();for(const item of bank.items){const ids=byteGroups.get(item.sha256)??[];ids.push(item.id);byteGroups.set(item.sha256,ids);}
const semanticAlternatives={movement_land:['npc_fall'],farm_crop_interact:['farm_sow','farm_harvest_pick'],beast_charge:['buffalo_charge','rhino_charge','warthog_charge'],beast_attack:['lion_attack','hyena_attack'],beast_vocal_neutral:['lion_neutral','hyena_neutral','buffalo_neutral','rhino_neutral','warthog_neutral'],beast_vocal_aggressive:['lion_aggressive','hyena_aggressive','buffalo_aggressive','rhino_aggressive','warthog_aggressive'],beast_retreat:['lion_retreat','hyena_retreat','buffalo_retreat','rhino_retreat','warthog_retreat'],spirit_move:['spirit_appear','spirit_disappear'],spirit_invalid:['ui_error'],ui_sell:['eco_crop_sold']};
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
  classification:connected?'assigned-compatible-source':contextExceptions.has(item.id)?'context-exception':proposal.integration_status==='Reserva documentada'?'scope-reserve':'unbound-alternative',
  runtimeUnused:!connected,audiblePlaybackVerified:false,
  runtimeChains:locations.map(point=>({assignment:point,callers:chain(point,item.id)})),
  sourceMentions:mentions.get(item.id)??[],
  byteDuplicates:(byteGroups.get(hash)??[]).filter(id=>id!==item.id),
  semanticAlternatives:semanticAlternatives[item.id]??[],
  contextEvidence:contextEvidence[item.id]??null,
  actionAssessment:connected?'Compatible proposal and guarded source route reviewed; caller evidence is static, not playback proof.':'No gameplay route; retained in Library. Context or alternative choice required, not an automatic missing assignment.',
  evidence:connected?'Code assignment and exact original bytes; this row does not prove audible playback.':'Original retained; no runtime assignment. Review the proposed context before binding.'};
});
const groups={};for(const row of rows){const key=row.planClass+' / '+row.runtimeStatus;(groups[key]??=[]).push(row.id);}
const classificationCounts=Object.fromEntries([...new Set(rows.map(row=>row.classification))].map(key=>[key,rows.filter(row=>row.classification===key).length]));
const sources=['public/content/sfx.json','public/content/sfx-routing.json','docs/plan/sfx_mapeo_implementacion.json','docs/plan/sfx_catalogo_extraido.json',...sourceFiles].sort();
const report={scope:'Complete 126-row catalogue/code/byte audit. No claim of playback, listening or completed pending bindings.',
 sourceHashes:Object.fromEntries(sources.map(path=>[path,sha(read(path))])),classificationCounts,byteDuplicateGroups:[...byteGroups.values()].filter(ids=>ids.length>1),total:126,assigned:points.size,unassigned:126-points.size,groups,rows};
const output=JSON.stringify(report,null,2)+'\n',folder=resolve(root,'docs/qa/sfx-catalog-post-jam');mkdirSync(folder,{recursive:true});
const target=resolve(folder,'inventory.json');
if(process.argv.includes('--check'))assert.equal(sha(readFileSync(target)),sha(Buffer.from(output)),'Catalogue audit is stale; regenerate and review it.');
else{
 writeFileSync(target,output);
 const escape=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
 const table=['# Barrido de los 126 SFX','',
  'Inventario completo de asignaciones de código y bytes originales. No acredita escucha ni la integración de los pendientes. Regenerar con `node tools/audit_sfx_catalog.mjs`; comprobar vigencia con `--check`.','',
  `Asignados: **${report.assigned}**. Sin asignar en gameplay: **${report.unassigned}**.`,
  `Clasificación: ${Object.entries(classificationCounts).map(([key,count])=>key+' '+count).join('; ')}. Duplicados por bytes: ${report.byteDuplicateGroups.length}. Alternativas semánticas no son duplicados de archivo.`, '',
  '| Nº | ID / nombre | Estado / clasificación | Acción prevista | Punto de código, llamada o contexto pendiente |','| --- | --- | --- | --- | --- |',
  ...rows.map(r=>`| ${String(r.number).padStart(3,'0')} | ${escape(r.id+' · '+r.name)} | ${r.classification} | ${escape(r.plannedAction)} | ${escape(r.codePoints.length?r.runtimeChains.map(chain=>chain.assignment.file+':'+chain.assignment.line+' → '+chain.assignment.trigger+' ← '+chain.callers.map(p=>p.file+':'+p.line).join(' ← ')).join('; '):r.pendingContext)} |`),
  '', 'Las alternativas y reservas restantes requieren su contexto correcto. No se crean lluvia, salud de animales, sacos o recompensas monetarias para que suenen tomas reservadas. Los usos compatibles pendientes deben recibir implementación y pruebas antes de cerrar la tarea.',''];
 writeFileSync(resolve(folder,'inventory.md'),table.join('\n'));
}
console.log(JSON.stringify({total:report.total,assigned:report.assigned,unassigned:report.unassigned,exactOriginalFiles:rows.length,stale:false}));
