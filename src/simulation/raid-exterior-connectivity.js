// Sufficient native exterior certificates, not a global enclosure classifier.
// No A*: the finite graph contains only already selected birth/exit positions.
export const EXTERIOR_GRAPH_LIMITS=Object.freeze({nodes:192,rootChecks:128,edgeChecks:768,edgeLength:24});
export function exteriorGroupWitness(entry,specs,box,nav,witness){
  if(!entry||entry.entries.length!==specs.length||entry.exits.length!==specs.length)return false;
  const nodes=[...entry.entries,...entry.exits],rootCache=new Map(),walkCache=new Map(),edgeCache=new Map(),missing=new Map();
  const key=(radius,index)=>`${radius}:${index}`;
  const walk=(index,radius)=>{
    const id=key(radius,index);if(!walkCache.has(id))walkCache.set(id,nav.walkable(nodes[index].x,nodes[index].z,radius,null,false));
    return walkCache.get(id);
  };
  const root=(index,radius)=>{
    const id=key(radius,index);if(!rootCache.has(id))rootCache.set(id,walk(index,radius)&&witness(nodes[index],radius,box,nav));
    return rootCache.get(id);
  };
  const edge=(from,to,radius)=>{
    const id=`${radius}:${from}>${to}`;
    if(!edgeCache.has(id))edgeCache.set(id,!!nav.segmentClear?.(nodes[from],nodes[to],radius,null,false));
    return edgeCache.get(id);
  };
  for(let i=0;i<specs.length;i++){
    const radius=specs[i].radius,exit=i+specs.length;
    if(!walk(i,radius)||!walk(exit,radius))return false;
    const birthRoot=root(i,radius),exitRoot=root(exit,radius);
    if(birthRoot&&exitRoot||((birthRoot||exitRoot)&&edge(birthRoot?exit:i,birthRoot?i:exit,radius)))continue;
    if(!missing.has(radius))missing.set(radius,new Set());missing.get(radius).add(i);missing.get(radius).add(exit);
  }
  if(!missing.size)return true;
  // Large groups still use the fast certificates above. Exceeding a proof-work
  // bound rejects the complete candidate; it never discards individual actors.
  if(nodes.length>EXTERIOR_GRAPH_LIMITS.nodes)return false;
  let rootChecks=0,edgeChecks=0;
  for(const [radius,required] of missing){
    const reached=new Set(),queue=[];let expanded=0;
    const seed=index=>{if(!reached.has(index)){reached.add(index);queue.push(index);}};
    for(let i=0;i<nodes.length;i++)if(rootCache.get(key(radius,i)))seed(i);
    const complete=()=>{for(const i of required)if(!reached.has(i))return false;return true;};
    // Each extra root is recomputed with this actor's actual radius; a smaller
    // neighbor's certificate cannot be borrowed as a wider passage.
    for(let probe=0;probe<nodes.length&&!complete();probe++){
      if(!rootCache.has(key(radius,probe))){if(rootChecks>=EXTERIOR_GRAPH_LIMITS.rootChecks)return false;rootChecks++;if(root(probe,radius))seed(probe);}
      else if(rootCache.get(key(radius,probe)))seed(probe);
      while(expanded<queue.length&&!complete()){
        const target=queue[expanded++];
        for(let from=0;from<nodes.length&&!complete();from++){
          if(reached.has(from)||!walk(from,radius))continue;
          const distance=Math.hypot(nodes[from].x-nodes[target].x,nodes[from].z-nodes[target].z);
          if(distance>EXTERIOR_GRAPH_LIMITS.edgeLength)continue;
          const id=`${radius}:${from}>${target}`;
          if(!edgeCache.has(id)){if(edgeChecks>=EXTERIOR_GRAPH_LIMITS.edgeChecks)return false;edgeChecks++;}
          if(edge(from,target,radius))seed(from);
        }
      }
    }
    if(!complete())return false;
  }
  return true;
}
