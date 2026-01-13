'use client';

import dynamic from 'next/dynamic';

// Chatbot nur client-side rendern, um Hydration-Probleme zu vermeiden
// ssr: false garantiert, dass die Komponente NUR auf dem Client gerendert wird
// Kein zusätzlicher mounted Check nötig, da dynamic import das bereits handhabt
const MCPSupportChatbot = dynamic(
  () => import('@/components/support/MCPSupportChatbot'),
  { 
    ssr: false,
    // Loading-State während des dynamischen Imports
    loading: () => null, // Kein Loading-State, um Hydration zu vermeiden
  }
);

export default function MCPSupportChatbotWrapper() {
  // Mit ssr: false wird diese Komponente NUR auf dem Client gerendert
  // Kein zusätzlicher mounted Check erforderlich
  return <MCPSupportChatbot />;
}

