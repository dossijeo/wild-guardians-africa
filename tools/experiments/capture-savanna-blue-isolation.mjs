import {readFile,writeFile,unlink} from 'node:fs/promises';
const source=new URL('./check-spatial-thread-game.mjs',import.meta.url);
const temporary=new URL('./.qa-blue-isolation-generated.mjs',import.meta.url);
const anchor=" result.spatialFailures=await page.evaluate(()=>globalThis.qaSpatialFailures??null);";
const hook=" const isolateBase=process.env.WG_THREAD_REPORT.replace(/\\.json$/,'');\n await page.screenshot({path:isolateBase+'-before.png'});\n result.blueIsolation=await page.evaluate(()=>{\n const w=qaThreadWorld, groups=[...w.assetGroups.colors.entries()];\n const selected=groups.filter(([key])=>key.startsWith('8:')).map(([key,g])=>({key,mesh:g.mesh}));\n if(!selected.length)throw Error('No plant_02 color groups');\n const render=w.renderer.render.bind(w.renderer);\n w.renderer.render=function(...args){const states=selected.map(x=>x.mesh.visible);selected.forEach(x=>x.mesh.visible=false);try{return render(...args)}finally{selected.forEach((x,i)=>x.mesh.visible=states[i])}};\n return {selected:selected.map(x=>({key:x.key,uuid:x.mesh.uuid,count:x.mesh.count})),allKeys:groups.map(([key])=>key),elapsed:w.state.elapsed,camera:w.camera.position.toArray()};\n });\n await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));\n await page.screenshot({path:isolateBase+'-without-plant02.png'});\n";
const text=await readFile(source,'utf8');
if(text.split(anchor).length!==2)throw Error('Isolation anchor changed');
await writeFile(temporary,text.replace(anchor,hook+anchor),{flag:'wx'});
try{await import(temporary.href)}finally{await unlink(temporary)}
