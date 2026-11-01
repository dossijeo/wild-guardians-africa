// Diagnostic ordering gate. A failed operation never advances its version.
export function createWorldEventGate(session){
 if(typeof session!=='string'||!session)throw TypeError('Invalid session');let version=0;
 const check=message=>{if(!message||typeof message.session!=='string'||!Number.isSafeInteger(message.version)||message.version<0)throw TypeError('Invalid message');return message.session===session;};
 return {
  edit(message,apply){if(!check(message))return {accepted:false,reason:'session',version};if(message.version<=version)return {accepted:false,reason:'stale',version};if(message.version!==version+1)return {accepted:false,reason:'gap',version};const value=apply();version=message.version;return {accepted:true,version,value};},
  query(message,run){if(!check(message))return {accepted:false,reason:'session',version};if(message.version!==version)return {accepted:false,reason:message.version<version?'stale':'gap',version};return {accepted:true,version,value:run()};}
 };
}
