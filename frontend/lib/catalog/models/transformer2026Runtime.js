import manifest from './transformer2026RuntimeManifest.json' with { type: 'json' };
import { transformerRecordShape, recordShapeDigest } from './transformer2026Shape.js';
export const transformerRuntimeManifest=manifest;
const knownRecordIds = new Set(manifest.knownRecordIds);
export const isTransformer2026Record = product => product?.sourceId === manifest.sourceId || product?.sourceFileId === manifest.sourceFileId || knownRecordIds.has(product?.id);
export function getReviewedTransformerAsset(product, channel) {
 if(!product || !['geometry','icons'].includes(channel) || !Object.hasOwn(manifest[channel],product.id))return null;
 const approved=manifest[channel][product.id];
 return verifiedTransformerAsset(product, approved, manifest);
}
export function verifiedTransformerAsset(product, approved, manifest) {
 if(!product || !approved) return null;
 if(product.sourceId!==manifest.sourceId || product.sourceFileId!==manifest.sourceFileId || product.sourceSha256!==manifest.sourceSha256)return null;
 if(product.source==='api' && product.databaseId!==approved.database_id)return null;
 if(recordShapeDigest(transformerRecordShape(product))!==approved.record_shape_sha256)return null;
 return approved;
}
