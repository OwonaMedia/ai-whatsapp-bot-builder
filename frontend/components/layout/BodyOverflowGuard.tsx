'use client';

import { useEffect } from 'react';

export default function BodyOverflowGuard() {
  useEffect(() => {
    // Hydration-Sicherheit: Nur auf Client ausführen
    if (typeof window === 'undefined' || !document.body) {
      return;
    }

    const body = document.body;

    const bodyStyle = body.style;
    const prevOverflowX = bodyStyle.getPropertyValue('overflow-x');
    const prevOverflowY = bodyStyle.getPropertyValue('overflow-y');
    const hadOverflowHiddenClass = body.classList.contains('overflow-hidden');

    if (hadOverflowHiddenClass) {
      body.classList.remove('overflow-hidden');
    }

    bodyStyle.setProperty('overflow-x', 'hidden', 'important');
    bodyStyle.setProperty('overflow-y', 'auto', 'important');

    return () => {
      if (prevOverflowX) {
        bodyStyle.setProperty('overflow-x', prevOverflowX);
      } else {
        bodyStyle.removeProperty('overflow-x');
      }
      if (prevOverflowY) {
        bodyStyle.setProperty('overflow-y', prevOverflowY);
      } else {
        bodyStyle.removeProperty('overflow-y');
      }
    };
  }, []);

  return null;
}
