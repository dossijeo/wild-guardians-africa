// Private experimental extension; BC7 is already GPU-compressed, not Basis.
export function registerNativeBc7Glb(loader,ktx2Loader){
  loader.register(parser=>({
    name:'WG_native_ktx2',
    loadTexture(index){
      const extension=parser.json.textures[index].extensions?.WG_native_ktx2;
      return extension ? parser.loadTextureImage(index,extension.source,ktx2Loader) : null;
    }
  }));
  return loader;
}
