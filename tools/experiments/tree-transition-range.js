// Experimental immutable-size policy. Classification depends only on authored
// height and procedural Y scale, never camera angle or frame history.
export function treeTransitionWeight(tree,height,policy){
 if(policy&&(!Number.isFinite(height)||height<=0||!Number.isFinite(tree.sy??tree.scale)||!(tree.sy??tree.scale)))throw Error('Invalid tree transition dimensions');
 return policy&&height*(tree.sy??tree.scale)>=policy.minimumHeight?1:0;
}
export function validateTreeTransitionPolicy(policy,start,end){
 if(policy===null||policy===undefined)return null;
 if(![policy.minimumHeight,policy.start,policy.end].every(Number.isFinite)||policy.minimumHeight<=0||policy.start<start||policy.end<=policy.start||policy.end<end)throw Error('Invalid tree transition height policy');
 return Object.freeze({...policy});
}
export function treeTransitionRange(tree,height,start,end,policy){
 return treeTransitionWeight(tree,height,policy)?[policy.start,policy.end]:[start,end];
}
