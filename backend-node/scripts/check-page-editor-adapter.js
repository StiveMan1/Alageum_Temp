"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const manifest = require("../data/compatibility/native-page-editor.json");

function verifyPageEditorAdapter(projectRoot = path.resolve(__dirname, ".."), expected = manifest) {
  const packageRoot = path.join(projectRoot, "node_modules", "@strapi", "content-manager");
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, "package-lock.json"), "utf8"));
  if (packageJson.name !== expected.package || packageJson.version !== expected.version ||
      lock.packages?.["node_modules/@strapi/content-manager"]?.integrity !== expected.package_integrity) {
    throw new Error("Review the pinned native Page editor adapter before changing its package or lock integrity");
  }
  const realRoot = fs.realpathSync(packageRoot);
  const entries = Object.entries(expected.files);
  if (entries.length !== 16) throw new Error("Incomplete native Page editor integrity manifest");
  for (const [relative, digest] of entries) {
    if (!relative.startsWith("dist/admin/") || relative.split("/").includes("..") || !/^[a-f0-9]{64}$/.test(digest)) {
      throw new Error("Invalid native Page editor integrity entry");
    }
    const filename = path.join(packageRoot, relative);
    if (!fs.lstatSync(filename).isFile() || !fs.realpathSync(filename).startsWith(`${realRoot}${path.sep}`)) {
      throw new Error(`Native Page editor must use an unredirected package file: ${relative}`);
    }
    if (createHash("sha256").update(fs.readFileSync(filename)).digest("hex") !== digest) {
      throw new Error(`Native Page editor package bytes changed; review the adapter: ${relative}`);
    }
  }
  return { version: expected.version, files: entries.length };
}

if (require.main === module) {
  const result = verifyPageEditorAdapter();
  console.log(`Native Page editor adapter verified: Strapi ${result.version}, ${result.files} unchanged official package files`);
}

module.exports = { verifyPageEditorAdapter };
