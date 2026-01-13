'use client';

import { useEffect, useState } from 'react';

export default function ChatbotTest() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[ChatbotTest] Komponente gemountet - sollte sichtbar sein!');
    setMounted(true);
    // Prüfe ob Element im DOM ist
    setTimeout(() => {
      const el = document.getElementById('chatbot-test-button');
      console.log('[ChatbotTest] Element im DOM:', el ? 'JA' : 'NEIN', el);
      if (el) {
        console.log('[ChatbotTest] Element Styles:', window.getComputedStyle(el));
      }
    }, 1000);
  }, []);
  
  // Hydration-Sicherheit: Nicht rendern bis nach Mount
  if (!mounted) {
    return null;
  }

  console.log('[ChatbotTest] Rendering Test-Button');
  
  return (
    <div 
      id="chatbot-test-button"
      style={{ 
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        width: '80px',
        height: '80px',
        backgroundColor: 'red',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        border: '3px solid white',
      }}
      onClick={() => {
        console.log('[ChatbotTest] Button geklickt!');
        alert('Test Button funktioniert! Chatbot sollte auch funktionieren.');
      }}
    >
      TEST
    </div>
  );
}

