// A lost device cannot produce the visible-ready frame awaited by the loader.
// Ignore intentional destruction during disposal, and report a real loss once.
export function observeLoadingDeviceLoss(device,{isClosed=()=>false,onError}={}){
 if(!device?.lost||typeof device.lost.then!=='function'||typeof isClosed!=='function'||typeof onError!=='function')throw TypeError('Invalid loading WebGPU device');
 let cancelled=false;
 Promise.resolve(device.lost).then(info=>{if(!cancelled&&!isClosed())onError(Error('WebGPU loading device lost: '+(info?.message||info?.reason||'unknown')));},error=>{if(!cancelled&&!isClosed())onError(Error('WebGPU loading device lost: '+(error?.message||'unknown')));});
 return ()=>{cancelled=true;};
}
