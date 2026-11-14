// A failed optional resource must reject its own request, not retire the
// presentation Worker. Fatal renderer errors are reported independently by
// the renderer owner; late results are discarded when that owner closes.
export async function respondToWebGpuPreparation({id,kind,prepare,send,isOpen}){
 if(!Number.isSafeInteger(id)||id<1||!['guardian','structure','crop'].includes(kind)||typeof prepare!=='function'||typeof send!=='function'||typeof isOpen!=='function')throw TypeError('Invalid preparation request');
 let response;try{await prepare();response={kind:kind+'PrepareResult',id};}catch(error){response={kind:kind+'PrepareError',id,message:String(error?.message??error)};}
 if(isOpen())send(response);
}
