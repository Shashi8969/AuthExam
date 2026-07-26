import { useEffect } from 'react';

const DEFAULT_TITLE = 'AuthExam - Field Operator & Workforce Management';
const DEFAULT_DESCRIPTION =
  'AuthExam is a workforce management platform for onboarding field operators, assigning service centers, tracking invoices, and managing approvals.';

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

// Updates the document <title>, meta description, Open Graph tags, and
// canonical link for the current route. This is a client-rendered SPA with
// a single static index.html, so without this every page would share the
// same title/description in search results - this is the fix for that.
export default function useDocumentMeta({ title, description, path, noindex } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | AuthExam` : DEFAULT_TITLE;

    setMeta('description', description || DEFAULT_DESCRIPTION);
    setMeta('og:title', title ? `${title} | AuthExam` : DEFAULT_TITLE, 'property');
    setMeta('og:description', description || DEFAULT_DESCRIPTION, 'property');
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    if (path) {
      const url = `${window.location.origin}${path}`;
      setCanonical(url);
      setMeta('og:url', url, 'property');
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, path, noindex]);
}
