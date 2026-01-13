#!/usr/bin/env node

/**
 * Einfaches Script zum Erstellen von Payment-Screenshots
 * Verwendet Puppeteer mit vereinfachter Konfiguration
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../public/docs/screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3999';
const LOCALE = 'de';

const paymentSections = [
  'checkout-page',
  'payment-method-selector',
  'payment-method-card',
  'checkout-form',
  'payment-status-success',
  'payment-status-failed',
  'checkout-success',
  'checkout-cancel',
];

// Erstelle Verzeichnis wenn nicht vorhanden
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  console.log(`📁 Verzeichnis erstellt: ${SCREENSHOT_DIR}`);
}

async function createScreenshots() {
  console.log('🚀 Starte Screenshot-Erstellung...');
  console.log(`📂 Ziel: ${SCREENSHOT_DIR}`);
  console.log('');

  let browser;
  try {
    // Browser starten
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    console.log('✅ Browser gestartet');

    const results = [];

    for (const section of paymentSections) {
      const page = await browser.newPage();
      
      try {
        console.log(`📸 Erstelle Screenshot: ${section}`);
        
        await page.setViewport({
          width: 1920,
          height: 1080,
        });

        const url = `${BASE_URL}/${LOCALE}/screenshots?section=${section}`;
        
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 60000,
        });

        // Warte zusätzlich auf Rendering
        await page.waitForTimeout(2000);

        const screenshotPath = path.join(SCREENSHOT_DIR, `${section}.png`);
        
        // Versuche zuerst Element-Screenshot
        const element = await page.$('#screenshot-content');
        if (element) {
          await element.screenshot({
            path: screenshotPath,
            type: 'png',
          });
        } else {
          // Fallback: Full page
          await page.screenshot({
            path: screenshotPath,
            type: 'png',
            fullPage: true,
          });
        }

        console.log(`   ✅ Gespeichert: ${section}.png`);
        results.push({ section, success: true });
      } catch (error) {
        console.error(`   ❌ Fehler: ${error.message}`);
        results.push({ section, success: false });
      } finally {
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await browser.close();

    console.log('');
    console.log('📊 Ergebnis:');
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`✅ Erfolgreich: ${success}/${paymentSections.length}`);
    console.log(`❌ Fehlgeschlagen: ${failed}/${paymentSections.length}`);

    if (failed > 0) {
      console.log('');
      console.log('Fehlgeschlagene Screenshots:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.section}`);
      });
    }

    console.log('');
    console.log(`📁 Screenshots gespeichert in: ${SCREENSHOT_DIR}`);
    
  } catch (error) {
    console.error('💥 Fataler Fehler:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

createScreenshots().catch(error => {
  console.error('💥 Fehler:', error);
  process.exit(1);
});








