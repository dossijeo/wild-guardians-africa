// Pure capability selection for an experimental split character package.
// This does not initiate network requests or imply the format is production-ready.
const SHA256 = /^[a-f0-9]{64}$/;
function safePath(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._/-]+$/.test(value) && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..');
}
function validateFile(file, prefix = '') {
  if (!file || !safePath(file.path) || (prefix && !file.path.startsWith(`${prefix}/`)) || !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || !SHA256.test(file.sha256 ?? '')) throw Error('Invalid character package file');
}
export function selectCharacterPreviewVariant(manifest, features) {
  if (manifest?.schemaVersion !== 1 || !/^[A-Za-z][A-Za-z0-9]*$/.test(manifest.id ?? '') || !safePath(manifest.sourceModel)) throw Error('Invalid character package manifest');
  validateFile(manifest.preview);
  if (!manifest.preview.path.endsWith('.glb')) throw Error('Invalid character preview');
  const available = new Set(features ?? []), variants = manifest.variants;
  if (!variants || typeof variants !== 'object') throw Error('Missing character package variants');
  function compatible(name) {
    const variant = variants[name]; if (!variant) return false;
    if (!Array.isArray(variant.requires) || !Array.isArray(variant.files) || !variant.files.length) throw Error(`Invalid ${name} variant`);
    const paths = new Set();
    for (const file of variant.files) { validateFile(file, name); if (paths.has(file.path)) throw Error(`Duplicate ${name} file`); paths.add(file.path); }
    if (!paths.has(`${name}/materials.gltf`) || !paths.has(`${name}/mapping.json`)) throw Error(`Incomplete ${name} variant`);
    if (![...paths].some(path => path.endsWith(name === 'bc7' ? '.ktx2' : '.webp'))) throw Error(`Missing ${name} textures`);
    if (!variant.requires.every(feature => typeof feature === 'string' && feature.length > 0)) throw Error(`Invalid ${name} requirements`);
    if (name === 'bc7' && !variant.requires.includes('texture-compression-bc')) throw Error('BC7 capability requirement missing');
    return variant.requires.every(feature => available.has(feature));
  }
  // Validate both variants even when BC7 is supported; a broken fallback must
  // never silently escape validation on devices that happen to support BC7.
  const webp = compatible('webp'), bc7 = compatible('bc7');
  if (bc7) return { name: 'bc7', preview: manifest.preview, ...variants.bc7 };
  if (webp) return { name: 'webp', preview: manifest.preview, ...variants.webp };
  throw Error('No compatible character package variant');
}
