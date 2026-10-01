import './globals.css';
import './site-shell.css';
import './catalog.css';
import './public-pages.css';
import { AuthProvider } from '@/components/AuthProvider';
import { SelectionProvider } from '@/components/catalog/SelectionProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: { default: 'ALAGEUM Electric · Технический каталог', template: '%s · ALAGEUM Electric' }, description: 'Электротехническое оборудование ALAGEUM Electric: каталог, предприятия, решения и подготовка запроса.', robots: { index: false, follow: false } };
export default function RootLayout({ children }) {
  return <html lang="ru"><body><AuthProvider><SelectionProvider><SiteHeader /><main id="main-content" className="site-main">{children}</main><SiteFooter /></SelectionProvider></AuthProvider></body></html>;
}
