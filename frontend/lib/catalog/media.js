import manifest from './media-manifest.json' with { type: 'json' };

const isMedia = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const imagePath = /^\/(catalog-products|catalog-source|brand)\/[A-Za-z0-9_./-]+\.(webp|png|jpe?g|gif|avif)$/i;

// JSONB can reorder object keys. Media order and the presence of alt are meaningful.
export function sameOrderedMedia(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => {
    const other = right[index];
    return isMedia(item) && isMedia(other) && item.path === other.path && item.kind === other.kind
      && Object.hasOwn(item, 'alt') === Object.hasOwn(other, 'alt') && item.alt === other.alt;
  });
}

export function selectApiProductImage(id, media, databaseId) {
  const override = Object.hasOwn(manifest.overrides, id) ? manifest.overrides[id] : null;
  // This narrowly corrects untouched imported mismatches without rewriting saved media.
  const selected = override && databaseId === override.database_id && sameOrderedMedia(media, override.imported) ? override.reviewed : media;
  if (!Array.isArray(selected)) return null;
  const image = selected.find(item => isMedia(item) && item.kind === 'image' && typeof item.path === 'string'
    && imagePath.test(item.path) && !item.path.split('/').some(segment => segment === '.' || segment === '..'));
  return image ? { ...image } : null;
}

export function getProductMedia(product, visual) {
  const image = product.source === 'api' ? product.image : visual.fallbackImage || product.image;
  if (!image) return { image: null, alt: '', caption: 'Проверенный чертёж конструкции не предоставлен', sourcePages: [], representation: null };
  const asset = Object.hasOwn(manifest.assets, image) ? manifest.assets[image] : null;
  const pageMatch = /^\/catalog-source\/page-(\d{3})\.webp$/.exec(image);
  const scanPage = pageMatch ? Number(pageMatch[1]) : null;
  const representation = asset?.representation || (scanPage >= 1 && scanPage <= 104 ? 'source-scan' : image.startsWith('/catalog-products/') ? 'crop' : null);
  const sourcePages = [...(asset?.source_pages || (representation === 'source-scan' ? [scanPage] : []))];
  const caption = representation === 'source-scan'
    ? `Страница ${sourcePages[0]} исходного каталога; не фотография изделия`
    : representation === 'crop'
      ? 'Иллюстрация серии из исходного каталога; не фотография конкретного исполнения'
      : 'Иллюстрация; конструкция конкретного исполнения не подтверждена';
  // A static reviewed fallback can differ from the record's original image and alt.
  const alt = product.imageCaption === '' ? '' : product.source !== 'api' && image !== product.image ? null : product.imageCaption;
  return { image, alt: typeof alt === 'string' ? alt : caption, caption, sourcePages, representation };
}
