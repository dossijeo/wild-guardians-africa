import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';

const origin=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const browser=await chromium.launch({channel:'chrome',headless:true});
let report;
try{
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await page.goto(`${origin}/tests/browser/african-toon.html?case=1&q=media&visualLab=global-grass&visualLabReference=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:120000});
  report=await page.evaluate(async()=>{
    const {world,state,emit}=window.qaVisualReference,details=world.groundDetails;
    const positions=[...details.chunks.values()].flat();
    const site=positions.find(p=>state.plants.every(crop=>(p.x-crop.x)**2+(p.z-crop.z)**2>45));
    if(!site)throw Error('No free detail site in controlled scene');
    const targetKey=[...details.chunks].find(([,items])=>items.includes(site))[0];
    const before=JSON.stringify(details.chunks.get(targetKey));
    const crop={...state.plants[0],id:'visual-event-probe',x:site.x,z:site.z,alive:true};
    state.plants.push(crop);
    emit(state,'CropPlaced',{targetId:crop.id});
    const pendingAfterPlacement=details.dirtyChunks.size;
    world.sync(0);
    const cleared=[...details.chunks.values()].flat().every(p=>(p.x-site.x)**2+(p.z-site.z)**2>=1.8**2);
    const pendingAfterSync=details.dirtyChunks.size;
    const afterPlaceNear=[...details.chunks.values()].flat().filter(p=>(p.x-site.x)**2+(p.z-site.z)**2<1.8**2).length;
    crop.alive=false;
    emit(state,'CropPicked',{targetId:crop.id});
    world.sync(0);
    const regenerated=JSON.stringify(details.chunks.get(targetKey))===before;
    const wallTemplate=state.structures.find(item=>item.kind==='wall');
    const wall={...wallTemplate,id:'visual-event-wall',x:site.x,z:site.z};
    state.structures.push(wall);
    emit(state,'PlacementCommitted',{kind:'wall',targetId:wall.id});
    world.sync(0);
    const wallCleared=[...details.chunks.values()].flat().every(p=>(p.x-site.x)**2+(p.z-site.z)**2>=1.45**2);
    state.structures=state.structures.filter(item=>item.id!==wall.id);
    emit(state,'WallRemoved',{targetId:wall.id});
    world.sync(0);
    const wallRegenerated=JSON.stringify(details.chunks.get(targetKey))===before;
    if(!cleared||!regenerated||!wallCleared||!wallRegenerated)throw Error('Confirmed event left stale visual ground detail');
    return {initialInstances:positions.length,enabled:details.enabled,subscribed:Boolean(details.releaseEvents),pendingAfterPlacement,pendingAfterSync,afterPlaceNear,cleared,regenerated,wallCleared,wallRegenerated,refreshStats:details.refreshStats};
  });
  await page.close();
}finally{await browser.close();}
await writeFile('docs/qa/global-visual-lab/ground-detail-browser-event-qa.json',JSON.stringify({origin,scenario:'WorldScene real WebGL fixture; confirmed-style CropPlaced/CropPicked events injected into controlled state; same resident chunks',...report},null,2)+'\n');
console.log(report);
