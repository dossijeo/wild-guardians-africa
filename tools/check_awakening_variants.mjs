import {mkdir,writeFile} from 'node:fs/promises';
// A visual matrix, not an economic campaign: funding, maturity, clock and charges
// are prescribed explicitly; placement and blessing still use real commands.
export async function checkAwakeningVariants(page,out){
 await mkdir(out,{recursive:true});await page.setViewportSize({width:960,height:600});
 const catalog=await page.evaluate(async()=>{
  const {state:s}=globalThis.wildGuardiansSpatialQa(),{BALANCE:B}=await import('/src/simulation/balance.js'),{transact,rational}=await import('/src/simulation/money.js');
  transact(s.ledger,'qa-variant-funding',rational(1500));globalThis.variantAnchor={x:s.plants[0].x,z:s.plants[0].z};
  return {crops:B.crops.map(c=>c.id),walls:B.walls.map(w=>w.id)};
 });
 const records=[];
 const place=async(kind,key,growth=1,gate=false)=>page.evaluate(async({kind,key,growth,gate})=>{
  const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js'),{cropSpec}=await import('/src/simulation/rules.js');
  // Reuse a known open native plot, removing previous fixtures through real damage/removal paths.
  const {applyCropImpact}=await import('/src/simulation/crop-impact-health.js');
  s.pauses=[];s.time=120;
  for(const crop of s.plants.filter(p=>p.alive)){const hit=applyCropImpact(s,crop,10);G.emit(s,'CropHit',{targetId:crop.id,...hit});G.emit(s,'CropDestroyed',{targetId:crop.id});}
  for(const wall of s.structures.filter(p=>p.kind==='wall'))G.removeWall(s,'matrix-remove-'+wall.id,wall.id,w.nav);
  w.nav.setState(s);s.elapsed+=1;w.render(0);
  const anchor=globalThis.variantAnchor,p={x:anchor.x+(kind==='wall'?4.5:0),z:anchor.z};let target;
  if(kind==='crop'){G.plant(s,`matrix-${key}-${growth}`,key,p.x,p.z,w.nav);target=s.plants.at(-1);target.growth=cropSpec(key).growth_seconds*growth;for(const water of target.water)water.status='manual';}
  else if(G.placeStructure(s,`matrix-${key}-${gate}`,{kind:'wall',material:key,gate,...p},w.nav))target=s.structures.at(-1);
  if(!target)throw Error('No native variant site: '+key);s.pauses=['qa-visual'];
  const y=w.nav.field.surface(target.x,target.z),height=kind==='crop'?w.cropBatch.sample(key,target.growth).height:2,distance=Math.max(4,height*3.5);
  w.controls.target.set(target.x,y+height*.4,target.z);w.camera.position.set(target.x+distance*.62,y+distance*.55,target.z+distance);
  globalThis.__wildSpellFrameManual=false;w.syncChunks();await w.whenChunksReady();globalThis.__wildSpellFrameManual=true;w.render(0);
  return {id:target.id,key,kind,growth,gate,x:target.x,z:target.z};
 },{kind,key,growth,gate});
 const bless=async target=>page.evaluate(async id=>{const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js');s.pauses=[];s.time=120;s.awakenings.progress=100;G.bless(s,'matrix-bless-'+id,id);s.pauses=['qa-visual'];w.render(0);s.elapsed+=5;},target.id);
 const shot=async(target,state,time)=>{
  const name=`${target.kind}-${target.key}${target.gate?'-gate':''}-${state}`;
  const metrics=await page.evaluate(time=>{const {state:s,world:w}=globalThis.wildGuardiansSpatialQa();s.time=time;w.render(0);return {calls:w.renderer.info.render.calls,roots:w.awakeningRoots.stats.bytes,sources:w.blessingVfx.sources.size};},time);
  await page.locator('canvas#world').screenshot({path:`${out}/${name}.png`});records.push({...target,name,time,...metrics});console.log('AWAKENING_VARIANT '+name);
  await writeFile(`${out}/variants.json`,JSON.stringify({catalog,records,scope:'Real native renderer, paid placement with explicit +1500 QA funding, prescribed maturity/clock/charges. Not campaign or economy evidence.'},null,2)+'\n');
 };
 for(const species of catalog.crops){
  const mature=await place('crop',species);await shot(mature,'normal-day',120);await bless(mature);await shot(mature,'blessed-day',120);await shot(mature,'blessed-night',420);
  const young=await place('crop',species,.42);await bless(young);await shot(young,'young-day',120);await shot(young,'young-night',420);
 }
 for(const material of catalog.walls){
  const wall=await place('wall',material);await shot(wall,'normal-day',120);await bless(wall);await shot(wall,'blessed-day',120);await shot(wall,'blessed-night',420);
  await page.evaluate(async id=>{const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),wall=s.structures.find(p=>p.id===id),{recordWallPresentation}=await import('/src/simulation/structure-presentation.js');wall.hp=wall.maxHp*.65;recordWallPresentation(wall,1,s.elapsed);s.elapsed+=.6;w.render(0);let visual;w.scene.traverse(o=>{if(o.userData.nativeWall&&o.entityId===id)visual=o.visual;});if(!Number.isFinite(visual)||Math.abs(visual-.65)>.001)throw Error('Damaged wall pose did not settle: '+visual);},wall.id);await shot(wall,'damaged-night',420);
  const gate=await place('wall',material,1,true);await bless(gate);await shot(gate,'closed-night',420);
  await page.evaluate(id=>{const {state:s}=globalThis.wildGuardiansSpatialQa();s.structures.find(p=>p.id===id).gateOpen=1;},gate.id);await shot(gate,'open-night',420);
 }
 const html='<!doctype html><meta charset="utf-8"><title>Despertares: todas las variantes</title><style>body{background:#111c19;color:#efeedb;font:16px system-ui;margin:20px}section{margin:24px 0}h2{margin:0 0 10px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}figure{margin:0;background:#20332c}img{width:100%;display:block}figcaption{padding:8px}</style><h1>Cultivos y murallas: comprobación visual</h1><p>Capturas reales, día y noche; modelo original conservado. Los estados de crecimiento, daño y carga son prescritos para QA.</p>'+['crop','wall'].flatMap(kind=>(kind==='crop'?catalog.crops:catalog.walls).map(key=>`<section id="${kind}-${key}"><h2>${key}</h2><div class="grid">${records.filter(r=>r.kind===kind&&r.key===key).map(r=>`<figure><img src="${r.name}.png"><figcaption>${r.name}</figcaption></figure>`).join('')}</div></section>`)).join('');
 await writeFile(`${out}/index.html`,html);return {catalog,captures:records.length};
}
