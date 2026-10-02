"use strict";
const fs = require("node:fs");
const path = require("node:path");
const manifest = require("../../data/catalog-media-manifest.json");
const allowlist = new Set(require("../../data/public-assets.json"));
const { sourceDigest, digest, sameMediaEntry, sameMedia } = require("./catalog-media-evidence");
const { AppError } = require("./errors");
const mirrorRoot = path.resolve(__dirname, "../../data/catalog-media");
function evidence(row) {
  const source = typeof row.source_data === "string" ? JSON.parse(row.source_data) : row.source_data;
  const record = Object.hasOwn(manifest.records, row.public_key) ? manifest.records[row.public_key] : null;
  // A matching editable public key/category/provenance is never an association.
  return record && source && sourceDigest(source) === record.source_sha256 ? record : null;
}
function options(row) {
  const record = evidence(row);
  const stored = typeof row.media === "string" ? JSON.parse(row.media) : row.media || [];
  return {
    product_id: row.transport_id, public_key: row.public_key, version: row.version,
    source_pages: record?.source_pages || [], imported: record?.imported || [], reviewed: record?.reviewed || [],
    entries: (record?.entry_ids || []).map(id => manifest.assets[id]),
    baseline_override: Boolean(record && !sameMedia(record.imported, record.reviewed) && sameMedia(stored, record.imported)),
  };
}
function invalid(index, message) {
  throw new AppError("validation_error", "Invalid native catalog media", 422, [{ loc: ["media", index], msg: message }]);
}
function validateNativeMedia(row, next) {
  const record = evidence(row);
  const eligible = new Set((record?.entry_ids || []).map(id => manifest.assets[id].path));
  const before = typeof row.media === "string" ? JSON.parse(row.media) : row.media || [];
  const remaining = [...before];
  const counts = new Map();
  next.forEach((item, index) => {
    const key = `${item.kind}:${item.path}`;
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    const oldCount = before.filter(old => old.path === item.path && old.kind === item.kind).length;
    if (count > Math.max(1, oldCount)) invalid(index, "Duplicate media cannot be added");
    if (item.kind === "image" && eligible.has(item.path)) return;
    const existing = remaining.findIndex(old => sameMediaEntry(old, item));
    if (existing < 0) invalid(index, "Only this record's reviewed assets may be added or edited; existing legacy attachments are read-only");
    remaining.splice(existing, 1);
  });
}
function readAsset(entry, root = mirrorRoot) {
  if (!entry || !/^[a-f0-9]{64}$/.test(entry.id) || !allowlist.has(entry.path) ||
      !/^\/(catalog-products\/[a-z0-9-]+|catalog-source\/page-\d{3})\.webp$/.test(entry.path) ||
      entry.id !== digest(entry.path) || entry.mime !== "image/webp" || entry.kind !== "image")
    throw new Error("Invalid catalog media package entry");
  const filename = path.join(root, `${entry.id}.webp`);
  if (!fs.lstatSync(filename).isFile()) throw new Error("Catalog media package must contain regular files");
  const bytes = fs.readFileSync(filename);
  if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256 ||
      bytes.subarray(0, 4).toString() !== "RIFF" || bytes.subarray(8, 12).toString() !== "WEBP")
    throw new Error("Catalog media package integrity failure");
  return bytes;
}
function preview(row, id) {
  const record = evidence(row);
  if (!/^[a-f0-9]{64}$/.test(id || "") || !record?.entry_ids.includes(id))
    throw new AppError("media_not_found", "Reviewed media not found", 404);
  try { return { bytes: readAsset(manifest.assets[id]), mime: manifest.assets[id].mime }; }
  catch { throw new AppError("media_not_found", "Reviewed media unavailable", 404); }
}
function verifyPackage() {
  if (manifest.format !== "alageum-catalog-media-v1") throw new Error("Unknown catalog media package");
  const entries = Object.values(manifest.assets);
  const actual = fs.readdirSync(mirrorRoot).sort();
  const expected = entries.map(entry => `${entry.id}.webp`).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Unexpected catalog media package files");
  let bytes = 0;
  for (const entry of entries) bytes += readAsset(entry).length;
  for (const record of Object.values(manifest.records)) {
    if (record.entry_ids.some(id => !Object.hasOwn(manifest.assets, id))) throw new Error("Missing associated media");
  }
  return { records: Object.keys(manifest.records).length, assets: entries.length, bytes };
}
module.exports = { options, validateNativeMedia, preview, readAsset, verifyPackage, evidence };
