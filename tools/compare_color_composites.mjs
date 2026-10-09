// Offline image evidence only; does not edit assets or contact a provider.
import sharp from 'sharp';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const [source, candidate, output, ...extra] = process.argv.slice(2);
if (!source || !candidate || !output || extra.length) throw Error('Usage: node tools/compare_color_composites.mjs SOURCE CANDIDATE OUTPUT_DIRECTORY');
const paths = [source, candidate].map(path => resolve(path));
const directory = resolve(output);
if (paths.some(path => path.startsWith(directory + '/') || path.startsWith(directory + '\\'))) throw Error('Keep comparison inputs outside the output directory');
const inputs = await Promise.all(paths.map(path => readFile(path)));
const decoded = await Promise.all(inputs.map(input => sharp(input).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject: true})));
const [a, b] = decoded;
if (a.info.width !== b.info.width || a.info.height !== b.info.height || a.data.length !== b.data.length) throw Error('Image dimensions differ');
let weighted = 0, weight = 0, maxVisible = 0, visiblePixels = 0, alphaDifferences = 0;
for (let i = 0; i < a.data.length; i += 4) {
  if (a.data[i + 3] !== b.data[i + 3]) alphaDifferences++;
  const alpha = a.data[i + 3] / 255;
  weight += alpha * 3;
  for (let c = 0; c < 3; c++) {
    const delta = Math.abs(a.data[i + c] - b.data[i + c]);
    weighted += alpha * delta;
    if (alpha >= .5) maxVisible = Math.max(maxVisible, delta);
  }
  if (alpha >= .5) visiblePixels++;
}
const report = {
  scope: 'Offline alpha-composited comparison; not browser/native QA or visual acceptance',
  sourceSha256: createHash('sha256').update(inputs[0]).digest('hex'),
  candidateSha256: createHash('sha256').update(inputs[1]).digest('hex'),
  width: a.info.width, height: a.info.height, alphaDifferences,
  alphaWeightedRgbMean: weight ? weighted / weight : 0,
  maxRgbAtAlphaHalf: maxVisible, visiblePixels,
  layout: 'Original above; candidate below',
};
await mkdir(directory, {recursive: true});
await writeFile(resolve(directory, 'comparison.json'), JSON.stringify(report, null, 2) + '\n');
const width = Math.min(1086, a.info.width), height = Math.round(a.info.height * width / a.info.width);
for (const [name, background] of [['day', '#d8ceb4'], ['night', '#0b1b34']]) {
  const layers = await Promise.all(inputs.map(input => sharp(input).flatten({background}).resize(width, height).png().toBuffer()));
  await sharp({create: {width, height: height * 2, channels: 3, background}})
    .composite(layers.map((input, i) => ({input, left: 0, top: i * height})))
    .png().toFile(resolve(directory, name + '-comparison.png'));
}
console.log(JSON.stringify(report));
