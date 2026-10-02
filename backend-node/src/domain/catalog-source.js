"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
function readCatalog() {
  const root = path.resolve(__dirname, "../../data/catalog-import");
  const index = JSON.parse(fs.readFileSync(path.join(root, "products.json")));
  if (index.format !== "alageum-catalog-chunks-v1")
    throw new Error("Unknown catalog format");
  const records = [];
  for (const chunk of index.chunks) {
    if (path.isAbsolute(chunk.path) || chunk.path.split("/").includes(".."))
      throw new Error("Unsafe catalog path");
    const bytes = fs.readFileSync(path.join(root, chunk.path));
    if (createHash("sha256").update(bytes).digest("hex") !== chunk.sha256)
      throw new Error("Catalog checksum mismatch");
    const rows = JSON.parse(bytes);
    if (rows.length !== chunk.recordCount)
      throw new Error("Catalog chunk count mismatch");
    records.push(...rows);
  }
  if (records.length !== index.recordCount)
    throw new Error("Catalog record count mismatch");
  const overlay = JSON.parse(
    fs.readFileSync(path.join(root, "database-overlay.json")),
  );
  if (overlay.format !== "alageum-catalog-overlay-v1")
    throw new Error("Unknown catalog overlay");
  if (
    new Set(records.map((r) => r.id)).size !== records.length ||
    new Set(overlay.records.map((r) => r.id)).size !== overlay.records.length
  )
    throw new Error("Duplicate source keys");
  const byId = new Map(records.map((r) => [r.id, r]));
  for (const r of overlay.records) byId.set(r.id, r);
  if (
    byId.size !== overlay.recordCount ||
    new Set(overlay.order).size !== overlay.order.length ||
    overlay.order.length !== byId.size ||
    overlay.order.some((id) => !byId.has(id))
  )
    throw new Error("Incomplete catalog overlay");
  return overlay.order.map((id) => byId.get(id));
}
module.exports = { readCatalog };
