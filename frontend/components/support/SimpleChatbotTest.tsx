'use client';

import { useEffect, useState } from 'react';

export default function SimpleChatbotTest() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    console.log('[SimpleChatbotTest] Component rendered');
    setMounted(true);
    
    // Zusätzlicher Check nach kurzer Verzögerung
    setTimeout(() => {
      setVisible(true);
      const el = document.getElementById('simple-chatbot-test');
      console.log('[SimpleChatbotTest] Element after timeout:', el ? 'EXISTS' : 'NOT FOUND');
      if (el) {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        console.log('[SimpleChatbotTest] Styles:', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position,
        });
        console.log('[SimpleChatbotTest] Position:', {
          bottom: rect.bottom,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        });
      } else {
        console.error('[SimpleChatbotTest] Element nicht im DOM gefunden!');
      }
    }, 500);
  }, []);

  // Rendere IMMER etwas - auch während SSR
  // WICHTIG: display: 'flex' statt 'none', damit es sofort sichtbar ist
  console.log('[SimpleChatbotTest] Rendering, mounted:', mounted, 'visible:', visible);

  return (
    <div
      id="simple-chatbot-test"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '80px',
        height: '80px',
        backgroundColor: '#ef4444',
        borderRadius: '50%',
        display: 'flex', // IMMER flex, nicht 'none'
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 999999,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        border: '3px solid white',
        opacity: mounted ? 1 : 0.5, // Leicht transparent wenn nicht gemountet
      }}
      onClick={() => {
        console.log('[SimpleChatbotTest] CLICKED!');
        alert('Test Button funktioniert!');
      }}
      suppressHydrationWarning={true}
    >
      {mounted ? 'TEST' : 'LOAD'}
    </div>
  );
}

