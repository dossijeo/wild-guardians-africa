import {noiseSpatialPoses,compareNoisePixels} from './noise-spatial-metrics.js';
import {withRenderOrigin,renderOriginBounds} from '../../src/rendering/render-origin.js';

// Opt-in native QA attached to the existing authored visual fixture. No game
// imports use this module; no performance queries or simulation ticks here.
export function installNoiseSpatialReview(getWorld,volume){
  const panel=document.createElement('details');panel.id='noise-spatial-panel';
  panel.style.cssText='position:absolute;right:8px;bottom:8px;z-index:4;max-width:44vw;max-height:50vh;overflow:auto;background:#fff9ed;padding:8px';
  panel.innerHTML='<summary>QA ruido fino · regiones</summary><p>Escena visual controlada. A/A/B/B/A, sin avanzar simulación. Informe describe diferencias; no aprobación automática ni benchmark.</p><button id="noise-spatial-run">Comparar 20 vistas × 3 fases</button> <label>Vista <select id="noise-spatial-pose"></select></label> <label>Luz <select id="noise-spatial-phase"><option value="day">Día</option><option value="dusk">Transición</option><option value="night">Noche</option></select></label> <label>Ruido <select id="noise-spatial-recipe"><option value="0">Analítico</option><option value="1">Volumen</option></select></label> <button id="noise-spatial-view">Mostrar vista</button> <button id="noise-spatial-close">Cerrar mundo QA</button><p id="noise-spatial-status">Sin ejecutar</p><pre id="noise-spatial-report" style="font-size:10px;white-space:pre-wrap"></pre>';
  document.body.append(panel);
  const repeatButton=document.createElement('button');repeatButton.id='noise-spatial-repeat';repeatButton.textContent='Diagnóstico: repetir mundo / solo dibujo';panel.querySelector('p').after(repeatButton);
  const element=id=>document.getElementById(`noise-spatial-${id}`);
  const phaseTimes={day:150,dusk:300+Math.log(2)/2.4,night:350};
  const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  let busy=false,poses=[],result=null;
  function available(){const world=getWorld();if(!world||world.disposed)throw Error('World unavailable');return world;}
  function refresh(world){
    poses=noiseSpatialPoses(world.state);element('pose').replaceChildren(...poses.map((pose,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=pose.id;return option;}));
  }
  function assert(condition,message){if(!condition)throw Error(message);}
  function publish(){element('report').textContent=JSON.stringify(result,null,2);}
  async function setPose(world,pose,phase){
    const y=world.nav.field.surface(pose.x,pose.z);
    world.controls.target.set(pose.x,y+pose.aim,pose.z);
    world.camera.position.set(pose.x+pose.offset[0],y+pose.offset[1],pose.z+pose.offset[2]);
    world.controls.update();world.updateCamera();world.syncChunks();
    await world.whenChunksReady();
    assert(world===getWorld()&&!world.disposed,'World replaced during QA');
    world.state.time=phaseTimes[phase];volume.apply(world.scene);
    for(let warm=0;warm<4;warm++){await raf();world.render(0);volume.apply(world.scene);}
  }
  function capture(world){
    const gl=world.renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
    const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    assert(gl.getError()===gl.NO_ERROR,'WebGL readback error');
    return {pixels,width,height,calls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles};
  }
  function lock(){const controls=[...document.querySelectorAll('button,input,select')].map(node=>[node,node.disabled]);for(const [node] of controls)node.disabled=true;return()=>{for(const [node,disabled] of controls)if(node.isConnected)node.disabled=disabled;};}
  element('repeat').onclick=async()=>{
    if(busy)return;busy=true;const unlock=lock();let world,updateCamera;
    try{
      world=available();await world.whenChunksReady();world.render(0);volume.apply(world.scene);
      for(let i=0;i<4;i++){await raf();world.render(0);}
      const before=JSON.stringify(world.state);updateCamera=world.updateCamera;world.updateCamera=()=>{};
      const onlyDraw=()=>withRenderOrigin({scene:world.scene,camera:world.camera,origin:world.renderOrigin,detached:[world.assetGroups.shadowRoot],minMax:()=>renderOriginBounds(world.scene),minSize:()=>[world.contacts.uniforms.uContactBounds.value,...world.terrainMeshes.map(m=>m.material.userData.biomeGround?.uGroundRect.value).filter(Boolean)]},()=>{
        const autoClear=world.renderer.autoClear;try{world.renderer.autoClear=false;world.renderer.clear();world.sky.render(world.renderer,world.camera,world.state);world.renderer.render(world.scene,world.camera);}finally{world.renderer.autoClear=autoClear;}
      });
      result={scope:'Diagnostic world updates versus repeated sky/color drawing with effective camera fixed. Only-draw excludes WorldScene effect/depth/smoke preparation and entity/material/light updates. Not a pixel-equivalent production render replacement or benchmark.',biome:world.state.biome,culture:world.state.culture,elapsed:world.state.elapsed,enabled:volume.uniforms.uFineNoiseVolumeEnabled.value,rows:[],errors:[],completed:false};
      let previous=null;
      for(const mode of ['world','only-draw'])for(let i=0;i<12;i++){
        await raf();if(mode==='world')world.render(0);else onlyDraw();
        const frame=capture(world),sha256=await hash(frame.pixels);
        assert(JSON.stringify(world.state)===before,'Diagnostic changed logical state');
        result.rows.push({mode,index:i,sha256,cameraMatrix:world.camera.matrixWorld.elements.slice(),calls:frame.calls,triangles:frame.triangles,difference:previous?compareNoisePixels(previous.pixels,frame.pixels,frame.width,frame.height):null});
        previous=frame;publish();element('status').textContent=`Repetición ${mode} ${i+1}/12`;
      }
      // Read exactly the same freshly rendered buffer synchronously: no RAF,
      // hash promise, shader draw or scene update between these readbacks.
      // This distinguishes readback variability from actual rendering changes.
      world.render(0);const reads=Array.from({length:12},()=>capture(world));
      for(let i=0;i<reads.length;i++){
        const frame=reads[i];result.rows.push({mode:'same-buffer-read',index:i,sha256:await hash(frame.pixels),calls:frame.calls,triangles:frame.triangles,difference:i?compareNoisePixels(reads[0].pixels,frame.pixels,frame.width,frame.height):null});
      }
      result.completed=true;result.logicalStateUnchanged=JSON.stringify(world.state)===before;publish();element('status').textContent='Diagnóstico terminado · revisar controles, lectura y transición de ruta';
    }catch(error){result??={rows:[],errors:[]};result.errors.push(String(error.stack??error));publish();element('status').textContent='Error diagnóstico · revisar informe';}
    finally{if(world&&updateCamera)world.updateCamera=updateCamera;unlock();busy=false;}
  };
  element('run').onclick=async()=>{
    if(busy)return;busy=true;const unlock=lock();let world,saved;
    try{
      world=available();world.sync(0);
      await Promise.all([...world.objects.values()].map(object=>object.userData.actorReady).filter(Boolean));
      assert(world.actorsReady(),'Authored worker/animal rigs are not ready');refresh(world);
      saved={eye:world.camera.position.clone(),target:world.controls.target.clone(),damping:world.controls.enableDamping,time:world.state.time,enabled:volume.uniforms.uFineNoiseVolumeEnabled.value};
      world.controls.enableDamping=false;
      const original=JSON.stringify(world.state);
      result={scope:'Native authored WorldScene visual QA, analytic versus periodic R8 volume within the same QA-wrapped shader program. Twenty views, three light phases, fixed elapsed and A/A/B/B/A per view. This does not prove fallback pixel equivalence to the unmodified production shader. Shader differences intentionally permitted; metrics are descriptive, no quality gate, GPU/CPU benchmark, mobile or gameplay acceptance.',biome:world.state.biome,culture:world.state.culture,seed:world.state.seed,quality:world.quality,textureBytes:volume.texture.image.data.byteLength,rows:[],errors:[],completed:false};publish();
      for(const phase of Object.keys(phaseTimes))for(const pose of poses){
        await setPose(world,pose,phase);
        const before=JSON.stringify(world.state),frames=[],updateCamera=world.updateCamera;
        // Resolve terrain/orbit protection once above, then keep the effective
        // eye exactly fixed while comparing shaders. Re-solving spherical orbit
        // coordinates is presentation work, not part of this shader experiment.
        // Preserve actual per-frame matrices for diagnosis; don't hide any other
        // animation, lighting, shadow or material variation behind this control.
        world.updateCamera=()=>{};
        try{
          for(const [label,enabled] of [['A1',0],['A2',0],['B1',1],['B2',1],['A3',0]]){
            volume.uniforms.uFineNoiseVolumeEnabled.value=enabled;
            await raf();world.render(0);const frame=capture(world);
            assert(JSON.stringify(world.state)===before,'Render changed logical state');
            frames.push({label,enabled,...frame,camera:world.camera.position.toArray(),target:world.controls.target.toArray(),cameraMatrix:world.camera.matrixWorld.elements.slice(),sha256:await hash(frame.pixels)});
          }
        }finally{world.updateCamera=updateCamera;}
        const {width,height}=frames[0];assert(frames.every(frame=>frame.width===width&&frame.height===height),'Viewport changed during comparison');
        const comparisons=[[0,1],[1,2],[2,3],[3,4],[1,4]].map(([a,b])=>({from:frames[a].label,to:frames[b].label,...compareNoisePixels(frames[a].pixels,frames[b].pixels,width,height)}));
        result.rows.push({pose,phase,fixedEffectiveCamera:true,night:world.toon.uniforms.uNight.value,elapsed:world.state.elapsed,camera:world.camera.position.toArray(),target:world.controls.target.toArray(),renderOrigin:{x:world.renderOrigin.x,z:world.renderOrigin.z},width,height,stateSha256:await hash(new TextEncoder().encode(before)),frames:frames.map(({pixels,...frame})=>frame),comparisons});
        element('status').textContent=`${result.rows.length}/60 · ${phase} · ${pose.id}`;publish();
      }
      world.state.time=saved.time;assert(JSON.stringify(world.state)===original,'QA changed state beyond explicit temporary light phase');
      result.completed=true;result.logicalStateRestored=true;result.patchedPrograms=volume.patched;publish();element('status').textContent='Comparación terminada · 60 vistas; inspección visual pendiente';
    }catch(error){result??={rows:[],errors:[]};result.errors.push(String(error.stack??error));publish();element('status').textContent='Error · revisar informe';}
    finally{if(world&&saved&&world===getWorld()&&!world.disposed){world.state.time=saved.time;world.controls.enableDamping=saved.damping;world.camera.position.copy(saved.eye);world.controls.target.copy(saved.target);world.controls.update();volume.uniforms.uFineNoiseVolumeEnabled.value=saved.enabled;world.render(0);}unlock();busy=false;}
  };
  element('view').onclick=async()=>{
    if(busy)return;busy=true;const unlock=lock();
    try{const world=available();if(!poses.length)refresh(world);const damping=world.controls.enableDamping;world.controls.enableDamping=false;try{const index=Number(element('pose').value),phase=element('phase').value;volume.uniforms.uFineNoiseVolumeEnabled.value=Number(element('recipe').value);await setPose(world,poses[index],phase);element('status').textContent=`Vista ${poses[index].id} / ${phase} / ${element('recipe').value==='1'?'volumen':'analítico'} · escena estática, no gameplay`;}finally{world.controls.enableDamping=damping;}}
    catch(error){element('status').textContent=String(error);}finally{unlock();busy=false;}
  };
  element('close').onclick=()=>{if(!busy){getWorld()?.dispose();volume.dispose();element('status').textContent='Mundo cerrado';}};
  return {panel,get result(){return result;}};
}
