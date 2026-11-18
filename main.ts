// World news of Tuesday 17 November 2026, in one image.
// The picture is rendered ahead of time from design/front.html (see design/render.mjs) and
// committed as entry.png; this program delivers it, byte for byte, to the grader's /output directory.
// It is deterministic: both grader runs copy the same committed bytes.
//
// Run locally (MAKEFUN_OUTPUT_DIR stands in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1024;
const PNG_SIGNATURE = '89504e470d0a1a0a';

const image = readFileSync(new URL('./entry.png', import.meta.url));

// Fail loudly here rather than at the gate: whole PNG, at most 1 MiB and 1024x1024.
if (image.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) throw new Error('entry.png is not a PNG');
if (image.length > MAX_BYTES) throw new Error(`entry.png is ${image.length} bytes, over 1 MiB`);
const width = image.readUInt32BE(16);
const height = image.readUInt32BE(20);
if (width > MAX_SIDE || height > MAX_SIDE) throw new Error(`entry.png is ${width}x${height}, over 1024x1024`);
if (image.subarray(-8, -4).toString('latin1') !== 'IEND') throw new Error('entry.png is truncated (no IEND)');

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
writeFileSync(join(outDir, 'entry.png'), image);
