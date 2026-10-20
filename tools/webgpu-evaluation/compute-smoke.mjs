import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.WG_WEBGPU_URL ?? 'http://127.0.0.1:5294';
const output = process.env.WG_COMPUTE_OUTPUT ?? 'docs/qa/webgpu-evaluation/compute-smoke.json';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const watchdog = setTimeout(() => { console.error('Node watchdog timeout'); browser.close().finally(() => process.exit(1)); }, 90000);
const errors = [];
try {
  const page = await browser.newPage();
  page.on('response', response => { if (response.status() >= 400) console.error(`HTTP ${response.status()} ${response.url()}`); });
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { console.log(message.text()); if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${url}/tools/webgpu-evaluation/compute-smoke.html`);
  await page.waitForFunction(() => typeof window.runComputeSmoke === 'function');
  const result = await page.evaluate(async ({ samples, warmup, resident }) => ({
    report: await Promise.race([
      window.runComputeSmoke({ samples, warmup, resident }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Compute smoke timed out after 60 s')), 60000)),
    ]),
    userAgent: navigator.userAgent,
  }), {
    samples: Number(process.env.WG_COMPUTE_SAMPLES ?? 8),
    warmup: Number(process.env.WG_COMPUTE_WARMUP ?? 2),
    resident: process.env.WG_COMPUTE_RESIDENT === '1',
  });
  const report = { ...result, errors, purpose: 'Compilation and correctness smoke; not migration performance evidence.' };
  await mkdir(output.slice(0, output.lastIndexOf('/')), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, status: result.report.status, audits: result.report.audits, errors }));
  if (errors.length || result.report.status !== 'completed') process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  await browser.close();
}
