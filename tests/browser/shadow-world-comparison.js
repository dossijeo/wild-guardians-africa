import * as THREE from 'three';
import {updateObstructions} from '../../src/rendering/obstruction.js';

// Readbacks intentionally synchronize the GPU. This is image acceptance, not a
// frametime benchmark, and freezes presentation and simulation for each pair.
export function installShadowWorldComparison(getWorld){
 const button=document.createElement('button');button.id='shadowWorldCompare';button.textContent='Comparar sombras del mundo nativo (QA)';
 const output=document.createElement('pre');output.id='shadowWorldReport';output.style.cssText='white-space:pre-wrap;max-height:45vh;overflow:auto;background:#fff9ed';
 document.querySelector('#qaControls').append(button,output);
 button.onclick=async()=>{
  const world=getWorld(),cache=world.releaseNativeShadow.cache,controls=world.controls,rows=[];let colorTarget=null;
  const singleTarget=new URL(document.URL).searchParams.get('shadow-readback')==='single';
  const previous={eye:world.camera.position.clone(),target:controls.target.clone(),damping:controls.enableDamping,time:world.state.time,ratio:world.pixelRatioLimit,obstruction:world.obstructionEnabled,cache:cache.enabled};
  const center=world.state.structures.find(s=>s.kind==='center'),health={hp:center.hp,status:center.status,collapseRemaining:center.collapseRemaining};
  const buttons=[...document.querySelectorAll('button,select,input')];buttons.forEach(b=>b.disabled=true);
  const compare=(a,b)=>{let different=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])different++;return different;};
  const imageDifference=(a,b)=>{let differentBytes=0,max=0;const bounds=[Infinity,Infinity,-1,-1],width=world.renderer.getContext().drawingBufferWidth;for(let i=0;i<a.length;i++)if(a[i]!==b[i]){differentBytes++;max=Math.max(max,Math.abs(a[i]-b[i]));const pixel=Math.floor(i/4),x=pixel%width,y=Math.floor(pixel/width);bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}return {differentBytes,max,bounds:differentBytes?bounds:null};};
  const depth=()=>{const map=world.sun.shadow.map,data=new Uint8Array(map.width*map.height*4);world.renderer.readRenderTargetPixels(map,0,0,map.width,map.height,data);return data;};
  const color=()=>{const gl=world.renderer.getContext(),data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);if(colorTarget)world.renderer.readRenderTargetPixels(colorTarget,0,0,colorTarget.width,colorTarget.height,data);else gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
  try{
   controls.enableDamping=false;world.pixelRatioLimit=.6;world.obstructionEnabled=false;cache.enabled=true;world.raidCamera?.beginManual();
   if(singleTarget){world.resize();colorTarget=new THREE.WebGLRenderTarget(world.renderResolution.width,world.renderResolution.height,{samples:0});colorTarget.texture.colorSpace=THREE.SRGBColorSpace;world.renderer.setRenderTarget(colorTarget);}
   world.sync(0);await Promise.all([...world.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));
   if(!world.actorsReady())throw Error('Native worker/animal rigs not ready');
   for(const damage of [0,.45,.8]){
    center.hp=center.maxHp*(1-damage);center.status='intact';center.collapseRemaining=0;
    for(const time of [150,350])for(const focus of ['center','crops'])for(const angle of [0,Math.PI/2,Math.PI]){
     world.state.time=time;const x=center.x+(focus==='crops'?30:0),z=center.z+(focus==='crops'?13:3),y=world.nav.field.surface(x,z);
     controls.target.set(x,y+1,z);world.camera.position.set(x+Math.sin(angle)*30,y+16,z+Math.cos(angle)*30);controls.update();
     world.updateCamera();world.syncChunks();await world.whenChunksReady();
     updateObstructions(world.chunks,world.camera,controls.target,0,{enabled:false,snap:true});
     world.render(0);world.render(0);
     const before={...cache.stats},pose=[...world.camera.position.toArray(),...controls.target.toArray()],view=world.camera.matrixWorldInverse.elements.slice();
     world.render(0);const cachedDepth=depth(),cachedColor=color(),after={...cache.stats};
     world.render(0);const cachedRepeat=color();
     world.renderer.shadowMap.needsUpdate=true;world.render(0);const forcedDepth=depth(),forcedColor=color();
     world.renderer.shadowMap.needsUpdate=true;world.render(0);const forcedRepeat=color();
     const row={damage,time,focus,angle,cacheHits:after.hits-before.hits,cacheDraws:after.draws-before.draws,untracked:after.untracked-before.untracked,depthDifferentBytes:compare(cachedDepth,forcedDepth),colorDifferentBytes:compare(cachedColor,forcedColor),cachedControl:imageDifference(cachedColor,cachedRepeat),forcedControl:imageDifference(forcedColor,forcedRepeat),cachedVsForced:imageDifference(cachedColor,forcedColor),poseStable:JSON.stringify(pose)===JSON.stringify([...world.camera.position.toArray(),...controls.target.toArray()]),viewMatrixStable:view.every((v,i)=>Object.is(v,world.camera.matrixWorldInverse.elements[i])),viewMatrixMaxDelta:Math.max(...view.map((v,i)=>Math.abs(v-world.camera.matrixWorldInverse.elements[i]))),glError:world.renderer.getContext().getError()};
     rows.push(row);output.textContent=JSON.stringify({running:true,rows},null,2);
     if(row.depthDifferentBytes||!row.poseStable||!row.viewMatrixStable||row.glError)throw Error('Native depth or camera differs');
     await new Promise(resolve=>requestAnimationFrame(resolve));
    }
   }
   if(!rows.some(row=>row.cacheHits))throw Error('No native shadow cache reuse observed');
   const exactColor=rows.every(row=>row.colorDifferentBytes===0),controlVariation=rows.some(row=>row.cachedControl.differentBytes||row.forcedControl.differentBytes);
   output.textContent=JSON.stringify({passed:exactColor,depthPassed:true,exactColorPassed:exactColor,controlVariation,singleSampleTarget:singleTarget,biome:world.state.biome,culture:world.state.culture,rows,rigs:world.mixers.size,plants:world.state.plants.length,walls:world.state.structures.filter(s=>s.kind==='wall').length,quality:world.quality,canvas:[world.renderResolution.width,world.renderResolution.height],scope:'Original GLB rigs, procedural crops, walls and native destruction shader; 36 fixed-pose day/night readback pairs, three damage states. Optional single-sample SRGB target is QA only. Color equality remains unproven if controls vary. Synchronizing image test, not performance or physical mobile acceptance.'},null,2);
  }catch(error){output.textContent=JSON.stringify({passed:false,rows,error:String(error.stack??error)},null,2);}
  finally{
   world.renderer.setRenderTarget(null);colorTarget?.dispose();Object.assign(center,health);world.state.time=previous.time;world.pixelRatioLimit=previous.ratio;world.obstructionEnabled=previous.obstruction;cache.enabled=previous.cache;controls.enableDamping=previous.damping;controls.target.copy(previous.target);world.camera.position.copy(previous.eye);controls.update();cache.invalidate();world.render(0);buttons.forEach(b=>b.disabled=false);
  }
 };
}
