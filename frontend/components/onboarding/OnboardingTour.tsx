'use client';

import { useEffect } from 'react';
// Temporär deaktiviert wegen React 19 Kompatibilitätsproblemen mit react-joyride
// TODO: Reaktivieren wenn react-joyride React 19 unterstützt
// import dynamic from 'next/dynamic';
// const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
  steps: Array<{
    target: string;
    content: string;
    title?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';
  }>;
}

export default function OnboardingTour({ run, onComplete, steps }: OnboardingTourProps) {
  // Temporär deaktiviert wegen React 19 Kompatibilitätsproblemen
  // TODO: Reaktivieren wenn react-joyride React 19 unterstützt
  // Automatisch abschließen, damit der Flow nicht hängt
  useEffect(() => {
    if (run) {
      const timer = setTimeout(() => {
        onComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined; // Explicit return for all code paths
  }, [run, onComplete]);

  return null; // Temporär deaktiviert

  /* Original Code (wird reaktiviert wenn react-joyride React 19 unterstützt):
  return (
    <Joyride
      steps={joyrideSteps}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={(data) => {
        const { status } = data;
        if (status === 'finished' || status === 'skipped') {
          onComplete();
        }
      }}
      styles={{
        options: {
          primaryColor: '#10b981', // brand-green
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
        },
        buttonNext: {
          backgroundColor: '#10b981',
          color: 'white',
          borderRadius: 6,
        },
        buttonBack: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Zurück',
        close: 'Schließen',
        last: 'Fertig',
        next: 'Weiter',
        skip: 'Überspringen',
      }}
    />
  );
  */
}

