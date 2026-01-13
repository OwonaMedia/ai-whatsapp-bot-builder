'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

interface HelpIconProps {
  title?: string;
  content: string | React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
  docLink?: string; // Link zur Dokumentations-Sektion
}

/**
 * HelpIcon Component
 * Zeigt ein Fragezeichen-Icon, das bei Klick ein Pop-up mit Hilfetext öffnet
 */
export default function HelpIcon({ 
  title, 
  content, 
  className,
  size = 'md',
  position = 'bottom',
  docLink
}: HelpIconProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizes = {
    sm: 'w-3 h-3 text-xs',
    md: 'w-4 h-4 text-sm',
    lg: 'w-5 h-5 text-base',
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help',
          sizes[size],
          className
        )}
        aria-label="Hilfe anzeigen"
        title="Hilfe anzeigen"
      >
        ?
      </button>

      {/* Pop-up Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Pop-up Content */}
          <div
            className={cn(
              'absolute z-50 w-80 max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200 p-4',
              positions[position],
              'before:absolute before:w-2 before:h-2 before:bg-white before:border-l before:border-b before:border-gray-200 before:rotate-45',
              position === 'bottom' && 'before:-top-1 before:left-1/2 before:-translate-x-1/2',
              position === 'top' && 'before:-bottom-1 before:left-1/2 before:-translate-x-1/2 before:rotate-[225deg]',
              position === 'left' && 'before:-right-1 before:top-1/2 before:-translate-y-1/2 before:rotate-135',
              position === 'right' && 'before:-left-1 before:top-1/2 before:-translate-y-1/2 before:-rotate-45'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Hilfe schließen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="pr-6">
              {title && (
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                  {title}
                </h4>
              )}
              <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                {typeof content === 'string' ? (
                  <p className="whitespace-pre-line">{content}</p>
                ) : (
                  content
                )}
              </div>
              {docLink && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <a
                    href={docLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-green hover:underline flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Mehr in der Dokumentation
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * HelpIcon Inline - Zeigt Help-Icon direkt neben einem Label/Text
 */
export function HelpIconInline({ 
  title, 
  content, 
  className,
  size = 'sm',
  docLink,
}: Omit<HelpIconProps, 'position'>) {
  return (
    <span className={cn('inline-flex items-center gap-1 ml-1', className)}>
      <HelpIcon title={title} content={content} size={size} position="bottom" docLink={docLink} />
    </span>
  );
}

