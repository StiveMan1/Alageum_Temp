import { historicalDependencyHash } from './source-asset-reviewed-dependencies.mjs';
// A source/geometry approval is immutable. Only independently reviewed integration
// changes may replace its exact old dependency hash with one exact new hash.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const fileHash = file => {
  assert.ok(typeof file === 'string' && !path.isAbsolute(file) && !file.split('/').includes('..'));
  return historicalDependencyHash(file);
};
export const transformerIntegrationAmendmentFiles = Object.freeze([
  'frontend/lib/catalog/models/transformer2026Runtime.js',
  'frontend/lib/catalog/models/transformerExecutionChoices.js',
  'frontend/lib/catalog/models/visualMap.js',
  'frontend/lib/catalog/models/iconMap.js',
  'frontend/components/catalog/ProductVisual.js',
  'scripts/approve-transformer-execution-choices.mjs',
]);

export function assertReviewedTransformerDependency(file, historicalHash, historicalApproval) {
  const actual = fileHash(file);
  if (actual === historicalHash) return;
  assert.ok(transformerIntegrationAmendmentFiles.includes(file), `Changed reviewed dependency ${file}`);
  const supplement = read('docs/catalog-transformers-2026/review/asset-completion/clearance.json');
  assert.equal(supplement.format, 'alageum-transformer-asset-completion-clearance-v1');
  assert.equal(supplement.status, 'approved-bounded-supplement');
  for (const key of ['sourceFileId', 'sourceSha256', 'inventorySha256']) assert.equal(supplement[key], historicalApproval[key]);
  assert.equal(fileHash(supplement.reviewReport), supplement.reviewReportSha256, 'Changed independent integration amendment');
  const review = read(supplement.reviewReport);
  assert.equal(review.format, 'alageum-transformer-asset-completion-independent-review-v1');
  assert.equal(review.status, 'approved-bounded-supplement');
  for (const key of ['sourceFileId', 'sourceSha256', 'inventorySha256']) assert.equal(review[key], supplement[key]);
  assert.equal(review.approvedDependenciesSha256, digest(JSON.stringify(supplement.dependencies)), 'Changed approved integration dependencies');
  const verifierFile = 'scripts/catalog/transformer-reviewed-dependencies.mjs';
  assert.equal(fileHash(verifierFile), supplement.dependencies.reviewedFileHashes[verifierFile], 'Changed integration verifier');
  const amendment = supplement.dependencies.reviewedIntegrationAmendments?.[file];
  assert.ok(amendment, `Unreviewed integration change ${file}`);
  assert.equal(amendment.historicalSha256, historicalHash, `Wrong historical integration dependency ${file}`);
  assert.equal(amendment.reviewedSha256, actual, `Changed amended integration dependency ${file}`);
  assert.equal(supplement.dependencies.reviewedFileHashes[file], actual, `Missing exact integration pin ${file}`);
}
