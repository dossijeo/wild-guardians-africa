// Experimental: apply original glTF materials to the existing preview rig.
// Image decoding is asynchronous; shader compilation/GPU upload is not gated.
export async function prepareHydration(preview, materialAsset, mapping) {
  const records = new Map(mapping.primitives.map(record => [`${record.mesh}:${record.primitive}`, record]));
  const changes = [];
  preview.scene.traverse(object => {
    if (!object.isMesh) return;
    const association = preview.parser.associations.get(object);
    const key = association && `${association.meshes}:${association.primitives ?? 0}`;
    const record = records.get(key);
    if (!record || record.material == null) throw Error(`No original material mapping for ${key}`);
    changes.push({ object, record });
  });
  await Promise.all(changes.map(async change => {
    change.material = await materialAsset.parser.getDependency('material', change.record.material);
    change.color = change.record.colorAccessor == null ? null : await preview.parser.getDependency('accessor', change.record.colorAccessor);
  }));
  return () => {
    for (const change of changes) {
      if (change.color) change.object.geometry.setAttribute('color', change.color);
      else change.object.geometry.deleteAttribute('color');
      change.object.material = change.material;
      // GLTFLoader supplies per-geometry variants (skinning, vertex colors,
      // flat shading, tangents) exactly as it does for a normal glTF load.
      preview.parser.assignFinalMaterial(change.object);
    }
  };
}
