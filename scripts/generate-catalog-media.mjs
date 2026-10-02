// Derived evidence only. Edit reviewed records/maps, then regenerate this release mirror.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getEquipmentVisual } from '../frontend/lib/catalog/models/visualMap.js';
const require = createRequire(import.meta.url);
const { readCatalog } = require('../backend-node/src/domain/catalog-source.js');
const { importedProductId } = require('../backend-node/src/domain/catalog-identity.js');
const { digest, sourceDigest, sameMedia } = require('../backend-node/src/domain/catalog-media-evidence.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const allowed = new Set(require('../backend-node/data/public-assets.json'));
const mirror = path.join(root, 'backend-node/data/catalog-media');
const manifest = { format: 'alageum-catalog-media-v1', records: {}, assets: {} };
const publicManifest = { format: 'alageum-catalog-media-public-v1', overrides: {}, assets: {} };
const files = new Map();
const media = (record) => record.image ? [{ path: record.image, kind: 'image', alt: record.imageCaption || '' }] : [];
function asset(file, pages) {
  assert.ok(allowed.has(file), `Unshipped reviewed asset ${file}`);
  assert.match(file, /^\/(catalog-products\/[a-z0-9-]+|catalog-source\/page-\d{3})\.webp$/);
  assert.ok(pages.length && pages.every(page => Number.isInteger(page) && page >= 1 && page <= 104));
  const source = path.join(root, 'frontend/public', file);
  assert.ok(fs.lstatSync(source).isFile(), `Canonical asset must be a regular file: ${file}`);
  const bytes = fs.readFileSync(source);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  const entry = { id: digest(file), path: file, kind: 'image', representation: file.startsWith('/catalog-source/') ? 'source-scan' : 'crop', source_pages: [...new Set(pages)].sort((a, b) => a - b), mime: 'image/webp', sha256: digest(bytes), bytes: bytes.length };
  if (manifest.assets[entry.id]) assert.deepEqual(manifest.assets[entry.id], entry, `Conflicting asset evidence: ${file}`);
  manifest.assets[entry.id] = entry;
  publicManifest.assets[file] = { representation: entry.representation, source_pages: entry.source_pages };
  files.set(`${entry.id}.webp`, bytes);
  return entry.id;
}
for (const record of readCatalog()) {
  const imported = media(record);
  const visual = getEquipmentVisual(record);
  const reviewedPath = record.image ? visual.fallbackImage || record.image : null;
  let entryIds = [];
  if (record.image) {
    assert.ok(record.sourcePages.includes(record.imageSourcePage), `Missing imported image evidence: ${record.id}`);
    asset(record.image, [record.imageSourcePage]);
    const pages = reviewedPath === record.image ? [record.imageSourcePage] : visual.sourcePages;
    assert.ok(pages.every(page => record.sourcePages.includes(page)), `Reviewed image outside record evidence: ${record.id}`);
    entryIds = [asset(reviewedPath, pages)];
  }
  const reviewed = reviewedPath ? [{ path: reviewedPath, kind: 'image', alt: reviewedPath.startsWith('/catalog-source/') ? `Страница ${manifest.assets[entryIds[0]].source_pages.join(', ')} исходного каталога; не фотография изделия` : record.imageCaption || '' }] : [];
  manifest.records[record.id] = { source_sha256: sourceDigest(record), source_pages: record.sourcePages || [], imported, reviewed, entry_ids: entryIds };
  if (!sameMedia(imported, reviewed)) publicManifest.overrides[record.id] = { database_id: importedProductId(record.id), imported, reviewed };
}
assert.equal(Object.keys(manifest.records).length, 238);
assert.equal(Object.values(manifest.records).filter(record => !record.reviewed.length).length, 24);
assert.equal(files.size, 60);
assert.equal([...files.values()].reduce((sum, bytes) => sum + bytes.length, 0), 1452744);
const outputs = new Map([
  ['backend-node/data/catalog-media-manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)],
  ['frontend/lib/catalog/media-manifest.json', Buffer.from(`${JSON.stringify(publicManifest, null, 2)}\n`)],
  ...[...files].map(([name, bytes]) => [`backend-node/data/catalog-media/${name}`, bytes]),
]);
if (!check) fs.mkdirSync(mirror, { recursive: true });
for (const [relative, bytes] of outputs) {
  const target = path.join(root, relative);
  if (check) { assert.ok(fs.lstatSync(target).isFile()); assert.deepEqual(fs.readFileSync(target), bytes, `${relative} is stale; regenerate media evidence`); }
  else fs.writeFileSync(target, bytes);
}
assert.deepEqual(fs.readdirSync(mirror).sort(), [...files.keys()].sort(), 'Unexpected release mirror bytes');
console.log(`Catalog media ${check ? 'verified' : 'generated'}: 238 associations, 24 empty, 60 raster assets, 1452744 bytes`);
