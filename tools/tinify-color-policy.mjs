import sharp from 'sharp';
import {createHash} from 'node:crypto';

// Classifications are necessary but cannot replace inspecting the current bytes.
// Profiled/HDR/animated/oriented images need an explicit conversion review.
export async function requireTinifyColorInput(item, bytes) {
 if (!item?.distributed || item.requiresExactPixels || !item.roles?.length || item.roles.some(role => role !== 'color')) throw Error('Tinify requires a reviewed distributed color image; data/unknown images are excluded');
 if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw Error('Image inventory is stale');
 const metadata = await sharp(bytes, {animated: true}).metadata();
 if (!['png', 'jpeg', 'webp'].includes(metadata.format) || metadata.format !== item.format) throw Error('Tinify requires a supported format matching the inventory');
 if ((metadata.pages ?? 1) !== 1) throw Error('Tinify image needs separate animation review before upload');
 if ((metadata.orientation ?? 1) !== 1) throw Error('Tinify image needs separate orientation review before upload');
 if (metadata.icc || metadata.hasProfile) throw Error('Tinify image needs separate color-profile review before upload');
 if (metadata.depth !== 'uchar' || (metadata.bitsPerSample ?? 8) !== 8 || !((metadata.space === 'srgb' && [3, 4].includes(metadata.channels)) || (metadata.space === 'b-w' && [1, 2].includes(metadata.channels)))) throw Error('Tinify image needs separate depth/color-space review before upload');
 if (metadata.width !== item.width || metadata.height !== item.height || metadata.hasAlpha !== item.alpha || (metadata.pages ?? 1) !== item.pages) throw Error('Image metadata does not match inventory');
 return metadata;
}
