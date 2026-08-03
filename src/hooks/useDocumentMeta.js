import { useEffect } from 'react';

const DEFAULT_TITLE = 'AuthExam - Field Operator & Workforce Management';
const DEFAULT_DESCRIPTION = 'AuthExam is a workforce management platform for onboarding field operators, assigning service centers, tracking invoices, and managing approvals.';

// Updates the tab title / meta description per route for an SPA with no SSR.
export default function useDocumentMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | AuthExam` : DEFAULT_TITLE;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description || DEFAULT_DESCRIPTION);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (metaDescription) {
        metaDescription.setAttribute('content', DEFAULT_DESCRIPTION);
      }
    };
  }, [title, description]);
}
