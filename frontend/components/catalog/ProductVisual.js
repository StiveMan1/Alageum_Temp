import { getEquipmentIcon } from '@/lib/catalog/models/iconMap';
import { sourcePageUrl } from '@/lib/catalog/sources';
import Image from 'next/image';
import Link from 'next/link';
import ProductIcon from './ProductIcon';
export { default as ProductIcon } from './ProductIcon';
import EquipmentModel from './EquipmentModel';
import { getEquipmentVisual } from '@/lib/catalog/models/visualMap';
import { getProductMedia } from '@/lib/catalog/media';

const visualLabel = (visual) => visual.confidence === 'source-matched'
  ? 'Общая схема конструкции по иллюстрации серии'
  : visual.confidence === 'source-only' ? 'Исходная иллюстрация серии; общая схема не подменяет конструкцию'
  : visual.confidence === 'unverified' ? 'Проверенное изображение конструкции отсутствует'
  : 'Типовая иллюстрация; конструкция конкретного исполнения не подтверждена';


function OriginalImage({ product, media }) {
  return <div className="product-visual">{media.image ? <Image src={media.image} alt={media.alt} width={520} height={440}/> : <div className="product-no-image"><ProductIcon product={product} size={156}/><span>Условная схема типа</span></div>}<span className="catalog-meta">{media.caption}</span>{!!media.sourcePages.length && <div className="catalog-meta">{media.sourcePages.map(page => <Link key={page} href={sourcePageUrl(media.sourceId, page)}>стр. {page}</Link>)}</div>}</div>;
}

export default function ProductVisual({ product }) {
  const visual = getEquipmentVisual(product);
  const icon = getEquipmentIcon(product);
  const media = getProductMedia(product, visual);
  const matchesReviewedImage = !!media.image && media.image === visual.fallbackImage;
  const showReviewedProvenance = !!visual.type || matchesReviewedImage;
  return <div className="product-visual-stack" data-product-visual={visual.sourceFamilyId || product.id}>
    {visual.type ? <EquipmentModel type={visual.type} previewIconType={icon.type} previewIconReason={icon.reason}/> : <><OriginalImage product={product} media={media}/><p className="visual-mapping-note">{media.image ? 'Показана выбранная иллюстрация. Общая 3D-схема этой конструкции ещё не подтверждена.' : 'Для этой позиции нужен чертёж производителя. Условный символ не подтверждает конструкцию изделия.'}</p></>}
    {showReviewedProvenance ? <div className="visual-provenance"><strong>{visualLabel(visual)}</strong>{visual.reason && <p>{visual.reason}</p>}{!!visual.sourcePages?.length && <div>{visual.sourcePages.map(page => <Link key={page} href={sourcePageUrl(product, page)}>стр. {page}</Link>)}</div>}</div> : <div className="visual-provenance"><strong>{media.image ? 'Конструкция конкретного исполнения по выбранной иллюстрации не подтверждена' : 'Условный символ не подтверждает конструкцию конкретного исполнения'}</strong></div>}
    {visual.type && media.image && <details className="product-original-illustration"><summary>{media.representation === 'source-scan' ? 'Страница исходного каталога' : 'Исходная иллюстрация'}</summary><OriginalImage product={product} media={media}/></details>}
  </div>;
}
