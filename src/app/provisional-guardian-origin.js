// Presentation only. The Worker recomputes the authoritative origin before
// damage; this point exists solely until the confirmed event arrives.
export function provisionalGuardianOrigin(camera,contact){
 if(!Array.isArray(camera)||camera.length!==3||!camera.every(Number.isFinite)||!contact||![contact.x,contact.y,contact.z].every(Number.isFinite))return null;
 const dx=camera[0]-contact.x,dz=camera[2]-contact.z,length=Math.hypot(dx,dz),x=length>1e-6?dx/length:1,z=length>1e-6?dz/length:0;
 return {x:contact.x+x*3,y:contact.y+1.7,z:contact.z+z*3};
}
