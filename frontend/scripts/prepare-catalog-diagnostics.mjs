import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, inflateSync } from 'node:zlib';

export const MAX_GROUP_BYTES = 24 * 1024 * 1024;
const groups = ['report', 'desktop', 'mobile', 'shared'];
const roots = ['catalog-browser.log', 'playwright-report', 'test-results'];
const reportPath = 'playwright-report/catalog-results.json';
const metricName = /-(pixels|panel-context|icon-surface)\.json$/;
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const within = (root, target) => target === root || target.startsWith(`${root}${path.sep}`);
const manifestEntry = file => Object.fromEntries(Object.entries(file).filter(([key]) => key !== 'body'));

// Only existing catalog diagnostics are eligible. Trace archives, videos,
// network dumps and all other files remain solely in the original full upload.
export function diagnosticGroup(relative) {
  if (relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) return null;
  if (relative === 'catalog-browser.log' || relative === reportPath || relative === 'test-results/.last-run.json') return 'report';
  if (!/^(test-results|playwright-report)\//.test(relative)) return null;
  if (relative.split('/').some(part => /^(trace|traces|network|resources)([.-]|$)/i.test(part))) return null;
  if (/(?:-pixels|-panel-context|-icon-surface)(?:-[a-f0-9]+)?\.json$/.test(relative) || relative.endsWith('/error-context.md')) return 'report';
  if (!relative.endsWith('.png')) return null;
  const project = /^test-results\/[^/]*-catalog-(desktop|mobile)(?:-retry\d+)?\//.exec(relative);
  return project ? project[1] : 'shared';
}

function checkedFile(sourceRoot, relative) {
  const absolute = path.join(sourceRoot, relative);
  let current = sourceRoot;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink excluded: ${relative}`);
  }
  if (!within(sourceRoot, fs.realpathSync(absolute))) throw new Error(`Path escape excluded: ${relative}`);
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  const stat = fs.fstatSync(fd);
  if (!stat.isFile()) {
    fs.closeSync(fd);
    throw new Error(`Non-regular file excluded: ${relative}`);
  }
  return { fd, stat };
}

function hashFile(sourceRoot, relative, destination) {
  const { fd, stat } = checkedFile(sourceRoot, relative);
  let output;
  try {
    if (destination) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      output = fs.openSync(destination, 'wx');
    }
    const hash = createHash('sha256');
    const buffer = Buffer.alloc(64 * 1024);
    let size = 0;
    for (let read; (read = fs.readSync(fd, buffer, 0, buffer.length, null));) {
      const bytes = buffer.subarray(0, read);
      hash.update(bytes);
      if (output !== undefined) fs.writeFileSync(output, bytes);
      size += read;
      if (size > stat.size) throw new Error(`Source grew while reading: ${relative}`);
    }
    const after = fs.fstatSync(fd);
    if (size !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs) {
      throw new Error(`Source changed while reading: ${relative}`);
    }
    return { size, sha256: hash.digest('hex') };
  } finally {
    fs.closeSync(fd);
    if (output !== undefined) fs.closeSync(output);
  }
}

function readCheckedBytes(sourceRoot, relative, maximum) {
  const { fd, stat } = checkedFile(sourceRoot, relative);
  try {
    if (stat.size > maximum) throw new Error(`Source exceeds bounded read limit: ${relative}`);
    const bytes = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!count) throw new Error(`Source shortened while reading: ${relative}`);
      offset += count;
    }
    if (fs.readSync(fd, Buffer.alloc(1), 0, 1, null)) throw new Error(`Source grew while reading: ${relative}`);
    return bytes;
  } finally { fs.closeSync(fd); }
}

function validatePNG(body, budget) {
  const fail = reason => { throw new Error(`Invalid or unsupported PNG: ${reason}`); };
  if (!body.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) fail('signature');
  let header;
  let palette = false;
  let endedData = false;
  const imageData = [];
  let offset = 8;
  let ended = false;
  while (offset + 12 <= body.length) {
    const length = body.readUInt32BE(offset);
    const type = body.toString('latin1', offset + 4, offset + 8);
    const end = offset + length + 12;
    if (end > body.length || !/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)) fail('chunk framing');
    if (crc32(body.subarray(offset + 4, end - 4)) !== body.readUInt32BE(end - 4)) fail(`${type} CRC`);
    if (offset === 8 && type !== 'IHDR') fail('IHDR must be first');
    if (type === 'IHDR') {
      if (header || length !== 13) fail('IHDR shape/order');
      const width = body.readUInt32BE(offset + 8), height = body.readUInt32BE(offset + 12);
      const depth = body[offset + 16], color = body[offset + 17], interlace = body[offset + 20];
      const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!width || !height || width > 0x7fffffff || height > 0x7fffffff || !depths[color]?.includes(depth) || body[offset + 18] || body[offset + 19] || interlace > 1) fail('IHDR fields');
      header = { width, height, depth, color, interlace };
    } else if (type === 'PLTE') {
      if (palette || imageData.length || !length || length % 3 || length > 768 || [0, 4].includes(header.color) || (header.color === 3 && length / 3 > 2 ** header.depth)) fail('PLTE shape/order');
      palette = true;
    } else if (type === 'IDAT') {
      if (endedData || (header.color === 3 && !palette)) fail('IDAT order/palette');
      imageData.push(body.subarray(offset + 8, end - 4));
    } else if (type === 'IEND') {
      if (length || !imageData.length || end !== body.length) fail('IEND shape/order');
      ended = true;
    } else {
      if (/^[A-Z]/.test(type) || ['acTL', 'fcTL', 'fdAT'].includes(type)) fail(`unhandled chunk ${type}`);
    }
    if (imageData.length && type !== 'IDAT') endedData = true;
    offset = end;
    if (ended) break;
  }
  if (!ended || offset !== body.length) fail('missing final IEND');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.color];
  const passes = header.interlace ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]] : [[0, 0, 1, 1]];
  const rows = passes.map(([x, y, dx, dy]) => {
    const width = Math.max(0, Math.ceil((header.width - x) / dx));
    const height = Math.max(0, Math.ceil((header.height - y) / dy));
    return { height: width ? height : 0, stride: Math.ceil(width * channels * header.depth / 8) + 1 };
  });
  const expectedBytes = rows.reduce((total, row) => total + row.height * row.stride, 0);
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes > 64 * 1024 * 1024 || expectedBytes > budget.remaining) fail('inflation budget exceeded (64 MiB/image, 2 GiB/export)');
  budget.remaining -= expectedBytes;
  const compressed = Buffer.concat(imageData);
  const inflated = inflateSync(compressed, { maxOutputLength: expectedBytes, info: true });
  if (inflated.engine.bytesWritten !== compressed.length || inflated.buffer.length !== expectedBytes) fail('compressed stream or scanline length');
  offset = 0;
  for (const row of rows) for (let y = 0; y < row.height; y++, offset += row.stride) if (inflated.buffer[offset] > 4) fail('scanline filter');
  return { width: header.width, height: header.height, inflatedBytes: expectedBytes, validation: 'chunk-crc-zlib-scanlines' };
}

function decodeInlineAttachments(bytes, sourceSha256, issues, sourceRoot, inventory, pngBudget) {
  const index = { version: 1, source: `frontend/${reportPath}`, sourceSha256, sourceBytes: bytes.length, attachments: [], tests: [], results: [] };
  const decoded = [];
  let originalSafeForCompact = true;
  let totalBytes = 0;
  try {
    const report = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const problem = (pointer, reason) => { originalSafeForCompact = false; issues.push(`Invalid or incomplete report at ${pointer}: ${reason}`); };
    if (!object(report)) throw new Error('Report must be an object');
    index.stats = report.stats;
    index.errors = report.errors;
    const counters = ['expected', 'unexpected', 'flaky', 'skipped'];
    const validStats = object(report.stats) && counters.every(key => Number.isSafeInteger(report.stats[key]) && report.stats[key] >= 0);
    if (!validStats) problem('/stats', 'Expected nonnegative integer expected/unexpected/flaky/skipped source counters');
    if (!Array.isArray(report.errors)) problem('/errors', 'Expected an errors array');
    function suites(items, pointer) {
      for (const [suiteIndex, suite] of items.entries()) {
        const suitePointer = `${pointer}/${suiteIndex}`;
        if (!object(suite)) { problem(suitePointer, 'Expected a suite object'); continue; }
        if (!Array.isArray(suite.specs)) problem(`${suitePointer}/specs`, 'Expected specs array');
        for (const [specIndex, spec] of (Array.isArray(suite.specs) ? suite.specs : []).entries()) {
          const specPointer = `${suitePointer}/specs/${specIndex}`;
          if (!object(spec) || !Array.isArray(spec.tests) || !spec.tests.length) { problem(specPointer, 'Expected spec with nonempty tests array'); continue; }
          for (const [testIndex, test] of spec.tests.entries()) {
            const testPointer = `${specPointer}/tests/${testIndex}`;
            const testItem = { pointer: testPointer, title: spec.title, disposition: 'invalid' };
            index.tests.push(testItem);
            if (!object(test)) { problem(testPointer, 'Expected test object'); continue; }
            Object.assign(testItem, { projectName: test.projectName, sourceStatus: test.status, expectedStatus: test.expectedStatus });
            if (!Array.isArray(test.results)) { problem(`${testPointer}/results`, 'Expected results array'); continue; }
            testItem.resultCount = test.results.length;
            if (!test.results.length) {
              testItem.disposition = test.status === 'skipped' && test.expectedStatus === 'skipped' ? 'explicitly-skipped-without-result' : 'missing-results';
              if (testItem.disposition === 'missing-results') problem(`${testPointer}/results`, 'No result and no explicit expected skip');
              continue;
            }
            testItem.disposition = 'has-results';
            for (const [resultIndex, result] of test.results.entries()) {
              const resultPointer = `${testPointer}/results/${resultIndex}`;
              const resultItem = { pointer: resultPointer, testPointer, disposition: 'invalid' };
              index.results.push(resultItem);
              if (!object(result)) { problem(resultPointer, 'Expected result object'); continue; }
              Object.assign(resultItem, { status: result.status, retry: result.retry, errors: result.errors, disposition: 'observed' });
              if (!['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(result.status) || !Number.isSafeInteger(result.retry) || result.retry < 0 || !Array.isArray(result.errors)) {
                resultItem.disposition = 'invalid'; problem(resultPointer, 'Invalid result status/retry/errors');
              }
              if (!Array.isArray(result.attachments)) { problem(`${resultPointer}/attachments`, 'Expected attachments array'); continue; }
              for (const [attachmentIndex, attachment] of result.attachments.entries()) {
                const pointer = `${resultPointer}/attachments/${attachmentIndex}`;
                const item = { pointer, testPointer, resultPointer, projectName: test.projectName };
                index.attachments.push(item);
                if (!object(attachment) || typeof attachment.name !== 'string' || typeof attachment.contentType !== 'string') {
                  item.status = 'invalid'; item.reason = 'Expected attachment object with string name and contentType';
                  problem(pointer, item.reason); continue;
                }
                Object.assign(item, { name: attachment.name, contentType: attachment.contentType, originalPath: attachment.path });
                const png = attachment.contentType === 'image/png' && typeof attachment.name === 'string' && attachment.name.endsWith('.png');
                const metric = attachment.contentType === 'application/json' && typeof attachment.name === 'string' && metricName.test(attachment.name);
                if (!png && !metric) {
                  item.status = 'excluded-type'; item.reason = 'Only PNG images and named catalog JSON metrics are decoded; other payloads remain in the full original report.';
                  if (attachment.body !== undefined) originalSafeForCompact = false;
                  continue;
                }
                if (attachment.body === undefined) {
                  const relative = typeof attachment.path === 'string' ? path.relative(sourceRoot, path.resolve(sourceRoot, attachment.path)).split(path.sep).join('/') : '';
                  const referenced = diagnosticGroup(relative) && inventory.find(file => file.path === `frontend/${relative}` && file.status === 'selected' && file.sha256);
                  if (referenced) {
                    Object.assign(item, { status: 'file-reference', path: referenced.path, group: referenced.group, size: referenced.size, sha256: referenced.sha256 });
                  } else {
                    item.status = 'missing-or-excluded-file-reference';
                    item.reason = 'Attachment does not match a selected regular file inside known evidence roots; its path was not followed.';
                    issues.push(`Missing or excluded file attachment at ${pointer}`);
                  }
                  continue;
                }
                try {
                  if (attachment.path !== undefined) throw new Error('Ambiguous attachment has both path and body');
                  const base64 = attachment.body;
                  if (typeof base64 !== 'string') throw new Error('Invalid base64 body type');
                  if (base64.length > Math.ceil(MAX_GROUP_BYTES / 3) * 4) throw new Error('Inline attachment exceeds 24 MiB decode limit');
                  if (base64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error('Invalid canonical base64');
                  const body = Buffer.from(base64, 'base64');
                  if (body.toString('base64') !== base64) throw new Error('Invalid base64 padding bits');
                  if (png) item.pngValidation = validatePNG(body, pngBudget);
                  if (metric) {
                    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
                    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON metric body must be an object');
                  }
                  totalBytes += body.length;
                  if (totalBytes > 4 * MAX_GROUP_BYTES) throw new Error('Total inline evidence exceeds 96 MiB decode limit');
                  const group = metric ? 'report' : test.projectName === 'catalog-desktop' ? 'desktop' : test.projectName === 'catalog-mobile' ? 'mobile' : 'shared';
                  // Names and attachment paths never control output paths.
                  const destination = `derived/inline/${String(index.attachments.length).padStart(6, '0')}.${png ? 'png' : 'json'}`;
                  Object.assign(item, { status: 'decoded', path: destination, group, size: body.length, sha256: digest(body) });
                  decoded.push({ path: destination, group, size: body.length, sha256: item.sha256, body, status: 'selected', sourcePointer: pointer });
                } catch (error) {
                  originalSafeForCompact = false;
                  item.status = 'invalid'; item.reason = error.message;
                  issues.push(`Invalid inline attachment at ${pointer}: ${error.message}`);
                }
              }
            }
          }
        }
        if (suite.suites !== undefined) {
          if (!Array.isArray(suite.suites)) problem(`${suitePointer}/suites`, 'Expected child suites array');
          else suites(suite.suites, `${suitePointer}/suites`);
        }
      }
    }
    if (!Array.isArray(report.suites)) problem('/suites', 'Expected suites array');
    else suites(report.suites, '/suites');
    index.observedTestCount = index.tests.length;
    if (!index.tests.length) problem('/suites', 'Report contains no tests');
    if (validStats) {
      index.sourceStatsTotal = counters.reduce((sum, key) => sum + report.stats[key], 0);
      if (index.sourceStatsTotal !== index.observedTestCount) problem('/stats', 'Source total disagrees with observed test entries');
    }
  } catch (error) {
    originalSafeForCompact = false;
    issues.push(`Invalid or incomplete catalog report: ${error.message}`);
  }
  index.issues = [...issues];
  const body = Buffer.from(json(index));
  decoded.push({ path: 'derived/catalog-index.json', group: 'report', size: body.length, sha256: digest(body), body, status: 'selected' });
  return { decoded, originalSafeForCompact };
}

export function prepareCatalogDiagnostics({ sourceRoot, outputRoot, maxGroupBytes = MAX_GROUP_BYTES }) {
  sourceRoot = path.resolve(sourceRoot);
  outputRoot = path.resolve(outputRoot);
  if (!Number.isSafeInteger(maxGroupBytes) || maxGroupBytes < 1024 || maxGroupBytes > MAX_GROUP_BYTES) throw new Error('Invalid diagnostic byte limit');
  if (fs.lstatSync(sourceRoot).isSymbolicLink()) throw new Error('Source root must not be a symlink');
  sourceRoot = fs.realpathSync(sourceRoot);
  outputRoot = path.join(fs.realpathSync(path.dirname(outputRoot)), path.basename(outputRoot));
  if (roots.some(root => within(path.join(sourceRoot, root), outputRoot)) || within(outputRoot, sourceRoot)) throw new Error('Output overlaps source evidence');
  // Refuse existing output, including symlinks, rather than overwriting evidence.
  fs.mkdirSync(outputRoot);
  const inventory = [];
  const issues = [];
  const missing = [];
  const pngBudget = { remaining: 2 * 1024 * 1024 * 1024 };

  function visit(relative) {
    const absolute = path.join(sourceRoot, relative);
    try {
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
        issues.push(`Excluded unsafe entry: ${relative}`);
        inventory.push({ path: `frontend/${relative}`, status: 'excluded-unsafe' });
      } else if (stat.isDirectory()) {
        for (const name of fs.readdirSync(absolute).sort()) visit(`${relative}/${name}`);
      } else {
        const group = diagnosticGroup(relative);
        inventory.push({ path: `frontend/${relative}`, group, size: stat.size, status: group ? 'selected' : 'excluded-by-selection' });
      }
    } catch (error) {
      issues.push(`Cannot inspect ${relative}: ${error.code || error.message}`);
    }
  }

  for (const root of roots) {
    try { fs.lstatSync(path.join(sourceRoot, root)); } catch (error) {
      if (error.code === 'ENOENT') { missing.push(`frontend/${root}`); continue; }
      issues.push(`Cannot inspect ${root}: ${error.code || error.message}`);
      continue;
    }
    visit(root);
  }
  if (!inventory.some(file => file.path === `frontend/${reportPath}` && file.status === 'selected')) missing.push(`frontend/${reportPath}`);
  for (const file of inventory.filter(file => file.group)) {
    try {
      const relative = file.path.slice('frontend/'.length);
      Object.assign(file, hashFile(sourceRoot, relative));
      if (relative.endsWith('.png') && file.size <= maxGroupBytes) {
        const bytes = readCheckedBytes(sourceRoot, relative, maxGroupBytes);
        if (digest(bytes) !== file.sha256) throw new Error(`PNG changed before validation: ${relative}`);
        file.pngValidation = validatePNG(bytes, pngBudget);
      }
    } catch (error) {
      file.status = 'failed';
      issues.push(error.message);
    }
  }

  const sourceReport = inventory.find(file => file.path === `frontend/${reportPath}` && file.sha256);
  if (sourceReport) {
    if (sourceReport.size > 128 * 1024 * 1024) {
      issues.push('Catalog report exceeds the 128 MiB parsing limit; inline evidence was not decoded');
    } else {
      try {
        const bytes = readCheckedBytes(sourceRoot, reportPath, 128 * 1024 * 1024);
        if (digest(bytes) !== sourceReport.sha256) throw new Error('Report changed before inline decoding');
        const { decoded, originalSafeForCompact } = decodeInlineAttachments(bytes, sourceReport.sha256, issues, sourceRoot, inventory, pngBudget);
        inventory.push(...decoded);
        if (!originalSafeForCompact) {
          sourceReport.group = null;
          sourceReport.status = 'retained-in-full-artifact';
          sourceReport.reason = 'Original report contains excluded or invalid inline data; exact original remains in the full artifact.';
        }
      } catch (error) { issues.push(error.message); }
    }
  }

  const results = [];
  for (const group of groups) {
    let files = inventory.filter(file => file.group === group);
    let sourceBytes = files.reduce((total, file) => total + file.size, 0);
    const manifest = {
      version: 1, group, maxGroupBytes, sourceBytes,
      status: files.length ? 'complete' : 'empty',
      missing, issues: [...issues], files: files.map(manifestEntry),
      // Every encountered file has a disposition, including deliberate exclusions.
      excluded: group === 'report' ? inventory.filter(file => !file.group) : [],
    };
    if (issues.length || missing.length) manifest.status = 'incomplete';
    let encoded = json(manifest);
    if (group === 'report' && files.includes(sourceReport) && sourceBytes + Buffer.byteLength(encoded) > maxGroupBytes) {
      // Keep the derived index and metrics usable when the original JSON alone
      // consumes the budget. The exact original remains in the full upload.
      sourceReport.group = null;
      sourceReport.status = 'oversize-retained-in-full-artifact';
      files = files.filter(file => file !== sourceReport);
      sourceBytes -= sourceReport.size;
      manifest.status = 'incomplete';
      manifest.sourceBytes = sourceBytes;
      manifest.files = files.map(manifestEntry);
      manifest.excluded.push(sourceReport);
      manifest.issues.push(`Compact report exceeds byte limit with original ${reportPath}; exact original retained only in full artifact`);
      encoded = json(manifest);
    }
    if (sourceBytes + Buffer.byteLength(encoded) > maxGroupBytes) {
      manifest.status = 'oversize';
      manifest.issues.push(`Group exceeds ${maxGroupBytes} bytes including manifest; no selected files exported. Full original upload is unchanged.`);
    } else if (files.some(file => file.status === 'failed')) {
      manifest.status = 'failed';
      manifest.issues.push('A selected file could not be read; no selected files exported.');
    }
    const partial = path.join(outputRoot, `.${group}-partial`);
    fs.mkdirSync(partial);
    let exportedBytes = 0;
    if (!['oversize', 'failed'].includes(manifest.status)) {
      try {
        for (const file of files) {
          const destination = path.join(partial, file.path);
          let copied;
          if (file.body) {
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.writeFileSync(destination, file.body, { flag: 'wx' });
            copied = { size: file.body.length, sha256: digest(file.body) };
          } else copied = hashFile(sourceRoot, file.path.slice('frontend/'.length), destination);
          if (copied.size !== file.size || copied.sha256 !== file.sha256) throw new Error(`Source changed before copy: ${file.path}`);
          exportedBytes += copied.size;
        }
      } catch (error) {
        // Only remove this invocation's incomplete copies, never source evidence.
        fs.rmSync(partial, { recursive: true });
        fs.mkdirSync(partial);
        exportedBytes = 0;
        manifest.status = 'failed';
        manifest.issues.push(error.message, 'Copy failed; no selected files exported.');
      }
    }
    manifest.exportedBytes = exportedBytes;
    encoded = json(manifest);
    if (exportedBytes + Buffer.byteLength(encoded) > maxGroupBytes) {
      fs.rmSync(partial, { recursive: true });
      fs.mkdirSync(partial);
      manifest.status = 'oversize';
      manifest.exportedBytes = 0;
      manifest.issues.push('Final manifest plus content exceeds byte limit; no selected files exported.');
      encoded = json(manifest);
    }
    if (Buffer.byteLength(encoded) > maxGroupBytes) throw new Error(`Manifest itself exceeds limit for ${group}; preparation failed`);
    fs.writeFileSync(path.join(partial, 'manifest.json'), encoded, { flag: 'wx' });
    fs.renameSync(partial, path.join(outputRoot, group));
    results.push({ group, status: manifest.status, files: files.length, exportedBytes: manifest.exportedBytes, rawBytes: manifest.exportedBytes + Buffer.byteLength(encoded), manifestSha256: digest(encoded) });
  }
  return { ok: results.every(result => ['complete', 'empty'].includes(result.status)), results };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/prepare-catalog-diagnostics.mjs OUTPUT_DIRECTORY');
    const result = prepareCatalogDiagnostics({ sourceRoot: path.resolve(fileURLToPath(new URL('..', import.meta.url))), outputRoot: process.argv[2] });
    console.log(json(result));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`Catalog diagnostic preparation failed: ${JSON.stringify(error.message)}`);
    process.exitCode = 1;
  }
}
