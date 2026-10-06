// Successful exact queries shared only during one synchronous simulation tick.
// WeakMap identity isolates preview/dynamic navigators, including inherited ones.
const scopes=new WeakMap();
const MAX_ROUTES=128,MAX_POINTS=20000;
export function withNavigationQueries(nav,action){
 if(!nav||typeof nav!=='object'||scopes.has(nav))return action();
 scopes.set(nav,{version:nav.version,entries:null,points:0});
 try{return action();}finally{scopes.delete(nav);}
}
function currentScope(nav){
 const scope=scopes.get(nav);if(!scope)return null;
 if(scope.version!==nav.version){scope.version=nav.version;scope.entries=null;scope.points=0;}
 return scope;
}
export function navigationQueryResult(nav,key){
 const path=currentScope(nav)?.entries?.get(key);
 return path?.map(point=>({...point}));
}
export function rememberNavigationQuery(nav,key,path){
 const scope=currentScope(nav);if(!scope||!Array.isArray(path)||path.length>MAX_POINTS)return;
 const entries=scope.entries??=new Map();
 if(entries.has(key))return;
 while(entries.size&&(entries.size>=MAX_ROUTES||scope.points+path.length>MAX_POINTS)){
  const oldest=entries.keys().next().value;scope.points-=entries.get(oldest).length;entries.delete(oldest);
 }
 entries.set(key,path.map(point=>({...point})));scope.points+=path.length;
}
