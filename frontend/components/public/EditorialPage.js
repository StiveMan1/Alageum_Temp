import PageIntro from './PageIntro';
import EditorialBlocks from './EditorialBlocks';

export default function EditorialPage({ page }) {
  return <article className="editorial-page site-container site-info-page" lang={page.locale_code}>
    <PageIntro label={page.title} title={page.title} />
    <EditorialBlocks body={page.body} />
  </article>;
}
