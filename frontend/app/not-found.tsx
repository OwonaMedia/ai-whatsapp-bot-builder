'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to default locale homepage
    router.replace(`/${defaultLocale}`);
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
        <p className="text-gray-600">Weiterleitung...</p>
      </div>
    </div>
  );
}

