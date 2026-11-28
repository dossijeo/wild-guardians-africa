// Shared with the existing intent bridge. This converts an established game
// entity ID; it allocates no ID and owns no entity/graphics registry.
export function nativeEntityNumericId(id){
 const match=/-(\d+)$/.exec(id??'');
 if(!match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])<1)throw TypeError(`Unsupported native intent ID: ${id}`);
 return Number(match[1]);
}
