import { useEffect } from 'react';

const DEFAULT_TITLE = 'AuthExam - Secure Online Exam Authentication Platform';
const DEFAULT_DESCRIPTION = "AuthExam offers a robust and secure platform for online exam authentication, biometric verification, and exam center management.";

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
