"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readCatalog } = require("../src/domain/catalog-source");
const { options, validateNativeMedia, preview, readAsset, verifyPackage } = require("../src/domain/catalog-media");
const { sameMedia, sourceDigest } = require("../src/domain/catalog-media-evidence");
const validation = require("../src/domain/catalog-validation");
const manifest = require("../data/catalog-media-manifest.json");
const publicManifest = require("../../frontend/lib/catalog/media-manifest.json");
const { importedProductId } = require("../src/domain/catalog-identity");
const records = readCatalog();
const imported = source => source.image ? [{ path: source.image, kind: "image", alt: source.imageCaption || "" }] : [];
const row = source => ({ public_key: source.id, source_data: source, media: imported(source), version: 1, transport_id: "fixture" });
const exception = records.find(record => record.id === "cat-bktp-modular-v001");

test("all 238 native media associations are derived from unchanged records/maps and exact canonical bytes", () => {
  execFileSync(process.execPath, [path.resolve(__dirname, "../../scripts/generate-catalog-media.mjs"), "--check"], { stdio: "pipe" });
  assert.deepEqual(verifyPackage(), { records: 238, assets: 60, bytes: 1452744 });
  let empty = 0;
  for (const source of records) {
    const result = options(row(source));
    assert.deepEqual(result.imported, imported(source));
    assert.deepEqual(result.source_pages, source.sourcePages || []);
    if (!result.reviewed.length) empty++;
    assert.equal(result.entries.length, result.reviewed.length);
    for (const entry of result.entries) {
      assert.equal(entry.path, result.reviewed[0].path);
      assert.ok(!entry.path.startsWith("/brand/"));
      assert.ok(entry.source_pages.every(page => source.sourcePages.includes(page)));
      assert.equal(preview(row(source), entry.id).bytes.length, entry.bytes);
    }
  }
  assert.equal(empty, 24);
});
test("reviewed page38 overrides the imported page39 evidence without making the crop editable", () => {
  const value = row(exception), choices = options(value);
  assert.equal(publicManifest.overrides[exception.id].database_id, importedProductId(exception.id));
  assert.equal(choices.imported[0].path, "/catalog-products/cat-bktp-modular.webp");
  assert.equal(choices.reviewed[0].path, "/catalog-source/page-038.webp");
  assert.equal(choices.entries[0].representation, "source-scan");
  assert.deepEqual(choices.entries[0].source_pages, [38]);
  assert.equal(choices.baseline_override, true);
  const reordered = [{ alt: value.media[0].alt, kind: "image", path: value.media[0].path }];
  assert.equal(options({ ...value, media: reordered }).baseline_override, true);
  validateNativeMedia(value, reordered);
  assert.throws(() => validateNativeMedia(value, [{ ...value.media[0], alt: "Edited" }]), error => error.status === 422);
  validateNativeMedia(value, choices.reviewed);
  validateNativeMedia(value, []);
  assert.equal(options({ ...value, media: [] }).baseline_override, false);
});
test("alt presence is distinct while JSONB object order does not affect immutable evidence", () => {
  const base = { path: "/catalog-products/cat-ktp-25-250.webp", kind: "image" };
  const values = [base, { ...base, alt: null }, { ...base, alt: "" }, { ...base, alt: "Description" }];
  for (let i = 0; i < values.length; i++) for (let j = 0; j < values.length; j++)
    assert.equal(sameMedia([values[i]], [values[j]]), i === j);
  assert.equal(sourceDigest({ z: [1, { b: 2, a: null }], a: false }), sourceDigest({ a: false, z: [1, { a: null, b: 2 }] }));
});
test("authoring rejects unrelated/brand/source-page choices, duplicates, and mutable evidence spoofing", () => {
  const value = row(records.find(source => source.image && source.id !== exception.id));
  const other = Object.values(manifest.assets).find(entry => entry.path !== value.media[0].path);
  for (const media of [
    [{ path: other.path, kind: "image" }], [{ path: "/brand/transformer.png", kind: "image" }],
    [{ path: "/catalog-source/page-001.webp", kind: "image" }], [value.media[0], value.media[0]],
  ]) assert.throws(() => validateNativeMedia(value, media), error => error.code === "validation_error");
  const fake = { ...value, source_data: {}, media: [], provenance: value.source_data, specs: value.source_data };
  assert.deepEqual(options(fake).entries, []);
  assert.throws(() => validateNativeMedia(fake, value.media));
  assert.deepEqual(options({ ...value, source_data: { ...value.source_data, name: "Changed source" } }).entries, []);
  for (const source of records.filter(source => !source.image)) assert.deepEqual(options(row(source)).entries, []);
});
test("valid existing legacy media survive omission, reordering and removal but not new edits", () => {
  const source = records.find(item => !item.image);
  const a = { path: "/brand/transformer.png", kind: "image", alt: null }, b = { path: "/catalog-source/page-001.webp", kind: "image" };
  const value = { ...row(source), media: [a, b] };
  validateNativeMedia(value, [b, a]);
  validateNativeMedia(value, [a]);
  validateNativeMedia(value, []);
  assert.throws(() => validateNativeMedia(value, [{ ...a, alt: "" }]));
  assert.throws(() => validateNativeMedia(value, [b, b]));
  validateNativeMedia({ ...value, media: [a, a] }, [a, a]);
  assert.throws(() => validateNativeMedia({ ...value, media: [a, a] }, [a, a, a]));
});
test("generic v1 retains its global safe-asset contract and validates kinds, count, alt and unsafe paths", () => {
  const parse = media => validation.parse(validation.patch, { version: 1, media });
  assert.deepEqual(parse([{ path: "/brand/transformer.png", kind: "image" }]).media, [{ path: "/brand/transformer.png", kind: "image" }]);
  const valid = row(exception).media[0];
  for (const unsafe of ["https://example.com/x.webp", "//example.com/x.webp", "/catalog-products/../brand/transformer.png", "/catalog-products/%2e%2e/x.webp", "/catalog-products/cat-bktp-modular.webp?x=1", "/catalog-products/cat-bktp-modular.webp#x", "/catalog-products//cat-bktp-modular.webp", "/catalog-products/cat-bktp-modular.svg"])
    assert.throws(() => parse([{ ...valid, path: unsafe }]), error => error.status === 422);
  for (const bad of [[{ ...valid, kind: "document" }], [{ ...valid, mime: "image/webp" }], [{ ...valid, alt: "a".repeat(1001) }], Array.from({ length: 51 }, () => valid)])
    assert.throws(() => parse(bad), error => error.status === 422);
  for (const alt of [undefined, null, "", "a".repeat(1000)]) parse([{ path: valid.path, kind: "image", ...(alt !== undefined ? { alt } : {}) }]);
});
test("preview identifiers bind to this exact immutable product and never resolve paths supplied by clients", () => {
  const value = row(exception), allowed = options(value).entries[0];
  const other = Object.values(manifest.assets).find(entry => entry.id !== allowed.id);
  for (const id of [other.id, "../public-assets.json", "%2e%2e", allowed.path, "https://example.com/a", "x".repeat(500)])
    assert.throws(() => preview(value, id), error => error.status === 404);
  assert.throws(() => preview({ ...value, source_data: {} }, allowed.id), error => error.status === 404);
});
test("release previews fail closed for missing, corrupt, symlinked or MIME-mismatched bytes", () => {
  const entry = options(row(exception)).entries[0];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "media-integrity-"));
  const target = path.join(directory, `${entry.id}.webp`);
  try {
    assert.throws(() => readAsset(entry, directory));
    fs.writeFileSync(target, Buffer.alloc(entry.bytes));
    assert.throws(() => readAsset(entry, directory));
    fs.writeFileSync(target, readAsset(entry));
    assert.throws(() => readAsset({ ...entry, mime: "image/svg+xml" }, directory));
    fs.unlinkSync(target);
    fs.symlinkSync(path.resolve(__dirname, `../data/catalog-media/${entry.id}.webp`), target);
    assert.throws(() => readAsset(entry, directory));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
