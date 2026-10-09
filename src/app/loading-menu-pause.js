// Opt-in diagnostic: use the menu's existing pause API only at definitive start.
// The closure holds only a WeakRef, never an iframe/window/API after detachment.
function releasePause(reference,getFrame){
 let released=false;
 return()=>{if(released)return;released=true;try{const frame=getFrame();if(frame?.isConnected&&frame===reference.deref())frame.contentWindow?.WildGuardiansMenu?.setRenderPaused?.(false);}catch{}};
}
export function pauseLoadingMenu(getFrame,{enabled=false}={}){
 if(!enabled)return()=>{};
 try{const frame=getFrame();if(!frame?.isConnected)return()=>{};const menu=frame.contentWindow?.WildGuardiansMenu;if(typeof menu?.setRenderPaused!=='function')return()=>{};const restore=releasePause(new WeakRef(frame),getFrame);try{menu.setRenderPaused(true);}catch{restore();return()=>{};}return restore;}catch{return()=>{};}
}
