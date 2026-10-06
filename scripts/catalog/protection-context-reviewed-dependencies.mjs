// A narrow raw-byte successor to PR33. No historical approval is rewritten and
// this leaf never invokes historical adapters, preventing authority cycles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertBrowserAssertionDependencies } from './catalog-browser-reviewed-dependencies.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const protectionContextReviewDir = 'docs/catalog-transformers-2026/review/protection-context-integration';
const priorDir = 'docs/catalog-transformers-2026/review/measurement-column-completion';
export const protectionContextClearancePath = `${protectionContextReviewDir}/clearance.json`;
export const protectionContextBaselineCommit = '5de8251ffd15d8799c8f187cf445107c295811e4';
export const protectionContextBaselineTree = '911b4fe4db506ab426bce0a522daa1ea17addb71';
export const protectionContextAmendmentFiles = Object.freeze([
  'frontend/components/catalog/Comparison.js',
  'frontend/components/catalog/EquipmentIcon.js',
  'frontend/components/catalog/LiveCatalog.js',
  'frontend/components/catalog/ProductVisual.js',
  'frontend/e2e/catalog.spec.js',
  'frontend/lib/catalog/apiData.js',
  'frontend/lib/catalog/models/geometry.js',
  'frontend/lib/catalog/models/iconMap.js',
  'frontend/lib/catalog/models/iconTypes.js',
  'frontend/lib/catalog/models/types.js',
  'frontend/lib/catalog/models/visualMap.js',
  'frontend/next.config.mjs',
  'frontend/scripts/build-preview.mjs',
  'frontend/tests/catalog-admin.test.mjs',
  'frontend/tests/catalog-media.test.mjs',
  'frontend/tests/equipment-icons.test.mjs',
  'frontend/tests/equipment-source-expansion.test.mjs',
  'frontend/tests/equipment-transformer2026-assets.test.mjs',
  'frontend/tests/equipment-visual-map.test.mjs',
  'frontend/tests/measurement-column-amendment.test.mjs',
  'frontend/tests/measurement-column-completion.test.mjs',
  'frontend/tests/source-asset-completion.test.mjs',
  'frontend/tests/transformer-asset-completion.test.mjs',
  'scripts/catalog/measurement-column-reviewed-dependencies.mjs',
  'scripts/catalog/source-asset-reviewed-dependencies.mjs',
  'scripts/check-measurement-column-completion.mjs',
  'scripts/check-source-asset-completion.mjs',
]);
export const protectionContextRequiredFiles = Object.freeze([
  'frontend/lib/catalog/comparison.js', 'frontend/tests/catalog-comparison-specs.test.mjs', 'frontend/tests/catalog-api-variant-specs.test.mjs',
  'frontend/tests/helpers/historical-reviewed-bytes.mjs',
  'frontend/e2e/helpers/catalog-viewport.js',
  'backend-node/data/catalog-release.json',
  'backend-node/src/domain/catalog-identity.js',

  'frontend/package.json',
  'frontend/package-lock.json',
  'frontend/playwright.catalog.config.js',
  'frontend/jsconfig.json',
  'frontend/eslint.config.mjs',
  'frontend/components/catalog/EquipmentModel.js',
  'frontend/components/catalog/ProductIcon.js',
  'frontend/lib/catalog/media.js',
  'frontend/lib/quotes/model.js',
  'frontend/lib/inquiry/model.js',
  'frontend/lib/catalog/query.js',
  'frontend/lib/catalog/sources.js',
  'frontend/lib/catalog/sources-manifest.json',
  'scripts/import-catalog.py',
  'scripts/catalog/measurement-column-asset-snapshot.mjs',
  'frontend/public/catalog-source/page-034.webp',
  'frontend/public/catalog-source/page-035.webp',
  'frontend/public/catalog-source/page-068.webp',
  'frontend/public/catalog-source/page-069.webp',
  'frontend/public/catalog-products/cat-shnn.webp',
  'frontend/public/catalog-products/cat-ptm-tded.webp',

  `${priorDir}/clearance.json`, `${priorDir}/independent-review.json`,
  ...['README.md', 'historical-test-bytes.json', 'baseline-api-spec-audit.json', 'baseline-outputs.json', 'baseline-dependencies.json', 'fixed-dependencies.json', 'baseline-client-consumers.json', 'protection-prototype-frozen-files.json',
    'protection-prototype-independent-review.json', 'protection-prototype-test.mjs',
    'context-prototype-frozen-files.json', 'context-prototype-independent-review.json'].map(file => `${protectionContextReviewDir}/${file}`),
  'frontend/.gitignore', 'frontend/lib/catalog/models/protectionExampleRuntime.js',
  'frontend/lib/catalog/models/protectionExampleRuntimeManifest.json',
  ...['Types.js', 'Geometry.js', 'Icons.js', 'SourceReview.md'].map(name => `frontend/lib/catalog/models/protectionExample${name}`),
  'frontend/scripts/render-protection-example-prototype.mjs', 'frontend/scripts/verify-source-context-build.mjs',
  'frontend/tests/protection-example-prototype.test.mjs', 'frontend/tests/protection-context-integration.test.mjs',
  'frontend/tests/protection-context-amendment.test.mjs', 'frontend/tests/source-context-build-gate.test.mjs',
  'frontend/lib/catalog/source-context/sourceContextBuildProof.js',
  'frontend/lib/catalog/source-context/sourceContextManifest.json', 'frontend/lib/catalog/source-context/sourceContexts.js',
  ...['CatalogSourceContext.js', 'CatalogSourceContext.module.css', 'SourceContextImage.js'].map(name => `frontend/components/catalog/source-context/${name}`),
  ...['page-035-left-example-native.png', 'page-035-right-example-native.png', 'source-ptm.png', 'source-tde.png'].map(name => `frontend/public/catalog-source-context/${name}`),
  'frontend/tests/catalog-source-context-render.test.mjs', 'frontend/tests/catalog-source-context.test.mjs',
  'scripts/catalog/protection-context-asset-snapshot.mjs', 'scripts/catalog/protection-context-reviewed-dependencies.mjs',
  'scripts/check-protection-context-integration.mjs',
]);
const fixed = Object.freeze({
  [`${protectionContextReviewDir}/baseline-api-spec-audit.json`]: 'ef3ea8944fd248e83b690e7a3d69554a04b4df73a3f7e4380384a06aef6e2323',
  [`${protectionContextReviewDir}/historical-test-bytes.json`]: 'e91cb759740ba3359dc4c1d336fec900c597dfede4bd7fe206450550c926e020',
  [`${protectionContextReviewDir}/fixed-dependencies.json`]: '15b029b03ec7c088d98e09d31e333ff36de6654a5f2ffbdf81061b6407a8b320',
  [`${protectionContextReviewDir}/baseline-client-consumers.json`]: '69ab2ac713fdb0f74141e5ed12c276fb22820254f3976947ede922205deddb1b',
  [`${protectionContextReviewDir}/baseline-dependencies.json`]: 'abf89ceda42f73af88c4a495cc03005f724ef179cf27d384ec2e6380a53c37f3',
  [`${priorDir}/clearance.json`]: 'de40a225d16414831b0944fc338fee1672951ed503a8b264f993ca22311022ca',
  [`${priorDir}/independent-review.json`]: '828200e0902b69981ca2242b39d26ed7794cb373ff9a25f669f11892547e52a1',
  [`${protectionContextReviewDir}/baseline-outputs.json`]: 'edc00fd04790d5493d14c0965cc3fc3363af2d7ad2ca0c5b702887bd2e8a0b0b',
  [`${protectionContextReviewDir}/protection-prototype-frozen-files.json`]: '8858d862a2ed387f0c2e22c1b7ff35763a15b4c6c9fea4acb0f90ecc475a4ba3',
  [`${protectionContextReviewDir}/protection-prototype-independent-review.json`]: '0e87f37c9f7baacf4d30c34e9d647f4fdbffc5f1f701d0c91000255d5eecaaa7',
  [`${protectionContextReviewDir}/context-prototype-frozen-files.json`]: 'b54ab998e961096555aae2b58a4d7eea9f357686ded60a8f2b9dff9008fbbc9d',
  [`${protectionContextReviewDir}/context-prototype-independent-review.json`]: '0251ea10a873797e0fa7d45139f5e2c21b5b1f7f0ef0997fe6b6c1b624657824',
});
export const protectionContextDigest = bytes => createHash('sha256').update(bytes).digest('hex');
export const readProtectionContextBytes = file => {
  assert.ok(typeof file === 'string' && file && !path.isAbsolute(file) && !file.split('/').includes('..'), 'Invalid protection/context review path');
  return fs.readFileSync(path.join(root, file));
};

/** Candidate integrity is evidence, never release approval. */
export function verifyProtectionContextDependencyFiles(clearance, read = readProtectionContextBytes) {
  const hash = file => protectionContextDigest(read(file));
  assert.equal(clearance.format, 'alageum-protection-context-clearance-v1');
  assert.equal(clearance.baselineCommit, protectionContextBaselineCommit); assert.equal(clearance.baselineTree, protectionContextBaselineTree);
  for (const [file, expected] of Object.entries(fixed)) assert.equal(hash(file), expected, `Changed frozen protection/context input ${file}`);
  for (const [file, expected] of Object.entries(JSON.parse(read(`${protectionContextReviewDir}/fixed-dependencies.json`)))) assert.equal(hash(file), expected, `Changed fixed build/source/consumer dependency ${file}`);
  const prior = JSON.parse(read(`${priorDir}/clearance.json`)).dependencies.reviewedFiles;
  const baseline = JSON.parse(read(`${protectionContextReviewDir}/baseline-dependencies.json`));
  const { amendments, reviewedFiles } = clearance.dependencies;
  assert.deepEqual(Object.keys(baseline).sort(), [...protectionContextAmendmentFiles].sort(), 'Changed successor baseline scope');
  assert.deepEqual(Object.keys(amendments).sort(), [...protectionContextAmendmentFiles].sort(), 'Incomplete or overbroad protection/context amendment');
  const required = [...new Set([...Object.keys(prior), ...protectionContextAmendmentFiles, ...protectionContextRequiredFiles])].sort();
  assert.deepEqual(Object.keys(reviewedFiles).sort(), required, 'Incomplete or overbroad protection/context dependency scope');
  for (const [file, expected] of Object.entries(prior)) {
    if (Object.hasOwn(amendments, file)) assert.equal(baseline[file], expected, `Wrong historical PR33 pin ${file}`);
    else assert.equal(hash(file), expected, `Changed unamended PR33 dependency ${file}`);
  }
  for (const file of protectionContextAmendmentFiles) {
    assert.equal(amendments[file].baselineSha256, baseline[file], `Wrong protection/context baseline ${file}`);
    assert.equal(amendments[file].reviewedSha256, reviewedFiles[file], `Changed successor amendment pin ${file}`);
    assert.notEqual(amendments[file].reviewedSha256, baseline[file], `Unnecessary successor amendment ${file}`);
  }
  assertBrowserAssertionDependencies(reviewedFiles, read);
  const prototype = JSON.parse(read(`${protectionContextReviewDir}/protection-prototype-frozen-files.json`));
  for (const entry of prototype.files) {
    const file = entry.path.endsWith('/protection-example-prototype.test.mjs') ? `${protectionContextReviewDir}/protection-prototype-test.mjs` : entry.path;
    assert.equal(hash(file), entry.sha256, `Changed reviewed protection prototype ${file}`);
  }
  const context = JSON.parse(read(`${protectionContextReviewDir}/context-prototype-frozen-files.json`));
  for (const [file, entry] of Object.entries(context.files)) assert.equal(hash(file), entry.sha256, `Changed reviewed context prototype ${file}`);
  assert.equal(clearance.bindingsSha256, hash('frontend/lib/catalog/models/protectionExampleRuntimeManifest.json'));
  assert.equal(clearance.contextManifestSha256, hash('frontend/lib/catalog/source-context/sourceContextManifest.json'));
  assert.equal(clearance.baselineOutputsSha256, hash(`${protectionContextReviewDir}/baseline-outputs.json`));
  return clearance;
}

export function verifyProtectionContextDependencyAmendment(clearance, read = readProtectionContextBytes) {
  assert.equal(clearance.status, 'approved-bounded-protection-context', 'Protection/context integration still requires independent approval');
  verifyProtectionContextDependencyFiles(clearance, read);
  assert.equal(clearance.reviewReport, `${protectionContextReviewDir}/independent-review.json`);
  assert.equal(protectionContextDigest(read(clearance.reviewReport)), clearance.reviewReportSha256, 'Changed independent protection/context review');
  const review = JSON.parse(read(clearance.reviewReport));
  assert.equal(review.format, 'alageum-protection-context-independent-review-v1'); assert.equal(review.status, clearance.status);
  assert.equal(review.baselineCommit, protectionContextBaselineCommit); assert.equal(review.baselineTree, protectionContextBaselineTree);
  assert.equal(review.approvedDependenciesSha256, protectionContextDigest(JSON.stringify(clearance.dependencies)));
  assert.equal(review.approvedBindingsSha256, clearance.bindingsSha256); assert.equal(review.approvedContextManifestSha256, clearance.contextManifestSha256);
  assert.equal(review.approvedBaselineOutputsSha256, clearance.baselineOutputsSha256);
  assert.deepEqual(review.refinedModelIds, ['cat-ptm-tded-v012', 'cat-ptm-tded-v013']);
  assert.deepEqual(review.refinedIconIds, ['cat-ptm-tded', 'cat-ptm-tded-v012', 'cat-ptm-tded-v013']);
  const contextIds = Object.keys(JSON.parse(read('frontend/lib/catalog/source-context/sourceContextManifest.json')).records).sort();
  assert.deepEqual(review.contextRecordIds, contextIds); assert.equal(contextIds.length, 24);
  assert.deepEqual(review.counts, { productBodies: 843, legacyRecords: 238, oldModelTypes: 126, oldIconTypes: 136,
    newModelTypes: 2, newIconTypes: 3, choiceRecords: 36, choices: 74, ntmiSourcePreviews: 2,
    sourceGroundedDefault3D: 464, sourceBasedIcons: 465, explicitConstructionGaps: 243, constructionGapFamilies: 29,
    sourceContextRecords: 24, newProducts: 0, confidencePromotions: 0, apiSummaryCorrections: 23, comparisonCellCorrections: 3 });
  return clearance;
}

// Batch one exact expected map. Current bytes are freshly hashed on every call;
// approval is checked once for that map, with no cache or reusable proof token.
export function assertProtectionContextForwardDependencies(expectedFiles, read = readProtectionContextBytes) {
  const changed = Object.entries(expectedFiles).map(([file, expected]) => ({ file, expected, actual: protectionContextDigest(read(file)) })).filter(item => item.actual !== item.expected);
  if (!changed.length) return;
  for (const { file } of changed) assert.ok(protectionContextAmendmentFiles.includes(file), `Changed unreviewed protection/context dependency ${file}`);
  const clearance = verifyProtectionContextDependencyAmendment(JSON.parse(read(protectionContextClearancePath)), read);
  for (const { file, expected } of changed) {
    assert.equal(clearance.dependencies.amendments[file].baselineSha256, expected, `Wrong historical protection/context dependency ${file}`);
    assertBrowserAssertionDependencies({ [file]: clearance.dependencies.amendments[file].reviewedSha256 }, read);
  }
}
export function assertProtectionContextForwardDependency(file, expected, read = readProtectionContextBytes) {
  return assertProtectionContextForwardDependencies({ [file]: expected }, read);
}

// Historical adapters may see only this independently attested predecessor hash.
// The real raw-byte verifier above always examines the current files themselves.
export function protectionContextHistoricalHash(file, read = readProtectionContextBytes) {
  const actual = protectionContextDigest(read(file));
  if (!protectionContextAmendmentFiles.includes(file)) return actual;
  const baseline = JSON.parse(read(`${protectionContextReviewDir}/baseline-dependencies.json`));
  if (actual === baseline[file]) return actual;
  const clearance = verifyProtectionContextDependencyAmendment(JSON.parse(read(protectionContextClearancePath)), read);
  assertBrowserAssertionDependencies({ [file]: clearance.dependencies.amendments[file].reviewedSha256 }, read);
  return clearance.dependencies.amendments[file].baselineSha256;
}

// PR32 froze these presentation adapters along with its source inputs. Only these
// two exact files have later presentation amendments; source evidence stays fixed.
export function assertProtectionContextSourceInputs(expectedFiles, read = readProtectionContextBytes) {
  const changed = Object.fromEntries(Object.entries(expectedFiles).filter(([file, expected]) => protectionContextDigest(read(file)) !== expected));
  for (const file of Object.keys(changed)) assert.ok(['frontend/components/catalog/ProductVisual.js', 'frontend/lib/catalog/apiData.js'].includes(file), `Changed immutable source input ${file}`);
  assertProtectionContextForwardDependencies(changed, read);
}
export function assertProtectionContextSourceInput(file, expected, read = readProtectionContextBytes) {
  return assertProtectionContextSourceInputs({ [file]: expected }, read);
}
