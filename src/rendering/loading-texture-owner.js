// Texture objects owned by presentation, pixel Sources borrowed from Assets.
// Three r180 shares GL storage for an identical Source/sampler key. A clone's
// dispose must never close or dispose the original bitmap/texture owner.
export class LoadingTextureOwner {
 constructor(){this.copies=new Map();this.disposed=false;}
 borrow(texture){if(this.disposed)throw Error('Loading texture owner disposed');if(!texture?.isTexture)return texture;if(!this.copies.has(texture))this.copies.set(texture,texture.clone());return this.copies.get(texture);}
 material(material){for(const key of ['map','normalMap'])if(material[key]?.isTexture)material[key]=this.borrow(material[key]);return material;}
 dispose(){if(this.disposed)return;this.disposed=true;for(const texture of this.copies.values())texture.dispose();this.copies.clear();}
}
