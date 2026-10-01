import EquipmentIcon from './EquipmentIcon';
import { getEquipmentIcon, iconConfidenceLabel } from '@/lib/catalog/models/iconMap';

/** Always an inline SVG: tiny scanned source drawings never stand in for an icon. */
export default function ProductIcon({ product, size = 56 }) {
  const icon = getEquipmentIcon(product);
  const description = `${iconConfidenceLabel(icon)}. ${icon.reason || ''}`;
  return <span className="product-shared-symbol" data-product-icon={product.id} data-icon-confidence={icon.confidence} data-icon-type={icon.type} title={description}>
    <EquipmentIcon type={icon.type} size={size} title={description}/>
    {icon.confidence === 'typical' && <span className="product-icon-approximation" aria-hidden="true">≈</span>}
  </span>;
}
