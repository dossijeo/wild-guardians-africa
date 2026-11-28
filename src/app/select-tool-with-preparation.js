export function selectToolWithPreparation({select,prepare=null,isCurrent=()=>true,onError=()=>{}}){
 if(typeof select!=='function'||prepare!==null&&typeof prepare!=='function'||typeof isCurrent!=='function'||typeof onError!=='function')throw TypeError('Invalid tool preparation');
 select();
 if(!prepare)return;
 try{Promise.resolve(prepare()).catch(error=>{if(isCurrent())onError(error);});}catch(error){if(isCurrent())onError(error);}
}
