// Material.copy normally JSON-serializes userData. Runtime shader uniforms
// contain borrowed textures, whose toJSON can synchronously encode images.
// Copy ordinary material fields through an immutable view, then keep the same
// runtime references; the existing ground owner counts the additional borrower.
export function cloneRuntimeMaterial(material){
 const view=Object.create(material);view.userData={};
 const clone=new material.constructor().copy(view);clone.userData={...material.userData};
 clone.userData.retainBiomeGround?.(clone);return clone;
}
