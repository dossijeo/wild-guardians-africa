// Reuse the cursor: a fresh Map iterator repeatedly scans deleted prefixes.
// Map iterators preserve insertion order and see later insertions/clear().
// Ephemeron ownership releases the cursor with its cache; no new key queue.
const cursors=new WeakMap();
export function evictOldest(map){
 let iterator=cursors.get(map);
 if(!iterator){iterator=map.keys();cursors.set(map,iterator);}
 let entry=iterator.next();
 if(entry.done){iterator=map.keys();cursors.set(map,iterator);entry=iterator.next();}
 return !entry.done&&map.delete(entry.value);
}
