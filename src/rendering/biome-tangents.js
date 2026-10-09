import {computeTangents} from './surface-source.js';
export function prepareBiomeTangents(buffer,assets){const types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array},attribute=desc=>new types[desc.type](buffer,desc.offset,desc.count);return assets.map(asset=>asset.lods.map(lod=>computeTangents(attribute(lod.position),attribute(lod.normal),attribute(lod.uv),attribute(lod.index))));}
