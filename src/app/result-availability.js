// Shared by both graphical backends; the simulation remains the owner of the
// result and the UI only opens or restores the corresponding dialog.
export function renderResultAvailability({state,surfaces,stage,document,openResult,runSafe}){
 if(state.result&&!state.tutorial.reading&&surfaces.shouldOpen('result'))openResult();
 const pending=state.pauses.includes('hiring')?'hiring':state.result?'result':null;let reopen=document.querySelector('#reopen-dialog');
 if(pending&&surfaces.deferred.has(pending)&&!surfaces.active){
  if(!reopen){reopen=document.createElement(pending==='hiring'?'span':'button');reopen.id='reopen-dialog';stage.append(reopen);}
  reopen.textContent=pending==='hiring'?'Toca el terreno para continuar la contratación.':'Resultado · Abrir';reopen.onclick=pending==='hiring'?null:()=>runSafe(openResult);
 }else reopen?.remove();
}
