const maxNodes=4096,maxInsertions=32769;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const index=value=>Number.isSafeInteger(value)&&Math.abs(value)<=128;
function coordinate(key){
 if(typeof key!=='string')return null;
 const pair=key.split(',').map(Number);
 return pair.length===2&&pair.every(index)&&`${pair[0]},${pair[1]}`===key?pair:null;
}
const before=(a,b)=>a.value.f<b.value.f||a.value.f===b.value.f&&a.order<b.order;

// Persistence-boundary validation only. Strictly increasing parent costs prove
// acyclicity in linear time without repeatedly walking every ancestry chain.
export function validExitFrontier(fine){
 if(!record(fine)||!Array.isArray(fine.items)||fine.items.length>maxNodes||
   !Number.isSafeInteger(fine.sequence)||fine.sequence<0||fine.sequence>maxInsertions||
   !Number.isSafeInteger(fine.visited)||fine.visited<0||fine.visited>maxNodes||
   fine.sequence-fine.visited!==fine.items.length||
   !record(fine.costs)||!record(fine.previous))return false;
 const keys=Object.keys(fine.costs),parents=Object.keys(fine.previous);
 if(!Number.isSafeInteger(fine.nodeCount)||fine.nodeCount!==keys.length||
   keys.length<1||keys.length>maxNodes||parents.length!==keys.length-1||
   fine.costs['0,0']!==0||Object.hasOwn(fine.previous,'0,0'))return false;
 for(const key of keys){
  const child=coordinate(key),cost=fine.costs[key];
  if(!child||!Number.isFinite(cost)||cost<0)return false;
  if(key==='0,0')continue;
  const parentKey=fine.previous[key],parent=coordinate(parentKey);
  if(!parent||!Object.hasOwn(fine.costs,parentKey)||
    !(fine.costs[parentKey]<cost)||
    Math.max(Math.abs(child[0]-parent[0]),Math.abs(child[1]-parent[1]))!==1)return false;
 }
 // All extra parents are rejected even when a corrupt object hides a missing
 // parent behind an equal map size.
 if(parents.some(key=>!Object.hasOwn(fine.costs,key)))return false;
 const orders=new Set();
 for(let i=0;i<fine.items.length;i++){
  const entry=fine.items[i],value=entry?.value;
  if(!record(entry)||!Number.isSafeInteger(entry.order)||entry.order<0||
    entry.order>=fine.sequence||orders.has(entry.order)||!record(value)||
    !index(value.i)||!index(value.j)||!Number.isFinite(value.g)||
    !Number.isFinite(value.f)||value.f<value.g)return false;
  const key=`${value.i},${value.j}`;
  // Older heap entries can have a greater g after a cheaper route is queued.
  // A smaller g or an unknown coordinate cannot come from a valid search.
  if(!Object.hasOwn(fine.costs,key)||value.g<fine.costs[key])return false;
  orders.add(entry.order);
  if(i&&before(entry,fine.items[(i-1)>>1]))return false;
 }
 return true;
}
