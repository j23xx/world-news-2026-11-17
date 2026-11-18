// Renders a design page to a PNG at exactly 1024x1024 with headless Chrome, then checks the
// file against the contest gate (whole PNG, <= 1 MiB, <= 1024x1024).
//
//   node design/render.mjs                     front.html  -> entry.png (the dense front page)
//   node design/render.mjs poster.html v1.png  any page    -> any output, both relative to design/
//
// Build-time only: the graded program (main.ts) never runs this, it just copies entry.png.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const [page = 'front.html', target] = process.argv.slice(2);
const html = resolve(here, page);
const out = target ? resolve(here, target) : join(here, '..', 'entry.png');
const SIZE = 1024;
const MAX_BYTES = 1024 * 1024;

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = chromeCandidates.find((p) => existsSync(p));
if (!chrome) throw new Error('No Chrome found; set CHROME_BIN');

// A fresh profile per run, and the old image removed first: Chrome sometimes exits non-zero from its
// teardown watchdog after the screenshot is already written, so success is judged by the new file.
rmSync(out, { force: true });
const profile = mkdtempSync(join(tmpdir(), 'render-chrome-'));
try {
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--user-data-dir=${profile}`,
    `--window-size=${SIZE},${SIZE}`,
    `--screenshot=${out}`,
    '--virtual-time-budget=2000',
    pathToFileURL(html).href,
  ], { stdio: ['ignore', 'inherit', 'ignore'] });
} catch (err) {
  if (!existsSync(out)) throw err;
  console.warn(`chrome exited with status ${err.status} after writing the screenshot; continuing`);
} finally {
  rmSync(profile, { recursive: true, force: true });
}

// Gate checks: PNG signature, IHDR dimensions, byte size.
const buf = readFileSync(out);
const sig = buf.subarray(0, 8).toString('hex');
if (sig !== '89504e470d0a1a0a') throw new Error(`not a PNG (${sig})`);
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
const bytes = statSync(out).size;
console.log(`entry.png: ${width}x${height}, ${bytes} bytes`);
if (width > SIZE || height > SIZE) throw new Error('image larger than 1024x1024');
if (bytes > MAX_BYTES) throw new Error('image larger than 1 MiB');
