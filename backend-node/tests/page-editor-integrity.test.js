"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { verifyPageEditorAdapter } = require("../scripts/check-page-editor-adapter");
const official = require("../data/compatibility/native-page-editor.json");

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "page-editor-integrity-"));
  const packageRoot = path.join(root, "node_modules/@strapi/content-manager");
  const expected = { ...official, files: {} };
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({ name: official.package, version: official.version }));
  fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ packages: { "node_modules/@strapi/content-manager": { integrity: official.package_integrity } } }));
  for (const relative of Object.keys(official.files)) {
    const filename = path.join(packageRoot, relative);
    const bytes = `synthetic integrity fixture: ${relative}`;
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, bytes);
    expected.files[relative] = createHash("sha256").update(bytes).digest("hex");
  }
  try { run({ root, packageRoot, expected, first: Object.keys(expected.files)[0] }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test("Page editor adapter verifies the installed official package without rewriting it", () => {
  assert.deepEqual(verifyPageEditorAdapter(), { version: "5.56.0", files: 16 });
});

test("Page editor adapter refuses package version and lock integrity drift", () => {
  fixture(({ root, packageRoot, expected }) => {
    assert.equal(verifyPageEditorAdapter(root, expected).files, 16);
    fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({ name: official.package, version: "5.56.1" }));
    assert.throws(() => verifyPageEditorAdapter(root, expected), /package or lock integrity/);
  });
  fixture(({ root, expected }) => {
    fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({ packages: {} }));
    assert.throws(() => verifyPageEditorAdapter(root, expected), /package or lock integrity/);
  });
});

test("Page editor adapter refuses changed, missing, or redirected native bytes", () => {
  for (const change of ["changed", "missing", "symlink"]) fixture(({ root, packageRoot, expected, first }) => {
    const filename = path.join(packageRoot, first);
    if (change === "changed") fs.appendFileSync(filename, "altered");
    else {
      fs.unlinkSync(filename);
      if (change === "symlink") fs.symlinkSync(path.join(packageRoot, "package.json"), filename);
    }
    assert.throws(() => verifyPageEditorAdapter(root, expected));
  });
});

test("Page editor adapter refuses incomplete or traversing manifests", () => {
  fixture(({ root, expected, first }) => {
    const incomplete = { ...expected, files: { ...expected.files } };
    delete incomplete.files[first];
    assert.throws(() => verifyPageEditorAdapter(root, incomplete), /Incomplete/);
    const traversing = { ...expected, files: { ...incomplete.files, "dist/admin/../../outside.js": expected.files[first] } };
    assert.throws(() => verifyPageEditorAdapter(root, traversing), /Invalid native Page editor integrity entry/);
  });
});
