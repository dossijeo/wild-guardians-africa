// Owns a surface even when shutdown races its asynchronous creation. Closing
// never publishes the surface and resolves only after its disposal completes.
export function createWebGpuSurfaceOwner(){
 let pending=null,surface=null,closed=false,closing=null;const controller=new AbortController();
 return {
  get signal(){return controller.signal;},
  start(promise){if(closed||pending||surface||!promise||typeof promise.then!=='function')throw TypeError('Invalid surface initialization');pending=promise;return promise;},
  claim(value){if(closed)return false;if(!pending||!value||typeof value.dispose!=='function')throw TypeError('Invalid initialized surface');surface=value;pending=null;return true;},
  close(){if(closing)return closing;closed=true;controller.abort();const value=surface?Promise.resolve(surface):pending??Promise.resolve(null);surface=null;pending=null;closing=Promise.resolve(value).then(item=>item?.dispose(),()=>{});return closing;},
 };
}
