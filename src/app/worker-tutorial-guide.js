// A guide uses only a versioned graphical context and a target recomputed by
// the authority. Visibility remains unknown until a rendered visibility test
// is available; this controller never changes the tutorial pause.
export function createWorkerTutorialGuide({client,runtime,isCurrent=()=>true,keyNow,heightsCurrent=inputs=>Array.isArray(inputs)&&inputs.length===0,exclusions=()=>[],onConfig=()=>{},clock=()=>performance.now(),trackRevision=false}={}){
 if(!client||!runtime||typeof isCurrent!=='function'||typeof keyNow!=='function'||typeof heightsCurrent!=='function'||typeof exclusions!=='function'||typeof onConfig!=='function'||typeof clock!=='function'||typeof trackRevision!=='boolean')throw TypeError('Invalid tutorial guide controller');
 let key=null,sceneKey=null,generation=0,attempts=0,lastAttempt=-Infinity,stableSince=clock(),pending=false,active=false,closed=false,heightInputs=[],activeRevision=null,subscribed=false;
 const sameScene=(a,b)=>a&&b&&['terrainGeneration','selectableGeneration','cameraVersion','viewportVersion'].every(k=>a[k]===b[k]);
 function unsubscribe(){if(trackRevision&&subscribed){subscribed=false;Promise.resolve().then(()=>runtime.submit({kind:'tutorialGuideTarget',trackGuideRevision:false})).catch(()=>{});}}
 function clear(){generation++;active=false;heightInputs=[];activeRevision=null;client.clearGuardianGuide();onConfig(null);unsubscribe();}
 function valid(token,expected){return !closed&&generation===token&&isCurrent()&&keyNow()===expected;}
 return {
  update({key:next,toolKind,toolSpell=null}={}){
   if(closed)return;const frame=client.guardianFrame(),nextScene=frame?JSON.stringify([frame.terrainGeneration,frame.selectableGeneration,frame.cameraVersion,frame.viewportVersion??0]):null;
   if(next!==key||nextScene!==sceneKey||active&&(trackRevision?runtime.status().tutorialGuideRevision!==activeRevision:!heightsCurrent(heightInputs))){if(key!==null||sceneKey!==null)clear();key=next;sceneKey=nextScene;attempts=0;stableSince=clock();}
   if(!key||!frame||pending||active||attempts>=3||clock()-stableSince<250||clock()-lastAttempt<1000)return;
   pending=true;attempts++;lastAttempt=clock();const token=generation,expected=key;
   Promise.resolve().then(()=>client.guardianContext()).then(async({context,frame:captured})=>{
    if(!valid(token,expected)||runtime.status().confirmedSequence!==captured.sequence)throw Error('Stale tutorial guide');
    if(trackRevision)subscribed=true;const result=await runtime.submit({kind:'tutorialGuideTarget',toolKind,toolSpell,...(trackRevision?{trackGuideRevision:true}:{}),guardianContext:{...context,exclusions:exclusions()}});
    if(!valid(token,expected)||runtime.status().confirmedSequence!==result.sequence||result.rejection)throw Error('Stale tutorial guide');
    const config=result.value,revision=result.tutorialGuideRevision;if(!config?.origin||!Array.isArray(config.position)||!Array.isArray(config.cropHeightInputs)||(trackRevision?(!Number.isSafeInteger(revision)||runtime.status().tutorialGuideRevision!==revision):!heightsCurrent(config.cropHeightInputs))){unsubscribe();return;}
    const current=client.guardianFrame();if(!sameScene(captured,current)||![captured.sequence,result.sequence].includes(current.sequence))throw Error('Stale tutorial guide');
    await client.verifyGuardianFrame(current);if(!valid(token,expected)||runtime.status().confirmedSequence!==result.sequence||trackRevision&&runtime.status().tutorialGuideRevision!==revision)throw Error('Stale tutorial guide');
    const camera=context.camera?.position;if(!Array.isArray(camera)||camera.length!==3)throw Error('Invalid tutorial camera');
    await client.setGuardianGuide({origin:config.origin,target:config.position,camera:{x:camera[0],y:camera[1],z:camera[2]}},current);
    if(!valid(token,expected)||runtime.status().confirmedSequence!==result.sequence||(trackRevision?runtime.status().tutorialGuideRevision!==revision:!heightsCurrent(config.cropHeightInputs))){client.clearGuardianGuide();unsubscribe();return;}heightInputs=config.cropHeightInputs;activeRevision=trackRevision?revision:null;active=true;onConfig(config);
   }).catch(()=>{if(generation===token&&!active)unsubscribe();}).finally(()=>{pending=false;});
  },
  dispose(){if(closed)return;closed=true;clear();},
 };
}
