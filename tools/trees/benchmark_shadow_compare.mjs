// Isolated comparison microbenchmark; no scene traversal or GPU work.
const a=Array.from({length:100000},(_,i)=>i%17===0?{}:i),b=a.slice();
function old(){return b.every((v,i)=>Object.is(v,a[i]));}
function current(){for(let i=0;i<b.length;i++)if(!Object.is(b[i],a[i]))return false;return true;}
for(let i=0;i<2000;i++){old();current();}
for(const fn of [old,current,current,old]){const t=performance.now();for(let i=0;i<1000;i++)if(!fn())throw Error('Mismatch');console.log(fn.name,((performance.now()-t)/1000).toFixed(3),'ms');}
