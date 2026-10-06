// Read-only preflight. No API key, network, conversion or runtime replacement.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireTinifyColorInput} from './tinify-color-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(root, 'public');
const inventory = JSON.parse(await readFile(resolve(root, '.cache/image-inventory.json'), 'utf8'));
const variants = JSON.parse(await readFile(resolve(root, 'content/manifests/image-runtime.json'), 'utf8'));
const accepted = new Set(variants.records.map(r => r.runtime));
const eligible = [], review = [], alreadyIntegrated = [];
for (const item of inventory.standalone.filter(r => r.distributed)) {
 const entry = {path: item.path, sha256: item.sha256, bytes: item.bytes, roles: item.roles};
 if (accepted.has(item.path)) {alreadyIntegrated.push(entry); continue;}
 const source = resolve(publicRoot, item.path);
 if (!source.startsWith(publicRoot + sep)) throw Error('Inventoried image escapes public directory');
 // File errors are fatal rather than silently turning a stale inventory into a plan.
 const bytes = await readFile(source);
 try {await requireTinifyColorInput(item, bytes); eligible.push(entry);}
 catch (error) {
  if (/stale|metadata does not match|matching the inventory/.test(error.message)) throw error;
  review.push({...entry, reason: error.message});
 }
}
eligible.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
const totals = rows => ({count: rows.length, bytes: rows.reduce((n, r) => n + r.bytes, 0)});
const report = {schema: 'wg-tinify-preflight-1', scope: 'Standalone distributed images only. Eligible means safe to pilot, not visually accepted or proven smaller. Embedded textures require separate review. No API operations performed.', summary: {eligible: totals(eligible), review: totals(review), alreadyIntegrated: totals(alreadyIntegrated)}, eligible, review, alreadyIntegrated};
const directory = resolve(root, '.cache/tinify-preflight');
await mkdir(directory, {recursive: true});
await writeFile(resolve(directory, 'plan.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({summary: report.summary, largestEligible: eligible.slice(0, 5), output: '.cache/tinify-preflight/plan.json'}));
