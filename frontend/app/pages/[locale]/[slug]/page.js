import { cache } from 'react';
import { notFound } from 'next/navigation';
import EditorialPage from '@/components/public/EditorialPage';
import { loadEditorialPage } from '@/lib/api/pagesServer';
import { editorialMetadata } from '@/lib/public/pages';
import '../../editorial-pages.css';

// Request-local memoization shares metadata/render reads without storing page
// content across requests. This route has no ancestral loading/Suspense shell.
const getPage = cache(async (locale, slug) => {
  const page = await loadEditorialPage(locale, slug);
  if (!page) notFound();
  return page;
});

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  return editorialMetadata(await getPage(locale, slug), process.env.PAGES_SITE_ORIGIN);
}

export default async function Page({ params }) {
  const { locale, slug } = await params;
  return <EditorialPage page={await getPage(locale, slug)} />;
}
