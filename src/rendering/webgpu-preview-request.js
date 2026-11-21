// Preview failures are presentation failures, not simulation failures. The
// authority may still accept or reject the already submitted command.
export function runWebGpuPreview({resource,begin,report}){
 if(typeof resource!=='string'||!resource||typeof begin!=='function'||typeof report!=='function')throw TypeError('Invalid preview request');
 try{if(begin()!==true)throw Error('Preview unavailable');return true;}
 catch(error){report({resource,message:String(error?.message??error)});return false;}
}
