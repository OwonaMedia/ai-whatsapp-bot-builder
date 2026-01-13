import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zugriff verweigert',
  robots: 'noindex,nofollow',
};

type Props = {
  clientIP: string;
};

export function AccessDenied({ clientIP }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 shadow-lg">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Zugriff verweigert
        </h1>
        
        <p className="mb-6 text-center text-gray-600">
          Deine IP-Adresse ist nicht berechtigt, auf diesen Bereich zuzugreifen.
        </p>
        
        <div className="mb-6 rounded-md bg-gray-100 p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Deine IP-Adresse:</span>
            <br />
            <code className="mt-1 block rounded bg-white px-2 py-1 font-mono text-xs">
              {clientIP}
            </code>
          </p>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          Bei Fragen kontaktiere den Administrator.
        </div>
      </div>
    </div>
  );
}
