#!/usr/bin/env node

/**
 * Script zum Erstellen von Videos von Demo-Seiten
 * Verwendet Puppeteer um Screenshots zu machen, dann FFmpeg um Videos zu erstellen
 * 
 * Installation:
 * npm install puppeteer
 * sudo apt install ffmpeg (falls nicht vorhanden)
 * 
 * Usage:
 * node scripts/create-demo-videos.js
 */

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../public/videos/demos');
const SCREENSHOT_DIR = path.join(__dirname, '../tmp/screenshots');

// Demo-Seiten URLs
const demos = [
  {
    name: 'dashboard',
    url: `${BASE_URL}/de/demo/dashboard`,
    output: 'dashboard-demo.mp4',
  },
  {
    name: 'bot-builder',
    url: `${BASE_URL}/de/demo/bot-builder`,
    output: 'bot-builder-demo.mp4',
  },
  {
    name: 'features',
    url: `${BASE_URL}/de/demo/features`,
    output: 'features-demo.mp4',
  },
  {
    name: 'analytics',
    url: `${BASE_URL}/de/demo/analytics`,
    output: 'analytics-demo.mp4',
  },
  {
    name: 'knowledge',
    url: `${BASE_URL}/de/demo/knowledge`,
    output: 'knowledge-demo.mp4',
  },
  {
    name: 'settings',
    url: `${BASE_URL}/de/demo/settings`,
    output: 'settings-demo.mp4',
  },
];

// ✅ Hilfsfunktion: Sichtbaren Mauszeiger hinzufügen
async function addVisibleCursor(page) {
  await page.evaluate(() => {
    // Erstelle Mauszeiger-DIV
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgMkwzIDIxTDEyIDE3TDIxIDIxTDE5IDJMNSAyWiIgZmlsbD0iIzAwMCIgc3Ryb2tlPSIjRkZGIiBzdHJva2Utd2lkdGg9IjEuNSIvPgo8L3N2Zz4K') no-repeat;
      background-size: 20px 20px;
      pointer-events: none;
      z-index: 999999;
      transform: translate(-10px, -10px);
      transition: transform 0.05s linear;
      will-change: transform;
    `;
    document.body.appendChild(cursor);

    // Track Mouse Position
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;
    cursor.style.left = currentX + 'px';
    cursor.style.top = currentY + 'px';

    // Update cursor position when mouse moves
    document.addEventListener('mousemove', (e) => {
      currentX = e.clientX;
      currentY = e.clientY;
      cursor.style.left = currentX + 'px';
      cursor.style.top = currentY + 'px';
    });

    // Track clicks
    let clickTimeout = null;
    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'translate(-10px, -10px) scale(0.9)';
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        cursor.style.transform = 'translate(-10px, -10px) scale(1)';
      }, 150);
    });

    // Store cursor position globally for Puppeteer access
    window.demoCursorX = currentX;
    window.demoCursorY = currentY;
    setInterval(() => {
      window.demoCursorX = currentX;
      window.demoCursorY = currentY;
    }, 50);
  });
}

// ✅ Hilfsfunktion: Mauszeiger-Position aktualisieren (für Puppeteer)
async function updateCursorPosition(page, x, y) {
  await page.evaluate((mx, my) => {
    const cursor = document.getElementById('demo-cursor');
    if (cursor) {
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
      window.demoCursorX = mx;
      window.demoCursorY = my;
    }
  }, x, y);
}

// ✅ Hilfsfunktion: Cursor-Klick-Animation
async function animateCursorClick(page) {
  await page.evaluate(() => {
    const cursor = document.getElementById('demo-cursor');
    if (cursor) {
      cursor.style.transform = 'translate(-10px, -10px) scale(0.8)';
      setTimeout(() => {
        cursor.style.transform = 'translate(-10px, -10px) scale(1)';
      }, 150);
    }
  });
}

// ✅ Hilfsfunktion: Natürliche Mausbewegung MIT sichtbarem Cursor
async function moveMouseSmooth(page, fromX, fromY, toX, toY, steps = 20) {
  const stepX = (toX - fromX) / steps;
  const stepY = (toY - fromY) / steps;
  
  for (let i = 0; i <= steps; i++) {
    const x = fromX + stepX * i;
    const y = fromY + stepY * i;
    
    // ✅ WICHTIG: Puppeteer Mouse Move UND visueller Cursor Update
    await page.mouse.move(x, y);
    await updateCursorPosition(page, x, y);
    
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

// ✅ Hilfsfunktion: Header während Video-Recording ausblenden
async function hideHeaderForRecording(page) {
  await page.addStyleTag({
    content: `
      header.sticky,
      header[class*="sticky"],
      [class*="header"][class*="sticky"],
      header {
        position: fixed !important;
        top: -200px !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
        pointer-events: none !important;
        z-index: -1 !important;
      }
      body {
        padding-top: 0 !important;
      }
    `
  });
  await new Promise(resolve => setTimeout(resolve, 300));
}

async function simulateInteractions(page, demo) {
  // Warte auf vollständiges Laden
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    switch (demo.name) {
      case 'dashboard':
        // ✅ Natürliche Mausbewegung zu Statistik-Card
        await moveMouseSmooth(page, 960, 540, 500, 400, 15);
        await new Promise(resolve => setTimeout(resolve, 800)); // User "liest"
        
        // ✅ Hover über Card (Maus bleibt auf Element)
        const card1 = await page.$('[class*="card"], [class*="stat"]');
        if (card1) {
          const box1 = await card1.boundingBox();
          if (box1) {
            await moveMouseSmooth(page, 500, 400, box1.x + box1.width/2, box1.y + box1.height/2, 10);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Hover-Effekt sichtbar
          }
        }
        
        // ✅ Scroll langsam nach unten (natürliche Bewegung)
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel({ deltaY: 50 });
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // User liest
        
        // ✅ Mausbewegung zu Chart
        await moveMouseSmooth(page, 500, 400, 1200, 600, 15);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ✅ Hover über Chart
        const chart = await page.$('[class*="chart"], canvas, svg');
        if (chart) {
          const chartBox = await chart.boundingBox();
          if (chartBox) {
            await moveMouseSmooth(page, 1200, 600, chartBox.x + chartBox.width/2, chartBox.y + chartBox.height/2, 10);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        
        // ✅ Scroll zurück nach oben (natürlich)
        for (let i = 0; i < 15; i++) {
          await page.mouse.wheel({ deltaY: -50 });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // ✅ Simuliere Zahlen-Animation (Counter)
        await page.evaluate(() => {
          const counters = document.querySelectorAll('[class*="counter"], [class*="stat"]');
          counters.forEach((el, idx) => {
            if (el.textContent) {
              const current = parseInt(el.textContent) || 0;
              let target = current + Math.floor(Math.random() * 100);
              let step = 0;
              const interval = setInterval(() => {
                step++;
                const value = Math.floor(current + (target - current) * (step / 30));
                if (el.textContent.match(/\d+/)) {
                  el.textContent = el.textContent.replace(/\d+/, value);
                }
                if (step >= 30) clearInterval(interval);
              }, 30);
            }
          });
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;

      case 'bot-builder':
        // ✅ Mausbewegung zu Node-Palette
        await moveMouseSmooth(page, 960, 540, 200, 400, 20);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // ✅ Finde erste Node-Vorlage
        const nodeTemplate = await page.$('[draggable="true"], [class*="node-template"], [class*="node-card"]');
        if (nodeTemplate) {
          const templateBox = await nodeTemplate.boundingBox();
          if (templateBox) {
            // ✅ Maus zu Node-Template bewegen
            await moveMouseSmooth(page, 200, 400, templateBox.x + templateBox.width/2, templateBox.y + templateBox.height/2, 15);
            await new Promise(resolve => setTimeout(resolve, 800)); // User wählt aus
            
            // ✅ DRAG & DROP mit echter Maus
            const targetX = 600;
            const targetY = 400;
            
            // Mouse Down
            await page.mouse.move(templateBox.x + templateBox.width/2, templateBox.y + templateBox.height/2);
            await page.mouse.down();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // ✅ Smooth Drag-Bewegung
            await moveMouseSmooth(page, 
              templateBox.x + templateBox.width/2, 
              templateBox.y + templateBox.height/2,
              targetX, 
              targetY, 
              25
            );
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Mouse Up
            await page.mouse.up();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Warte auf Node-Drop
            
            // ✅ Zweite Node hinzufügen
            await moveMouseSmooth(page, targetX, targetY, templateBox.x + templateBox.width/2, templateBox.y + templateBox.height/2 + 100, 15);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            await page.mouse.move(templateBox.x + templateBox.width/2, templateBox.y + templateBox.height/2 + 100);
            await page.mouse.down();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            await moveMouseSmooth(page, 
              templateBox.x + templateBox.width/2, 
              templateBox.y + templateBox.height/2 + 100,
              targetX + 300, 
              targetY, 
              25
            );
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.mouse.up();
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // ✅ Verbindung erstellen (Mausbewegung zwischen Nodes)
            await moveMouseSmooth(page, targetX + 300, targetY, targetX, targetY, 20);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // ✅ Klick auf ersten Node (zum Verbinden) MIT Cursor-Animation
            await page.mouse.click(targetX, targetY);
            await animateCursorClick(page);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // ✅ Maus zu zweitem Node bewegen
            await moveMouseSmooth(page, targetX, targetY, targetX + 300, targetY, 20);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // ✅ Klick auf zweiten Node (Verbindung wird erstellt) MIT Cursor-Animation
            await page.mouse.click(targetX + 300, targetY);
            await animateCursorClick(page);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        
        // ✅ Scroll durch Canvas mit Mausrad
        await moveMouseSmooth(page, 600, 400, 960, 540, 15);
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel({ deltaX: 50, deltaY: 50 });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ✅ Scroll zurück
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel({ deltaX: -50, deltaY: -50 });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        break;

      case 'analytics':
        // ✅ Mausbewegung zum ersten Chart
        await moveMouseSmooth(page, 960, 540, 500, 500, 20);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // ✅ Scroll mit Mausrad (natürlich)
        for (let i = 0; i < 8; i++) {
          await page.mouse.wheel({ deltaY: 40 });
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ✅ Hover über Chart mit echter Maus
        const chart1 = await page.$('[class*="chart"], canvas, svg');
        if (chart1) {
          const chartBox1 = await chart1.boundingBox();
          if (chartBox1) {
            await moveMouseSmooth(page, 500, 500, chartBox1.x + chartBox1.width/2, chartBox1.y + chartBox1.height/2, 15);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Chart-Animation sichtbar
          }
        }
        
        // ✅ Scroll weiter nach unten
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel({ deltaY: 50 });
          await new Promise(resolve => setTimeout(resolve, 120));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ✅ Hover über zweiten Chart
        const chart2 = await page.$('[class*="chart"]:nth-of-type(2), canvas:nth-of-type(2)');
        if (chart2) {
          const chartBox2 = await chart2.boundingBox();
          if (chartBox2) {
            await moveMouseSmooth(page, 500, 600, chartBox2.x + chartBox2.width/2, chartBox2.y + chartBox2.height/2, 15);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        // ✅ Scroll zurück nach oben
        for (let i = 0; i < 18; i++) {
          await page.mouse.wheel({ deltaY: -50 });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        break;

      case 'knowledge':
        // ✅ Mausbewegung zum Upload-Button
        const uploadBtn = await page.$('[class*="upload"], input[type="file"], button[class*="upload"]');
        if (uploadBtn) {
          const uploadBox = await uploadBtn.boundingBox();
          if (uploadBox) {
            await moveMouseSmooth(page, 960, 540, uploadBox.x + uploadBox.width/2, uploadBox.y + uploadBox.height/2, 20);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Hover-Effekt sichtbar
            
            // ✅ Klick auf Upload MIT Cursor-Animation
            await page.mouse.click(uploadBox.x + uploadBox.width/2, uploadBox.y + uploadBox.height/2);
            await animateCursorClick(page);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // ✅ Scroll durch Wissensquellen-Liste (natürlich)
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel({ deltaY: 45 });
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ✅ Hover über Status-Badges
        const statusBadges = await page.$$('[class*="status"], [class*="badge"]');
        for (let i = 0; i < Math.min(statusBadges.length, 3); i++) {
          const badge = statusBadges[i];
          const badgeBox = await badge.boundingBox();
          if (badgeBox) {
            await moveMouseSmooth(page, 960, 400 + i * 100, badgeBox.x + badgeBox.width/2, badgeBox.y + badgeBox.height/2, 10);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // ✅ Simuliere Status-Update (processing -> ready)
            await page.evaluate((badgeEl) => {
              if (badgeEl.textContent?.includes('Verarbeitung') || badgeEl.textContent?.includes('Processing')) {
                badgeEl.textContent = badgeEl.textContent.replace(/Verarbeitung|Processing/, 'Fertig');
                badgeEl.className = badgeEl.className.replace(/warning|processing/, 'success');
              }
            }, badge);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // ✅ Scroll zurück
        for (let i = 0; i < 15; i++) {
          await page.mouse.wheel({ deltaY: -40 });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        break;

      case 'features':
        // ✅ Mausbewegung zur ersten Feature-Card
        await moveMouseSmooth(page, 960, 540, 400, 500, 20);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // ✅ Hover über Feature-Cards (natürliche Sequenz)
        const featureCards = await page.$$('[class*="card"], [class*="feature"]');
        for (let i = 0; i < Math.min(featureCards.length, 4); i++) {
          const card = featureCards[i];
          const cardBox = await card.boundingBox();
          if (cardBox) {
            await moveMouseSmooth(page, 
              i === 0 ? 400 : (cardBox.x - 200), 
              i === 0 ? 500 : cardBox.y,
              cardBox.x + cardBox.width/2, 
              cardBox.y + cardBox.height/2, 
              15
            );
            await new Promise(resolve => setTimeout(resolve, 1500)); // Hover-Effekt sichtbar
            
            // ✅ Leichtes Scrollen während Hover
            await page.mouse.wheel({ deltaY: 30 });
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        // ✅ Scroll weiter nach unten
        for (let i = 0; i < 12; i++) {
          await page.mouse.wheel({ deltaY: 50 });
          await new Promise(resolve => setTimeout(resolve, 120));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ✅ Hover über weitere Features
        for (let i = 4; i < Math.min(featureCards.length, 8); i++) {
          const card = featureCards[i];
          const cardBox = await card.boundingBox();
          if (cardBox) {
            await moveMouseSmooth(page, 960, 540, cardBox.x + cardBox.width/2, cardBox.y + cardBox.height/2, 15);
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        }
        
        // ✅ Scroll zurück nach oben
        for (let i = 0; i < 20; i++) {
          await page.mouse.wheel({ deltaY: -50 });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        break;

      case 'settings':
        // ✅ Scroll leicht nach unten
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel({ deltaY: 40 });
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // ✅ Toggle-Aktionen mit echter Maus
        const toggles = await page.$$('input[type="checkbox"], [class*="toggle"], [role="switch"]');
        for (let i = 0; i < Math.min(toggles.length, 4); i++) {
          const toggle = toggles[i];
          const toggleBox = await toggle.boundingBox();
          if (toggleBox) {
            // ✅ Mausbewegung zum Toggle
            await moveMouseSmooth(page, 960, 300 + i * 100, toggleBox.x + toggleBox.width/2, toggleBox.y + toggleBox.height/2, 15);
            await new Promise(resolve => setTimeout(resolve, 600)); // User "liest" Label
            
            // ✅ Klick auf Toggle MIT Cursor-Animation
            await page.mouse.click(toggleBox.x + toggleBox.width/2, toggleBox.y + toggleBox.height/2);
            await animateCursorClick(page);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Warte auf Toggle-Animation
          }
        }
        
        // ✅ Scroll weiter nach unten
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel({ deltaY: 50 });
          await new Promise(resolve => setTimeout(resolve, 120));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ✅ Hover über Settings-Sektion
        const section = await page.$('[class*="section"], [class*="settings-group"]');
        if (section) {
          const sectionBox = await section.boundingBox();
          if (sectionBox) {
            await moveMouseSmooth(page, 960, 600, sectionBox.x + sectionBox.width/2, sectionBox.y + sectionBox.height/2, 15);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        
        // ✅ Scroll zurück nach oben
        for (let i = 0; i < 18; i++) {
          await page.mouse.wheel({ deltaY: -45 });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        break;

      default:
        // Standard: Scroll langsam durch die Seite
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
        const scrollSteps = 5;
        const scrollStep = pageHeight / scrollSteps;
        
        for (let step = 1; step <= scrollSteps; step++) {
          await page.evaluate((y) => {
            window.scrollTo({ top: y, behavior: 'smooth' });
          }, scrollStep * step);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error(`⚠️  Fehler bei Interaktionen für ${demo.name}:`, error.message);
    // Fallback: Einfach scrollen
    await page.evaluate(() => {
      const height = document.body.scrollHeight;
      window.scrollTo({ top: height / 2, behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function createScreenshots(browser, demo, count = 60, interval = 500) {
  const page = await browser.newPage();
  
  try {
    // Desktop Viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    console.log(`📸 Screenshots erstellen für ${demo.name}...`);
    await page.goto(demo.url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Warte auf vollständiges Laden
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ✅ WICHTIG: Sichtbaren Mauszeiger hinzufügen (BEVOR Interaktionen)
    console.log(`🖱️  Füge sichtbaren Mauszeiger hinzu für ${demo.name}...`);
    await addVisibleCursor(page);
    await new Promise(resolve => setTimeout(resolve, 300));

    // ✅ WICHTIG: Header während Video-Recording ausblenden
    console.log(`🎬 Verstecke Header für ${demo.name}...`);
    await hideHeaderForRecording(page);

    // ✅ WICHTIG: Simuliere Interaktionen MIT sichtbarem Cursor
    console.log(`🎬 Simuliere Interaktionen mit sichtbaren Mausbewegungen für ${demo.name}...`);
    await simulateInteractions(page, demo);

    // Erstelle Screenshots während/nach Interaktionen (eine pro 500ms = 60 Frames für 30 Sekunden Video)
    const screenshots = [];
    for (let i = 0; i < count; i++) {
      try {
        const screenshotPath = path.join(SCREENSHOT_DIR, `${demo.name}-${String(i).padStart(4, '0')}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        screenshots.push(screenshotPath);
        
        // ✅ Während Screenshots: Weiter interagieren für Bewegung (mit sichtbarem Cursor)
        if (i % 10 === 0 && i < count - 10) {
          // Alle 5 Sekunden: Neue Interaktion mit Mausbewegung
          const currentPos = await page.evaluate(() => ({ x: window.demoCursorX || 960, y: window.demoCursorY || 540 }));
          const randomX = 400 + Math.random() * 1000;
          const randomY = 300 + Math.random() * 400;
          await moveMouseSmooth(page, currentPos.x, currentPos.y, randomX, randomY, 10);
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Leichtes Scrollen
          await page.mouse.wheel({ deltaY: 30 });
          await new Promise(resolve => setTimeout(resolve, 200));
        } else if (i < count - 1 && i % 3 === 0) {
          // Jeden 3. Frame: Leichte Mausbewegung für natürliche Animation
          const currentMouse = await page.evaluate(() => ({ x: window.demoCursorX || 960, y: window.demoCursorY || 540 }));
          const nextX = currentMouse.x + (Math.random() - 0.5) * 50;
          const nextY = currentMouse.y + (Math.random() - 0.5) * 50;
          const newX = Math.max(20, Math.min(1900, nextX));
          const newY = Math.max(20, Math.min(1060, nextY));
          await page.mouse.move(newX, newY);
          await updateCursorPosition(page, newX, newY);
        }
        
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error(`❌ Fehler bei Screenshot ${i} für ${demo.name}:`, error.message);
        // Versuche weiter
        if (i > 0) {
          // Verwende letzten Screenshot als Fallback
          const lastScreenshot = screenshots[screenshots.length - 1];
          const newPath = path.join(SCREENSHOT_DIR, `${demo.name}-${String(i).padStart(4, '0')}.png`);
          fs.copyFileSync(lastScreenshot, newPath);
          screenshots.push(newPath);
        }
      }
    }

    await page.close();
    return screenshots;
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen von Screenshots für ${demo.name}:`, error.message);
    await page.close().catch(() => {});
    throw error;
  }
}

async function createVideoFromScreenshots(screenshots, outputPath, fps = 2) {
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  // Erstelle FFmpeg Input-Datei
  const inputFile = path.join(SCREENSHOT_DIR, `input-${Date.now()}.txt`);
  const inputContent = screenshots.map(s => `file '${s}'\nduration ${1 / fps}`).join('\n');
  fs.writeFileSync(inputFile, inputContent);

  // FFmpeg-Kommando: Screenshots zu Video
  const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${inputFile}" -vf "fps=${fps},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p -y "${outputPath}"`;

  try {
    execSync(ffmpegCommand, { stdio: 'inherit' });
    console.log(`✅ Video erstellt: ${outputPath}`);
    fs.unlinkSync(inputFile); // Cleanup
    return true;
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen des Videos: ${error.message}`);
    return false;
  }
}

async function cleanupScreenshots(screenshots) {
  screenshots.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

async function main() {
  console.log('🎥 Starte Video-Erstellung für Demo-Seiten...\n');

  // Erstelle Verzeichnisse
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Starte Browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const demo of demos) {
      try {
        console.log(`\n📹 Verarbeite: ${demo.name}`);
        
        // Erstelle Screenshots
        const screenshots = await createScreenshots(browser, demo, 60, 500); // 60 Frames, 2 FPS = 30 Sekunden
        
        if (screenshots.length === 0) {
          console.log(`⚠️  Keine Screenshots für ${demo.name}, überspringe...`);
          continue;
        }
        
        // Erstelle Video
        const outputPath = path.join(OUTPUT_DIR, demo.output);
        const success = await createVideoFromScreenshots(screenshots, outputPath, 2);
        
        if (success) {
          // Cleanup Screenshots
          cleanupScreenshots(screenshots);
          console.log(`✅ ${demo.name} abgeschlossen`);
        }
      } catch (error) {
        console.error(`❌ Fehler bei ${demo.name}:`, error.message);
        // Weiter mit nächstem Demo
        continue;
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n✨ Alle Videos erstellt!');
  console.log(`📁 Output-Verzeichnis: ${OUTPUT_DIR}`);
}

// Führe Script aus
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createScreenshots, createVideoFromScreenshots };

