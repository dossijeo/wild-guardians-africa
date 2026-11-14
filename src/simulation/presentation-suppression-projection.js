// Both ends charge the same projected suppression state to the negotiated
// receive window. A delta must extend the immediately preceding wire state.
export function projectSuppression(publication,previous,baseSequence){
 if(publication.unchanged===true)return previous;
 let value;if(typeof publication.snapshot==='string'&&publication.snapshotDelta===undefined)value=JSON.parse(publication.snapshot)?.suppressed;
 else{const delta=publication.snapshotDelta;if(!delta||delta.baseSequence!==baseSequence||!Array.isArray(delta.changed)||!Array.isArray(delta.removed))throw TypeError('Invalid suppression projection delta');const matches=delta.changed.filter(pair=>Array.isArray(pair)&&pair[0]==='suppressed');if(matches.length>1||delta.removed.includes('suppressed'))throw TypeError('Invalid suppression projection');value=matches.length?JSON.parse(matches[0][1]):previous;}
 if(!Array.isArray(value)||value.some(id=>typeof id!=='string'))throw TypeError('Invalid suppression projection');return value;
}
