// Route ownership is derived state: it cannot survive a save/load.
const owners=new WeakMap();
export const markRouteOwner=(actor,nav)=>owners.set(actor,nav);
export const hasRouteOwner=(actor,nav)=>owners.get(actor)===nav;
