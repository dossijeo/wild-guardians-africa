import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import * as Game from '../../src/simulation/game.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {rational} from '../../src/simulation/money.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {prepareVillageIsolated} from '../../src/simulation/isolated-village-preflight.js';
import {WILD_ENGINE_WORLD_VERSION} from '../../src/world/wild-engine/world-version.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const opening=await createSpatialCampaignOpening({seed:712,biome:'desierto',culture:'suajili',slotId:'worker-village-audit'});
let browser;
try{
 const {state,nav,session,loaded,start}=opening;state.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;state.tutorial.step='done';state.initialPreparation=false;state.day=101;state.completedNights=100;state.result='victory';state.ledger.balance=rational(200000);Game.continuePostgame(state);Game.hire(state,'native-postgame-hire',{});
 const {x,z}=start.site.center,cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),jobs=new Map();for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++)jobs.set(`${cx+dx},${cz+dz}`,{cx:cx+dx,cz:cz+dz,score:Math.hypot(dx,dz)});session.stream.plan(jobs);await session.stream.whenIdle();
 const bounds=[x-120,z-120,x+120,z+120];nav.setActiveBounds(bounds);const site={x:94.64685702961343,z:43.466662183008076},payload=JSON.parse(await readFile('public/content/villages.json','utf8')).find(v=>v.id==='suajili'),source=serialize(state),module=new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm')),siteChunk=`${Math.floor((site.x+24)/48)},${Math.floor((site.z+24)/48)}`,chunks=[...loaded.keys()].filter(k=>k!==siteChunk),command={kind:'foundVillage',id:'worker-village',culture:'suajili',...site,payload},expected=prepareVillageIsolated(module,source,chunks,command,{bounds});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/tests/browser/simulation-authority-postgame.html');
 const result=await page.evaluate(async({source,chunks,bounds,command})=>{const {createSimulationAuthorityClient}=await import('/src/simulation/simulation-authority-client.js'),client=createSimulationAuthorityClient({snapshot:source,chunkKeys:chunks,navigationView:{bounds,eye:{x:0,z:0},target:{x:0,z:0}},session:'village-test'});try{await client.ready;const submit=async cmd=>{const r=client.submit(cmd);if(!r.accepted)throw Error('Admission failed');return r.result;};const first=await submit(command),second=await submit(command),bad=await submit({...command,id:'wrong-culture',culture:'mapungubwe'}),after=await submit({kind:'snapshot'});return {first,second,bad,after};}finally{client.dispose();}},{source,chunks,bounds,command});
 if(!result.first.value||result.first.snapshot!==expected.snapshot||JSON.stringify(result.first.events)!==JSON.stringify(expected.events)||!result.first.commandLoadedChunks?.includes(siteChunk)||result.second.value!==false||result.second.events.length||result.bad.value!==false||!result.bad.rejection||result.after.snapshot!==result.first.snapshot)throw Error('Worker village result mismatch');
 let ui=null;if(process.argv.includes('--ui')){
  await page.evaluate(async source=>{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js');await new BrowserSaveRepository(localStorage).save(JSON.parse(source));},source);
  await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/?qa-worker-game&qa-worker-clock&qa-worker-village&wildEngineThreads=0&qa-worker-load-slot=worker-village-audit',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game'||document.querySelector('.error-banner'),null,{timeout:180000});
  const startup=await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa?.(),error:document.querySelector('.error-banner')?.textContent}));if(startup.error||startup.qa?.screen!=='game')throw Error('UI startup failed: '+JSON.stringify(startup));
  const preview=await page.evaluate(point=>window.wildGuardiansWorkerVillageQa(point),site);if(!preview.valid)throw Error('UI preview rejected: '+JSON.stringify(preview));
  await page.locator('#found-village').click();const deadline=Date.now()+120000;while(!ui&&Date.now()<deadline){ui=await page.evaluate(async()=>{const {BrowserSaveRepository}=await import('/src/persistence/browser-saves.js');const saved=await new BrowserSaveRepository(localStorage).load('worker-village-audit');return saved?.villages.length===2?{villages:saved.villages.length,culture:saved.villages[1].culture,worker:window.wildGuardiansWorkerQa().status}:null;});if(!ui)await page.waitForTimeout(500);}
  if(!ui||ui.culture!=='suajili'||ui.worker?.fault)throw Error('UI village failed: '+JSON.stringify({ui,qa:await page.evaluate(()=>window.wildGuardiansWorkerQa()),error:await page.locator('.error-banner').allTextContents()}));
 }
 console.log(JSON.stringify({added:result.first.commandLoadedChunks,events:result.first.events.map(e=>e.type),duplicate:result.second.value,rejection:result.bad.rejection,ui,scope:'Synthetic desert postgame on a real browser Worker, comparing one village with isolated native result and a missing site chunk; optional real UI save. No active physics or full campaign.'}));
}finally{await browser?.close();opening.session.dispose();}
