// A single exit operation owns persistence and the native request. Web callers
// retain the menu's existing farewell screen; no browser window.close attempt.
export function createDesktopExit({host=globalThis,save=async()=>true,hasGame=()=>false,onError=()=>{}}={}){
 let pending=null;
 return function exit(){
  const invoke=host.__TAURI_INTERNALS__?.invoke;
  if(typeof invoke!=='function')return Promise.resolve(false);
  if(pending)return pending;
  pending=(async()=>{
   try{
    if(hasGame()&&!await save())return false;
    await invoke('exit_application');return true;
   }catch(error){onError(error);return false;}
   finally{pending=null;}
  })();
  return pending;
 };
}
