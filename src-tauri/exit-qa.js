// Opt-in packaged-app QA. Reports do not exit the app: only the actual menu
// Exit button can complete the native process check run by Windows CI.
(async()=>{
 if(window.__desktopExitQaStarted)return;window.__desktopExitQaStarted=true;
 const invoke=(command,args)=>window.__TAURI_INTERNALS__.invoke(command,args),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const report={ok:false,errors:[],checks:{}};
 addEventListener('error',e=>report.errors.push(e.message));addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason)));
 const until=async predicate=>{const end=performance.now()+300000;while(!predicate()){if(performance.now()>end)throw Error('Exit QA condition timed out');await wait(100);}};
 try{
  const {stage,fixture}=await invoke('desktop_exit_qa_config');report.stage=stage;
  if(!fixture.slotId.startsWith('qa-desktop-exit-'))throw Error('Unsafe QA slot');
  const read=async()=>{
   // Dist contains bundled modules, so the persisted bytes are read directly.
   return new Promise((resolve,reject)=>{const request=indexedDB.open('wild-guardians-saves',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('slots','readonly'),get=tx.objectStore('slots').get(fixture.slotId);let value;get.onsuccess=()=>value=get.result;tx.oncomplete=()=>{db.close();resolve(value?.primary);};tx.onabort=()=>reject(tx.error);};});
  };
  if(stage==='create')localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);
  else {const committed=await read();if(!committed)throw Error('Previous process save missing');report.checks.previous=JSON.parse(committed);}
  await until(()=>document.querySelector('#native-menu'));
  let menu=document.querySelector('#native-menu');
  const send=data=>dispatchEvent(new MessageEvent('message',{origin:location.origin,source:menu.contentWindow,data:{type:'wild-guardians:menu',...data}}));
  send({action:'settings-change',settings:{quality:'muy_baja',sfx:0,music:0}});send({action:'load-slot',slotId:fixture.slotId});
  await until(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false');
  document.querySelector('#menuButton').click();await until(()=>document.querySelector('#exit'));
  document.querySelector('#exit').click();await until(()=>document.querySelector('#native-menu'));
  const committed=JSON.parse(await read());report.checks.committed=committed;
  if(committed.slotId!==fixture.slotId)throw Error('Wrong committed slot');
  if(stage==='restore'){
   const previous=report.checks.previous;
   for(const key of ['ledger','structures','villages'])if(JSON.stringify(previous[key])!==JSON.stringify(committed[key]))throw Error('Native restart changed persisted '+key);
   const cropIdentity=s=>s.plants.map(p=>({id:p.id,species:p.species,x:p.x,z:p.z,alive:p.alive}));
   if(JSON.stringify(cropIdentity(previous))!==JSON.stringify(cropIdentity(committed)))throw Error('Native restart changed paid crop identity');
   // Growth, worker positions and the clock may advance normally between the
   // ready gate and opening the pause menu. They are recorded, not falsified.
   report.checks.restartRestored=true;
  }
  menu=document.querySelector('#native-menu');await until(()=>menu.contentDocument?.querySelector('#loading')?.style.display==='none'&&menu.contentDocument.querySelector('#hot-exit'));
  menu.contentDocument.querySelector('#hot-exit').click();await until(()=>menu.contentDocument?.querySelector('#exit-action')&&!menu.contentDocument.querySelector('#panelstage').inert);
  report.ok=report.errors.length===0;report.checks.exitButtonFound=true;
  await invoke('desktop_exit_qa_report',{report});
  menu.contentDocument.querySelector('#exit-action').click();
 }catch(error){report.errors.push(String(error));await invoke('desktop_exit_qa_report',{report});}
})();
