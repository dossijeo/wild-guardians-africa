import { assetUrl } from './asset-url.js';

export const WORKER_BAKE_DIRECTORIES = Object.freeze({
  Walk_Skip: 'gpu-worker-walk', Run: 'gpu-worker-run', Harvest: 'gpu-worker-harvest',
  Idle: 'gpu-worker-idle', Water: 'gpu-worker-water', Plant: 'gpu-worker-plant',
  Carry_Crate: 'gpu-worker-carry', Alert: 'gpu-worker-alert', Fall: 'gpu-worker-fall',
  Worker_GetUp: 'gpu-worker-getup'
});
export const ANIMAL_ATTACK_BAKES = Object.freeze([
  'Charged_Upward_Slash', 'Right_Hand_Sword_Slash', 'Weapon_Combo', 'Weapon_Combo_2'
]);
export const BAKE_BANK_DIRECTORY = 'content/baked-animations';
export const MAX_BAKE_BANK_BYTES = 32 * 1024 * 1024;
export const MAX_BAKE_MEMBER_BYTES = 8 * 1024 * 1024;

export function workerBakePath(profile, clip) {
  return `content/${WORKER_BAKE_DIRECTORIES[clip]}/${profile}/walking`;
}

export function animalBakePath(species, clip) {
  if (clip === 'Walking') return `content/gpu-walk/${species}/walking`;
  if (clip === 'Running') return `content/gpu-animal-run/${species}/walking`;
  return `content/gpu-animal-attack/${species}/${clip}/walking`;
}

async function readBytes(body, limit, signal, exact = true) {
  const bytes = new Uint8Array(limit);
  const reader = body.getReader();
  let length = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      if (value.byteLength > limit - length) throw Error('Baked animation exceeds its declared length');
      bytes.set(value, length);
      length += value.byteLength;
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  signal?.throwIfAborted();
  if (exact && length !== limit) throw Error('Truncated baked animation');
  return bytes.subarray(0, length);
}

const utf8 = new TextDecoder('utf-8', { fatal: true });
const positiveInteger = (value, maximum) => Number.isSafeInteger(value) && value > 0 && value <= maximum;

export async function readPackedBakedAnimation(bankUrl, clip, { fetcher, signal }) {
  const indexResponse = await fetcher(bankUrl + '.json', { signal });
  if (!indexResponse.ok || !indexResponse.body) throw Error('Baked animation index unavailable');
  const index = JSON.parse(utf8.decode(await readBytes(indexResponse.body, 8192, signal, false)));
  const member = index?.clips && Object.hasOwn(index.clips, clip) ? index.clips[clip] : null;
  if (index?.version !== 1 || !positiveInteger(index.bytes, MAX_BAKE_BANK_BYTES) ||
      !member || !Number.isSafeInteger(member.offset) || member.offset < 0 ||
      !positiveInteger(member.length, index.bytes - member.offset) ||
      !positiveInteger(member.decodedBytes, MAX_BAKE_MEMBER_BYTES) || member.decodedBytes <= 4) {
    throw Error('Invalid baked animation index');
  }

  const end = member.offset + member.length - 1;
  const range = `bytes=${member.offset}-${end}`;
  const response = await fetcher(bankUrl + '.bin', { signal, headers: { Range: range } });
  if (!response.body) throw Error('Baked animation bank unavailable');
  let encoded;
  if (response.status === 206 && response.headers.get('Content-Range') === `bytes ${member.offset}-${end}/${index.bytes}`) {
    encoded = await readBytes(response.body, member.length, signal);
  } else if (response.status === 200) {
    const bank = await readBytes(response.body, index.bytes, signal);
    encoded = bank.subarray(member.offset, end + 1);
  } else {
    await response.body.cancel();
    throw Error('Baked animation bank range mismatch');
  }

  const stream = new Blob([encoded]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decoded = await readBytes(stream, member.decodedBytes, signal);
  const metadataBytes = new DataView(decoded.buffer).getUint32(0, true);
  const dataOffset = 4 + metadataBytes;
  if (metadataBytes === 0 || dataOffset >= decoded.byteLength) throw Error('Invalid baked animation metadata length');
  const meta = JSON.parse(utf8.decode(decoded.subarray(4, dataOffset)));
  if (meta?.byteLength !== decoded.byteLength - dataOffset) throw Error('Baked animation byte count mismatch');
  return [meta, decoded.buffer.slice(dataOffset)];
}

export function bakedAnimationAssetUrl(path) {
  // Bundled assets and Worker modules sit one directory below the release root.
  if (import.meta.env?.PROD) return new URL(path, new URL('../', import.meta.url)).href;
  return assetUrl(path);
}

export async function readBakedAnimation(profile, clip, rawPath, { fetcher, signal }) {
  if (import.meta.env?.PROD) {
    const bankUrl = bakedAnimationAssetUrl(`${BAKE_BANK_DIRECTORY}/${profile}`);
    return readPackedBakedAnimation(bankUrl, clip, { fetcher, signal });
  }
  const url = assetUrl(rawPath);
  const [metadata, data] = await Promise.all([fetcher(url + '.json', { signal }), fetcher(url + '.bin', { signal })]);
  if (!metadata.ok || !data.ok) throw Error('Baked animation asset unavailable: ' + profile);
  return Promise.all([metadata.json(), data.arrayBuffer()]);
}
