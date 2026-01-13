'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Etwas ist schiefgelaufen
          </h1>
          <p className="text-gray-600 mb-6">
            Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.
          </p>

          {error.digest && (
            <p className="text-xs text-gray-400 mb-4">
              Fehler-ID: {error.digest}
            </p>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-dark transition-colors"
            >
              Erneut versuchen
            </button>
            <Link
              href="/de"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

