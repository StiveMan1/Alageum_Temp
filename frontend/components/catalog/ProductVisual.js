import Image from 'next/image';
import Link from 'next/link';
import ProductIcon from './ProductIcon';
export { default as ProductIcon } from './ProductIcon';
import EquipmentModel from './EquipmentModel';
import { getEquipmentVisual } from '@/lib/catalog/models/visualMap';

const visualLabel = (visual) => visual.confidence === 'source-matched'
  ? 'Общая схема конструкции по иллюстрации серии'
  : visual.confidence === 'source-only' ? 'Исходная иллюстрация серии; общая схема не подменяет конструкцию'
  : visual.confidence === 'unverified' ? 'Проверенное изображение конструкции отсутствует'
  : 'Типовая иллюстрация; конструкция конкретного исполнения не подтверждена';


function OriginalImage({ product, visual }) {
  const image = visual.fallbackImage || product.image;
  return <div className="product-visual">{image ? <Image src={image} alt={product.imageCaption || 'Исходная иллюстрация серии'} width={520} height={440}/> : <div className="product-no-image"><ProductIcon product={product} size={156}/><span>Условная схема типа</span></div>}<span className="catalog-meta">{image ? product.imageCaption || 'Иллюстрация серии; не фотография конкретного исполнения' : 'Проверенный чертёж конструкции не предоставлен'}</span></div>;
}

export default function ProductVisual({ product }) {
  const visual = getEquipmentVisual(product);
  return <div className="product-visual-stack" data-product-visual={visual.sourceFamilyId || product.id}>
    {visual.type ? <EquipmentModel type={visual.type}/> : <><OriginalImage product={product} visual={visual}/><p className="visual-mapping-note">{visual.fallbackImage ? 'Для этой конструкции используется изображение из источника. Общая 3D-схема ещё не подтверждена.' : 'Для этой позиции нужен чертёж производителя. Условный символ не подтверждает конструкцию изделия.'}</p></>}
    <div className="visual-provenance"><strong>{visualLabel(visual)}</strong>{visual.reason && <p>{visual.reason}</p>}{!!visual.sourcePages?.length && <div>{visual.sourcePages.map(page => <Link key={page} href={`/catalog/source?page=${page}`}>стр. {page}</Link>)}</div>}</div>
    {visual.type && (visual.fallbackImage || product.image) && <details className="product-original-illustration"><summary>Иллюстрация серии из исходного каталога</summary><OriginalImage product={product} visual={visual}/></details>}
  </div>;
}
