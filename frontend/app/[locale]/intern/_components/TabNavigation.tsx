'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';

export type TabId = 'overview' | 'tickets' | 'external-changes';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  locale: string;
}

export function TabNavigation({ activeTab, onTabChange, locale }: TabNavigationProps) {
  const t = useTranslations('internalPortal.tabs');
  
  const TABS: Array<{ id: TabId; icon: string }> = [
    { id: 'overview', icon: '📊' },
    { id: 'tickets', icon: '🎫' },
    { id: 'external-changes', icon: '🔄' },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-2" aria-label="Tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'px-4 py-3 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="mr-2">{tab.icon}</span>
            {t(tab.id)}
          </button>
        ))}
      </nav>
    </div>
  );
}

